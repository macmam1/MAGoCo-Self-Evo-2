/**
 * The code-execution capability — `magoco.code.run` (Phase 3, spec §4.3).
 *
 * The sandbox runs code a model wrote, on the same machine as the framework,
 * with a process as the only hard boundary. That is the whole security model,
 * and it is the reason this file exists as a capability def rather than a
 * function in `@magoco/agents`: the boundary is a *contract*, and the contract
 * is stated where both the provider and the consumer can see it.
 *
 * What tier-1 actually guarantees, stated so no caller can hear something
 * softer than reality (spec §5):
 *
 *   - the child sees no secret the parent holds (env whitelist)
 *   - the child cannot open a file outside the project root (path resolution)
 *   - the child dies when its time, memory, or process budget is spent
 *   - network is *best effort*. On a host without privileges, no boundary
 *     below a container can promise no-network. This capability says so, and
 *     callers must not run untrusted code on it.
 */

import type { CapabilityDef } from './types.js';

/** Capabilities that can be executed as tools. */
export const CODE_CAPABILITY = 'magoco.code.run' as const;

/** What a run may not exceed. Every field is overridable in the profile. */
export interface RunLimits {
  /** Wall-clock before the child is SIGKILLed. */
  readonly timeoutMs: number;
  /** RLIMIT_AS. */
  readonly memoryMB: number;
  /** RLIMIT_CPU, in milliseconds. */
  readonly cpuMs: number;
  /** RLIMIT_NPROC. */
  readonly maxProcesses: number;
  /** RLIMIT_FSIZE. Zero means the limit is the project root's own byte cap. */
  readonly maxFileBytes: number;
  /** Output beyond this is truncated, never buffered whole. */
  readonly maxOutputBytes: number;
}

/** A language the sandbox knows how to spawn. Adding one is a ~10-line adapter. */
export type RunLanguage = 'js' | 'py';

/**
 * A request to run code. Either a file inside the project root, or inline
 * source plus a language. If both are given the file wins — a caller that has
 * already written the file should not have to copy its contents inline.
 */
export interface RunRequest {
  readonly path?: string;
  readonly source?: string;
  readonly language?: RunLanguage;
  /** Lines fed to stdin, newline-terminated. */
  readonly stdin?: readonly string[];
  readonly limits?: Partial<RunLimits>;
  /** Called when the run is killed or exits; never throws. */
  readonly onKill?: () => void;
}

/** What a run says when the process ends. */
export interface ExitInfo {
  /** Process exit status, or the signal name if killed by a signal. */
  readonly code: number | null;
  /** Set when the child never exited and was force-killed by the sandbox. */
  readonly killed: boolean;
  /** True when a resource limit (not the timeout) terminated the child. */
  readonly limited: boolean;
  /** Bytes of output retained. Past maxOutputBytes this is the cap. */
  readonly outputBytes: number;
}

/** The shape a `magoco.code.run` provider implements. */
export interface CodeProvider {
  /**
   * Spawn the run. Resolves with a handle as soon as the process is alive.
   *
   * `done` rejects only when the sandbox itself cannot spawn — e.g. the
   * interpreter is missing. A process that exits with an error code is
   * *not* a rejection: it is a fulfilled `done` with that code.
   */
  run(request: RunRequest): Promise<RunHandle>;
}

/** A handle to one running process. */
export interface RunHandle {
  readonly runId: string;
  /** Resolves on exit, rejects only if the sandbox could not spawn. */
  readonly done: Promise<ExitInfo>;
  /** stdout/stderr as they arrive. */
  readonly stdout: AsyncIterable<string>;
  readonly stderr: AsyncIterable<string>;
  /** SIGKILL the child and resolve `done` immediately. */
  kill(): void;
}

/** The capability def. Providers register against `CODE_CAPABILITY`. */
/**
 * The capability contract. `create()` throws by design — `@magoco/core` defines
 * the contract, `@magoco/sandbox` provides the only implementation (spec §7.1:
 * the sandbox package is the only thing allowed to run code).
 */
export const codeDef: CapabilityDef = {
  id: CODE_CAPABILITY,
  name: 'Code execution',
  description:
    'Run generated code in a process-isolated sandbox. Env sanitised, paths ' +
    'confined to the project root, CPU/memory/process/time capped. Network ' +
    'isolation is best-effort on a host without privileges — do not run ' +
    'untrusted code here.',
  version: '1.0.0',
  create: () => {
    throw new Error(
      'magoco.code.run requires the @magoco/sandbox package; it is created by ' +
        'the sandbox plugin, not by the bare def',
    );
  },
};

/**
 * Defaults from spec §4.1. Exported rather than nested on the def because the
 * def's shape is a stable contract, while default limits are policy.
 */
export const DEFAULT_RUN_LIMITS: RunLimits = {
  timeoutMs: 20000,
  memoryMB: 512,
  cpuMs: 5000,
  maxProcesses: 64,
  maxFileBytes: 0,
  maxOutputBytes: 1024 * 1024,
};

/** Merge request limits over profile limits over defaults. Field-by-field. */
export function resolveLimits(
  profile?: Partial<RunLimits>,
  request?: Partial<RunLimits>,
): RunLimits {
  return { ...DEFAULT_RUN_LIMITS, ...profile, ...request };
}
