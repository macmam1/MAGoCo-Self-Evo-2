/**
 * Workflow Builder — Phase 5 (live workflow from prompt).
 *
 * Parses a plain-text description and produces a WorkflowDef.
 * Rule-based for now (no LLM dependency); LLM integration plugs in
 * via the `WorkflowParser` interface without changing callers.
 */

import { randomUUID } from 'node:crypto';
import type { WorkflowDef, NodeDef, EdgeDef, NodeKind, TriggerKind } from './types.js';

export interface ParsedWorkflow {
  def: WorkflowDef;
  /** Warnings about ambiguous or unsupported constructs */
  warnings: string[];
}

export interface WorkflowParser {
  parse(prompt: string): Promise<ParsedWorkflow>;
}

// ── Keyword maps ──────────────────────────────────────────────────────────────

const TRIGGER_KEYWORDS: [TriggerKind, RegExp][] = [
  ['schedule', /every|cron|schedule|interval|daily|weekly|hourly/i],
  ['webhook', /webhook|http|post|api call|on request/i],
  ['event', /when|on event|emit|fired|trigger on/i],
  ['manual', /manual|button|on demand|start/i],
];

const CONDITION_KEYWORDS = /if|check|condition|branch|decide|whether|when it/i;
const HITL_KEYWORDS = /approve|confirm|human|review|wait for|ask user/i;
const PARALLEL_KEYWORDS = /parallel|simultaneously|at the same time|concurrently/i;

function detectTrigger(prompt: string): TriggerKind {
  for (const [kind, re] of TRIGGER_KEYWORDS) {
    if (re.test(prompt)) return kind;
  }
  return 'manual';
}

function detectKind(sentence: string): NodeKind {
  if (HITL_KEYWORDS.test(sentence)) return 'hitl-gate';
  if (CONDITION_KEYWORDS.test(sentence)) return 'condition';
  if (PARALLEL_KEYWORDS.test(sentence)) return 'parallel';
  return 'action';
}

/**
 * Built-in rule-based parser.
 * Splits prompt into sentences, converts each to a node, chains linearly.
 */
export function createRuleBasedParser(): WorkflowParser {
  return {
    async parse(prompt: string): Promise<ParsedWorkflow> {
      const warnings: string[] = [];
      const trigger = detectTrigger(prompt);

      // Split on ., then, and, ;  — filter empty
      const sentences = prompt
        .split(/[,;]|\bthen\b|\band\b|\.\s+/i)
        .map(s => s.trim())
        .filter(s => s.length > 2);

      if (sentences.length === 0) {
        warnings.push('could not extract any steps from prompt');
        sentences.push('run workflow');
      }

      const nodes: NodeDef[] = sentences.map((s, i) => ({
        id: `node_${i}`,
        kind: detectKind(s),
        label: s.slice(0, 80),
      }));

      // Linear chain of edges
      const edges: EdgeDef[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const from = nodes[i]!;
        const to = nodes[i + 1]!;
        edges.push({ from: from.id, to: to.id });
      }

      const def: WorkflowDef = {
        id: randomUUID(),
        name: prompt.slice(0, 60),
        trigger,
        nodes,
        edges,
      };

      return { def, warnings };
    },
  };
}

/**
 * Convenience function: parse a prompt and return a WorkflowDef.
 */
export async function buildWorkflowFromPrompt(
  prompt: string,
  parser: WorkflowParser = createRuleBasedParser(),
): Promise<ParsedWorkflow> {
  return parser.parse(prompt);
}
