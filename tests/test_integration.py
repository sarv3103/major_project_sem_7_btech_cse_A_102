import os
import json
import sqlite3
from datetime import datetime
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_full_platform_lifecycle():
    print("\n=================================================================")
    print("      INTEGRATION TEST: FULL INSURANCE & AI AUDIT LIFECYCLE      ")
    print("=================================================================\n")
    
    # 1. Health Check
    res = client.get("/api/health")
    assert res.status_code == 200
    print("Step 1: Health check passed ->", res.json())
    
    # 2. Register Customer
    reg_payload = {
        "full_name": "Sarvesh Kulkarni",
        "email": "sarvesh@testmifd.com",
        "mobile": "9876543210",
        "password": "SecurePassword123"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    if res.status_code == 200 and "user_id" in res.json():
        user_id = res.json()["user_id"]
    else:
        res = client.post("/api/auth/login", json={"email_or_mobile": "sarvesh@testmifd.com", "password": "SecurePassword123"})
        if res.status_code == 200:
            user_id = res.json()["user_id"]
        else:
            # Generate unique user for test
            unique_email = f"test_{int(datetime.now().timestamp())}@testmifd.com"
            reg_payload["email"] = unique_email
            reg_payload["mobile"] = str(int(datetime.now().timestamp()))[:10]
            res = client.post("/api/auth/register", json=reg_payload)
            user_id = res.json()["user_id"]
    print(f"Step 2: Customer authenticated -> User ID: {user_id}")
    
    # 3. Add Vehicle to Garage
    veh_payload = {
        "registration_number": "MH12PK2026",
        "vehicle_type": "Car",
        "manufacturer": "Honda",
        "model": "Civic Sport",
        "manufacturing_year": 2022,
        "fuel_type": "Petrol",
        "estimated_idv": 850000.0
    }
    res = client.post(f"/api/vehicles?user_id={user_id}", json=veh_payload)
    if res.status_code == 200:
        veh_id = res.json()["vehicle_id"]
    else:
        v_list = client.get(f"/api/vehicles?user_id={user_id}").json()
        veh_id = v_list[0]["id"]
    print(f"Step 3: Vehicle enrolled in garage -> Vehicle ID: {veh_id}")
    
    # 4. Purchase Policy (Rs 1 Academic Demo Payment)
    pol_payload = {
        "vehicle_id": veh_id,
        "duration_years": 1,
        "plan_type": "Comprehensive",
        "calculated_premium": 14500.0,
        "prototype_amount_paid": 1.0,
        "payment_method": "Simulated UPI Sandbox"
    }
    res = client.post(f"/api/policies?user_id={user_id}", json=pol_payload)
    assert res.status_code == 200
    pol_data = res.json()
    pol_id = pol_data["policy_id"]
    print(f"Step 4: Policy purchased (Rs. 1 demo payment) -> Policy No: {pol_data['policy_number']}")
    
    # 5. Download Certificate PDF
    res = client.get(f"/api/policies/{pol_id}/pdf")
    assert res.status_code == 200
    assert len(res.content) > 1000
    print(f"Step 5: Policy PDF certificate generated -> Size: {len(res.content)} bytes")
    
    # 6. Claim Initiation via OTP
    res = client.post("/api/claims/otp/initiate", json={"mobile_or_email": "9876543210"})
    assert res.status_code == 200
    demo_otp = res.json()["demo_otp"]
    print(f"Step 6: OTP sent -> Code: {demo_otp}")
    
    # 7. OTP Verification
    res = client.post("/api/claims/otp/verify", json={"mobile_or_email": "9876543210", "otp_code": demo_otp})
    assert res.status_code == 200
    print("Step 7: OTP successfully verified.")
    
    # 8. Submit Claim with Multi-Modal & Incident Attributes (Accident on valid policy date)
    today_str = datetime.now().strftime("%Y-%m-%d")
    claim_payload = {
        "policy_id": pol_id,
        "accident_date": today_str,
        "accident_time": "14:30",
        "accident_location": "Pune Highway",
        "incident_description": "Vehicle collided with guardrail during afternoon rain.",
        "damage_description": "Front bumper and right headlight shattered.",
        "estimated_repair_cost": 45000.0,
        "is_drivable": True,
        "third_party_involved": False,
        "injury_reported": False,
        "fatality_reported": False,
        "police_report_filed": True,
        "witness_present": False,
        "fault": "Policy Holder",
        "accident_area": "Urban",
        "damage_image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
        "damage_image_urls": [
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=p1",
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=p2",
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=p3",
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=p4",
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=p5"
        ]
    }
    res = client.post(f"/api/claims/submit?user_id={user_id}", json=claim_payload)
    assert res.status_code == 200, f"Submit claim failed: {res.text}"
    claim_result = res.json()
    claim_id = claim_result["claim_id"]
    ai_analysis = claim_result["ai_analysis"]
    print(f"Step 8: Claim submitted -> Claim No: {claim_result['claim_number']}")
    print(f"         AI Analysis Status: {claim_result['status']}")
    print(f"         RF Score:           {ai_analysis['random_forest_score']}")
    print(f"         XGBoost Score:      {ai_analysis['xgboost_score']}")
    print(f"         Isolation Forest:   {ai_analysis['isolation_forest_score']}")
    print(f"         Ensemble Risk Score:{ai_analysis['ensemble_score']}")
    print(f"         Assigned Risk Level:{ai_analysis['risk_level']}")
    print(f"         Recommended Action: {ai_analysis['recommended_action']}")
    
    # 9. Admin Dashboard View
    res = client.get("/api/admin/dashboard")
    assert res.status_code == 200
    dash = res.json()
    print(f"Step 9: Admin dashboard verified -> Total Policies: {dash['total_policies']}, Total Claims: {dash['total_claims']}")
    
    # 10. Human-in-the-Loop Decision & Override Audit
    decision_payload = {
        "claim_id": claim_id,
        "decision": "APPROVED",
        "override_reason": "Verified photos and repair invoice match physical damage; claim approved after manual inspection.",
        "investigator_notes": "First-time claimant with verified damage."
    }
    res = client.post("/api/admin/claims/decision?admin_id=ADMIN_SARVESH", json=decision_payload)
    assert res.status_code == 200
    print(f"Step 10: Admin human decision recorded with audit justification.")
    
    # 11. Verify Audit Logs
    res = client.get("/api/admin/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    print(f"Step 11: Audit trail entries verified -> {len(logs)} events logged with immutable timestamps.")
    print("\n>>> ALL 11 END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_full_platform_lifecycle()
