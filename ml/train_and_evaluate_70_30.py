import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, roc_auc_score, average_precision_score,
    precision_score, recall_score, f1_score, confusion_matrix
)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists
from ml.models.random_forest import build_random_forest
from ml.models.xgboost_model import build_xgboost
from ml.models.isolation_forest import build_isolation_forest

def evaluate_model_performance(y_true, y_prob, threshold=0.5, cost_fp=1.0, cost_fn=10.0, name="Model"):
    preds = (y_prob >= threshold).astype(int)
    acc = accuracy_score(y_true, preds)
    try:
        roc_auc = roc_auc_score(y_true, y_prob)
    except Exception:
        roc_auc = 0.5
    try:
        pr_auc = average_precision_score(y_true, y_prob)
    except Exception:
        pr_auc = 0.0
    prec = precision_score(y_true, preds, zero_division=0)
    rec = recall_score(y_true, preds, zero_division=0)
    f1 = f1_score(y_true, preds, zero_division=0)
    cm = confusion_matrix(y_true, preds)
    
    # Cost = (FP * cost_fp) + (FN * cost_fn)
    tn, fp, fn, tp = cm.ravel()
    total_cost = (fp * cost_fp) + (fn * cost_fn)
    
    return {
        "model_name": name,
        "threshold": threshold,
        "accuracy": round(acc, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "total_cost": round(total_cost, 1),
        "confusion_matrix": {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)}
    }

def run_70_30_training():
    print("=================================================================")
    print("   SECUREWHEELS: 70-30 TRAIN-TEST ML MODEL TRAINING & BENCHMARK ")
    print("   Dataset: carclaims.csv (15,420 historical vehicle claim records)")
    print("=================================================================\n")

    # 1. Load and clean
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)

    # 2. Strict 70% Training / 30% Testing Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )

    print(f"Training set: {len(X_train):,} samples (70%) | Fraud rate: {np.mean(y_train)*100:.2f}%")
    print(f"Test set:     {len(X_test):,} samples (30%) | Fraud rate: {np.mean(y_test)*100:.2f}%\n")

    # 3. Train Model 1: Random Forest
    print("[1/3] Training Random Forest (Cost-Sensitive Balanced Trees)...")
    rf_pipe = build_random_forest(num_cols, cat_cols, class_weight="balanced")
    rf_pipe.fit(X_train, y_train)
    rf_probs = rf_pipe.predict_proba(X_test)[:, 1]

    # 4. Train Model 2: XGBoost
    print("[2/3] Training XGBoost (Gradient Boosted Decision Trees)...")
    xgb_pipe = build_xgboost(num_cols, cat_cols, scale_pos_weight=15.7)
    xgb_pipe.fit(X_train, y_train)
    xgb_probs = xgb_pipe.predict_proba(X_test)[:, 1]

    # 5. Train Model 3: Isolation Forest
    print("[3/3] Training Isolation Forest (Unsupervised Anomaly Detector)...")
    iso_pipe = build_isolation_forest(num_cols, cat_cols)
    iso_pipe.fit(X_train)
    iso_probs = iso_pipe.predict_proba(X_test)[:, 1]

    # 6. Ensemble Fusion (0.45 RF + 0.45 XGB + 0.10 ISO)
    print("\n[Ensemble] Generating Tri-Model Weighted Probability Distributions...")
    ensemble_probs = (0.45 * rf_probs) + (0.45 * xgb_probs) + (0.10 * iso_probs)
    ensemble_probs = np.clip(ensemble_probs, 0.0, 1.0)

    # 7. Evaluate on Unseen 30% Test Set
    results = []
    # Standard threshold 0.50
    results.append(evaluate_model_performance(y_test, rf_probs, threshold=0.50, name="Random Forest (Threshold 0.50)"))
    results.append(evaluate_model_performance(y_test, xgb_probs, threshold=0.50, name="XGBoost (Threshold 0.50)"))
    results.append(evaluate_model_performance(y_test, iso_probs, threshold=0.50, name="Isolation Forest (Threshold 0.50)"))
    results.append(evaluate_model_performance(y_test, ensemble_probs, threshold=0.50, name="Tri-Model Ensemble (Threshold 0.50)"))

    # Cost-Sensitive Optimal Operating Threshold 0.40
    opt_ensemble = evaluate_model_performance(y_test, ensemble_probs, threshold=0.40, name="Tri-Model Ensemble (Cost-Optimal 0.40)")
    results.append(opt_ensemble)

    print("\n================== 70-30 TEST SET EVALUATION MATRIX ==================")
    header = f"{'Model':<35} | {'Acc':<6} | {'ROC-AUC':<8} | {'PR-AUC':<7} | {'Recall':<7} | {'Prec':<7} | {'F1':<6} | {'Cost':<7}"
    print(header)
    print("-" * len(header))
    for r in results:
        print(f"{r['model_name']:<35} | {r['accuracy']:<6.4f} | {r['roc_auc']:<8.4f} | {r['pr_auc']:<7.4f} | {r['recall']:<7.4f} | {r['precision']:<7.4f} | {r['f1_score']:<6.4f} | {r['total_cost']:<7.1f}")

    print("\nConfusion Matrix for Cost-Optimal Ensemble (Threshold 0.40):")
    cm = opt_ensemble["confusion_matrix"]
    print(f"  True Negatives (Legitimate Approved):  {cm['TN']:,}")
    print(f"  False Positives (Investigated):        {cm['FP']:,}")
    print(f"  False Negatives (Fraud Missed):        {cm['FN']:,}")
    print(f"  True Positives (Fraud Prevented):      {cm['TP']:,}")

    # 8. Re-fit on full data for maximum production generalization and serialize
    print("\nRe-fitting final models on complete 15,420 record dataset for production serialization...")
    rf_pipe.fit(X, y)
    xgb_pipe.fit(X, y)
    iso_pipe.fit(X)

    os.makedirs("ml/serialized", exist_ok=True)
    joblib.dump(rf_pipe, "ml/serialized/random_forest.joblib")
    joblib.dump(xgb_pipe, "ml/serialized/xgboost.joblib")
    joblib.dump(iso_pipe, "ml/serialized/isolation_forest.joblib")
    print("Exported serialized production models to ml/serialized/")

    return results

if __name__ == "__main__":
    run_70_30_training()
