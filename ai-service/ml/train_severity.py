"""Reproducible *synthetic-only* weak-label benchmark. Not real-world evaluation."""
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

RANDOM_STATE = 42
FEATURES = ["relative_area", "sharpness_proxy", "brightness", "safety_indicator"]


def synthetic_data(n_per_class: int = 100):
    rng = np.random.default_rng(RANDOM_STATE)
    rows, labels = [], []
    # Deliberately non-overlapping ranges reproduce the weak-label rule, so high F1 is artificial.
    ranges = {"minor": (0.00, 0.049), "moderate": (0.05, 0.199), "severe": (0.20, 0.65)}
    for label, (low, high) in ranges.items():
        for area in rng.uniform(low, high, n_per_class):
            rows.append([area, rng.uniform(2, 20), rng.uniform(60, 190), rng.integers(0, 6)])
            labels.append(label)
    return np.asarray(rows), np.asarray(labels)


def train(output: Path, n_per_class: int = 100) -> dict:
    x, y = synthetic_data(n_per_class)
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates = {
        "gradient_boosting": GridSearchCV(GradientBoostingClassifier(random_state=RANDOM_STATE), {"n_estimators": [50, 100], "max_depth": [1, 2]}, scoring="f1_macro", cv=cv, n_jobs=1),
        "random_forest": GridSearchCV(RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=1), {"n_estimators": [50, 100], "max_depth": [3, None]}, scoring="f1_macro", cv=cv, n_jobs=1),
    }
    results = {}
    for name, search in candidates.items():
        search.fit(x_train, y_train)
        prediction = search.best_estimator_.predict(x_test)
        scores = search.cv_results_["mean_test_score"]
        results[name] = {"best_params": search.best_params_, "cv_macro_f1_mean": float(search.best_score_), "cv_macro_f1_std": float(search.cv_results_["std_test_score"][search.best_index_]), "test_macro_f1": float(f1_score(y_test, prediction, average="macro")), "confusion_matrix": confusion_matrix(y_test, prediction, labels=["minor", "moderate", "severe"]).tolist(), "classification_report": classification_report(y_test, prediction, output_dict=True), "feature_importance": dict(zip(FEATURES, map(float, search.best_estimator_.feature_importances_)))}
    baseline = DummyClassifier(strategy="most_frequent").fit(x_train, y_train)
    results["dummy_baseline"] = {"test_macro_f1": float(f1_score(y_test, baseline.predict(x_test), average="macro"))}
    winner = max(candidates, key=lambda key: results[key]["cv_macro_f1_mean"])
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(candidates[winner].best_estimator_, output / "severity_model.joblib")
    metrics = {"dataset": "synthetic weak-label benchmark", "real_world_validation": "incomplete", "warning": "Relative-area ranges do not overlap class boundaries, encoding the weak-label rule and making high F1 artificially separable. Do not treat this as real-world performance.", "split": {"train": len(y_train), "test": len(y_test), "stratified": True}, "cross_validation": {"type": "StratifiedKFold", "n_splits": 5, "shuffle": True, "random_state": 42}, "winner_by_cv_macro_f1": winner, "results": results}
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (output / "MODEL_CARD.md").write_text("# Synthetic severity model\n\nThis artifact was trained only on synthetic weak labels. It is not approved for production severity inference or real-world accuracy claims. Non-overlapping area ranges encode the class rule, so any high F1 is artificially separable.\n")
    return metrics


if __name__ == "__main__":
    print(json.dumps(train(Path("artifacts/synthetic_severity")), indent=2))
