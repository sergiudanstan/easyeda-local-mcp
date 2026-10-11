# Local access and privacy

The adapter executes the native binary configured by the local operator. Protect that executable and the MCP configuration. `easyeda_invoke` can modify editor documents. Its optional `externalAccess` flag grants the script the native built-in editor identity. Run only trusted code and connect only trusted MCP clients.

This adapter does not install extensions, change editor permissions, access accounts, upload projects, or start an HTTP listener. Scripts invoked by an operator and the editor itself may access networks; this adapter is not a sandbox for those scripts.

Results can contain project contents, paths, and native error details. Treat terminal output, MCP transcripts, and evidence files as private. Do not paste raw evidence into public issues. The package does not collect telemetry.

Timeouts cannot prove that an editor-side mutation was cancelled. Inspect state before retrying. Save work before closing sessions. A response is not electrical verification.

Report a reproducible problem with a synthetic project or the generic test fixture. Never include activation material, private boards, credentials, or account data.
