# LINX Incident Recovery Status — 25 August 2026

**Prepared by:** Manus AI  
**Scope:** Recovery of the LINX Services Cloudflare Pages and Worker production system after repository-root artifacts were published through unintended Pages Git deployments.

## Current production status

The public LINX site has been **safely restored**. `linxservices.ca`, the `www` route, the required public styles/scripts/assets, and the public Worker health endpoint were verified after a controlled static release. The confirmed sensitive paths remain blocked at the Cloudflare edge with HTTP `403`, including the legacy environment path, Worker configuration, package manifests, legacy server source, and workflow source.

| Control | Verified status | Evidence |
|---|---|---|
| Cloudflare Pages automatic Git deployments | **Disabled** for both production and previews | Project source configuration now has `deployments_enabled: false`, `production_deployments_enabled: false`, and `preview_deployment_setting: none`. |
| Public Pages release path | **Manual-only** allowlisted artifact | GitHub Actions run `32815146637` deployed commit `1219924` as an ad-hoc Pages deployment. |
| Repository-source exposure | **Contained** | The Pages default domain serves public-page fallback content rather than the former file contents, while the custom domain denies confirmed sensitive paths at the edge. |
| Public site | **Online** | Homepage, public assets, the administrator sign-in page, white-label route, and `www` route returned successful responses after recovery. |
| LINX API Worker | **Online** | `GET https://api.linxservices.ca/health` returned HTTP `200` after the Worker security release. |
| Signup communications | **Still disabled** | The deployed non-secret automation switch remains `false`; no Twilio, email, Sheets, or notification action was enabled or tested. |

> The emergency rule is now a **narrow deny rule**, not a site-wide outage rule. It continues to block only the confirmed sensitive repository/configuration paths while leaving required public pages online.

## Recovery actions completed

The immediate cause was Cloudflare Pages Git integration deploying the repository root for `main` and Dependabot branches. This bypassed the existing manual Pages workflow. The project was first taken offline at the edge, then the Git deployment switches were disabled while keeping the Pages project, domains, Worker, D1 database, KV namespace, DNS, and deployment history intact.

The manual Pages workflow was redesigned from a denylist copy to a strict **allowlist**. It copies only intended public HTML, public client assets, approved static directories, and the static administrator pages. It does not copy Worker code, configuration files, package manifests, environment files, dependency trees, source-only administrator files, documentation, or GitHub workflow files. The local artifact verification found 41 intended static files and no Worker, Git, workflow, or dependency-tree directories.

| Change | Commit / release | Validation |
|---|---|---|
| Disable automatic Pages production and preview deployments | Cloudflare Pages project configuration | Confirmed after later Git pushes; no new Git-triggered Pages deployment appeared. |
| Enforce allowlisted Pages artifact | `1219924` — `Harden Pages artifact allowlist` | Worker test suite passed; manual Pages run `32815146637` completed successfully. |
| Restore public site while preserving source-path blocks | Cloudflare emergency ruleset | Public routes returned `200`; all eight confirmed sensitive paths returned `403`. |
| Close subscriber access to operational lead records | `d61643c` — `Restrict lead operations to administrators` | New test proves subscribers are rejected before database access; direct authenticated Worker release succeeded. |
| Separate Pages and Worker deployment credentials | `ce504f4` — `Separate Worker deployment credential` | Manual Worker workflow now references a dedicated `CLOUDFLARE_WORKER_API_TOKEN` secret rather than the working Pages token. |

## Security audit findings

The active Worker router, reviewed privileged endpoints, static deployment workflow, manual Worker workflow, Cloudflare edge controls, and legacy administrator server were inspected without reading environment-file contents or secret values.

| Finding | Severity | Status | Notes |
|---|---:|---|---|
| Pages Git integration deployed repository root automatically | Critical | **Fixed** | Production and preview Git deployment switches are disabled; releases are now manual and artifact-only. |
| Sensitive source/configuration artifacts had been publicly reachable | Critical | **Contained** | Safe artifact excludes them and Cloudflare retains explicit edge blocks. Credential rotation remains required. |
| Authenticated subscriber tokens could access individual lead routes | High | **Fixed and released** | Single-lead read/update/delete and legacy ingest/crawler-run routes now require the administrator role. Regression suite: **39 passing tests**. |
| GitHub Worker deployment credential lacks Worker-script authorization | High operational | **Open** | The new workflow is manual-only, but its previous generic token failed Cloudflare authentication for Worker script deployment. A direct authenticated recovery release was used instead. |
| Legacy administrator server and tracked dependency trees remain in repository | Medium | **Open** | The legacy server is not included in the public Pages artifact. Its `admin/node_modules` tree contains 8,235 tracked files and the root tree contains 1,596. The legacy dependency audit previously found seven advisories. |
| Public AI and passive-observation endpoints have no application-level abuse rate limiter in the reviewed Worker | Medium | **Open** | Existing validation and scope restrictions remain, but an edge rate-limit policy should be designed before higher traffic or adversarial use. |
| Maintained Worker/admin/workflow source scan | Informational | **No active backdoor found in reviewed scope** | No dynamic execution primitive was found in maintained source outside dependency/build output; no hardcoded credential-assignment finding was identified outside tests/dependencies. This is not a claim that the entire historical repository is free of risk. |

