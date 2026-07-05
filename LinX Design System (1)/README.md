# LinX Design System

**LinX — Canada's Contractor Network** (`linxservices.ca`, est. 2026, sole proprietor **Darren Ethier**).

LinX is a two-sided marketplace that connects Canadian **homeowners** with verified local **contractors** — plumbers, electricians, roofers, landscapers, HVAC techs, painters and more. Homeowners post projects for free and receive transparent quotes; contractors subscribe for qualified leads plus a suite of business tools:

- **Lead matching** — algorithmic matching of homeowners to available, qualified local trades.
- **CRM pipeline** — contractors track leads from first contact to closed job.
- **URL shortener** — branded short links with click / geo / device analytics.
- **EchoForge** — a built-in automation marketplace where contractors buy, remix, and sell workflow automations.
- **LinX Echo** — the internal AI gateway (Cloudflare Worker) powering agent orchestration, SMS, and encrypted logging.

The brand voice is confident and calm: *"Quiet automation for busy teams."* / *"Linking People Together."*

> ⚠️ **Two distinct surfaces, two themes.** The **public/marketing brand** is luxe **gold-on-black**. The internal **LinX Admin** tool is a separate utilitarian **slate + sky** theme. Don't mix them — use gold for anything customer-facing, slate/sky only for internal tooling. A third early concept, **"FileLinx"** (a blue, light-mode file-sharing landing page), exists in the source but is **legacy/placeholder** and is *not* part of this system.

---

## Sources

This system was reverse-engineered from the founder's working repositories and local codebases. You may not have access, but they are recorded here so you (or the reader) can dig deeper:

**GitHub**
- https://github.com/darrenethier991/LinX-site
- https://github.com/darrenethier991/LinX-website
- https://github.com/darrenethier991/linx-echo
- https://github.com/darrenethier991/linx-orchestrator-hub
- https://github.com/darrenethier991/LinX

Explore these repos to build higher-fidelity LinX designs than this system alone captures.

**Local codebases explored** (mounted read-only)
- `linx-website/index.html` — **the flagship marketing site** (gold-on-black). Primary source of truth for the brand.
- `linx-website/admin/` — React/Vite/Tailwind **LinX Admin** dashboard (slate/sky). Source for the admin theme + UI kit.
- `linx/` — the LinX monorepo: CRM, Marketplace, TrustCenter, EchoForge, TelecomRoutingLogic, agent framework, and more.
- `linx-echo/` — LinX Echo AI gateway (`READ.md.txt`, Cloudflare Worker).
- `filelinx-website/` — legacy "FileLinx" file-sharing concept (blue, light) — **not** used here.

**Uploads**
- `assets/linx-promo.mp4` — founder's brand/promo clip (copied from `uploads/`).

---

## Content Fundamentals

How LinX writes. Match this voice in any copy you generate.

- **Tone:** confident, plain-spoken, reassuring. It sells *calm* and *trust*, not hype. Signature lines: *"Quiet automation for busy teams."*, *"SMS, CRM, and AI agents that just work."*, *"Linking People Together."*
- **Person:** speaks to **"you"** (the homeowner or contractor); the company is **"LinX"** or **"we"**. Benefit-led and direct: *"Stop chasing leads."*, *"Stop scrolling through sketchy listings."*
- **Casing:** Sentence case for headings and body. **UPPERCASE** is reserved for typographic accents — eyebrows, nav, buttons, badges, stat labels — never for full sentences.
- **Numbers & proof:** concrete and Canadian. Real cities (Toronto, Barrie, Calgary, Ottawa, Vancouver, Edmonton), **CAD** budgets, star ratings (`4.9 ★`), and plain stats (`1,400+ Contractors`, `97% Match Rate`). Prices shown as `$29`/mo with a gold `$`.
- **Trades vocabulary:** name the trades explicitly (plumbers, electricians, roofers, landscapers, HVAC, painters, flooring). "Verified", "qualified", "transparent", "no bidding wars" are recurring trust words.
- **Punctuation:** em-dashes and mid-dots (`·`) for meta lines (`Toronto, ON · CAD $22k–$30k · 2h ago`). Sparing exclamation, mostly in confirmations (*"✓ Message sent!"*).
- **Emoji:** used deliberately as **trade/activity icons** (🏠 ⚡ 🔧 🚿 🌳 🏗️ 🏡 🔨) and role markers (🏡 Homeowner / 🔨 Contractor) — not as decoration in prose. `✓` for feature lists, `★` for ratings.

---

## Visual Foundations

The LinX look is **luxe, nocturnal, and gold-accented** — closer to a private-members brand than a typical SaaS site.

