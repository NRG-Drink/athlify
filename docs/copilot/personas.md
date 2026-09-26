# Personas

_Who this product is for. Loaded by plan-design-review and build agents.
Keep terse — this is agent context, not a PM document._

## Luca — hobby cyclist who wants their whole riding history in one place

- **Context:** One of the two Athlify developers; rides regularly and
  records every ride on Strava. Uses Athlify in two moments: a quick check
  on the phone right after a ride (was the tour logged, distance,
  elevation), and a longer session on the laptop in the evening or at the
  weekend to look at weeks, months and years.
- **Goals (ranked):**
  1. See the overall picture: kilometers, hours, elevation and TSS per
     week, month, year and bicycle, in one place and independent of Strava.
  2. Keep the history complete: Strava imports plus manual rides, the
     bicycles and gadgets used, Body-Stats and Events (crashes, injuries,
     breaks) next to the training data.
  3. Understand trends without studying sports science: what changed
     compared with last period, and why.
- **Frustrations / anti-goals:**
  - A "number graveyard": dozens of unexplained metrics, where the
    important value is lost among the rest.
  - Scattered or incomplete data: bicycles, weight, crashes and manual
    rides spread over different tools; missing data shown as `0` as if it
    were a real value.
  - Anything that turns a personal tool into a feed (social, kudos,
    marketing).
- **Design implications:** Lead every view with a few large,
  self-explaining totals (label, unit, comparison period) and let details
  unfold on demand. Never render missing data as zero; show "no data" and
  why. The phone view answers "what did my last ride add?" at a glance,
  and the laptop view supports comparing periods and bicycles side by
  side. Calm, personal and data-first: no feed patterns, no decoration
  that competes with the numbers.
