/**
 * Per-file TypeScript → ESM transform for the dev loop.
 *
 * The spec (§6.2) says no bundler: the UI is loaded as ES modules directly from
 * the page. That works because we transform each `.ts` file on the fly rather
 * than bundling. `esbuild` is the only transformer that is already resolved in
 * this monorepo (a transitive dependency), so it costs the user no new
 * install. If it is ever absent we fail loudly rather than serving raw TS to
 * the browser, which would silently break the page.
 *
 * Scope (spec §9.1 line): transforms are *only* applied to requests under
 * `/src`. Everything else is served verbatim.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

type EsbuildTransform = (input: string, options: { loader: 'ts'; format: 'esm' }) => Promise<{ code: string }>;

let api: EsbuildTransform | null = null;

/**
 * Loads esbuild lazily. It is a transitive dependency in this monorepo, so we
 * resolve it by path rather than adding it to every package.json — a missing
 * transformer is a hard error, not a silent fallback.
 */
async function load(): Promise<EsbuildTransform> {
  if (api) return api;
  try {
    // `esbuild` is a direct dependency of this package (§6.2 dev transform).
    // Plain bare-specifier import so pnpm hoists it into packages/web/node_modules.
    const mod = await import('esbuild');
    const fn: EsbuildTransform = mod.transform;
    if (typeof fn !== 'function') throw new Error('esbuild.transform missing');
    api = fn;
    return fn;
  } catch {
    throw new Error('esbuild not found: the UI dev loop needs it to transform TypeScript');
  }
}

/**
 * True when a request should be transformed instead of served verbatim.
 * Only `/src/**.ts` qualifies.
 */
export function isTransformable(urlPath: string): boolean {
  // The page asks for `/src/main.js`, the source on disk is `main.ts`. Accept
  // both spellings and resolve to the `.ts` file below.
  return urlPath.startsWith('/src/') && (urlPath.endsWith('.ts') || urlPath.endsWith('.js'));
}

/**
 * Transforms one `.ts` file to ESM. Throws if the file cannot be read or
 * esbuild is unavailable — the browser would show a blank page either way, and
 * a loud error is debuggable.
 */
export async function transformFile(rootDir: string, urlPath: string): Promise<string> {
  // Page requests `/src/main.js`; the file on disk is `main.ts`.
  const tsPath = urlPath.replace(/\.js$/, '.ts');
  const file = path.resolve(rootDir, '.' + tsPath);
  const src = await fs.promises.readFile(file, 'utf8');
  const esbuild = await load();
  const out = await esbuild(src, { loader: 'ts', format: 'esm' });
  return out.code;
}
