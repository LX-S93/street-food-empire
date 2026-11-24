# Street Food Empire

An idle tycoon game about growing a single street food stand into a restaurant chain, with a deeper management layer than most idle games.

**Play:** https://lx-s93.github.io/street-food-empire/ (installable as a web app: open in Safari or Chrome and choose "Add to Home Screen")

## What makes it different

- **Real consequences.** Running costs, loans and an overdraft limit. Three closing days below the limit and you are insolvent.
- **Hiring under uncertainty.** Applicants come with CVs, references and interviews that can mislead. Skills are shown as estimated ranges; a trial day or a headhunter narrows them. Some hires turn out to be bad for business.
- **Growth that bites back.** More locations need more oversight. Expand faster than your management capacity and every location starts to slip.
- **Active play helps, idling still works.** Kitchen shifts, phone calls from staff, pop-up stands at city events and temp workers for event days reward attention without being mandatory.
- **Menus, extras, quality tiers, recipes, regulars, reviews, weather, competitors, achievements and a prestige loop.**

## Status

- English by default, German selectable (Office → Language, or on the welcome screen).
- Illustrated art generated locally with ComfyUI (Z-Image Turbo) and short looping storefront animations (Wan 2.1 VACE).
- Vite + TypeScript project, deployed to GitHub Pages by GitHub Actions on every push to `main`.

### Roadmap

1. Split `src/game.ts` into typed modules (simulation, UI, data) and remove `@ts-nocheck` step by step.
2. Move game content (dishes, roles, events) into JSON data files.
3. More art: animated kitchen shift, staff portraits per role, weather scenes.
4. Balancing driven by headless simulations and opt-in play telemetry.
5. Native iOS/Android packaging (Capacitor).

## Project layout

```
index.html            app shell
src/main.ts           entry: styles, game, service worker
src/game.ts           game simulation and UI (being modularised)
src/data.ts           static game data (typed)
src/i18n.ts           language selection and TR()
src/audio.ts          synthesised sound effects and music (Web Audio)
src/ui/dom.ts         flicker-free DOM patching
src/i18n/en.json      German source text -> English
src/styles.css        styles
public/art/           game art (WebP), generated with ComfyUI
public/sw.js          offline cache
tests/                headless simulation tests (Node)
```

## Development

```bash
npm install
npm run dev     # local dev server
npm test        # headless simulation tests
npm run build   # production build in dist/
```

Updates pushed to `main` are tested, built and deployed automatically; installed copies pick them up the next time they are opened online.
