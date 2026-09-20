/**
 * The `magoco.web.serve` capability definition.
 *
 * One capability, one provider (spec §6.1). The CLI resolves this and calls
 * `serve()`; it never imports packages/web directly — that keeps the server
 * swappable (spec §1.5 mechanism 1).
 *
 * The web package registers this def and provides it. This file lives in core
 * as the stable contract, because both core and web must agree on it and
 * neither may import the other's internals.
 */
import type { CapabilityDef } from './types.js';

/**
 * The instance a `magoco.web.serve` provider hands back.
 *
 * Fields are readonly on purpose: the caller gets a handle to stop a server,
 * never to reconfigure one. Reconfiguration is a profile change + reboot.
 */
export interface WebServeInstance {
  /** Bound port (after listen). Useful for port: 0 and HF-space registration. */
  readonly port: number;
  /** Start listening. Resolves when the socket is accepting. */
  listen(): Promise<void>;
  /** Stop accepting and close all sockets. Idempotent. */
  stop(): Promise<void>;
}

export interface WebServeConfig {
  /** Port to bind. 0 = ephemeral. */
  readonly port: number;
  /** Directory the UI is served from. */
  readonly staticRoot: string;
  /** Model id to route chat to. */
  readonly modelId: string;
  /** Watchdog: a session that produces nothing for this long is force-failed. */
  readonly timeoutMs?: number;
}

export const WEB_SERVE_CAPABILITY = 'magoco.web.serve';

export const webServeDef: CapabilityDef<WebServeConfig, WebServeInstance> = {
  id: WEB_SERVE_CAPABILITY,
  name: 'Web server',
  description:
    'Serve the MAGoCo browser UI and stream chat sessions to it over ' +
    'WebSocket. Binds 127.0.0.1 only.',
  version: '1.0.0',
  create: () => {
    throw new Error(
      'magoco.web.serve requires the @magoco/web package; it is created by ' +
        'the web plugin, not by the bare def',
    );
  },
};
