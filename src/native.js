import { execFile } from 'node:child_process';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export class NativeError extends Error {
  constructor(code, message, details = {}) {
    super(message); this.code = code; this.details = details;
  }
}

export async function findBinary(explicit = process.env.EASYEDA_BIN) {
  if (explicit) {
    const path = resolve(explicit);
    await access(path, constants.X_OK);
    return path;
  }
  const roots = ['/Applications', `${homedir()}/Applications`];
  const candidates = roots.flatMap(root => [
    `${root}/嘉立创EDA(专业版).app/Contents/MacOS/LCEDA-Pro`,
    `${root}/JLCEDA-Pro.app/Contents/MacOS/JLCEDA-Pro`,
    `${root}/LCEDA-Pro.app/Contents/MacOS/LCEDA-Pro`,
    `${root}/EasyEDA-Pro.app/Contents/MacOS/EasyEDA-Pro`,
  ]);
  for (const dir of (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')) {
    for (const name of ['easyeda-pro', 'lceda-pro']) candidates.push(resolve(dir, name + (process.platform === 'win32' ? '.exe' : '')));
  }
  for (const path of candidates) {
    try { await access(path, constants.X_OK); return path; } catch {}
  }
  throw new NativeError('BINARY_NOT_FOUND', 'Set EASYEDA_BIN to the EasyEDA Pro or JLCEDA Pro v4.1.60+ executable.');
}

export function parseNative(stdout, stderr, exitCode) {
  let response;
  try { response = JSON.parse(stdout.trim()); }
  catch { throw new NativeError('INVALID_JSON', 'Native command did not return a single JSON response.', { exitCode, stdout, stderr }); }
  if (!response || typeof response !== 'object' || Array.isArray(response) || typeof response.ok !== 'boolean') {
    throw new NativeError('INVALID_ENVELOPE', 'Native response is missing a boolean ok field.', { exitCode, response, stderr });
  }
  if (exitCode !== 0 || response.ok !== true) {
    throw new NativeError(response.error?.code || 'NATIVE_FAILURE', response.error?.message || `Native command failed (exit ${exitCode}).`, { exitCode, response, stderr });
  }
  return { ...response, nativeExitCode: exitCode, ...(stderr.trim() ? { nativeStderr: stderr } : {}) };
}

export async function runNative(args, { binary, timeoutMs = 65000 } = {}) {
  const executable = await findBinary(binary);
  return new Promise((resolveResult, reject) => {
    execFile(executable, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) return reject(new NativeError('TIMEOUT_OR_SIGNAL', 'Native process was interrupted. Any editor-side mutation may still have occurred; inspect before retrying.', { signal: error.signal, stderr }));
      if (error && typeof error.code !== 'number') return reject(new NativeError('PROCESS_ERROR', error.message, { stderr }));
      try { resolveResult(parseNative(stdout, stderr, error ? error.code : 0)); } catch (e) { reject(e); }
    });
  });
}

export async function doctor(options) {
  const result = await runNative(['doctor'], options);
  const v = result.value;
  if (!v || typeof v.connected !== 'boolean') throw new NativeError('INVALID_DOCTOR', 'Doctor response lacks a boolean connected field.', { response: result });
  if (!v.connected) throw new NativeError('NOT_CONNECTED', 'Native bridge is not connected. Launch the desktop editor, then retry.', { response: result });
  if (v.versionMatch === false) throw new NativeError('VERSION_MISMATCH', 'Native CLI and running bridge versions differ.', { response: result });
  if (v.versionMatch !== true || typeof v.bridgeVersion !== 'string' || !v.bridgeVersion) throw new NativeError('INCOMPLETE_IDENTITY', 'Bridge identity or version match is unverified.', { response: result });
  return result;
}

export async function invoke({ session, code, args = {}, externalAccess = false, timeoutMs = 60000 }, options = {}) {
  if (!session || typeof session !== 'string' || !code || typeof code !== 'string') throw new NativeError('INVALID_ARGUMENT', 'session and code must be nonempty strings.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1800000) throw new NativeError('INVALID_ARGUMENT', 'timeoutMs must be an integer from 1 to 1800000.');
  const command = ['invoke', '--session', session, '--code', code, '--args', JSON.stringify(args), '--timeout', String(timeoutMs)];
  if (externalAccess) command.push('--ext-uuid', 'eda');
  return runNative(command, { ...options, timeoutMs: timeoutMs + 5000 });
}

export async function checkArtifact(path, expectedSha256) {
  const file = resolve(path);
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new NativeError('INVALID_ARTIFACT', 'Artifact must be a nonempty regular file.');
  const sha256 = createHash('sha256').update(await readFile(file)).digest('hex');
  if (expectedSha256 && sha256 !== expectedSha256) throw new NativeError('HASH_MISMATCH', 'Artifact hash does not match the expected value.', { sha256 });
  return { ok: true, value: { path: file, bytes: info.size, sha256, modifiedAt: info.mtime.toISOString(), scope: 'File presence and bytes only; no design correctness claim.' } };
}

export function errorEnvelope(error) {
  return { ok: false, error: { code: error.code || 'ERROR', message: error.message, ...(error.details ? { details: error.details } : {}) } };
}
