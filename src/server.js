import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { doctor, runNative, invoke, checkArtifact, errorEnvelope } from './native.js';

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const mutation = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };
export function createServer(options = {}) {
  const server = new McpServer({ name: 'easyeda-local-mcp', version: '0.1.0' });
  const register = (name, description, inputSchema, annotations, fn) => server.registerTool(name, { description, inputSchema, annotations }, async args => {
    try { const data = await fn(args); return { content: [{ type: 'text', text: JSON.stringify(data) }], isError: false }; }
    catch (error) { return { content: [{ type: 'text', text: JSON.stringify(errorEnvelope(error)) }], isError: true }; }
  });
  register('easyeda_doctor', 'Check the native local bridge. Disconnected or mismatched bridges are errors. Does not validate a design.', {}, readOnly, () => doctor(options));
  register('easyeda_sessions', 'List native editor sessions, including origin and project path.', {}, readOnly, () => runNative(['session', 'list'], options));
  register('easyeda_open', 'Open an existing local project or a bare editor in a new session. Keep the returned session ID.', { path: z.string().optional(), headless: z.boolean().default(false) }, mutation, args => {
    const command = ['open', '--headless', String(args.headless)]; if (args.path) command.push('--path', args.path);
    return runNative(command, options);
  });
  register('easyeda_invoke', 'Execute an async JavaScript body using the official eda API. Can modify designs. Use __CLI__.args for arguments. externalAccess=true uses the built-in eda identity with broader file/system permissions. An ok response means execution completed, NOT that returned false/undefined signifies success or that DRC passed. Inspect API-specific return values and read back changes.', {
    session: z.string().min(1), code: z.string().min(1), args: z.unknown().optional(), externalAccess: z.boolean().default(false), timeoutMs: z.number().int().min(1).max(1800000).default(60000),
  }, mutation, args => invoke(args, options));
  register('easyeda_api', 'Query the native API reference; inspect method signatures before using them.', { className: z.string().optional(), methodName: z.string().optional() }, readOnly, args => {
    const command = ['doc', 'api']; if (args.className) command.push('--class-name', args.className); if (args.methodName) command.push('--method-name', args.methodName);
    return runNative(command, options);
  });
  register('easyeda_close', 'Close a CLI-created session after explicitly saving its documents. destroy=true closes its window. May discard unsaved work.', { session: z.string().min(1), destroy: z.boolean().default(false) }, mutation, args => {
    const command = ['session', 'close', '--session', args.session]; if (args.destroy) command.push('--destroy'); return runNative(command, options);
  });
  register('easyeda_artifact_check', 'Check an exported local file exists, is nonempty, and optionally matches a SHA-256. This is not electrical or fabrication validation.', { path: z.string().min(1), expectedSha256: z.string().regex(/^[a-f0-9]{64}$/).optional() }, readOnly, args => checkArtifact(args.path, args.expectedSha256));
  return server;
}
export async function startServer(options) { await createServer(options).connect(new StdioServerTransport()); }
