/**
 * MCP (Model Context Protocol) client — `magoco.mcp` (Phase 3.7).
 *
 * Enables connection to Claude/ChatGPT via MCP without rewriting entire system.
 */

import type { CapabilityDef } from './types.js';

export const MCP_CAPABILITY = 'magoco.mcp' as const;

export type MCPTransport = 'stdio' | 'sse' | 'websocket';

export interface MCPConfig {
  transport: MCPTransport;
  serverUrl?: string;
  serverCommand?: string;
  serverArgs?: string[];
}

export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface MCPClient {
  /** Initialize MCP connection */
  connect(config: MCPConfig): Promise<void>;
  
  /** Send request and await response */
  request(req: MCPRequest): Promise<MCPResponse>;
  
  /** Close MCP connection */
  close(): Promise<void>;
}

export const mcpDef: CapabilityDef = {
  id: MCP_CAPABILITY,
  name: 'MCP Client',
  description: 'Model Context Protocol client for external LLM connection',
  version: '0.1.0',
  create(_config, _ctx) {
    throw new Error(`Provider for ${MCP_CAPABILITY} not registered`);
  },
};
