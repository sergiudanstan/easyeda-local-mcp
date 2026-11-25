# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-25

First tagged release (the version in `package.json` was 0.1.0 before this). A CLI and
stdio MCP adapter for the native EasyEDA Pro / JLCEDA Pro v4.1.60+ desktop CLI with seven
tools: doctor, sessions, open, invoke, api, close and artifact check.

### Added
- Schema test: malformed MCP tool arguments are rejected (`test/schema.test.js`).
- CI (tests on Node 22 and 24, `npm audit`, `pip-audit` of the CI toolchain, `zizmor`),
  CodeQL, OpenSSF Scorecard and a tag-triggered release workflow with an SBOM and build
  provenance; Dependabot for actions and npm. The former `test.yml` is folded into `ci.yml`.
- Private vulnerability reporting, scope and supply-chain sections in `SECURITY.md`;
  `CONTRIBUTING.md` and this changelog.

### Changed
- `zod` ^3.25.0 -> ^4.6.7 (3.x is flagged by `npm audit`; the full suite passes unchanged).
- Locked dependencies updated to clear all `npm audit` advisories.

[Unreleased]: https://github.com/sergiudanstan/easyeda-local-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/sergiudanstan/easyeda-local-mcp/releases/tag/v0.2.0
