import os
import joblib
import shap
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists
from ml.models.xgboost_model import build_xgboost

def explain_model_with_shap():
    print("=================================================================")
    print("   PHASE 3 - SHAP EXPLAINABILITY ENGINE (FEATURE-LEVEL)          ")
    print("=================================================================\n")
    
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)
    
    pipe = build_xgboost(num_cols, cat_cols, scale_pos_weight=15.7)
    pipe.fit(X, y)
    
    preprocessor = pipe.named_steps["preprocessor"]
    model = pipe.named_steps["classifier"]
    
    X_trans = preprocessor.transform(X)
    feature_names = preprocessor.get_feature_names_out()
    
    print("Computing TreeSHAP values for a sample of 500 claims...")
    sample_indices = np.random.choice(X_trans.shape[0], size=500, replace=False)
    X_sample = X_trans[sample_indices]
    
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)
    
    # Global feature importance
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    top_indices = np.argsort(mean_abs_shap)[::-1][:15]
    
    print("\nTop 15 Most Influential Features Driving Fraud Probability (SHAP):")
    for i, idx in enumerate(top_indices, 1):
        print(f" {i:2d}. {feature_names[idx]:<45} | Mean |SHAP|: {mean_abs_shap[idx]:.4f}")
        
    os.makedirs("ml/explainability/output", exist_ok=True)
    
    # Save SHAP summary values
    df_shap_summary = pd.DataFrame({
        "feature": feature_names[top_indices],
        "mean_abs_shap": mean_abs_shap[top_indices]
    })
    df_shap_summary.to_csv("ml/explainability/output/top_shap_features.csv", index=False)
    print("\nSaved SHAP summary to ml/explainability/output/top_shap_features.csv")

if __name__ == "__main__":
    np.random.seed(42)
    explain_model_with_shap()
