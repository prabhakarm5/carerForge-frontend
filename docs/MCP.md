# CareerForge MCP Plan

## Decision

Do not expose the existing internal services through an open MCP endpoint. Career data, resumes, wallet state and admin operations require explicit user identity, scopes, rate limits and audit logs.

## Compatibility Gate

The backend currently uses Spring Boot 3.3.x. Current stable Spring AI MCP lines target newer supported Spring Boot versions. Upgrade and verify the application first; do not mix an incompatible MCP starter into the production API.

## Proposed Transport

- Streamable HTTP
- Dedicated `/mcp` boundary
- OAuth 2.1 resource-server authentication
- No cookie authentication
- Per-user and per-client audit identity
- Tool-specific timeout, rate limit and wallet cost

## Phase 2 Tool Catalog

| Tool | Scope | Mutates data |
|---|---|---|
| `careerforge_capabilities` | Public metadata | No |
| `list_resume_projects` | `resume:read` | No |
| `get_ats_summary` | `resume:read` | No |
| `analyze_skill_gap` | `resume:write` | Yes |
| `search_live_jobs` | `jobs:read` | No |
| `list_saved_jobs` | `jobs:read` | No |
| `save_job` | `jobs:write` | Yes |
| `get_wallet_balance` | `wallet:read` | No |

Admin tools will not be exposed in the initial MCP release.

## Delivery Sequence

1. Upgrade Spring Boot to a supported Spring AI-compatible version.
2. Add Spring AI BOM and WebMVC Streamable HTTP MCP starter.
3. Add OAuth scopes and MCP client registration.
4. Adapt existing service interfaces; do not call controllers from tools.
5. Add Redis rate limits, idempotency and wallet charging per tool.
6. Add contract, authorization and prompt-injection tests.
7. Enable with `MCP_ENABLED=true` only after deployed smoke verification.