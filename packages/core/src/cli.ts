#!/usr/bin/env node
import { Runtime } from './runtime.js';

/**
 * magoco — the framework entrypoint.
 *
 *   magoco --profile web        boot the runtime with the `web` profile
 *   magoco --root ./data        use a non-default data dir
 *
 * This is the smallest possible surface to prove the core works end to end:
 * it boots, discovers plugins, lists the capabilities they provide, and
 * exits cleanly. Everything heavier (server, UI) arrives in later phases.
 */

interface CliArgs {
  profile: string;
  rootDir: string;
  exec?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { profile: 'headless', rootDir: './.magoco' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--profile' || a === '-p') out.profile = argv[++i] ?? out.profile;
    if (a === '--root' || a === '-r') out.rootDir = argv[++i] ?? out.rootDir;
    if (a === '--exec' || a === '-e') {
      const v = argv[++i];
      if (typeof v === 'string') out.exec = v;
    }
    if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function printHelp(): void {
  process.stdout.write(
    [
      'magoco — MAGoCo-Self-Evo-2 runtime',
      '',
      'USAGE:',
      '  magoco [--profile <name>] [--root <dir>] [--exec "<command>"]',
      '',
      'OPTIONS:',
      '  -p, --profile <name>   profile to boot (default: headless)',
      '  -r, --root <dir>       data root (default: ./.magoco)',
      '  -e, --exec <command>   run a command and exit. Examples:',
      '                           list                     list bound capabilities',
      '                           call <cap> <json>        invoke a capability',
      '  -h, --help             show this help',
      '',
    ].join('\n') + '\n',
  );
}

async function execCommand(rt: Runtime, cmd: string): Promise<void> {
  const parts = cmd.trim().split(/\s+/);
  const sub = parts[0];

  if (sub === 'list') {
    const rows = rt.registry.list();
    if (!rows.length) {
      process.stdout.write('no capabilities bound\n');
      return;
    }
    for (const r of rows) process.stdout.write(`${r.capability}\t<- ${r.plugin}\n`);
    return;
  }

  if (sub === 'call') {
    const cap = parts[1];
    if (!cap) throw new Error('usage: call <capability> <json-input>');
    // The input is everything after the capability name — JSON may contain spaces.
    const json = cmd.slice(cmd.indexOf(cap) + cap.length).trim();
    const input = json ? JSON.parse(json) : {};
    const result = await rt.invoke(cap, input);
    process.stdout.write(JSON.stringify(result) + '\n');
    return;
  }

  throw new Error(`unknown command: ${sub} (try: list | call <cap> <json>)`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const rt = await Runtime.boot({
    rootDir: args.rootDir,
    profile: args.profile,
  });

  process.stdout.write('\n=== MAGoCo runtime booted ===\n');
  process.stdout.write(`session:  ${rt.sessionId}\n`);
  process.stdout.write(`profile:  ${rt.profile.name}\n`);
  process.stdout.write(`plugins:  ${rt.plugins.list().join(', ') || '(none)'}\n`);
  process.stdout.write('capabilities:\n');
  for (const c of rt.registry.list()) {
    process.stdout.write(`  ${c.capability}  <- ${c.plugin}\n`);
  }

  if (args.exec) {
    await execCommand(rt, args.exec);
  }

  await rt.shutdown();
}

void main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