- **Palette:** true black `#000` foundation, near-black raised surfaces (`#050506`) and cards (`#0B0B0D`), hairline borders (`#1E1E22`). A single warm **metallic gold** accent `#DFB24E` (highlight `#F6DE8B`, shadow `#9C6F27`) carries all emphasis. The logo and foil-stamped headings use the **`--linx-gold-foil`** chromed-gold gradient (dark→bright→dark) via `background-clip:text`, mirroring the business-card logo. Text is off-white `#F5F5F5` on muted grey `#A7A7A7`. Status: green `#22C55E`, red `#EF4444`, blue `#3B82F6` — always shown as **12%-tinted pills**, never solid blocks.
- **Type:** **Inter** exclusively for UI, 300–900 (headings tight & heavy, 800–900; the signature is UPPERCASE with wide letter-spacing on labels). The **business card** additionally sets the personal name & tagline in an elegant **serif italic** — if you need that formal-engraved feel for a name/tagline, use a serif such as *Playfair Display* italic; treat it as a card/print accent, not a UI face. See `guidelines/type-*`.
- **Backgrounds:** a **woven carbon-fiber** texture (dark twill weave, `--linx-carbon`) with a soft **gold sheen vignette** at the top (`--linx-carbon-sheen`) — matching the LinX business card. Apply the weave as `background: var(--linx-carbon); background-size: var(--linx-carbon-size)`, then layer the sheen over hero sections. No photography, no illustration, no busy gradients — the drama comes from the carbon weave + a little gold glow.
- **Buttons:** always **pill** (`999px`), uppercase, letter-spaced. Primary = solid gold. The signature secondary is **black with a gold outline that fills solid gold on hover**. Neutral outline warms to gold text/border on hover.
- **Cards:** dark fill, **1px hairline border, 14px radius, no drop shadow** — on black, borders do the work. Interactive cards **warm their border to gold and lift −2px** on hover. Shadows appear only on the admin theme and floating toasts.
- **Radii:** `8px` inputs · `12px` inner/live cards · `14px` primary cards · `999px` every pill · `50%` step rings & dots.
- **Spacing:** sections breathe at **72px** vertical; content maxes at **1040px** with 6% side padding.
- **Motion:** understated. Fades/slide-ups on entrance, `cubic-bezier(0.16,1,0.3,1)` ease, ~180–300ms. A rotating "LIVE" badge in the feed and animated stat counters. Hover = colour/border change + small lift; press inverts fill. No bounces, no parallax.
- **Details:** a custom **gold cursor ring**, a pulsing green **"LIVE" dot**, gold `✓` bullets, gold `★` ratings, `+`→`×` rotating FAQ toggles.

### Admin theme (internal only)
Slate `#020617` / `#0F172A` surfaces, **sky-400 `#38BDF8`** accent, emerald/rose status, Tailwind-style `rounded-xl` cards **with** soft shadows. Functional and dense — the visual opposite of the gold brand. See `guidelines/color-admin.html` and `ui_kits/admin/`.

---

## Iconography

LinX has **no custom icon set**. Its icon language is **native emoji**, used semantically:

- **Trades & project activity:** 🏠 ⚡ 🔧 🚿 🌳 🏗️ 🏡 🔨 — one per project/trade in feeds and cards.
- **Roles:** 🏡 Homeowner · 🔨 Contractor (segmented toggles, contact form).
- **Unicode glyphs as UI marks:** `✓` (gold) for feature-list bullets, `★` for ratings, `+`/`×` for accordion toggles, `·` for meta separators, `$` (gold) before prices.
- **Admin** uses a simple **`LX` monogram** tile (sky on slate) as its app mark.

When you need a logo, use the wordmark assets rather than drawing one. If a design genuinely needs line icons beyond emoji, reach for a thin, minimal set (e.g. Lucide) in gold/white — but prefer emoji to stay on-brand. **Do not** invent bespoke SVG icons.

**Brand assets** (`assets/`)
- `linx-wordmark.svg` — primary wordmark in the **metallic-foil gold gradient**.
- `linx-wordmark-gold.svg` — all-gold wordmark (footer / mono contexts).
- `linx-mark.svg` — `LX` monogram in a gold-outlined tile.
- `linx-promo.mp4` — founder promo clip.

---

## Index / Manifest

**Root**
- `styles.css` — the single entry point consumers link (`@import` manifest only).
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`.
- `README.md` — this guide. · `SKILL.md` — Agent-Skill wrapper.

**Foundations** (`guidelines/`, shown on the Design System tab)
- Colors: Brand Gold · Neutrals · Semantic Status · Admin Theme
- Type: Display & Headings · Body & Meta · Labels & Tracking · Weight Scale
- Spacing: Spacing Scale · Radius
- Brand: Logo Lockups · Backdrop · Card Anatomy · States & Motion · Iconography

**Components** (`components/<group>/`) — React primitives, `window.LinXDesignSystem_1b8a1a`
- `actions/` — **Button**, **Toggle**
- `display/` — **Badge**, **SectionLabel**, **StatItem**
- `surfaces/` — **Card**, **FeatureCard**, **PricingCard**
- `marketplace/` — **LiveCard**, **StepItem**, **Testimonial**
- `forms/` — **Field**, **Segmented**
- `feedback/` — **FaqItem**, **Toast**
- `navigation/` — **Navbar**
- `admin/` — **AdminStatCard**, **AdminBadge** (slate/sky theme)

**UI Kits** (`ui_kits/`)
- `marketing/` — the full LinX contractor-network landing page (interactive).
- `admin/` — LinX Admin login → crawler & lead-intelligence dashboard.

Each component ships a `.d.ts` (props), a `.prompt.md` (what/when + usage), and its directory carries a `@dsCard` gallery HTML.
