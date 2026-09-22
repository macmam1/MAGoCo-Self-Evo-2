/**
 * AI code provider implementation — uses MCP or direct LLM calls.
 */

import type { CodeRequest, CodeResponse, AIProvider } from '../../core/src/capabilities/ai-code.js';
import type { MCPClient } from '../../core/src/capabilities/mcp.js';

interface AIConfig {
  /** Use MCP provider if available, fallback to direct LLM */
  mcpClient?: MCPClient;
  /** Direct LLM model name */
  model?: string;
  /** API endpoint for direct calls */
  apiEndpoint?: string;
  apiKey?: string;
}

export function createAIProvider(config: AIConfig): AIProvider {
  return {
    async run(request: CodeRequest): Promise<CodeResponse> {
      // Use MCP if available (preferred)
      if (config.mcpClient) {
        return await this._runViaMCP(request);
      }
      // Fallback to direct LLM (mock for now, replace with real call)
      return await this._runDirect(request);
    },

    async _runViaMCP(request: CodeRequest): Promise<CodeResponse> {
      if (!config.mcpClient) throw new Error('MCP client not available');
      const prompt = this._buildPrompt(request);
      const response = await config.mcpClient.request('generate_code', { prompt });
      return {
        type: request.type,
        code: (response as any).code || '// Generated code',
        explanation: (response as any).explanation || 'Code generated via MCP',
      };
    },

    async _runDirect(request: CodeRequest): Promise<CodeResponse> {
      // Placeholder - replace with real LLM call to OpenAI/Claude/etc.
      // For now, use simple pattern matching
      const prompt = this._buildPrompt(request);
      const code = this._generateSimpleCode(request.type, prompt);
      return {
        type: request.type,
        code,
        explanation: this._generateExplanation(request.type),
      };
    },

    _buildPrompt(request: CodeRequest): string {
      let prompt = `Task: ${request.type}\n\n`;
      prompt += `Description: ${request.prompt}\n\n`;
      if (request.context) {
        prompt += `Context:\n${request.context}\n\n`;
      }
      if (request.files?.length) {
        prompt += `Files:\n` + request.files.map(f => `- ${f.path}:\n${f.content}`).join('\n');
      }
      return prompt;
    },

    _generateSimpleCode(type: string, prompt: string): string {
      // Simple pattern-based code generation (replace with real LLM)
      if (type === 'generate') {
        return `// Generated based on: ${prompt.substring(0, 100)}\nconsole.log('TODO: Replace with actual implementation');`;
      }
      if (type === 'review') {
        return `// Review suggestions:\n// 1. Add error handling\n// 2. Optimize performance\n// 3. Add tests`;
      }
      if (type === 'debug') {
        return `// Debugging steps:\n// 1. Check for null/undefined\n// 2. Validate inputs\n// 3. Add logging`;
      }
      return `// TODO: Implement based on: ${prompt.substring(0, 100)}`;
    },

    _generateExplanation(type: string): string {
      switch (type) {
        case 'generate': return 'Generated basic structure. Refine as needed.';
        case 'review': return 'Review completed. See suggestions above.';
        case 'debug': return 'Debugging hints provided. Add logs to narrow down issue.';
        case 'complete': return 'Code completion ready.';
        default: return 'Processed request.';
      }
    },
  };
}
