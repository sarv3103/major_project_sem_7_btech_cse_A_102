import os
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.linear_model import LogisticRegression
from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists
from ml.models.random_forest import build_random_forest
from ml.models.xgboost_model import build_xgboost
from ml.models.isolation_forest import build_isolation_forest
from ml.evaluation.metrics import evaluate_predictions, print_metrics

def evaluate_threshold_sweep(y_true, y_prob, cost_fp=1.0, cost_fn=10.0, name="Model"):
    thresholds = np.linspace(0.05, 0.95, 19)
    best_cost = float("inf")
    best_thresh = 0.5
    best_metrics = None
    
    for t in thresholds:
        preds = (y_prob >= t).astype(int)
        m = evaluate_predictions(y_true, preds, y_prob, cost_fp=cost_fp, cost_fn=cost_fn)
        if m["total_cost"] < best_cost:
            best_cost = m["total_cost"]
            best_thresh = t
            best_metrics = m
            
    print(f"\n---> Best Cost-Sensitive Operating Point for {name}:")
    print(f"     Optimal Threshold: {best_thresh:.2f}")
    print(f"     Total Cost: {best_metrics['total_cost']:.1f} (vs default 0.5 cost: {evaluate_predictions(y_true, (y_prob>=0.5).astype(int), y_prob, cost_fp, cost_fn)['total_cost']:.1f})")
    print(f"     Fraud Recall: {best_metrics['recall']:.4f} | Precision: {best_metrics['precision']:.4f} | F1: {best_metrics['f1_score']:.4f} | PR-AUC: {best_metrics['pr_auc']:.4f}")
    return best_thresh, best_metrics

def run_ensemble_and_cost_experiments(n_splits=5, cost_fp=1.0, cost_fn=10.0):
    print("=================================================================")
    print("   PHASE 2 - ENSEMBLE & COST-SENSITIVE OPTIMIZATION (5-FOLD CV)  ")
    print(f"   Dataset: carclaims (15,420 claims) | Cost Ratio: FP={cost_fp} : FN={cost_fn}")
    print("=================================================================\n")
    
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)
    
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    
    oof_rf = np.zeros(len(y))
    oof_xgb = np.zeros(len(y))
    oof_if = np.zeros(len(y))
    
    print("Generating out-of-fold probability distributions for base estimators...")
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train = y[train_idx]
        
        # Fit models strictly within fold
        rf = build_random_forest(num_cols, cat_cols, class_weight="balanced")
        xgb = build_xgboost(num_cols, cat_cols, scale_pos_weight=15.7)
        iso = build_isolation_forest(num_cols, cat_cols)
        
        rf.fit(X_train, y_train)
        xgb.fit(X_train, y_train)
        iso.fit(X_train)
        
        oof_rf[val_idx] = rf.predict_proba(X_val)[:, 1]
        oof_xgb[val_idx] = xgb.predict_proba(X_val)[:, 1]
        oof_if[val_idx] = iso.predict_proba(X_val)[:, 1]
        
    print("\nEvaluating Ensembles...")
    
    # 1. E4: RF + XGBoost (Average)
    p_rf_xgb = 0.5 * oof_rf + 0.5 * oof_xgb
    m_rf_xgb = evaluate_predictions(y, (p_rf_xgb >= 0.5).astype(int), p_rf_xgb, cost_fp, cost_fn)
    print_metrics(m_rf_xgb, "E4: RF + XGBoost (Default 0.5)")
    evaluate_threshold_sweep(y, p_rf_xgb, cost_fp, cost_fn, "E4: RF + XGBoost")
    
    # 2. E7: 3-Model Weighted Ensemble (RF + XGB + IF)
    # Weights reflecting supervised confidence + anomaly bonus (e.g. 0.45, 0.45, 0.10)
    p_tri = 0.45 * oof_rf + 0.45 * oof_xgb + 0.10 * oof_if
    m_tri = evaluate_predictions(y, (p_tri >= 0.5).astype(int), p_tri, cost_fp, cost_fn)
    print_metrics(m_tri, "E7: RF + XGBoost + Isolation Forest (Default 0.5)")
    evaluate_threshold_sweep(y, p_tri, cost_fp, cost_fn, "E7: RF + XGBoost + Isolation Forest")
    
    # 3. E8: Stacking Ensemble (Meta-learner Logistic Regression)
    print("\nTraining Stacking Meta-Learner on Out-Of-Fold Predictions...")
    stack_oof_prob = np.zeros(len(y))
    meta_features = np.column_stack([oof_rf, oof_xgb, oof_if])
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(meta_features, y)):
        meta_lr = LogisticRegression(C=1.0, class_weight="balanced", random_state=42)
        meta_lr.fit(meta_features[train_idx], y[train_idx])
        stack_oof_prob[val_idx] = meta_lr.predict_proba(meta_features[val_idx])[:, 1]
        
    m_stack = evaluate_predictions(y, (stack_oof_prob >= 0.5).astype(int), stack_oof_prob, cost_fp, cost_fn)
    print_metrics(m_stack, "E8: Stacking Ensemble (Logistic Regression Meta-Learner at 0.5)")
    evaluate_threshold_sweep(y, stack_oof_prob, cost_fp, cost_fn, "E8: Stacking Ensemble")

if __name__ == "__main__":
    run_ensemble_and_cost_experiments()
