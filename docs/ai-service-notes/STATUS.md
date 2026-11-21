# Implementation status

## Fully implemented and tested

- FastAPI health/model status, request IDs, timing, structured errors/logs.
- Multipart image validation; quality signals; conservative HSV dark-region area
  heuristic; dHash duplicate evidence; heuristic severity; risk-limited
  authenticity response.
- Rule-based XP recommendation (including preserved exact breakdown),
  verification rules, and priority explanation.
- Synthetic-only Gradient Boosting vs Random Forest comparison and artifacts.
- Express-to-FastAPI multipart bridge; Node in-memory idempotent XP-ledger
  interface; browser AI Lab upload path.

## Image relevance and false-positive protection (this iteration)

- `app/cv/image_relevance.py` rejects document/screenshot signatures (bright framed paper incl. curved
  ornamental borders; exactly-flat rectilinear graphics) before any damage analysis. It is a heuristic,
  not a scene classifier: everything else is `uncertain` and routed to manual review, never "civic".
- `app/cv/area_estimator.py` keeps the HSV guard (V<55, S<0.55) and now removes frames/borders, thin lines,
  dark backgrounds, edge-touching large regions and low-contrast shadows; excluded regions are reported.
- Every `/analyze` response has a `decision` block (rejected / manual_review_required) with
  `xp_eligible`, `auto_verification_eligible`, `verification_allowed`.
- Node (`server/src/service.js`): non-civic and invalid uploads are never stored; the XP promise is
  computed server-side at submission; finalization needs `verified` state, is idempotent, daily-capped
  and ignores client-supplied recommendations; duplicate-image and >10 reports/day are XP-ineligible.

## Partially implemented / intentionally degraded

- Road-damage output is a dark-region heuristic candidate, not a trained
  detector. Pothole/road-damage/garbage/waterlogging classifiers are unavailable
  pending licensed, verified model weights.
- Authenticity result is inconclusive; no AI-image detector is installed.
- The Node service uses in-memory report/ledger adapters for a demonstrator;
  MongoDB, authentication, and authority work orders are integration interfaces
  still required for production.
- Demo requires a user-supplied image. Synthetic demo images, if generated, must
  be labelled simulated; no licensed fixture set is bundled.

## Measured synthetic ML result

The generated `metrics.json` records Gradient Boosting as CV winner with mean
macro-F1 0.985659 and test macro-F1 1.0; Random Forest tied on CV and also
achieved test 1.0; the dummy baseline test macro-F1 was 0.166667. These values
are not real-world estimates because class-specific affected-area ranges do not
overlap and encode the weak-label decision boundary.
