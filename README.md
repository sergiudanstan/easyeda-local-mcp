# easyeda-local-mcp

A small, MIT-licensed CLI and stdio MCP adapter for the **native EasyEDA Pro / JLCEDA Pro v4.1.60+ desktop CLI**. It calls the official editor API through the installed application. No browser automation, extension installation, background HTTP server, or cloud relay is required.

This is an independent adapter, not an EasyEDA product. EasyEDA's native CLI already includes its own MCP server (`--mcp stdio`). Use that directly if you prefer. This adapter adds a consistent seven-tool interface, shell-free invocation, connection checks, explicit native exit-code checks, and file evidence checks.

## Install

Install an official desktop release with native CLI support, then install Node.js 22 or newer.

```sh
npm ci
npm link
```

Set `EASYEDA_BIN` to the executable inside the application. For example, on macOS:

```sh
export EASYEDA_BIN='/Applications/嘉立创EDA(专业版).app/Contents/MacOS/LCEDA-Pro'
easyeda-local doctor
easyeda-local sessions
```

The executable name depends on the edition. macOS application bundles and executables on `PATH` are detected automatically, but an explicit path is recommended if several versions are installed. Windows/Linux users can also set `EASYEDA_BIN` to their native executable. Do not point it at a shortcut or a shell command. Version 3 does not implement this protocol.

## CLI

```sh
easyeda-local open
easyeda-local api --class SYS_Environment
easyeda-local invoke --session SESSION_ID --file examples/environment.js
easyeda-local invoke --session SESSION_ID --file examples/project-info.js
easyeda-local artifact --path ./exported-file.json
```

Run `easyeda-local --help` for all options. `invoke` accepts `--args '{"key":"value"}'`, available as `__CLI__.args` inside the editor. `--output ./evidence.json` saves the successful envelope to a new file without overwriting existing evidence. Failures print JSON to stderr and exit nonzero.

`--external-access` deliberately adds `--ext-uuid eda`, which runs with the built-in editor identity and broader file/system access. Enable it only for trusted scripts that require it. It is off by default.

Save and verify documents before using `close --session SESSION_ID --destroy`.

## MCP configuration

Use absolute paths in your MCP client configuration:

```json
{
  "mcpServers": {
    "easyeda-local": {
      "command": "node",
      "args": ["/path/to/easyeda-local-mcp/src/cli.js", "mcp"],
      "env": { "EASYEDA_BIN": "/path/to/native-editor-executable" }
    }
  }
}
```

| Tool | Purpose |
| --- | --- |
| `easyeda_doctor` | Require a connected native bridge; reject version mismatch |
| `easyeda_sessions` | List editor sessions and project paths |
| `easyeda_open` | Open a local project or bare editor |
| `easyeda_invoke` | Execute an async JavaScript body through the official API |
| `easyeda_api` | Query native class/method documentation |
| `easyeda_close` | Close a saved CLI session |
| `easyeda_artifact_check` | Check nonempty file presence, size, and SHA-256 |

The MCP server uses stdio only. It does not open a network listener. Native failures return `isError: true` to the MCP client.

## Verification boundaries

An `ok: true` envelope means the native invocation completed. A method may still return `false`, `null`, missing data, or findings. Inspect API-specific values and read back mutations. The adapter preserves these values and does **not** turn execution success into a design-pass claim.

For electrical/design checks, retain fresh native reports, all relevant finding categories, enabled/disabled rules, document identity, tool version, and file hashes. An empty array alone is insufficient to establish complete coverage. Run meaningful known-failure probes in disposable project copies before trusting a new validation integration. File hashes establish identity, not correctness. No simulation, manufacturing, or physical validation is supplied by this adapter.

```sh
npm test
# Against a live disposable/bare editor session, expect a nonzero exit:
easyeda-local invoke --session SESSION_ID --file examples/known-failure.js
```

Automated tests cover malformed/missing output, nonzero native exit codes, disconnected bridges, version mismatches, timeouts, shell-literal arguments, artifact failures, and a real MCP stdio handshake with failure propagation. These use a synthetic executable and do not replace testing against your installed editor.

## References

- [Official native CLI documentation](https://prodocs.easyeda.com/en/api/guide/cli.html)
- [Official extension API reference](https://prodocs.easyeda.com/en/api/reference/pro-api.html)
- [Official EasyEDA downloads](https://easyeda.com/page/download)
- [Official JLCEDA downloads](https://lceda.cn/page/download)

This repository contains generic examples only. It does not include design files, activation data, credentials, or private runtime evidence.
