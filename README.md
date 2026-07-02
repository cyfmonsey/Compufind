# Compufind

A website that recommends the right laptop/desktop for your exact needs and
budget, then finds the best real price for a matching machine — sourced only
from trustworthy retailers and, when refurbished, only
manufacturer-certified refurbished units.

The core flow:

1. You set a **maximum price**.
2. You answer a short questionnaire about **how you'll use the machine**.
3. The site converts those answers into a **target spec** (CPU tier, RAM,
   GPU, storage, form factor).
4. The site searches connected retailers for **matching, in-budget
   products**, filtered to manufacturer-direct sellers or
   manufacturer-certified refurbished, and shows ranked results.

## Current status: Phase 1

This repo currently implements **Phase 1** of the build plan: the
questionnaire → spec rules engine as a standalone, unit-tested module, plus
a React UI for the questionnaire and the resulting spec target. No external
APIs are involved yet.

```
src/
  engine/            Pure rules engine (no I/O, no React) — designed to be
                     shared with the future backend as-is.
    types.ts         Questionnaire input + SpecTarget output types
    specEngine.ts    recommendSpec(answers) → { spec, maxBudget, warnings }
    specEngine.test.ts  Unit tests covering every rules-table row
    labels.ts        Display labels for engine enums
  components/        Questionnaire form + spec result card
  App.tsx            Page shell
```

### Running it

```bash
npm install
npm run dev     # local dev server
npm test        # engine unit tests (vitest)
npm run build   # typecheck + production build
```

## Rules engine

Inputs collected:

- **Max budget** ($)
- **Primary use case(s)** (multi-select): basic/office/QuickBooks;
  graphics/Photoshop; Revit/CAD/3D; programming; light & portable / 2-in-1
- **Browser tab habit** (basic/office path): light (<8), moderate (8–15),
  heavy (15+), plus a "heavy apps open alongside the browser" checkbox that
  maps to the heavy-multitasking row
- **Programming stack** (programming path): web/light scripting,
  ML/Docker/VM-heavy, or mobile/native
- **Portability priority**: not important / somewhat / very

Each selected use case contributes a partial requirement; the engine takes
the **strictest value per field** (RAM, CPU tier, GPU tier, storage) across
all of them, and emits notes (e.g. Revit being CPU-bound) plus a warning if
the budget is unrealistically low for the derived spec. Output is a spec
target object such as:

```ts
{
  spec: {
    ramGB: 32, ramRecommendedGB: 32,
    cpuTier: 'high',
    gpu: 'dedicated-mid', gpuPreferredNotRequired: false,
    storageGB: 1024, storageRecommendedGB: 1024,
    formFactor: 'any', prioritizePortability: false,
    notes: [...]
  },
  maxBudget: 1800,
  warnings: []
}
```

This object plus the budget is exactly what the Phase 2 data/search layer
will consume.

## Roadmap

- **Phase 1 (done):** Spec-recommendation questionnaire + rules engine.
- **Phase 2:** Best Buy Developer API + eBay Developer API (certified
  refurbished filter) for first live pricing data; Node backend + Postgres
  product cache.
- **Phase 3:** Impact / Rakuten Advertising / CJ Affiliate feeds to unlock
  Walmart, Staples, Costco, and manufacturer-direct/outlet catalogs (Dell,
  HP, Lenovo, Asus, Acer + their outlet/refurbished stores) with clean
  seller-of-record attribution.
- **Phase 4:** Scheduled refresh jobs, matching/ranking against the spec
  target, UI polish.
- **Phase 5 (optional):** Amazon via the Creators API once its access rules
  are confirmed workable (PA-API is deprecated May 15, 2026 and gated on
  existing Associates sales).

**Hard sourcing constraint** for every phase: results must be sold and
shipped directly by the retailer/manufacturer, or be manufacturer-certified
refurbished (Dell Refurbished, HP/Lenovo Certified Refurbished, etc.). No
third-party marketplace sellers, no generic "refurbished" listings, and no
scraping as a primary strategy.

## Decisions taken for v1 (from the spec's open questions)

- **Rules thresholds:** the draft table was implemented as written, with two
  interpretations: the "basic + heavy multitasking" row is triggered by an
  explicit checkbox (many heavy apps alongside the browser), and the
  mobile/native programming stack — listed as an input but absent from the
  table — targets 16GB (32GB recommended) with an upper-mid CPU. Thresholds
  live in one place (`src/engine/specEngine.ts`) and are trivial to adjust.
- **Best pick vs. list:** the results UI is scaffolded as a ranked list
  (top matches), not a single pick — easy to cap at 5–10 in Phase 2.
- **Budget bias:** fully budget-driven for now; no premium/mainstream bias.
- **Desktops:** the engine is form-factor-aware but v1 UI copy targets
  laptops first; desktops slot in when retailer data arrives.
- **Launch scope:** still open — Phase 1+2 vs. waiting for Phase 3 feeds.
