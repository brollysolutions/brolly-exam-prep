# Codex project setup

The design tooling setup is documented in [DESIGN_TOOLING.md](DESIGN_TOOLING.md).
It adds project-local shadcn, Taste, Refactoring UI, and UX Heuristics skills plus
a themed shadcn foundation for the separate Next.js website.

## Configured integrations

- `openaiDeveloperDocs`: official read-only documentation endpoint,
  `https://developers.openai.com/mcp`. Search and page fetch verified.
- `playwright`: Microsoft's `@playwright/mcp@0.0.80`, started through `npx.cmd`
  with `--browser chrome --headless --isolated`. Uses the installed Chrome
  browser with an in-memory profile. Browser launch, navigation, and accessibility
  snapshots verified against `http://localhost:3201/tests`.
- `postgres`: local development database at `127.0.0.1:5442/tslprb`, using
  `codex_reader`. Runs through `uvx` with `postgres-mcp==0.3.0`,
  `mcp==1.30.0`, and `--access-mode=restricted`. The MCP dependency is pinned
  because MCP 2.x removed the FastMCP import required by this server version.

Server registration and generated database credentials are in the user's
`~/.codex/config.toml`, not this repository. Do not copy credentials into
project documentation, commits, or chat output. Configuration is local to this
machine; cloning the repository does not install the MCP servers elsewhere.

The database account has SELECT access to `public.tests`, `public.sections`,
and `public.questions`. It has no access to user, OTP, attempt, answer, or result
records, no table write privileges, and no schema creation privilege. Its default
transactions are read-only and its statement timeout is 10 seconds. New tables
are not granted access automatically. Application migrations remain in Alembic.

## Project skills

The following local skills are available under `.agents/skills`:

| Skill | Use |
| --- | --- |
| `react-native-testing` | Component tests; use the v14 reference for this project |
| `react-native-best-practices` | React Native performance investigations |
| `design-audit` | Requested visual and accessibility reviews |
| `grill-me` | Explicit interview to clarify a plan |
| `grilling` | Interview workflow used by `grill-me` |

These are copies of the project's existing `.claude/skills` directories,
including their supporting files. Upstream source records remain in
`skills-lock.json`. The Codex copy of `design-audit` uses supported frontmatter;
the `grill-me` entrypoint reads its sibling workflow instead of calling a
Claude-specific Skill tool. Its explicit-only invocation policy is preserved.
When updating these copies, preserve the Codex adaptations and review upstream
changes before replacing files.

Imagegen, OpenAI Docs, Plugin Creator, Skill Creator, Skill Installer, Browser,
and Codex Security were already available in the setup session and were retained.
Superpowers and unverified design skill packages were not added. Playwright MCP
was added afterward at the user's explicit request as the main browser tool.

## Verification and use

- All three configured MCP servers completed an MCP handshake and tool discovery.
- OpenAI documentation search and fetch succeeded.
- PostgreSQL schema inspection and counts succeeded; the three allowed tables
  were empty when checked. Permission checks confirmed the intended grants, and
  reading OTP data was denied.
- All five project skill entrypoints passed the Skill Creator validator and
  were discovered by Codex through its `skills/list` interface.
- The built-in Browser runtime returned no available connections. The separately
  configured Playwright MCP successfully launched Chrome, opened `/tests`, and
  verified that SI Mock Test 01 is visible while the retired PWT mocks are absent.
  The verification browser was closed afterward. `.playwright-mcp/` output is
  ignored by Git.

Project skills should be available on the next turn. Use a new Codex session if
new MCP tools are not exposed in the current session; registration alone does not
prove that tools have been loaded into an existing conversation.

Example requests: "Use $react-native-testing to check the Tests page", "Use
$grill-me to refine this feature", or "Use postgres to inspect the questions
table schema". Database access requires the project's PostgreSQL container to be
running.
