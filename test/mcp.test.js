import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP handshake, tool discovery, and native known-failure propagation', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'eda-mcp-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const fake = join(dir, 'fake-native');
  await writeFile(fake, `#!${process.execPath}\nconsole.log(JSON.stringify({ok:false,error:{code:'EXPECTED_FAILURE',message:'injected'}}));`, { mode: 0o700 });
  const client = new Client({ name: 'generic-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('src/cli.js'), 'mcp', '--binary', fake], stderr: 'pipe' });
  await client.connect(transport); t.after(() => client.close());
  const list = await client.listTools();
  assert.equal(list.tools.length, 7);
  const result = await client.callTool({ name: 'easyeda_doctor', arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(JSON.parse(result.content[0].text).error.code, 'EXPECTED_FAILURE');
  const invocation = await client.callTool({ name: 'easyeda_invoke', arguments: { session: 'test', code: 'return 1' } });
  assert.equal(invocation.isError, true);
});