## Credential remediation required

No secret values were opened, printed, copied, or transmitted. The legacy tracked environment file is still present in Git history and working source, so secure rotation remains the principal remaining containment task. Rotate values through the relevant provider dashboards or secure secret stores—not through chat, source code, issues, or commits.

| Priority | Credential category | Required action |
|---:|---|---|
| 1 | Legacy administrator login and JWT material | Rotate the legacy administrator password/hash and JWT secret. If the live Worker shares either value, rotate the Worker counterpart at the same time and expect existing sessions to be invalidated. |
| 1 | Google service-account material | Revoke and replace the legacy service-account key/private-key material; update only secure production secret storage. |
| 1 | Legacy LINX API, SMTP, and webhook credentials | Rotate the legacy API key, SMTP credentials, and webhook endpoint/secrets. Keep mail and SMS delivery disabled unless separately approved and verified. |
| 2 | Current Worker secrets | Verify secure values independently for administrator auth, Google integration, JWT, OpenRouter, Stripe, GitHub repository access, Supabase, and Twilio. Rotate any value that was reused in the exposed legacy file. |
| 3 | GitHub OAuth | No conventional GitHub OAuth client-ID or client-secret variable name was present in the legacy variable-name inventory. Rotation is not indicated by that finding alone, unless a credential was stored under an unusual name. |

After rotation is confirmed, remove `admin/.env` from the tracked repository using a targeted removal, then sanitize or retire the legacy example/configuration surface. Do **not** rewrite Git history during incident response without a separate explicit decision: rotation and repository removal provide immediate risk reduction, while history rewriting is disruptive and needs a dedicated migration plan.

## Required GitHub Actions follow-up

The Pages credential remains successful for Pages deployments. The Worker workflow now intentionally expects a different GitHub Actions secret named **`CLOUDFLARE_WORKER_API_TOKEN`**. GitHub secret-list access was not available to the current GitHub integration, so its configured state could not be confirmed.

Create or update that secret directly in the repository’s Actions secrets settings. Use an account-scoped Cloudflare token with **Workers Scripts: Edit**. Because the Worker configuration manages an existing zone route, include **Workers Routes: Edit** for `linxservices.ca`; add only a binding-specific scope if a subsequent manual run returns a specific Cloudflare authorization error. Do not replace the working Pages token with this Worker token.

After the secret is saved, manually run **Deploy LINX API Worker** from the Actions page. The workflow is intentionally `workflow_dispatch` only, checks out `main`, has `contents: read` permission, and performs no Pages deployment.

## Recommended next remediation sequence

1. Rotate the legacy credentials through secure provider dashboards and confirm only that rotation is complete.
2. Add `CLOUDFLARE_WORKER_API_TOKEN` as a repository Actions secret, then run the manual Worker workflow once to validate the durable release path.
3. Remove the tracked legacy environment file and retire or sanitize the legacy example file after rotation.
4. On a dedicated review branch, remove tracked `node_modules` trees, retain lockfiles, and address the legacy administrator dependency advisories. Do not merge Dependabot updates automatically.
5. Design Cloudflare edge rate limits for public AI, prompt-enhancement, passive-observation, early-access, and public lead-submission endpoints without weakening intended public access.
6. Continue the bounded audit of legacy code and account controls before claiming a complete security certification.

## References

[1]: https://developers.cloudflare.com/pages/configuration/git-integration/ "Cloudflare Pages Git integration"
[2]: https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/ "Cloudflare Workers multipart upload metadata"
[3]: https://github.com/darrenethier991/LinX-website/actions/runs/32815146637 "Successful controlled LINX Pages artifact release"
[4]: https://github.com/darrenethier991/LinX-website/actions/runs/32815733811 "Failed GitHub Actions Worker release caused by missing Worker Scripts permission"
