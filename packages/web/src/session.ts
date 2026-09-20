/**
 * Chat session lifecycle (spec §1.1 B, §3.1, §4, §5).
 *
 * One session owns one conversation. It is a small state machine:
 *
 *   idle → running → (done | failed) → idle
 *
 * The two guarantees that make this usable, and that the tests enforce:
 *
 *   1. Every run ends in exactly ONE terminal event — `session_done` or
 *      `session_failed`. A token stream that never terminates is a bug, and
 *      the watchdog (§5) converts it into a `session_failed` rather than
 *      leaving a client staring at a spinner forever.
 *   2. Tokens are strictly ordered by `seq` per session. Two sessions on one
 *      socket never interleave each other's tokens (T-W7).
 *
 * The session does not know about WebSockets at all. It emits ClientFrames
 * through a callback; the server decides where they go. That is what lets the
 * same code serve a socket today and a replay-from-log tomorrow (§6.3).
 */
import type { ClientFrame, ModelView, SessionSummary } from './protocol.js';

/** The LLM call the session makes. This is the whole seam to @magoco/agents. */
export interface LlmCall {
  (opts: {
    readonly messages: ReadonlyArray<{ readonly role: 'system' | 'user' | 'assistant'; readonly content: string }>;
    readonly tools: ReadonlyArray<unknown>;
    readonly modelId: string;
    readonly stream: true;
    /** Aborted when the watchdog fires. A provider MUST stop and throw on abort. */
    readonly signal: AbortSignal;
  }): Promise<LlmStream>;
}

/** A stream the session can iterate. Mirrors @magoco/agents' LlmResponse. */
export interface LlmStream {
  readonly chunks: AsyncIterable<{ readonly delta?: string; readonly thinking?: string; readonly toolCalls?: unknown }>;
  readonly usage?: Promise<{ readonly inTokens?: number; readonly outTokens?: number }>;
}

/** A tool the session can invoke. */
export interface ToolBridge {
  (call: { readonly capability: string; readonly args: unknown }): Promise<{
    readonly status: 'ok' | 'error';
    readonly result: unknown;
  }>;
}

export interface SessionConfig {
  readonly id: string;
  readonly title: string;
  readonly modelId: string;
  /** Hard ceiling on think/act iterations, from the profile. */
  readonly maxSteps: number;
  /** A session producing no terminal event in this window is force-failed. */
  readonly timeoutMs: number;
  readonly llm: LlmCall;
  readonly tools: ToolBridge;
  /** Where every event is published. The session log lives behind this. */
  readonly emit: (f: ClientFrame) => void;
  readonly now?: () => number;
}

type Phase = 'idle' | 'running';

export interface ChatSession {
  readonly id: string;
  readonly title: string;
  getModel(): string;
  setModel(modelId: string): void;
  /** Send a user message and stream the reply. Rejects if already running. */
  send(text: string): Promise<void>;
  /** The messages exchanged so far, for export and replay. */
  messages(): ReadonlyArray<{ readonly role: 'user' | 'assistant' | 'system'; readonly content: string }>;
  close(): void;
}

export function createSession(cfg: SessionConfig): ChatSession {
  const now = cfg.now ?? Date.now;
  let phase: Phase = 'idle';
  let model = cfg.modelId;
  const history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  let tokenSeq = 0;
  let watchdog: NodeJS.Timeout | null = null;
  let abort: AbortController | null = null;

  // Guarantee 1: exactly one terminal event per run. `fail` is idempotent — a
  // late watchdog firing after the run already settled is a no-op, not a
  // second failure.
  let terminal = false;
  function fail(error: string): void {
    if (terminal) return;
    terminal = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    abort?.abort();
    phase = 'idle';
    cfg.emit({ t: 'session_failed', sessionId: cfg.id, error });
  }

  return {
    id: cfg.id,
    title: cfg.title,
    getModel: () => model,
    setModel(next: string) {
      model = next;
      cfg.emit({ t: 'session_model', sessionId: cfg.id, modelId: next });
    },

    async send(text: string): Promise<void> {
      if (phase === 'running') {
        throw new Error('session is already running');
      }
      phase = 'running';
      terminal = false;
      history.push({ role: 'user', content: text });
      cfg.emit({ t: 'session_message', sessionId: cfg.id, role: 'user', text });
      tokenSeq = 0;
      abort = new AbortController();

      // The watchdog is the whole point of guarantee 1: a provider that hangs
      // forever must still produce a terminal event. It aborts the call, which
      // makes the awaiting send() resolve instead of hanging for all time.
      watchdog = setTimeout(() => {
        if (phase === 'running') fail(`session timed out after ${cfg.timeoutMs}ms`);
      }, cfg.timeoutMs);

      const started = now();
      let stream: LlmStream;
      try {
        stream = await cfg.llm({
          messages: history.slice(),
          tools: [],
          modelId: model,
          stream: true,
          signal: abort.signal,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        fail(`llm error: ${msg}`);
        return;
      }

      // Guarantee 1 starts here: whatever happens below, the run must emit exactly
      // one terminal event. The try/finally below is what makes that true even
      // when the stream throws mid-iteration.
      let assembled = '';
      try {
        for await (const chunk of stream.chunks) {
          if (chunk.delta) {
            assembled += chunk.delta;
            tokenSeq += 1;
            cfg.emit({ t: 'session_token', sessionId: cfg.id, seq: tokenSeq, delta: chunk.delta });
          }
          if (chunk.thinking) {
            cfg.emit({ t: 'session_thinking', sessionId: cfg.id, seq: tokenSeq, delta: chunk.thinking });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        fail(`llm error: ${msg}`);
        return;
      }

      history.push({ role: 'assistant', content: assembled });

      // Usage is best-effort: a failure to read it must not lose the answer.
      let usage: { readonly inTokens?: number; readonly outTokens?: number } | undefined;
      try { usage = stream.usage ? await stream.usage : undefined; } catch { usage = undefined; }

      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      phase = 'idle';
      cfg.emit({
        t: 'session_done',
        sessionId: cfg.id,
        stopReason: 'answer',
        ms: now() - started,
        ...(usage ? { usage } : {}),
      });
    },

    messages: () => history.slice(),

    close(): void {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      phase = 'idle';
    },
  };
}

/** Export a conversation. Content is escaped by the caller; see T-W5. */
export function exportJson(session: ChatSession, modelId: string): string {
  return JSON.stringify(
    {
      sessionId: session.id,
      title: session.title,
      modelId,
      exportedAt: new Date().toISOString(),
      messages: session.messages(),
    },
    null,
    2,
  );
}

export function exportMarkdown(session: ChatSession): string {
  const lines = [`# ${session.title}`, ''];
  for (const m of session.messages()) {
    const who = m.role === 'user' ? '👤 User' : m.role === 'assistant' ? '🤖 Assistant' : '⚙ System';
    lines.push(`## ${who}`, '', m.content, '');
  }
  return lines.join('\n');
}

export type { ClientFrame, ModelView, SessionSummary };
