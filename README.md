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

The current build is a single, self-contained `index.html`, playable offline as a PWA. The interface is still German only.

### Roadmap

1. **English first, German selectable** via an i18n layer.
2. Restructure into TypeScript + Vite with the simulation separated from the UI and game content stored as data (JSON).
3. Illustrated assets: staff portraits, dishes, storefronts per tier, city map, short loop animations.
4. Balancing driven by headless simulations and opt-in play telemetry.
5. Native iOS/Android packaging (Capacitor).

## Development

```bash
npm test   # extracts the game script and runs the headless simulation tests
```

Updates pushed to `main` are served through GitHub Pages; installed copies pick them up the next time they are opened online.
