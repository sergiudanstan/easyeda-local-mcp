import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseNative, runNative, doctor, invoke, checkArtifact } from '../src/native.js';

test('does not confuse successful transport with native failure', () => {
  assert.throws(() => parseNative('{"ok":false,"error":{"code":"BROKEN","message":"failed"}}', '', 0), { code: 'BROKEN' });
  assert.throws(() => parseNative('{"ok":true,"value":42}', '', 5), { code: 'NATIVE_FAILURE' });
});
test('rejects missing, malformed, and unsupported envelopes', () => {
  for (const text of ['', 'passed', '{}', '[]', '{"ok":"true"}', 'null', '{"ok":true}\nnoise']) assert.throws(() => parseNative(text, '', 0));
});
test('preserves raw API value rather than claiming validation', () => {
  assert.equal(parseNative('{"ok":true,"value":false}', '', 0).value, false);
  assert.deepEqual(parseNative('{"ok":true,"value":[{"unconnected":1}]}', '', 0).value, [{ unconnected: 1 }]);
});

async function fixture(t, body) {
  const dir = await mkdtemp(join(tmpdir(), 'eda-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const binary = join(dir, 'fake-native');
  await writeFile(binary, `#!${process.execPath}\n${body}`, { mode: 0o700 });
  return { dir, binary };
}
test('real child-process exit status and failure JSON propagate', async t => {
  const f = await fixture(t, 'console.log(JSON.stringify({ok:true,value:1}));process.exitCode=5;');
  await assert.rejects(runNative(['doctor'], f), { code: 'NATIVE_FAILURE' });
});
test('disconnect is not a healthy bridge', async t => {
  const f = await fixture(t, 'console.log(JSON.stringify({ok:true,value:{connected:false}}));');
  await assert.rejects(doctor(f), { code: 'NOT_CONNECTED' });
});
test('bridge version mismatch is rejected', async t => {
  const f = await fixture(t, 'console.log(JSON.stringify({ok:true,value:{connected:true,versionMatch:false}}));');
  await assert.rejects(doctor(f), { code: 'VERSION_MISMATCH' });
});
test('timeouts are errors, never success', async t => {
  const f = await fixture(t, 'setInterval(()=>{},1000);');
  await assert.rejects(runNative(['doctor'], { ...f, timeoutMs: 100 }), { code: 'TIMEOUT_OR_SIGNAL' });
});
test('source and arguments reach executable literally without shell expansion', async t => {
  const f = await fixture(t, 'console.log(JSON.stringify({ok:true,value:process.argv.slice(2)}));');
  const code = 'return "$(echo unsafe) `backticks` $HOME";';
  const result = await invoke({ session: 'test-session', code, args: { text: '\n"$()' } }, f);
  assert.equal(result.value[result.value.indexOf('--code') + 1], code);
  assert.ok(!result.value.includes('--ext-uuid'));
  const elevated = await invoke({ session: 'test-session', code: 'return 1', externalAccess: true }, f);
  assert.deepEqual(elevated.value.slice(-2), ['--ext-uuid', 'eda']);
});
test('artifact checks reject missing, empty and wrong-hash files', async t => {
  const f = await fixture(t, '');
  const path = join(f.dir, 'export.json');
  await assert.rejects(checkArtifact(path));
  await writeFile(path, ''); await assert.rejects(checkArtifact(path), { code: 'INVALID_ARTIFACT' });
  await writeFile(path, '{}'); await assert.rejects(checkArtifact(path, '0'.repeat(64)), { code: 'HASH_MISMATCH' });
  const out = await checkArtifact(path); assert.equal(out.value.bytes, 2); assert.equal(out.value.sha256.length, 64);
});
