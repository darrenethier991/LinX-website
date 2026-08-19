# LINX Services Worker

The `linx-api` Cloudflare Worker provides the role-aware JSON interface used by the shared **Clam Code** UI.

| Audience | Route | Provider selection | Credential requirement |
| --- | --- | --- | --- |
| Public | `POST /api/clam-code/chat` | Cloudflare Workers AI using `PUBLIC_AI_MODEL` | The `AI` Worker binding |
| Administrator | `POST /api/clam-code/chat` with an administrator bearer token | OpenAI-compatible Claude provider using `CLAUDE_MODEL` | `CLAUDE_API_KEY`, or the pre-existing `OPENROUTER_API_KEY` fallback |
| Administrator | `GET /api/admin/analytics` | D1 aggregation only | Administrator bearer token |

The request body is `{"messages":[{"role":"user","content":"..."}]}`. The Worker selects the provider from the verified role and always returns the same JSON envelope. Prompt content is not recorded in D1; only privacy-safe operational counts and provider usage metadata are retained.

## Required secrets

Set the existing authentication secrets before deploying the Worker, then set an administrator model credential. The code first uses `CLAUDE_API_KEY` and falls back to the existing `OPENROUTER_API_KEY` binding. Keep the key out of `wrangler.jsonc` and browser code.

```bash
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put JWT_SECRET
npx wrangler secret put CLAUDE_API_KEY
```

Apply database migrations before a deployment that enables usage analytics:

```bash
npx wrangler d1 migrations apply linx-db-staging --remote
npm run test:worker
```

No deployment command is run automatically by this repository change.
