import os
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# 1. Load data
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "carclaims.csv")

def load_data(filepath=DATA_PATH):
    """Loads the carclaims dataset."""
    df = pd.read_csv(filepath)
    return df

def clean_data(df):
    """
    Cleans known irregularities:
    - Drops 'PolicyNumber' (unique identifier - prevents leakage).
    - Drops 'Age' because it is redundant with 'AgeOfPolicyHolder' and contains 320 invalid 0 values (as established in IEEE references).
    - Replaces '0' in 'MonthClaimed' and 'DayOfWeekClaimed' with NaN/mode.
    """
    df = df.copy()
    
    # Drop identifier
    if "PolicyNumber" in df.columns:
        df = df.drop(columns=["PolicyNumber"])
        
    # Drop redundant/zero-filled Age in favor of AgeOfPolicyHolder bracket
    if "Age" in df.columns:
        df = df.drop(columns=["Age"])
        
    # Replace '0' in MonthClaimed and DayOfWeekClaimed
    if "MonthClaimed" in df.columns:
        mode_month = df[df["MonthClaimed"] != "0"]["MonthClaimed"].mode()[0]
        df["MonthClaimed"] = df["MonthClaimed"].replace("0", mode_month)
        
    if "DayOfWeekClaimed" in df.columns:
        mode_day = df[df["DayOfWeekClaimed"] != "0"]["DayOfWeekClaimed"].mode()[0]
        df["DayOfWeekClaimed"] = df["DayOfWeekClaimed"].replace("0", mode_day)
        
    return df

def get_feature_lists(df, target_col="FraudFound_P"):
    """Separates numerical and categorical columns."""
    features = [c for c in df.columns if c != target_col]
    num_cols = df[features].select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df[features].select_dtypes(exclude=[np.number]).columns.tolist()
    return num_cols, cat_cols

def build_preprocessor(num_cols, cat_cols):
    """
    Constructs a ColumnTransformer applying StandardScaler to numerical features
    and OneHotEncoder to categorical features.
    Strictly fit within CV folds or training set to prevent data leakage.
    """
    num_transformer = Pipeline(steps=[
        ("scaler", StandardScaler())
    ])
    
    cat_transformer = Pipeline(steps=[
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_transformer, num_cols),
            ("cat", cat_transformer, cat_cols)
        ]
    )
    return preprocessor

if __name__ == "__main__":
    df = load_data()
    print(f"Initial shape: {df.shape}")
    df_clean = clean_data(df)
    print(f"Cleaned shape: {df_clean.shape}")
    num_cols, cat_cols = get_feature_lists(df_clean)
    print(f"Numerical features ({len(num_cols)}): {num_cols}")
    print(f"Categorical features ({len(cat_cols)}): {cat_cols}")
