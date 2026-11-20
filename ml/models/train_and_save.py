import os
import joblib
import pandas as pd
from ml.preprocessing.pipeline import load_data, clean_data, get_feature_lists
from ml.models.random_forest import build_random_forest
from ml.models.xgboost_model import build_xgboost
from ml.models.isolation_forest import build_isolation_forest

def train_and_export_models():
    print("Training and serializing production models...")
    df = clean_data(load_data())
    target_col = "FraudFound_P"
    X = df.drop(columns=[target_col])
    y = df[target_col].values
    num_cols, cat_cols = get_feature_lists(df, target_col=target_col)
    
    # 1. Fit Random Forest
    rf_pipe = build_random_forest(num_cols, cat_cols, class_weight="balanced")
    rf_pipe.fit(X, y)
    
    # 2. Fit XGBoost
    xgb_pipe = build_xgboost(num_cols, cat_cols, scale_pos_weight=15.7)
    xgb_pipe.fit(X, y)
    
    # 3. Fit Isolation Forest
    iso_pipe = build_isolation_forest(num_cols, cat_cols)
    iso_pipe.fit(X)
    
    os.makedirs("ml/serialized", exist_ok=True)
    joblib.dump(rf_pipe, "ml/serialized/random_forest.joblib")
    joblib.dump(xgb_pipe, "ml/serialized/xgboost.joblib")
    joblib.dump(iso_pipe, "ml/serialized/isolation_forest.joblib")
    
    print("Exported all 3 models to ml/serialized/")

if __name__ == "__main__":
    train_and_export_models()
