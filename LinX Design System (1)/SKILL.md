---
name: linx-design
description: Use this skill to generate well-branded interfaces and assets for LinX (Canada's Contractor Network), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Brand:** LinX — Canada's Contractor Network. Voice: calm, confident, trust-first ("Quiet automation for busy teams").
- **Two themes:** luxe **gold-on-black** for everything customer-facing; **slate + sky** only for internal admin tooling. Never mix them. Ignore the legacy blue "FileLinx" concept.
- **Color:** black `#000` / surfaces `#050506`–`#0B0B0D` / hairline `#1E1E22`; single metallic accent gold `#DFB24E` (+ `--linx-gold-foil` chromed gradient for the logo); text `#F5F5F5` on `#A7A7A7`; status shown as 12%-tinted pills.
- **Type:** Inter (300–900). Headings tight & heavy; labels/buttons/eyebrows UPPERCASE with wide letter-spacing.
- **Shape:** pill buttons & badges (999px); cards 14px radius with a 1px hairline border and no shadow; gold border + −2px lift on hover.
- **Icons:** native emoji (🏠⚡🔧🏡🔨), `✓` bullets, `★` ratings — no custom SVG icon set.
- **Backdrop:** a **carbon-fiber** diagonal weave (`--linx-carbon`) with a gold sheen (`--linx-carbon-sheen`) — matches the business card. No photography or illustration.

## Files
- `styles.css` + `tokens/` — link `styles.css` to inherit all colors, type, spacing.
- `guidelines/` — foundation specimen cards.
- `components/` — React primitives on `window.LinXDesignSystem_1b8a1a` (load `_ds_bundle.js`).
- `ui_kits/marketing/`, `ui_kits/admin/` — full-screen recreations to copy from.
- `assets/` — LinX wordmark & monogram SVGs, promo video.
