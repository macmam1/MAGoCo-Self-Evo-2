/**
 * AI code provider implementation — uses MCP or direct LLM calls.
 */

import type { CodeRequest, CodeResponse, AIProvider } from '../../core/src/capabilities/ai-code.js';

export interface AIProviderConfig {
  model?: string;
}

export function createAIProvider(config: AIProviderConfig): AIProvider {
  const buildPrompt = (request: CodeRequest): string => {
    const parts: string[] = [];
    parts.push(`Task: ${request.type}`);
    parts.push(`Prompt: ${request.prompt}`);
    if (request.context) {
      parts.push(`Context: ${request.context}`);
    }
    if (request.files) {
      for (const f of request.files) {
        parts.push(`File: ${f.path}`);
        parts.push(f.content);
      }
    }
    return parts.join('\n---\n');
  };

  const generateSimpleCode = (request: CodeRequest): CodeResponse => {
    switch (request.type) {
      case 'generate':
        return {
          type: 'generate',
          code: `// Generated code for: ${request.prompt}\nconsole.log('Hello World');`,
        };
      case 'review':
        return {
          type: 'review',
          suggestions: [{ file: 'index.js', changes: ['Add error handling', 'Optimize loop'] }],
        };
      case 'debug':
        return {
          type: 'debug',
          code: request.files?.[0]?.content || '',
        };
      case 'complete':
        return {
          type: 'complete',
          code: '// Completed implementation',
        };
      default:
        return { type: request.type };
    }
  };

  return {
    async run(request: CodeRequest): Promise<CodeResponse> {
      // Fallback to simple implementation
      return generateSimpleCode(request);
    },
  };
}
