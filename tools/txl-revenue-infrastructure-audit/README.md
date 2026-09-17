# TXL Revenue Infrastructure Audit

A single-file, zero-dependency lead magnet for ThriveXLabs. Quantifies founder
dependency and the 17 revenue leaks, gates the diagnosis behind an email, and
routes to a $299 paid diagnostic call.

`index.html` is the whole thing. Drop it on any host, or paste it into a
Webflow / Framer / Carrd embed. No build step, no framework, nothing to install.

## Sources it was built from

| Source | What it contributed |
| --- | --- |
| `17-revenue-leaks.pdf` | The 17 named leaks, their five sections, the cost benchmarks and the fix language |
| `revenue-leak-calculator.html` | Pipeline stage benchmarks (32 / 78 / 27 / 35) and the isolated-gap attribution method |
| `audit_1.html` | The six-function founder dependency model, the trapped-function test, and the phase roadmap |

## Before you publish: four edits

All four live in the `CONFIG` block at the top of the `<script>`.

1. **`calendlyUrl`** — currently a placeholder. The Calendly account connected
   to this workspace is **VirtUp** (`calendly.com/itisvirtup`), not ThriveXLabs,
   so nothing was auto-filled. Create the $299 event type on a TXL Calendly and
   paste the link.
2. **`leadEndpoint`** — currently `''`, which falls back to a `mailto:` draft.
   See the section below. **This is the one that decides whether you actually
   capture leads.**
3. **The logo** — the inline `<svg>` in the masthead is a placeholder built from
   the palette, because no TXL logo SVG was attached. Paste your real mark over
   it; keep `width`/`height` at 34.
4. **The palette** — the six brand hexes in `:root` were derived from your
   existing `audit_1.html`, not from the logo. If the real SVG carries different
   values, replace `--brass`, `--rust`, `--sage`, `--obsidian`, `--raised` and
   `--paper` and the whole page follows.

## The lead endpoint matters more than anything else here

With `leadEndpoint: ''` the form opens the visitor's own mail client with their
results pre-filled. It works with zero setup, but you only get the leads who
then hit send, and nothing lands in a CRM. Treat it as a stopgap, not a launch
configuration.

Set `leadEndpoint` to anything that accepts a POST and you capture everyone:

- **Customer.io** — you already run workspace 222769. A Track API form or event
  endpoint puts the lead straight into your campaigns with every score field
  attached as an attribute.
- A **Zapier / Make** catch hook, if you want to fan out to a sheet and a CRM.
- **Formspree**, **Netlify Forms**, or your own `/api/lead` route.

`leadEndpointMode` switches the body between `'json'` (default) and `'form'`
for endpoints that expect `multipart/form-data`.

The POST body carries the contact fields plus the full scored model: score,
band, net and gross exposure, the dependency and pipeline splits, leaks active
and missing, trapped function count, top priority, and every raw input. That is
enough to segment and to open a sales conversation with a real number in the
first line.

## Honest limitation: the gate is soft

The gating is client-side, so anyone who opens devtools can read the locked
sections. That is unavoidable in a single static file, and it is the right
trade for a lead magnet: friction for the 99% who will not look, zero
infrastructure, and instant page loads.

The free tier is deliberately the *hook* rather than a teaser: score, headline
exposure, the two-way split, how many leaks fired, and which section is worst.
The gated 80% is the part that changes behaviour — every leak named with its
fix, the ledger, the benchmarks, the ranked sequence, the 90-day plan.

If you ever need a hard gate, the move is to compute the report server-side and
return it only after the email is verified. That means a backend, so do it only
if lead quality genuinely justifies it.

## How the model avoids inflated numbers

Most calculators in this category quote a figure larger than the business's
revenue, which destroys credibility with exactly the buyer you want. Four
deliberate guards:

1. **Delegable fractions.** Only part of each function's founder hours counts
   (strategy 15%, delivery 80%, and so on). A founder is supposed to be in
   sales and strategy.
2. **The replacement spread.** Dependency is charged at the gap between the
   founder's implied hourly value and what a replacement costs, not the full
   rate. Charging the full rate implies delegating your week doubles revenue.
3. **Three leak classes.** Of the 17, six carry their own dollar line, nine
   carry none because they explain a pipeline stage or dependency figure that is
   already priced, and two raise risk without a figure. Nothing is counted
   twice.
4. **A 15% overlap haircut**, applied openly in the ledger, because root causes
   interact. The headline understates rather than overstates.

Plus two self-checks that appear in the report when they fire: a coherence
warning when pipeline inputs imply a revenue far from the stated figure, and a
flag when exposure exceeds 60% of annual revenue.

Every assumption is visible in the report's Method section. That transparency is
the reason a sceptical operator will believe the number and book the call.

## Tuning

| Knob | Where | Default |
| --- | --- | --- |
| Pipeline benchmarks | `BENCH` | 32 / 78 / 27 / 35 |
| Overlap haircut | `OVERLAP_HAIRCUT` | `0.15` |
| Delegable fractions | `FUNCS[].deleg` | 0.15 to 0.90 |
| Leak pricing rates | `LEAKS[].rate` / `.custom` | per leak, documented in `.basis` |
| Score weights | `computeModel` | 30 pipeline / 30 independence / 25 systemization / 15 retention |
| Band thresholds | `computeModel` | 80 / 65 / 45 |
| Diagnostic price | `CONFIG.diagnosticPrice` | 299 |

Each priced leak carries a `basis` string that is shown to the user in the
ledger. If you change a rate, change the `basis` with it.

## Notes

- State autosaves to `localStorage` under `txl-ria-v1`, so a visitor who leaves
  mid-audit returns to their answers.
- "Download my report" calls `window.print()` against a tuned print stylesheet,
  which is more reliable across browsers than a generated PDF and produces a
  clean document. The print styles invert to a light palette and unblur the
  gated sections once unlocked.
- Contact address `hi@thrivexlabs.com` appears in the footer and is the
  `mailto:` fallback target.
