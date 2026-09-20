/**
 * @magoco/agents — the agent core (MASTER_PLAN.md §2.1, §2.2, §2.9).
 *
 * Public surface, in the order you'd use it:
 *
 *   runLoop(...)                    the ReAct loop; give it an LLM and a tools seam
 *   LlmRouter                       tier mapping, auto-fallback, cost accounting
 *   ScriptedProvider                a deterministic provider for tests and reference
 *   OpenAiProvider                  every OpenAI-compatible backend, local included
 *   AnthropicProvider               Anthropic's own wire format
 *   invokeTool / ToolInvoker        the tools seam: validate, call, or fail gracefully
 *   MemoryCapability + MemoryStore  the three memory layers behind one contract
 *   validate / SchemaInput          the JSON-Schema subset the framework relies on
 *
 * This package deliberately depends on nothing but Node's built-ins: `fetch`,
 * `ReadableStream`, `node:sqlite`-free. That is what lets it be embedded anywhere.
 */

export * from './llm.js';
export * from './schema.js';
export * from './tools.js';
export * from './scripted.js';
export * from './router.js';
export * from './loop.js';
export * from './memory.js';
export { OpenAiProvider, type OpenAiConfig, SseStream } from './providers/openai.js';
export { AnthropicProvider, type AnthropicConfig } from './providers/anthropic.js';
