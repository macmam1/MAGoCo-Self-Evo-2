/**
 * Plugin System Types
 * Supports: loading, validation, capability providers
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
}

export interface PluginModule {
  manifest: PluginManifest;
  activate: (context: PluginContext) => Promise<void>;
  deactivate: () => Promise<void>;
}

export interface PluginContext {
  pluginId: string;
  config: Record<string, any>;
  addCapability: (capId: string, provider: any) => void;
  onEvent: (event: string, handler: (data: any) => void) => void;
  emitEvent: (event: string, data: any) => void;
}

export interface PluginLoaderOptions {
  pluginDir: string;
  configDir: string;
  validate: boolean;
}
