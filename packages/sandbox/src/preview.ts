/**
 * Live Preview provider implementation.
 *
 * Serves apps with hot reload support.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type {
  PreviewConfig,
  PreviewState,
  PreviewProvider,
} from '../../core/src/capabilities/preview.js';

// ============================================================================
// SESSION STATE
// ============================================================================

let currentPreview: PreviewState | null = null;
let devServer: ChildProcess | null = null;
let usedPorts = new Set<number>();

// ============================================================================
// FIND FREE PORT
// ============================================================================

async function findFreePort(start: number): Promise<number> {
  let port = start;
  while (usedPorts.has(port)) {
    port++;
    if (port > start + 1000) {
      throw new Error('No free port found in range');
    }
  }
  usedPorts.add(port);
  return port;
}

// ============================================================================
// DETECT FRAMEWORK
// ============================================================================

function detectFramework(rootPath: string): 'vite' | 'next' | 'react' | 'node' | null {
  const packageJsonPath = path.join(rootPath, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  const scripts = packageJson.scripts || {};
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (deps.vite || scripts.dev?.includes('vite')) return 'vite';
  if (deps.next || scripts.dev?.includes('next')) return 'next';
  if (deps.react || scripts.dev?.includes('react')) return 'react';
  if (scripts.start || scripts.dev) return 'node';
  return null;
}

// ============================================================================
// PROVIDER IMPLEMENTATION
// ============================================================================

export function createPreviewProvider(): PreviewProvider {
  return {
    async start(config: PreviewConfig): Promise<PreviewState> {
      const framework = detectFramework(config.rootPath);
      if (!framework) {
        return { url: '', port: -1, status: 'error' };
      }

      const port = await findFreePort(config.port || 3000);
      currentPreview = { url: `http://localhost:${port}`, port, status: 'starting' };

      try {
        let devCommand: string;
        let devArgs: string[];

        switch (framework) {
          case 'vite':
            devCommand = 'npx';
            devArgs = ['vite', '--port', port.toString()];
            break;
          case 'next':
            devCommand = 'npx';
            devArgs = ['next', 'dev', '-p', port.toString()];
            break;
          case 'node':
            devCommand = config.rootPath;
            devArgs = [];
            break;
          default:
            devCommand = 'npx';
            devArgs = ['vite', '--port', port.toString()];
        }

        devServer = spawn(devCommand, devArgs, {
          cwd: config.rootPath,
          shell: true,
        });

        devServer.stdout?.on('data', () => {
          currentPreview = { url: `http://localhost:${port}`, port, status: 'running' };
          console.log(`✅ Preview running: ${currentPreview.url}`);
        });

        devServer.stderr?.on('data', (chunk: Buffer) => {
          const output = chunk.toString();
          if (output.includes('ready') || output.includes('Local')) {
            currentPreview = { url: `http://localhost:${port}`, port, status: 'running' };
          }
        });

        devServer.on('error', (err: Error) => {
          currentPreview = { url: '', port, status: 'error' };
          console.error('❌ Preview server error:', err.message);
        });

        return currentPreview;
      } catch (error: any) {
        currentPreview = { url: '', port, status: 'error' };
        usedPorts.delete(port);
        return currentPreview;
      }
    },

    async stop(): Promise<void> {
      if (devServer) {
        devServer.kill();
        devServer = null;
        if (currentPreview) {
          usedPorts.delete(currentPreview.port);
          currentPreview = null;
        }
        console.log('❌ Preview stopped');
      }
    },

    async getState(): Promise<PreviewState | null> {
      return currentPreview;
    },

    async reload(): Promise<void> {
      if (currentPreview?.status === 'running') {
        // Trigger file watch to force reload
        console.log('🔄 Preview reload requested');
        // In practice, this would trigger framework-specific reload
      }
    },
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/** Get preview URL for sharing */
export function getPreviewUrl(): string | null {
  return currentPreview?.url ?? null;
}
