#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { doctor, runNative, invoke, checkArtifact, errorEnvelope } from './native.js';

const help = `easyeda-local — local native EasyEDA/JLCEDA v4 adapter

Commands:
  doctor                         Require a connected native bridge
  sessions                       List editor sessions
  open [--path FILE] [--headless]  Open project or bare editor
  invoke --session ID --file JS   Run an async JS body (or --code TEXT)
         [--args JSON] [--external-access] [--timeout MS]
  api [--class NAME] [--method NAME]
  close --session ID [--destroy]  Save documents BEFORE closing
  artifact --path FILE [--sha256 HASH]
  mcp                            Start stdio MCP server

Global: --binary PATH or EASYEDA_BIN; --output FILE stores JSON evidence.
Execution success is NOT a DRC, functional, or manufacturing result.
`;

try {
  const { positionals, values: v } = parseArgs({ allowPositionals: true, options: {
    help: { type: 'boolean' }, binary: { type: 'string' }, path: { type: 'string' }, headless: { type: 'boolean' }, session: { type: 'string' }, file: { type: 'string' }, code: { type: 'string' }, args: { type: 'string' }, 'external-access': { type: 'boolean' }, timeout: { type: 'string' }, class: { type: 'string' }, method: { type: 'string' }, destroy: { type: 'boolean' }, sha256: { type: 'string' }, output: { type: 'string' },
  } });
  const [command] = positionals;
  if (v.help || !command) { console.log(help); process.exit(0); }
  if (positionals.length !== 1) throw new Error('Unexpected positional arguments.');
  const options = { binary: v.binary };
  let result;
  switch (command) {
    case 'mcp': { const { startServer } = await import('./server.js'); await startServer(options); break; }
    case 'doctor': result = await doctor(options); break;
    case 'sessions': result = await runNative(['session', 'list'], options); break;
    case 'open': result = await runNative(['open', '--headless', String(!!v.headless), ...(v.path ? ['--path', v.path] : [])], options); break;
    case 'invoke':
      if (!!v.file === !!v.code) throw new Error('Provide exactly one of --file and --code.');
      result = await invoke({ session: v.session, code: v.file ? await readFile(v.file, 'utf8') : v.code, args: v.args ? JSON.parse(v.args) : {}, externalAccess: !!v['external-access'], timeoutMs: v.timeout ? Number(v.timeout) : 60000 }, options); break;
    case 'api': result = await runNative(['doc', 'api', ...(v.class ? ['--class-name', v.class] : []), ...(v.method ? ['--method-name', v.method] : [])], options); break;
    case 'close':
      if (!v.session) throw new Error('--session is required.');
      result = await runNative(['session', 'close', '--session', v.session, ...(v.destroy ? ['--destroy'] : [])], options); break;
    case 'artifact':
      if (!v.path) throw new Error('--path is required.');
      result = await checkArtifact(v.path, v.sha256); break;
    default: throw new Error(`Unknown command: ${command}`);
  }
  if (result) {
    const json = JSON.stringify(result, null, 2) + '\n';
    if (v.output) await writeFile(v.output, json, { flag: 'wx', mode: 0o600 });
    process.stdout.write(json);
  }
} catch (error) {
  process.stderr.write(JSON.stringify(errorEnvelope(error), null, 2) + '\n'); process.exitCode = 1;
}
