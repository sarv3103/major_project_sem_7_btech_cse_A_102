import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.pipeline import Pipeline
from ml.preprocessing.pipeline import build_preprocessor, get_feature_lists

class NormalizedIsolationForest(BaseEstimator, ClassifierMixin):
    """
    Wraps Isolation Forest to produce an anomaly probability/risk score in [0, 1].
    IsolationForest.score_samples outputs negative values where more negative = more anomalous.
    We calibrate/invert this so that:
      Higher output score in [0, 1] consistently means HIGHER fraud/anomaly risk.
    """
    def __init__(self, n_estimators=150, max_samples="auto", contamination=0.06, random_state=42):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            max_samples=self.max_samples,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.min_score_ = None
        self.max_score_ = None

    def fit(self, X, y=None):
        self.model.fit(X)
        # Compute range on training set for min-max normalization
        raw_scores = -self.model.score_samples(X)  # negate so larger = more anomalous
        self.min_score_ = float(np.percentile(raw_scores, 1))
        self.max_score_ = float(np.percentile(raw_scores, 99))
        if self.max_score_ == self.min_score_:
            self.max_score_ += 1e-6
        return self

    def predict_proba(self, X):
        raw_scores = -self.model.score_samples(X)
        # Min-max scale into [0, 1]
        norm_scores = (raw_scores - self.min_score_) / (self.max_score_ - self.min_score_)
        norm_scores = np.clip(norm_scores, 0.0, 1.0)
        # Return 2D array [prob_normal, prob_anomaly]
        prob_normal = 1.0 - norm_scores
        return np.vstack([prob_normal, norm_scores]).T

    def predict(self, X, threshold=0.5):
        probs = self.predict_proba(X)[:, 1]
        return (probs >= threshold).astype(int)

def build_isolation_forest(num_cols, cat_cols, contamination=0.06, n_estimators=150, random_state=42):
    """
    Constructs a complete leakage-free pipeline with ColumnTransformer preprocessor
    and NormalizedIsolationForest.
    """
    preprocessor = build_preprocessor(num_cols, cat_cols)
    iso = NormalizedIsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state
    )
    model_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", iso)
    ])
    return model_pipeline

if __name__ == "__main__":
    from ml.preprocessing.pipeline import load_data, clean_data
    df = clean_data(load_data())
    num_cols, cat_cols = get_feature_lists(df)
    pipe = build_isolation_forest(num_cols, cat_cols)
    print("Isolation Forest Pipeline created successfully:")
    print(pipe)
