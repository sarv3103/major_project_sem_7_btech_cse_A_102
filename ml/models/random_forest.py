import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from ml.preprocessing.pipeline import build_preprocessor, get_feature_lists

def build_random_forest(num_cols, cat_cols, class_weight=None, n_estimators=100, max_depth=15, random_state=42):
    """
    Constructs a complete leakage-free pipeline with ColumnTransformer preprocessor
    and RandomForestClassifier.
    """
    preprocessor = build_preprocessor(num_cols, cat_cols)
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight=class_weight,
        random_state=random_state,
        n_jobs=-1
    )
    model_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", rf)
    ])
    return model_pipeline

if __name__ == "__main__":
    import pandas as pd
    from ml.preprocessing.pipeline import load_data, clean_data
    df = clean_data(load_data())
    num_cols, cat_cols = get_feature_lists(df)
    pipe = build_random_forest(num_cols, cat_cols)
    print("Random Forest Pipeline created successfully:")
    print(pipe)
