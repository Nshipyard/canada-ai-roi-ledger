# DATA_NOTES.md — Canada AI ROI Ledger

## Source
- **Dataset:** Government of Canada AI Register (MVP), open.canada.ca
  dataset `fcbc0200-79ba-4fa4-94a6-00e32facea6b`.
- **Source URL:** https://open.canada.ca/data/en/dataset/fcbc0200-79ba-4fa4-94a6-00e32facea6b
- **Dataset CSV date:** 2026-04-28 (filename
  `gc-ai-register-mvp-registre-de-lia-du-gc-pmv-04-26.csv`).
- **Retrieved:** 2026-10-08. Raw snapshot committed at
  `data/snapshots/2026-10-08/ai-register-mvp.csv` (+ `snapshot_meta.json`
  with SHA-256). Row count verified: 412.

## Normalization decisions
- **status** (`ai_system_status_en`, trimmed + lowercased):
  `in production` -> `production`; `in development` -> `development`;
  `retired` -> `retired`; blank -> `unknown`. Raw kept as `status_raw`.
- **built_by** (`developed_by_en`, trimmed + lowercased):
  `government of canada` -> `government`; `vendor` -> `vendor`;
  `open source` -> `open_source`; `other` -> `other`; blank -> `unknown`.
  Raw kept as `built_by_raw`.
- **institution**: `government_organization` trimmed, kept verbatim as
  published (EN and FR names joined by " / ").
- **purpose_category**: heuristic first-match keyword rules over
  `name_ai_system_en` + `ai_system_capabilities_en` (see script docstring
  for the full rule table). This is a browsing convenience, NOT a source
  field. One category per row; blank text -> `unspecified`.
- **IDs**: `AIRO-0001`..`AIRO-0412` assigned in sorted `ai_register_id`
  order. These are the stable public IDs.
- **Spend**: `data/spend.json` carries ONLY reported media aggregates
  (Canadian Press via Global News, 2026-05-13). The Register contains no
  cost data; no public source joins costs to systems.
- **outcome_join.json** is intentionally empty: it defines the join
  needed to answer "did this system make a service cheaper or faster"
  and states that no public source provides all three links.

## Known defects (in the source CSV)
- Raw status variants: "In production " (trailing space, 5 rows),
  "in production" (lowercase, 2 rows), "In development " (trailing
  space, 11 rows) alongside the clean forms; all normalized as above.
- 42 blank statuses -> `unknown`.
- 66 blank `status_year` values (status_date column). All non-blank
  values are 4-digit years.
- 30 blank `developed_by` values -> `unknown`; 1 row is "Other " with a
  trailing space -> `other`.
- 43 distinct `government_organization` strings vs the 42 institutions
  TBS claimed at launch. No two strings share the same EN or FR part, so
  there is no exact duplicate pair in the CSV; the gap is not resolvable
  from the file alone (see `org_discrepancy_note` in summary.json).
- `purpose_category` is heuristic; rows whose capability text is generic
  (e.g. "Machine Learning") land in `analytics_prediction`, which may
  overstate that category.

## Rebuild
`python3 scripts/build_data.py` — reads `/tmp/airoi/ai-register.csv`,
rewrites all outputs deterministically.
