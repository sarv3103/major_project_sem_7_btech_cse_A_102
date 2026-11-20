import os
import sys
import joblib
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "serialized")

class FraudInferenceService:
    def __init__(self):
        self.rf = joblib.load(os.path.join(MODELS_DIR, "random_forest.joblib"))
        self.xgb = joblib.load(os.path.join(MODELS_DIR, "xgboost.joblib"))
        self.iso = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.joblib"))
        
        # Optimal cost-sensitive operating parameters
        self.opt_threshold = 0.40
        self.w_rf = 0.45
        self.w_xgb = 0.45
        self.w_iso = 0.10

    def predict_claim(self, claim_dict: dict):
        """
        Receives claim attributes, scores through RF, XGBoost, and Isolation Forest,
        computes the cost-sensitive ensemble score, risk category, and key driver explanations.
        """
        df = pd.DataFrame([claim_dict])
        
        # Individual model scores
        rf_score = float(self.rf.predict_proba(df)[0, 1])
        xgb_score = float(self.xgb.predict_proba(df)[0, 1])
        iso_score = float(self.iso.predict_proba(df)[0, 1])
        
        # 3-Model Weighted Ensemble
        ensemble_score = (self.w_rf * rf_score) + (self.w_xgb * xgb_score) + (self.w_iso * iso_score)
        ensemble_score = float(np.clip(ensemble_score, 0.0, 1.0))
        
        # Risk categorization based on cost-sensitive validation
        if ensemble_score >= 0.55:
            risk_level = "HIGH"
            recommended_action = "MANUAL_FRAUD_INVESTIGATION"
        elif ensemble_score >= self.opt_threshold:
            risk_level = "MEDIUM"
            recommended_action = "REQUEST_ADDITIONAL_EVIDENCE"
        else:
            risk_level = "LOW"
            recommended_action = "RECOMMENDED_APPROVAL"
            
        # Model disagreement analysis
        disagreement = abs(rf_score - xgb_score) > 0.35 or abs(xgb_score - iso_score) > 0.40
        disagreement_note = ""
        if disagreement:
            if iso_score > 0.65 and max(rf_score, xgb_score) < 0.35:
                disagreement_note = "Claim resembles standard historical forms but exhibits global anomaly (high Isolation Forest score)."
            elif max(rf_score, xgb_score) > 0.65 and iso_score < 0.35:
                disagreement_note = "Supervised models match specific known fraud patterns despite standard attribute ranges."
                
        # Explainable factors
        explanations = []
        if claim_dict.get("Fault") == "Policy Holder":
            explanations.append("Accident liability attributed directly to policyholder.")
        if claim_dict.get("PastNumberOfClaims") in ["2 to 4", "more than 4"]:
            explanations.append(f"Elevated historical claim frequency ({claim_dict.get('PastNumberOfClaims')}).")
        if claim_dict.get("Days_Policy_Accident") in ["1 to 7", "8 to 15"]:
            explanations.append("Accident occurred suspiciously soon after policy inception.")
        if claim_dict.get("AddressChange_Claim") in ["under 6 months", "1 year"]:
            explanations.append("Recent policyholder address change prior to claim submission.")
            
        return {
            "random_forest_score": round(rf_score, 4),
            "xgboost_score": round(xgb_score, 4),
            "isolation_forest_score": round(iso_score, 4),
            "ensemble_score": round(ensemble_score, 4),
            "threshold_used": self.opt_threshold,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "model_disagreement": disagreement,
            "disagreement_note": disagreement_note,
            "top_contributing_factors": explanations
        }

if __name__ == "__main__":
    svc = FraudInferenceService()
    # Test sample claim
    sample = {
        "Month": "Dec", "WeekOfMonth": 5, "DayOfWeek": "Wednesday", "Make": "Honda",
        "AccidentArea": "Urban", "DayOfWeekClaimed": "Tuesday", "MonthClaimed": "Jan",
        "WeekOfMonthClaimed": 1, "Sex": "Female", "MaritalStatus": "Single",
        "Fault": "Policy Holder", "PolicyType": "Sport - Liability",
        "VehicleCategory": "Sport", "VehiclePrice": "more than 69000",
        "RepNumber": 12, "Deductible": 300, "DriverRating": 1,
        "Days_Policy_Accident": "1 to 7", "Days_Policy_Claim": "more than 30",
        "PastNumberOfClaims": "more than 4", "AgeOfVehicle": "3 years",
        "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
        "WitnessPresent": "No", "AgentType": "External",
        "NumberOfSuppliments": "none", "AddressChange_Claim": "under 6 months",
        "NumberOfCars": "3 to 4", "Year": 1994, "BasePolicy": "Liability"
    }
    res = svc.predict_claim(sample)
    print("Inference result for high-risk test claim:")
    print(res)
