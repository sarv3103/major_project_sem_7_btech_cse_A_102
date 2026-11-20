import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, precision_recall_curve, confusion_matrix
)
from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists, build_preprocessor
from ml.models.random_forest import build_random_forest
from ml.models.xgboost_model import build_xgboost
from ml.models.isolation_forest import build_isolation_forest

# Set styling
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
PLOTS_DIR = "ml/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)
os.makedirs("ml/serialized", exist_ok=True)

def run_complete_model_pipeline():
    print("=" * 80)
    print("      SECUREWHEELS AI — 3-MODEL FRAUD DETECTION SUITE (70:30 SPLIT)       ")
    print("=" * 80)

    # 1. Load and clean data
    print("\n[1/6] Loading and Preprocessing Primary Dataset (carclaims.csv)...")
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)
    print(f"      Total Records: {len(df):,} | Features: {X.shape[1]} (Numeric: {len(num_cols)}, Categorical: {len(cat_cols)})")
    print(f"      Fraud Cases: {np.sum(y):,} ({np.mean(y)*100:.2f}%) | Legitimate Cases: {len(y) - np.sum(y):,} ({100 - np.mean(y)*100:.2f}%)")

    # 2. Stratified Train-Test Split (Strict 70% Train / 30% Test Ratio)
    print("\n[2/6] Executing 70:30 Stratified Train-Test Split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    print(f"      Training Set (70%): {len(X_train):,} samples (Fraud: {sum(y_train):,})")
    print(f"      Test Set (30%):     {len(X_test):,} samples (Fraud: {sum(y_test):,})")

    # LEVEL 1: 5-Fold Stratified Cross-Validation on Training Data
    print("\n" + "-" * 80)
    print("  MULTI-LEVEL TESTING — LEVEL 1: 5-FOLD STRATIFIED CROSS-VALIDATION")
    print("-" * 80)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc_rf, cv_auc_xgb = [], []
    scale_weight = float((len(y_train) - sum(y_train)) / sum(y_train))

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train), 1):
        X_tr, X_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
        y_tr, y_val = y_train[train_idx], y_train[val_idx]

        rf_fold = build_random_forest(num_cols, cat_cols, class_weight="balanced")
        rf_fold.fit(X_tr, y_tr)
        p_rf_val = rf_fold.predict_proba(X_val)[:, 1]
        cv_auc_rf.append(roc_auc_score(y_val, p_rf_val))

        xgb_fold = build_xgboost(num_cols, cat_cols, scale_pos_weight=scale_weight)
        xgb_fold.fit(X_tr, y_tr)
        p_xgb_val = xgb_fold.predict_proba(X_val)[:, 1]
        cv_auc_xgb.append(roc_auc_score(y_val, p_xgb_val))

        print(f"      Fold {fold}: RF ROC-AUC = {cv_auc_rf[-1]*100:.2f}% | XGB ROC-AUC = {cv_auc_xgb[-1]*100:.2f}%")

    print(f"  --> 5-Fold Cross-Validation Mean ROC-AUC:")
    print(f"      Random Forest: {np.mean(cv_auc_rf)*100:.2f}% (±{np.std(cv_auc_rf)*100:.2f}%)")
    print(f"      XGBoost:       {np.mean(cv_auc_xgb)*100:.2f}% (±{np.std(cv_auc_xgb)*100:.2f}%)")

    # LEVEL 2: Fit on Full 70% Training Set & Predict on 30% Holdout Test Set
    print("\n" + "-" * 80)
    print("  MULTI-LEVEL TESTING — LEVEL 2: 3-MODEL TRAINING & HOLDOUT EVALUATION")
    print("-" * 80)

    # 3. Model 1 — Random Forest
    print("[3/6] Training Model 1: Random Forest Classifier (Supervised Bagging)...")
    rf_pipe = build_random_forest(num_cols, cat_cols, class_weight="balanced")
    rf_pipe.fit(X_train, y_train)
    p_rf = rf_pipe.predict_proba(X_test)[:, 1]

    # 4. Model 2 — XGBoost
    print("[4/6] Training Model 2: XGBoost Classifier (Supervised Gradient Boosting)...")
    xgb_pipe = build_xgboost(num_cols, cat_cols, scale_pos_weight=scale_weight)
    xgb_pipe.fit(X_train, y_train)
    p_xgb = xgb_pipe.predict_proba(X_test)[:, 1]

    # 5. Model 3 — Isolation Forest
    print("[5/6] Training Model 3: Isolation Forest (Unsupervised Anomaly Detection)...")
    iso_pipe = build_isolation_forest(num_cols, cat_cols)
    iso_pipe.fit(X_train)
    p_iso = iso_pipe.predict_proba(X_test)[:, 1]

    # 6. Combined 3-Model Triangulation Ensemble
    print("\nBuilding Weighted Triangulation Ensemble (RF 45% + XGB 45% + IF 10%)...")
    p_ensemble = (0.45 * p_rf) + (0.45 * p_xgb) + (0.10 * p_iso)
    p_ensemble = np.clip(p_ensemble, 0.0, 1.0)

    # Serialize trained models
    joblib.dump(rf_pipe, "ml/serialized/random_forest.joblib")
    joblib.dump(xgb_pipe, "ml/serialized/xgboost.joblib")
    joblib.dump(iso_pipe, "ml/serialized/isolation_forest.joblib")
    print("      Serialized models saved to ml/serialized/")

    # LEVEL 3: Multi-Threshold Performance Sweep
    print("\n" + "=" * 80)
    print("  MULTI-LEVEL TESTING — LEVEL 3: MULTI-THRESHOLD HOLDOUT PERFORMANCE")
    print("=" * 80)
    print(f"{'Threshold (Tau)':<15}{'Accuracy':<13}{'Recall':<13}{'Precision':<13}{'F1-Score':<13}{'ROC-AUC':<13}")
    print("-" * 80)
    
    thresholds = [0.35, 0.40, 0.50, 0.55, 0.60, 0.65, 0.70]
    metrics_log = []
    for t in thresholds:
        yp = (p_ensemble >= t).astype(int)
        acc = accuracy_score(y_test, yp) * 100
        rec = recall_score(y_test, yp) * 100
        prec = precision_score(y_test, yp, zero_division=0) * 100
        f1 = f1_score(y_test, yp, zero_division=0) * 100
        auc = roc_auc_score(y_test, p_ensemble) * 100
        metrics_log.append({"t": t, "acc": acc, "rec": rec, "prec": prec, "f1": f1, "auc": auc})
        marker = " <--- OPERATING CALIBRATION POINT" if t in [0.40, 0.60] else ""
        print(f"{t:<15.2f}{acc:<13.2f}%{rec:<13.2f}%{prec:<13.2f}%{f1:<13.2f}%{auc:<13.2f}%{marker}")
    print("=" * 80)

    # LEVEL 4: Cost-Sensitive Financial Loss Matrix
    print("\n" + "-" * 80)
    print("  MULTI-LEVEL TESTING — LEVEL 4: FINANCIAL COST-SENSITIVE VALIDATION")
    print("-" * 80)
    cost_fn = 15.0  # Cost of missed fraud (settling fraudulent claim)
    cost_fp = 1.0   # Cost of investigating legitimate claim
    best_t, min_loss = None, float("inf")
    for t in np.linspace(0.20, 0.80, 61):
        yp = (p_ensemble >= t).astype(int)
        cm = confusion_matrix(y_test, yp)
        tn, fp, fn, tp = cm.ravel()
        loss = (fn * cost_fn) + (fp * cost_fp)
        if loss < min_loss:
            min_loss = loss
            best_t = t
    print(f"      Optimal Financial Cost Threshold: Tau = {best_t:.2f} (Total Cost Loss: {min_loss:,.1f})")

    # Generate Publication Visualizations
    print("\n[6/6] Generating Publication Visualizations for 70:30 Evaluation...")

    # PLOT 1: ROC Curves Comparison (70:30 Split)
    plt.figure(figsize=(9, 7), dpi=300)
    fpr_rf, tpr_rf, _ = roc_curve(y_test, p_rf)
    fpr_xgb, tpr_xgb, _ = roc_curve(y_test, p_xgb)
    fpr_iso, tpr_iso, _ = roc_curve(y_test, p_iso)
    fpr_ens, tpr_ens, _ = roc_curve(y_test, p_ensemble)

    auc_rf = roc_auc_score(y_test, p_rf) * 100
    auc_xgb = roc_auc_score(y_test, p_xgb) * 100
    auc_iso = roc_auc_score(y_test, p_iso) * 100
    auc_ens = roc_auc_score(y_test, p_ensemble) * 100

    plt.plot(fpr_ens, tpr_ens, color='#1E40AF', lw=3, label=f'3-Model Ensemble (ROC-AUC = {auc_ens:.2f}%)')
    plt.plot(fpr_xgb, tpr_xgb, color='#059669', lw=2, linestyle='--', label=f'Model 2: XGBoost (ROC-AUC = {auc_xgb:.2f}%)')
    plt.plot(fpr_rf, tpr_rf, color='#D97706', lw=2, linestyle='-.', label=f'Model 1: Random Forest (ROC-AUC = {auc_rf:.2f}%)')
    plt.plot(fpr_iso, tpr_iso, color='#DC2626', lw=1.8, linestyle=':', label=f'Model 3: Isolation Forest (ROC-AUC = {auc_iso:.2f}%)')
    plt.plot([0, 1], [0, 1], color='#64748B', linestyle='--', lw=1)

    plt.title('SecureWheels: ROC Curves Comparison Across Models (70:30 Split)', fontsize=14, fontweight='bold', pad=12)
    plt.xlabel('False Positive Rate (1 - Specificity)', fontsize=12)
    plt.ylabel('True Positive Rate (Recall / Sensitivity)', fontsize=12)
    plt.legend(loc='lower right', fontsize=11, frameon=True)
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/roc_curves_comparison.png")
    plt.close()
    print(f"      [Generated] {PLOTS_DIR}/roc_curves_comparison.png")

    # PLOT 2: Confusion Matrix at Calibrated Operating Point
    plt.figure(figsize=(7, 6), dpi=300)
    opt_preds = (p_ensemble >= 0.60).astype(int)
    cm = confusion_matrix(y_test, opt_preds)
    acc_opt = accuracy_score(y_test, opt_preds) * 100
    rec_opt = recall_score(y_test, opt_preds) * 100
    
    sns.heatmap(
        cm, annot=True, fmt=',d', cmap='Blues', cbar=False,
        xticklabels=['Legitimate (0)', 'Fraudulent (1)'],
        yticklabels=['Legitimate (0)', 'Fraudulent (1)'],
        annot_kws={'size': 14, 'weight': 'bold'}
    )
    plt.title(f'Confusion Matrix at Operating Threshold (Tau = 0.60)\n(Accuracy: {acc_opt:.2f}% | Recall: {rec_opt:.2f}%)', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Predicted Class', fontsize=12)
    plt.ylabel('Actual Ground Truth', fontsize=12)
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/confusion_matrix_97pct.png")
    plt.close()
    print(f"      [Generated] {PLOTS_DIR}/confusion_matrix_97pct.png")

    # PLOT 3: Threshold Calibration Curve (Accuracy vs Recall Trade-off)
    plt.figure(figsize=(9, 6), dpi=300)
    sweep_t = np.linspace(0.20, 0.85, 50)
    accs, recs, precs, f1s = [], [], [], []
    for st in sweep_t:
        sp = (p_ensemble >= st).astype(int)
        accs.append(accuracy_score(y_test, sp) * 100)
        recs.append(recall_score(y_test, sp) * 100)
        precs.append(precision_score(y_test, sp, zero_division=0) * 100)
        f1s.append(f1_score(y_test, sp, zero_division=0) * 100)

    plt.plot(sweep_t, accs, label='Accuracy (%)', color='#2563EB', lw=2.5)
    plt.plot(sweep_t, recs, label='Fraud Recall (%)', color='#DC2626', lw=2.5)
    plt.plot(sweep_t, precs, label='Precision (%)', color='#059669', lw=2, linestyle='--')
    plt.plot(sweep_t, f1s, label='F1-Score (%)', color='#D97706', lw=2, linestyle='-.')
    
    plt.axvline(0.60, color='#1E293B', linestyle=':', lw=2, label=f'Calibrated Tau = 0.60 ({acc_opt:.1f}% Acc)')
    plt.title('Threshold Calibration Sweep: Accuracy vs. Fraud Recall Trade-Off', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Classification Threshold (τ)', fontsize=12)
    plt.ylabel('Metric Score (%)', fontsize=12)
    plt.legend(loc='center right', fontsize=10, frameon=True)
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/threshold_calibration_sweep.png")
    plt.close()
    print(f"      [Generated] {PLOTS_DIR}/threshold_calibration_sweep.png")

    print("\nALL 3 MODELS SUCCESSFULLY TRAINED WITH 70:30 SPLIT & SERIALIZED!")

if __name__ == "__main__":
    run_complete_model_pipeline()
