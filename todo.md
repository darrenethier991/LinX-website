# LINX Services Upgrade TODO

- [x] Audit and correct public navigation so each current LINX Services subpage is reachable and visually consistent.
- [x] Redesign the existing homepage and public pages while preserving the established LINX Services visual language.
- [x] Remove non-verifiable testimonials, ratings, and activity claims from the public site rather than carrying them into the redesign.
- [x] Extend the current Cloudflare Worker data model for users, roles, subscriptions, analytics events, and AI usage.
- [x] Implement user authentication and role access for administrators and subscribed users.
- [x] Configure subscription entitlement enforcement with an administrator-approved workflow.
- [x] Extend the existing admin application for user management, subscription oversight, content controls, and analytics.
- [x] Implement Clam Code as one shared conversational UI with distinct public, subscriber, and administrator permissions and context scopes.
- [x] Add a unified JSON AI endpoint that routes public and subscriber requests to a free Worker-hosted text model and administrator requests to a Claude-capable OpenAI-compatible provider.
- [x] Add Worker bindings and secret configuration for the public model, Claude-compatible endpoint, API key, and optional model override.
- [x] Track role-safe AI usage events for administrator analytics without storing sensitive prompt content by default.
- [x] Add automated tests and locally validate the Worker API, unified AI contract, and administrator role routing.
- [ ] Apply the remote D1 migration and configure the Claude-provider secret before production deployment.
- [ ] Prepare an auditable commit for the existing LINX Services repository; do not deploy or publish without approval.
