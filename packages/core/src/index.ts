export { CapabilityRegistry, createContext } from './capabilities/registry.js';
export type {
  CapabilityDef,
  CapabilityContext,
  CapabilityLogger,
  CapabilityEvent,
} from './capabilities/types.js';
export { CapabilityNotRegisteredError, DuplicateProviderError } from './capabilities/types.js';

export { EventBus } from './eventbus/bus.js';
export type { StoredEvent } from './eventbus/bus.js';

export { SessionLog } from './session/log.js';

export { PluginLoader } from './plugins/loader.js';
export type { PluginManifest, PluginModule, PluginRegisterContext } from './plugins/loader.js';

export { ProfileLoader } from './profiles/loader.js';
export type { Profile, ResolvedProfile } from './profiles/loader.js';

export { Runtime } from './runtime.js';
export type { RuntimeOptions } from './runtime.js';

export { WEB_SERVE_CAPABILITY, webServeDef } from './capabilities/web.js';
export type { WebServeInstance, WebServeConfig } from './capabilities/web.js';
export { FS_CAPABILITY, fsDef } from './capabilities/fs.js';
export type {
  FileSystemCapability,
  FsEntry,
  FsReadResult,
  FsWriteOptions,
  FsListOptions,
  FsChangeEvent,
  FsError,
} from './capabilities/fs.js';
export {
  CODE_CAPABILITY,
  codeDef,
  DEFAULT_RUN_LIMITS,
  resolveLimits,
} from './capabilities/code.js';
export type {
  CodeProvider,
  ExitInfo,
  RunHandle,
  RunLanguage,
  RunLimits,
  RunRequest,
} from './capabilities/code.js';
export { EDIT_CAPABILITY, editDef, type EditProvider } from './capabilities/edit.js';
export { AI_CODE_CAPABILITY, aiCodeDef, type AIProvider } from './capabilities/ai-code.js';
export { VIEWPORT_CAPABILITY, viewportDef, type ViewportProvider } from './capabilities/view.js';
export { HUMAN_ASSIST_CAPABILITY, humanDef, type HumanProvider } from './capabilities/human-assist.js';
export { EXPERIENCE_CAPABILITY, experienceDef, type ExperienceProvider } from './capabilities/experience.js';
export { SKILL_CAPTURE_CAPABILITY, skillCaptureDef, type SkillProvider } from './capabilities/skill-capture.js';
export type {
  EditFile,
  EditRequest,
  EditResponse,
  EditResult,
} from './capabilities/edit.js';
