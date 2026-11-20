import os
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists
from ml.models.random_forest import build_random_forest
from ml.models.xgboost_model import build_xgboost
from ml.models.isolation_forest import build_isolation_forest
from ml.evaluation.metrics import evaluate_predictions, print_metrics

def run_baseline_evaluation(n_splits=5, cost_fp=1.0, cost_fn=10.0):
    print("=================================================================")
    print("   PHASE 1 - ML BASELINE EVALUATION (5-FOLD STRATIFIED CV)       ")
    print(f"   Dataset: carclaims (15,420 claims) | Cost Ratio: FP={cost_fp} : FN={cost_fn}")
    print("=================================================================\n")
    
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)
    
    models = {
        "Random Forest (Baseline)": lambda: build_random_forest(num_cols, cat_cols),
        "Random Forest (Balanced)": lambda: build_random_forest(num_cols, cat_cols, class_weight="balanced"),
        "XGBoost (Baseline)": lambda: build_xgboost(num_cols, cat_cols),
        "XGBoost (Weighted scale=15.7)": lambda: build_xgboost(num_cols, cat_cols, scale_pos_weight=15.7),
        "Isolation Forest (Unsupervised)": lambda: build_isolation_forest(num_cols, cat_cols, contamination=0.06)
    }
    
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    results = {}
    
    for name, model_fn in models.items():
        print(f"Evaluating: {name} across {n_splits} folds...")
        oof_preds = np.zeros(len(y), dtype=int)
        oof_probs = np.zeros(len(y), dtype=float)
        
        for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            pipe = model_fn()
            # Fit strictly within training fold (No leakage)
            pipe.fit(X_train, y_train)
            
            probs = pipe.predict_proba(X_val)[:, 1]
            preds = (probs >= 0.5).astype(int)
            
            oof_probs[val_idx] = probs
            oof_preds[val_idx] = preds
            
        m = evaluate_predictions(y, oof_preds, oof_probs, cost_fp=cost_fp, cost_fn=cost_fn)
        results[name] = m
        print_metrics(m, title=f"Out-Of-Fold CV Result: {name}")
        
    return results

if __name__ == "__main__":
    run_baseline_evaluation()
