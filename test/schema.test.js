import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Tool inputs come from an LLM: the zod schemas must reject malformed arguments
// before any native process is started (no EASYEDA_BIN is needed for these).
test('MCP tool schemas reject malformed arguments', async t => {
  const client = new Client({ name: 'schema-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('src/cli.js'), 'mcp'], stderr: 'pipe' }));
  t.after(() => client.close());
  const bad = [
    ['easyeda_artifact_check', { path: '/tmp/x', expectedSha256: 'not-a-hash' }],
    ['easyeda_invoke', { session: 's', code: 'return 1', timeoutMs: 0 }],
    ['easyeda_invoke', { session: 's', code: 'return 1', timeoutMs: 1800001 }],
    ['easyeda_invoke', { session: '', code: 'return 1' }],
    ['easyeda_close', {}],
  ];
  for (const [name, args] of bad) {
    let isError = false;
    try { isError = (await client.callTool({ name, arguments: args })).isError === true; } catch { isError = true; }
    assert.ok(isError, `${name} accepted ${JSON.stringify(args)}`);
  }
});
