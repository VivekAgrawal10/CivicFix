# CivicFix implementation plan

## Phase gates

Each phase has a runnable acceptance check.  A later phase does not rely on a
failed mandatory check from an earlier phase.  Measurements, dataset counts,
model performance, and inference outputs are published only after commands
produce them.

| Phase | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1. Reconnaissance | This architecture and plan | Boundaries, ownership, contracts, resources, and build order documented. |
| 2. AI skeleton | FastAPI service, config, logging, health/model status | Unit/API tests prove health and unavailable-model degradation. |
| 3. Data preparation | Dataset manifests, licenses, clean/split pipeline | Reproducible run validates inputs and preserves group boundaries. |
| 4. Computer vision | Validation, detection integration, area/severity evidence | Fixture tests cover valid, corrupt, poor-quality, and model-unavailable images. |
| 5. Tabular ML | GBC/RF training, metrics and model card | 70:30 stratified split, five-fold CV, baseline, reports, and untouched test set verified. |
| 6. Business engines | XP, duplicate, verification, priority logic | Pure unit tests cover idempotency rules, population modes, self-verification, and overrides. |
| 7. Integration | Express/Mongo workflow against FastAPI | Contract and integration tests prove graceful AI failure behavior. |
| 8. Interface | AI Lab, demo mode, authority review | Browser-level tests show live API results and an authority decision flow. |
| 9. Hardening | End-to-end demo and operations evidence | Full test suite, performance checks, failure scenarios, and handoff documentation. |

## Phase 2 proposal

Create the `ai-service/` package with FastAPI, Pydantic settings, a model
registry, structured logging, test fixtures, and dependency lockfiles.  The
first endpoints will be `/api/v1/health` and `/api/v1/models/status`; they
will state that no approved model artifact is installed instead of simulating
model success.  Planned dependencies are FastAPI, Uvicorn, Pydantic Settings,
Pillow, NumPy, OpenCV headless, Pytest, and HTTPX.  Exact compatible versions
will be resolved and tested against Python 3.13 before being committed.

## Dataset and model policy

No dataset is downloaded or model is represented as usable until its license,
source URL, label coverage, and reproducibility instructions have been recorded
in a manifest.  RDD2022 is a candidate for road-damage detection, TACO for
litter, FloodNet for flood-related imagery, and CIFAKE only for later synthetic
image research; their suitability and licenses must be verified before use.

Weak labels (for example, severity inferred from detection coverage) are stored
separately from human labels.  At least 150 independently human-labelled images
are required for the planned rubric evaluation; if unavailable, the model card
will explicitly mark that requirement incomplete rather than claim validation.

## ML evaluation protocol

The training pipeline will remove near duplicates before splitting and keep all
related scene/original/augmented samples in the same group.  It will use a 70:30
stratified train-test split (group-aware where source grouping exists), then
five-fold `StratifiedKFold(shuffle=True, random_state=42)` only on training
data.  Gradient Boosting and tuned Random Forest use identical features and
tuning scope.  Winner selection is mean CV macro-F1, not test score.  Outputs
are generated, never hand-authored: metrics JSON, comparison report, confusion
matrices, classification reports, feature importance, baseline, and model card.

## Key integration decisions

- Node owns idempotency, Mongo transactions, report state, and XP finalization.
- Python returns analysis evidence and recommended scoring inputs only.
- The Node-to-AI contract has explicit timeouts and `degraded` model status.
- Duplicate prevention uses location/time/category plus visual evidence; a
  single matching image alone is escalated when independence is uncertain.
- Low-activity auto-verification requires all configured confidence, quality,
  authenticity, and reporter-trust thresholds.  Other areas require two
  independent reporters and images, otherwise manual review.
- Safety overrides are logged with the priority explanation and actor identity.

## Risks to resolve during implementation

1. Model and dataset licenses may make a candidate unsuitable for distribution.
2. Public labels may not support all severity classes; weak labels cannot be
   presented as ground truth.
3. CPU-only inference may require small models, image resizing, and a queue for
   expensive work.
4. A clean workspace means the frontend/backend data contract will be designed,
   not inferred.  The Node service and web application will be added only once
   their phase begins.
