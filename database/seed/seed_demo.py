import os
import json
import sqlite3
import hashlib
from backend.models.database import get_db, init_db
from backend.services.fraud_service import FraudInferenceService
from backend.services.pdf_service import PolicyPDFGenerator

def seed_demo_claims():
    print("=================================================================")
    print("   SEEDING 3 CANONICAL DEMONSTRATION CLAIMS (VIVA / DEMO READY)  ")
    print("=================================================================\n")
    
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    fraud_svc = FraudInferenceService()
    
    # 1. Ensure Demo Policyholder User
    cursor.execute("SELECT id FROM users WHERE email = 'demo@securewheels.com'")
    row = cursor.fetchone()
    if row:
        user_id = row["id"]
    else:
        user_id = "USER-DEMO-001"
        cursor.execute("""
        INSERT INTO users (id, full_name, email, mobile, password_hash, role)
        VALUES (?, 'Rahul Sharma', 'demo@securewheels.com', '9123456780', ?, 'CUSTOMER')
        """, (user_id, hashlib.sha256("DemoPass123".encode("utf-8")).hexdigest()))
        
    # 2. Seed 3 Dedicated Vehicles & Policies
    demo_scenarios = [
        {
            "code": "A",
            "title": "Claim A — Genuine High-Damage Claim",
            "reg_no": "MH12GD2024",
            "type": "Car", "make": "Honda", "model": "City VX", "year": 2021, "idv": 850000.0,
            "policy_num": "MIFD-2026-CAR-00001001",
            "acc_date": "2026-09-12",
            "acc_desc": "Major multi-car collision on expressway during heavy rainfall.",
            "dmg_desc": "Severe structural deformation, broken front radiator, headlights, bumper.",
            "est_repair": 480000.0,
            "features": {
                "Month": "Sep", "WeekOfMonth": 2, "DayOfWeek": "Saturday", "Make": "Honda",
                "AccidentArea": "Rural", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 3, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 4, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "more than 30",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "36 to 40", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            }
        },
        {
            "code": "B",
            "title": "Claim B — Medium-Risk Discrepancy Claim",
            "reg_no": "MH12MD2025",
            "type": "Car", "make": "Toyota", "model": "Corolla Altis", "year": 2020, "idv": 720000.0,
            "policy_num": "MIFD-2026-CAR-00002002",
            "acc_date": "2026-09-13",
            "acc_desc": "Impacted parking pillar while reversing in basement.",
            "dmg_desc": "Rear fender and taillight assembly crushed.",
            "est_repair": 65000.0,
            "features": {
                "Month": "Sep", "WeekOfMonth": 2, "DayOfWeek": "Sunday", "Make": "Toyota",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Tuesday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 3, "Sex": "Male", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "20000 to 29000",
                "RepNumber": 8, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "15 to 30", "Days_Policy_Claim": "more than 30",
                "PastNumberOfClaims": "1", "AgeOfVehicle": "4 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "1 to 2", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1995, "BasePolicy": "Collision"
            }
        },
        {
            "code": "C",
            "title": "Claim C — High-Risk Fraud Pattern Claim",
            "reg_no": "MH12HR2026",
            "type": "Car", "make": "Pontiac", "model": "Firebird Sport", "year": 2023, "idv": 1100000.0,
            "policy_num": "MIFD-2026-CAR-00003003",
            "acc_date": "2026-09-14",
            "acc_desc": "Claimant claims sudden brake failure resulted in front and underbody destruction.",
            "dmg_desc": "Massive engine and front fascia damage claimed immediately after policy activation.",
            "est_repair": 820000.0,
            "features": {
                "Month": "Nov", "WeekOfMonth": 5, "DayOfWeek": "Friday", "Make": "Pontiac",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Dec",
                "WeekOfMonthClaimed": 1, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Sport - Liability",
                "VehicleCategory": "Sport", "VehiclePrice": "more than 69000",
                "RepNumber": 12, "Deductible": 300, "DriverRating": 4,
                "Days_Policy_Accident": "1 to 7", "Days_Policy_Claim": "more than 30",
                "PastNumberOfClaims": "more than 4", "AgeOfVehicle": "new",
                "AgeOfPolicyHolder": "21 to 25", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "more than 5", "AddressChange_Claim": "under 6 months",
                "NumberOfCars": "3 to 4", "Year": 1994, "BasePolicy": "Liability"
            }
        }
    ]

    for item in demo_scenarios:
        # Create Vehicle
        veh_id = f"VEH-{item['code']}"
        cursor.execute("SELECT id FROM vehicles WHERE id = ?", (veh_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO vehicles (id, user_id, registration_number, vehicle_type, manufacturer, model, manufacturing_year, fuel_type, estimated_idv)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Petrol', ?)
            """, (veh_id, user_id, item["reg_no"], item["type"], item["make"], item["model"], item["year"], item["idv"]))
            
        # Create Policy
        pol_id = f"POL-{item['code']}"
        cursor.execute("SELECT id FROM policies WHERE id = ?", (pol_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO policies (id, policy_number, user_id, vehicle_id, duration_years, plan_type, calculated_premium, prototype_amount_paid, start_date, end_date, status)
            VALUES (?, ?, ?, ?, 1, 'Comprehensive', ?, 1.0, '2026-09-01', '2027-08-31', 'ACTIVE')
            """, (pol_id, item["policy_num"], user_id, veh_id, item["idv"] * 0.025))

        # Generate Policy PDF
        p_dict = {"policy_number": item["policy_num"], "status": "ACTIVE", "start_date": "2026-09-01", "end_date": "2027-08-31", "plan_type": "Comprehensive", "calculated_premium": item["idv"] * 0.025, "prototype_amount_paid": 1.0}
        c_dict = {"full_name": "Rahul Sharma", "mobile": "9123456780", "email": "demo@securewheels.com", "id": user_id}
        v_dict = {"registration_number": item["reg_no"], "vehicle_type": item["type"], "manufacturer": item["make"], "model": item["model"], "manufacturing_year": item["year"], "fuel_type": "Petrol", "estimated_idv": item["idv"]}
        pdf_bytes = PolicyPDFGenerator.generate_policy_pdf(p_dict, c_dict, v_dict)
        with open(f"documents/policy_templates/{item['policy_num']}.pdf", "wb") as f:
            f.write(pdf_bytes)

        # Create Claim
        claim_id = f"CLAIM-DEMO-{item['code']}"
        claim_num = f"CLM-2026-0000000{item['code']}"
        cursor.execute("SELECT id FROM claims WHERE id = ?", (claim_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO claims (
                id, claim_number, policy_id, user_id, accident_date, accident_time, accident_location,
                incident_description, damage_description, estimated_repair_cost, is_drivable,
                third_party_involved, injury_reported, fatality_reported, police_report_filed, witness_present,
                fault, accident_area, status
            ) VALUES (?, ?, ?, ?, ?, '15:00', 'Pune Outer Ring', ?, ?, ?, 1, 0, 0, 0, 1, 0, ?, 'Urban', 'SUBMITTED')
            """, (claim_id, claim_num, pol_id, user_id, item["acc_date"], item["acc_desc"], item["dmg_desc"], item["est_repair"], item["features"]["Fault"]))

            # Run Model Inference
            ai = fraud_svc.predict_claim(item["features"])
            
            cursor.execute("""
            INSERT INTO model_predictions (
                id, claim_id, rf_score, xgb_score, iso_score, ensemble_score, threshold_used,
                risk_level, recommended_action, model_disagreement, disagreement_note, top_contributing_factors
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"PRED-{item['code']}", claim_id, ai["random_forest_score"], ai["xgboost_score"],
                ai["isolation_forest_score"], ai["ensemble_score"], ai["threshold_used"],
                ai["risk_level"], ai["recommended_action"], int(ai["model_disagreement"]),
                ai["disagreement_note"], json.dumps(ai["top_contributing_factors"])
            ))
            
            final_status = "RECOMMENDED_APPROVAL" if ai["risk_level"] == "LOW" else "UNDER_INVESTIGATION"
            cursor.execute("UPDATE claims SET status = ? WHERE id = ?", (final_status, claim_id))
            print(f"[{item['code']}] {item['title']}")
            print(f"    Claim: {claim_num} | Repair Est: Rs. {item['est_repair']:,.2f}")
            print(f"    RF: {ai['random_forest_score']} | XGB: {ai['xgboost_score']} | IF: {ai['isolation_forest_score']}")
            print(f"    Ensemble Score: {ai['ensemble_score']} -> {ai['risk_level']} RISK ({ai['recommended_action']})\n")

    conn.commit()
    conn.close()
    print("All 3 canonical demo scenarios seeded successfully!")

if __name__ == "__main__":
    seed_demo_claims()
