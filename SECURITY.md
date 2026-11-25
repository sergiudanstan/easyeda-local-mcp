# Security Policy

easyeda-local-mcp is a CLI and stdio MCP server that runs the native EasyEDA Pro / JLCEDA Pro
desktop executable on the operator's machine. The MCP client (an LLM, in practice) chooses
every tool argument, so **tool inputs are untrusted**. There are no accounts, no telemetry
and no network listener: the MCP transport is stdio only.

## Supported versions

| Version | Supported |
|---|---|
| 0.2.x | Current |

Single maintainer; only the latest release receives fixes.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it privately:
**[Report a vulnerability](https://github.com/sergiudanstan/easyeda-local-mcp/security/advisories/new)**
(Security -> Advisories -> Report a vulnerability).

Use a synthetic project or the generic test fixture in the report. Never include
activation material, private boards, credentials or account data.

| Stage | Target |
|---|---|
| Acknowledgement | within 3 business days |
| Triage | within 10 business days |
| Fix, or a documented decision not to fix | within 90 days |

These are best-effort targets from a single unpaid maintainer, not a contractual SLA.
There is no bug bounty; credit is offered in the advisory and changelog.

## Scope and attack surface

- **Code execution.** `easyeda_invoke` (and `easyeda-local invoke`) sends a JavaScript body
  to the editor through the official API. That is arbitrary code in the editor and can
  modify or delete documents. The optional `externalAccess` flag adds `--ext-uuid eda`,
  which runs the script with the built-in editor identity and broader file and system
  access; it is off by default. Run only trusted code and connect only trusted MCP clients.
  A report that `easyeda_invoke` executes code is not a vulnerability; one that makes
  it run with `externalAccess` when it was not requested is.
- **Process execution.** The adapter starts the native binary named by `EASYEDA_BIN` (or
  found in standard application folders and on `PATH`) with `execFile`, no shell, so
  arguments reach it literally (the tests check shell metacharacters). Protect that
  executable and the MCP configuration: whoever controls `EASYEDA_BIN` controls what runs.
- **File system.** `easyeda_open` passes a project path to the editor, `easyeda_artifact_check`
  reads and hashes any file the client names, and the CLI `--output` option writes JSON
  evidence to a new file (it refuses to overwrite). There is no path allow-list: the
  adapter can read anything the operator can.
- **Network.** The adapter itself makes no network calls and starts no listener. Scripts
  run in the editor, and the editor itself, may access networks; this adapter is not a
  sandbox for them.
- **Data in results.** Results can contain project contents, paths and native error
  details. Treat terminal output, MCP transcripts and evidence files as private; do not
  paste raw evidence into public issues.

Timeouts cannot prove that an editor-side mutation was cancelled. Inspect state before
retrying, and save work before closing sessions. A response is not electrical verification.

In scope: shell or argument injection into the native process, `externalAccess` being
enabled without being requested, results presented as success when the native call
failed, and anything in this repository's workflows that could publish a release not built
from `main`. Out of scope: vulnerabilities in EasyEDA / JLCEDA, Node.js or the MCP SDK
(report upstream), and what a script the operator chose to run does.

## Supply chain

CI runs the test suite on Node 22 and 24 on every push and pull request, `npm audit` on the
dependencies, `pip-audit` on the hash-pinned CI toolchain, CodeQL, and `zizmor` on the
workflows. Actions are pinned to full commit SHAs and kept current by Dependabot. Releases
attach a source archive and a CycloneDX SBOM with Sigstore build provenance:

```
gh attestation verify easyeda-local-mcp-v0.2.0.tar.gz --repo sergiudanstan/easyeda-local-mcp
```
