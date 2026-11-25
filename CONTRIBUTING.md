# Contributing

Contributions are welcome. This is a single-maintainer project, so please open an issue
before starting anything substantial.

**Security problems do not belong in issues.** Follow [SECURITY.md](SECURITY.md).

## Branches, pull requests and releases

- `main` is the only long-lived branch and is protected: changes land through a pull
  request with the required checks green, commits on `main` are signed, and force-pushes
  are refused. Pull requests are squash-merged; GitHub deletes the branch on merge.
- Branch names: `<type>/<topic>` (`feat/`, `fix/`, `docs/`, `chore/`, `release/`);
  agents use `agent/<name>/<topic>`.
- A release is a pull request that bumps `version` in `package.json` (the single version
  source; also update the string in `src/server.js`) and moves `[Unreleased]` in
  [CHANGELOG.md](CHANGELOG.md) to a dated version. After it merges, a signed `vX.Y.Z` tag
  on that commit triggers `release.yml`, which refuses to run if the tag, `package.json`
  and the changelog disagree. Tags are never moved or deleted.

## Running it locally

```bash
npm ci
npm test                       # node --test; needs Node.js 22 or newer
node src/cli.js --help
node src/cli.js mcp            # stdio MCP server
```

The tests use a synthetic executable in place of the native editor, so they run anywhere
and do **not** need EasyEDA / JLCEDA installed. They do not replace testing against your
installed editor (set `EASYEDA_BIN`, run `easyeda-local doctor`).

Keep the adapter honest: never turn "the native call completed" into "the design passed",
and keep failures as errors (`isError: true`, nonzero exit). A new tool needs a test that
shows a native failure propagating.
