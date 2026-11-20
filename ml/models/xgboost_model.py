import os
import joblib
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
from ml.preprocessing.pipeline import build_preprocessor, get_feature_lists

def build_xgboost(num_cols, cat_cols, scale_pos_weight=1.0, n_estimators=150, max_depth=6, learning_rate=0.08, random_state=42):
    """
    Constructs a complete leakage-free pipeline with ColumnTransformer preprocessor
    and XGBClassifier.
    """
    preprocessor = build_preprocessor(num_cols, cat_cols)
    xgb = XGBClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        scale_pos_weight=scale_pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=random_state,
        n_jobs=-1
    )
    model_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", xgb)
    ])
    return model_pipeline

if __name__ == "__main__":
    from ml.preprocessing.pipeline import load_data, clean_data
    df = clean_data(load_data())
    num_cols, cat_cols = get_feature_lists(df)
    pipe = build_xgboost(num_cols, cat_cols)
    print("XGBoost Pipeline created successfully:")
    print(pipe)
