import os
import sys
import uuid
import json
import random
import hashlib
from datetime import datetime, timedelta

# Ensure project root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.models.database import get_db, init_db
from backend.services.fraud_service import FraudInferenceService

def seed_rich_platform_data():
    print("=================================================================")
    print("   SEEDING ENTERPRISE-GRADE MOTOR INSURANCE DATASET")
    print("   Real ML Inference (RF + XGB + IF) + SHAP Vectors for All Claims")
    print("=================================================================\n")

    init_db()
    conn = get_db()
    cursor = conn.cursor()
    fraud_svc = FraudInferenceService()

    # --- 1. USERS: Ensure Admin & 15 Diverse Indian Customers ---
    print("[1/5] Seeding User Profiles (Customers, Auditors & Investigators)...")
    
    users_data = [
        {"id": "USER-ADMIN-01", "name": "Chief Claims Administrator", "email": "securewheelsadmin@gmail.com", "mobile": "9130123270", "pass": "AdminSecure2026", "role": "ADMIN"},
        {"id": "USER-DEMO-001", "name": "Rahul Sharma", "email": "demo@securewheels.com", "mobile": "9123456780", "pass": "DemoPass123", "role": "CUSTOMER"},
        {"id": "USER-IND-002", "name": "Priya Patel", "email": "priya.patel@gmail.com", "mobile": "9825100012", "pass": "Priya@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-003", "name": "Amit Verma", "email": "amit.verma@outlook.com", "mobile": "9811200034", "pass": "Amit@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-004", "name": "Sneha Iyer", "email": "sneha.iyer@yahoo.com", "mobile": "9845300056", "pass": "Sneha@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-005", "name": "Vikramaditya Reddy", "email": "v.reddy@techcorp.in", "mobile": "9849400078", "pass": "Reddy@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-006", "name": "Ananya Sengupta", "email": "ananya.s@kolkata.org", "mobile": "9830500090", "pass": "Ananya@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-007", "name": "Rohan Deshmukh", "email": "rohan.deshmukh@pune.co", "mobile": "9822600112", "pass": "Rohan@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-008", "name": "Neha Nair", "email": "neha.nair@kerala.in", "mobile": "9847700134", "pass": "Neha@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-009", "name": "Arjun Mehta", "email": "arjun.mehta@jaipur.biz", "mobile": "9829800156", "pass": "Arjun@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-010", "name": "Pooja Choudhury", "email": "pooja.c@odisha.gov.in", "mobile": "9861900178", "pass": "Pooja@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-011", "name": "Karan Johar", "email": "karan.johar@gurugram.io", "mobile": "9810100190", "pass": "Karan@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-012", "name": "Divya Krishnan", "email": "divya.k@chennai.net", "mobile": "9840200212", "pass": "Divya@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-013", "name": "Aditya Malhotra", "email": "aditya.m@chandigarh.org", "mobile": "9814300234", "pass": "Aditya@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-014", "name": "Meera Joshi", "email": "meera.joshi@nashik.in", "mobile": "9823400256", "pass": "Meera@2026", "role": "CUSTOMER"},
        {"id": "USER-IND-015", "name": "Rajesh Goud", "email": "rajesh.goud@ap.gov.in", "mobile": "9848500278", "pass": "Rajesh@2026", "role": "CUSTOMER"}
    ]

    for u in users_data:
        cursor.execute("SELECT id FROM users WHERE email = ? OR id = ?", (u["email"], u["id"]))
        if not cursor.fetchone():
            hashed_pw = hashlib.sha256(u["pass"].encode("utf-8")).hexdigest()
            cursor.execute("""
            INSERT INTO users (id, full_name, email, mobile, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (u["id"], u["name"], u["email"], u["mobile"], hashed_pw, u["role"]))
    conn.commit()

    # --- 2. VEHICLES: 26 Diverse Vehicles (Cars, Electric & Bikes) ---
    print("[2/5] Seeding Vehicle Fleet (26 Models Across Classes)...")
    
    vehicles_data = [
        # User 1 (Demo)
        {"id": "VEH-001", "uid": "USER-DEMO-001", "reg": "MH12GD2024", "type": "Car", "make": "Honda", "model": "City VX", "yr": 2021, "fuel": "Petrol", "idv": 850000.0},
        {"id": "VEH-002", "uid": "USER-DEMO-001", "reg": "MH12MD2025", "type": "Car", "make": "Toyota", "model": "Corolla Altis", "yr": 2020, "fuel": "Petrol", "idv": 720000.0},
        {"id": "VEH-003", "uid": "USER-DEMO-001", "reg": "MH12HR2026", "type": "Car", "make": "Pontiac", "model": "Firebird Sport", "yr": 2023, "fuel": "Petrol", "idv": 1100000.0},
        # User 2
        {"id": "VEH-004", "uid": "USER-IND-002", "reg": "GJ01AB1104", "type": "Car", "make": "Tata", "model": "Nexon EV Max", "yr": 2023, "fuel": "Electric", "idv": 1450000.0},
        {"id": "VEH-005", "uid": "USER-IND-002", "reg": "GJ01CD5521", "type": "Two-Wheeler", "make": "Ather", "model": "450X Gen 3", "yr": 2022, "fuel": "Electric", "idv": 130000.0},
        # User 3
        {"id": "VEH-006", "uid": "USER-IND-003", "reg": "DL10CA4521", "type": "Car", "make": "Mahindra", "model": "Thar 4x4 Hardtop", "yr": 2022, "fuel": "Diesel", "idv": 1380000.0},
        {"id": "VEH-007", "uid": "USER-IND-003", "reg": "DL04EA9090", "type": "Car", "make": "Maruti Suzuki", "model": "Brezza ZXi", "yr": 2021, "fuel": "Petrol", "idv": 890000.0},
        # User 4
        {"id": "VEH-008", "uid": "USER-IND-004", "reg": "KA05ML3902", "type": "Car", "make": "Hyundai", "model": "Creta SX(O)", "yr": 2022, "fuel": "Diesel", "idv": 1420000.0},
        {"id": "VEH-009", "uid": "USER-IND-004", "reg": "KA05NB7711", "type": "Two-Wheeler", "make": "Royal Enfield", "model": "Classic 350", "yr": 2021, "fuel": "Petrol", "idv": 185000.0},
        # User 5
        {"id": "VEH-010", "uid": "USER-IND-005", "reg": "TS09FA1109", "type": "Car", "make": "Kia", "model": "Seltos GTX+", "yr": 2023, "fuel": "Petrol", "idv": 1650000.0},
        {"id": "VEH-011", "uid": "USER-IND-005", "reg": "TS09GB8823", "type": "Car", "make": "Toyota", "model": "Innova Crysta", "yr": 2019, "fuel": "Diesel", "idv": 1800000.0},
        # User 6
        {"id": "VEH-012", "uid": "USER-IND-006", "reg": "WB02AE3412", "type": "Car", "make": "Volkswagen", "model": "Taigun GT", "yr": 2022, "fuel": "Petrol", "idv": 1500000.0},
        # User 7
        {"id": "VEH-013", "uid": "USER-IND-007", "reg": "MH14DE7823", "type": "Car", "make": "Tata", "model": "Harrier XZA+", "yr": 2023, "fuel": "Diesel", "idv": 2100000.0},
        {"id": "VEH-014", "uid": "USER-IND-007", "reg": "MH14FG6644", "type": "Two-Wheeler", "make": "TVS", "model": "Jupiter 125", "yr": 2022, "fuel": "Petrol", "idv": 82000.0},
        # User 8
        {"id": "VEH-015", "uid": "USER-IND-008", "reg": "KL07BH4511", "type": "Car", "make": "Skoda", "model": "Slavia 1.5 TSI", "yr": 2022, "fuel": "Petrol", "idv": 1390000.0},
        # User 9
        {"id": "VEH-016", "uid": "USER-IND-009", "reg": "RJ14CA2233", "type": "Car", "make": "Mahindra", "model": "Scorpio-N Z8", "yr": 2023, "fuel": "Diesel", "idv": 1950000.0},
        {"id": "VEH-017", "uid": "USER-IND-009", "reg": "RJ14CB9988", "type": "Two-Wheeler", "make": "Bajaj", "model": "Pulsar NS200", "yr": 2020, "fuel": "Petrol", "idv": 115000.0},
        # User 10
        {"id": "VEH-018", "uid": "USER-IND-010", "reg": "OD02AK7890", "type": "Car", "make": "Maruti Suzuki", "model": "Baleno Alpha", "yr": 2022, "fuel": "Petrol", "idv": 780000.0},
        # User 11
        {"id": "VEH-019", "uid": "USER-IND-011", "reg": "HR26DP4455", "type": "Car", "make": "BMW", "model": "330i M Sport", "yr": 2021, "fuel": "Petrol", "idv": 3800000.0},
        # User 12
        {"id": "VEH-020", "uid": "USER-IND-012", "reg": "TN09BK6712", "type": "Car", "make": "Hyundai", "model": "i20 N-Line", "yr": 2022, "fuel": "Petrol", "idv": 950000.0},
        {"id": "VEH-021", "uid": "USER-IND-012", "reg": "TN09CL4419", "type": "Two-Wheeler", "make": "KTM", "model": "Duke 250", "yr": 2023, "fuel": "Petrol", "idv": 230000.0},
        # User 13
        {"id": "VEH-022", "uid": "USER-IND-013", "reg": "CH01BL3344", "type": "Car", "make": "Toyota", "model": "Fortuner 4x4", "yr": 2022, "fuel": "Diesel", "idv": 3400000.0},
        # User 14
        {"id": "VEH-023", "uid": "USER-IND-014", "reg": "MH15CG1212", "type": "Car", "make": "Honda", "model": "Elevate ZX", "yr": 2023, "fuel": "Petrol", "idv": 1350000.0},
        # User 15
        {"id": "VEH-024", "uid": "USER-IND-015", "reg": "AP16DJ5678", "type": "Car", "make": "MG", "model": "Hector Plus", "yr": 2021, "fuel": "Diesel", "idv": 1550000.0},
        {"id": "VEH-025", "uid": "USER-IND-015", "reg": "AP16EK9012", "type": "Two-Wheeler", "make": "Hero", "model": "Splendor+ XTEC", "yr": 2022, "fuel": "Petrol", "idv": 68000.0},
        {"id": "VEH-026", "uid": "USER-IND-003", "reg": "DL01ZA8819", "type": "Car", "make": "Mercedes-Benz", "model": "C-Class C200", "yr": 2020, "fuel": "Petrol", "idv": 4200000.0}
    ]

    for v in vehicles_data:
        cursor.execute("SELECT id FROM vehicles WHERE registration_number = ? OR id = ?", (v["reg"], v["id"]))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO vehicles (id, user_id, registration_number, vehicle_type, manufacturer, model, manufacturing_year, fuel_type, estimated_idv)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (v["id"], v["uid"], v["reg"], v["type"], v["make"], v["model"], v["yr"], v["fuel"], v["idv"]))
    conn.commit()

    # --- 3. POLICIES: 26 Active / Valid Insurance Schedules ---
    print("[3/5] Seeding Active & Historical Policies (26 Policies)...")
    
    plan_types = ["Comprehensive", "Zero-Depreciation", "Third-Party"]
    policies_data = []
    
    base_date = datetime(2025, 1, 15)
    for i, v in enumerate(vehicles_data):
        pol_id = f"POL-2026-{1000 + i}"
        pol_num = f"MIFD-2026-{v['type'][:3].upper()}-{10001000 + i}"
        plan = plan_types[i % 3]
        dur = 1 if v["type"] == "Two-Wheeler" else (3 if i % 4 == 0 else 1)
        
        # Realistic actuarial premium
        if plan == "Zero-Depreciation":
            premium = round(v["idv"] * 0.032 + 2500, 2)
        elif plan == "Comprehensive":
            premium = round(v["idv"] * 0.024 + 1800, 2)
        else:
            premium = 4500.0 if v["type"] == "Car" else 1800.0
            
        start_d = (base_date + timedelta(days=i * 12)).date()
        end_d = start_d.replace(year=start_d.year + dur)
        status = "ACTIVE" if i != 25 else "SUSPENDED"
        
        policies_data.append({
            "id": pol_id, "num": pol_num, "uid": v["uid"], "vid": v["id"],
            "dur": dur, "plan": plan, "prem": premium, "start": str(start_d), "end": str(end_d), "status": status
        })

    for p in policies_data:
        cursor.execute("SELECT id FROM policies WHERE policy_number = ? OR id = ?", (p["num"], p["id"]))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO policies (id, policy_number, user_id, vehicle_id, duration_years, plan_type, calculated_premium, prototype_amount_paid, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, ?, ?, ?)
            """, (p["id"], p["num"], p["uid"], p["vid"], p["dur"], p["plan"], p["prem"], p["start"], p["end"], p["status"]))
    conn.commit()

    # --- 4. CLAIMS: 25 Diverse Scenarios Run through Real Ensemble ML Pipeline ---
    print("[4/5] Executing Real ML Inference for 25 Diverse Insurance Claims...")

    claim_scenarios = [
        # --- Group 1: High Risk & Blatant Fraud Typologies ---
        {
            "id": "CLM-2026-001", "pol_idx": 2, "dt": "2026-09-14", "loc": "Mumbai-Pune Expressway, Khalapur",
            "acc_desc": "Claimant states sudden complete brake failure at 90 km/h caused total rollover destruction.",
            "dmg_desc": "Catastrophic front-end crush, engine block dislocation, chassis twist claimed 4 days post policy renewal.",
            "repair_est": 820000.0, "status": "REJECTED",
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
                "NumberOfSuppliments": "more than 5", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1994, "BasePolicy": "Liability"
            },
            "override_reason": "Confirmed staged destruction. Forensic telemetry revealed no brake hydraulic failure.",
            "notes": "SIU team cross-checked CCTV cameras near toll plaza. Accident staged on isolated service road."
        },
        {
            "id": "CLM-2026-002", "pol_idx": 5, "dt": "2026-08-28", "loc": "Outer Ring Road, Delhi NCR",
            "acc_desc": "Midnight unwitnessed crash into concrete road divider during empty road conditions.",
            "dmg_desc": "Hardtop roof crushed, entire front suspension collapsed, custom accessories damaged.",
            "repair_est": 640000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Aug", "WeekOfMonth": 4, "DayOfWeek": "Saturday", "Make": "Chevrolet",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Utility - All Perils",
                "VehicleCategory": "Utility", "VehiclePrice": "more than 69000",
                "RepNumber": 7, "Deductible": 400, "DriverRating": 4,
                "Days_Policy_Accident": "8 to 15", "Days_Policy_Claim": "15 to 30",
                "PastNumberOfClaims": "2 to 4", "AgeOfVehicle": "new",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "3 to 5", "AddressChange_Claim": "under 6 months",
                "NumberOfCars": "1 vehicle", "Year": 1994, "BasePolicy": "All Perils"
            },
            "override_reason": None,
            "notes": "Surveyor assigned to inspect divider impact marks. Prior claims in neighboring state under review."
        },
        {
            "id": "CLM-2026-003", "pol_idx": 18, "dt": "2026-09-02", "loc": "Golf Course Extension Road, Gurugram",
            "acc_desc": "Claimant alleges water logging caused hydro-locking and total electronics burn.",
            "dmg_desc": "Engine ECU submerged, full wiring harness and interior leather upholstery claimed for total replacement.",
            "repair_est": 950000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Sep", "WeekOfMonth": 1, "DayOfWeek": "Wednesday", "Make": "Accura",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Friday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Sedan - All Perils",
                "VehicleCategory": "Sedan", "VehiclePrice": "more than 69000",
                "RepNumber": 14, "Deductible": 500, "DriverRating": 3,
                "Days_Policy_Accident": "1 to 7", "Days_Policy_Claim": "8 to 15",
                "PastNumberOfClaims": "2 to 4", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "more than 5", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1995, "BasePolicy": "All Perils"
            },
            "override_reason": None,
            "notes": "Weather radar indicates only 2mm rain on claimed date. Vehicle intake inspection ordered."
        },
        {
            "id": "CLM-2026-004", "pol_idx": 21, "dt": "2026-07-20", "loc": "Shimla Highway, Solan Cut",
            "acc_desc": "Alleged hill descent tumble down slope into tree line after steering lockup.",
            "dmg_desc": "Extensive structural crumple on roof, undercarriage, front axel snapped.",
            "repair_est": 780000.0, "status": "REJECTED",
            "features": {
                "Month": "Jul", "WeekOfMonth": 3, "DayOfWeek": "Sunday", "Make": "Ford",
                "AccidentArea": "Rural", "DayOfWeekClaimed": "Tuesday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Policy Holder", "PolicyType": "Utility - Collision",
                "VehicleCategory": "Utility", "VehiclePrice": "more than 69000",
                "RepNumber": 10, "Deductible": 400, "DriverRating": 4,
                "Days_Policy_Accident": "1 to 7", "Days_Policy_Claim": "more than 30",
                "PastNumberOfClaims": "more than 4", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "3 to 5", "AddressChange_Claim": "1 year",
                "NumberOfCars": "2 vehicles", "Year": 1994, "BasePolicy": "Collision"
            },
            "override_reason": "Multiple fraudulent claim history confirmed across 3 insurers in past 18 months.",
            "notes": "Fraud Intelligence Bureau blacklisted vehicle chassis ID. Claim officially repudiated."
        },
        {
            "id": "CLM-2026-005", "pol_idx": 25, "dt": "2026-06-12", "loc": "Vasant Kunj Flyover, Delhi",
            "acc_desc": "Hit from rear while parked outside shopping mall overnight.",
            "dmg_desc": "Suspension dislocation, bumper shattered, boot lid damaged.",
            "repair_est": 380000.0, "status": "REJECTED",
            "features": {
                "Month": "Jun", "WeekOfMonth": 2, "DayOfWeek": "Friday", "Make": "Mercedes",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Jun",
                "WeekOfMonthClaimed": 3, "Sex": "Male", "MaritalStatus": "Single",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "more than 69000",
                "RepNumber": 15, "Deductible": 500, "DriverRating": 4,
                "Days_Policy_Accident": "8 to 15", "Days_Policy_Claim": "8 to 15",
                "PastNumberOfClaims": "2 to 4", "AgeOfVehicle": "4 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "more than 5", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1994, "BasePolicy": "Collision"
            },
            "override_reason": "CCTV showed pre-existing damage was present when vehicle entered mall parking.",
            "notes": "Mall security provided HD entrance recording. Claim rejected for false declaration."
        },

        # --- Group 2: Medium Risk & Borderline Suspicious Claims ---
        {
            "id": "CLM-2026-006", "pol_idx": 1, "dt": "2026-09-13", "loc": "Basement Parking B2, Lower Parel, Mumbai",
            "acc_desc": "Impacted concrete parking pillar while reversing out of tight space.",
            "dmg_desc": "Rear left quarter panel, bumper and taillight assembly crushed.",
            "repair_est": 65000.0, "status": "APPROVED",
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
            },
            "override_reason": "Approved with 15% depreciation deduction following physical inspection by surveyor.",
            "notes": "Basement camera footage verified pillar scratch paint match."
        },
        {
            "id": "CLM-2026-007", "pol_idx": 6, "dt": "2026-08-15", "loc": "NH-48 Near Manesar Toll, Haryana",
            "acc_desc": "Sideswiped by unknown truck changing lanes suddenly without indicator.",
            "dmg_desc": "Left front door dented, side mirror sheared off, running board scratched.",
            "repair_est": 48000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Aug", "WeekOfMonth": 3, "DayOfWeek": "Friday", "Make": "Mazda",
                "AccidentArea": "Rural", "DayOfWeekClaimed": "Thursday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 4, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "20000 to 29000",
                "RepNumber": 5, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "8 to 15",
                "PastNumberOfClaims": "1", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "36 to 40", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1995, "BasePolicy": "Collision"
            },
            "override_reason": None,
            "notes": "Awaiting toll plaza camera records to confirm truck movement."
        },
        {
            "id": "CLM-2026-008", "pol_idx": 10, "dt": "2026-07-29", "loc": "Gachibowli Junction, Hyderabad",
            "acc_desc": "Braked suddenly for stray animal; skidded into road divider curb.",
            "dmg_desc": "Alloy wheel rim cracked, front steering tie-rod bent, tire sidewall torn.",
            "repair_est": 72000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Jul", "WeekOfMonth": 4, "DayOfWeek": "Tuesday", "Make": "Toyota",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Friday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Policy Holder", "PolicyType": "Utility - Collision",
                "VehicleCategory": "Utility", "VehiclePrice": "30000 to 39000",
                "RepNumber": 3, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "15 to 30",
                "PastNumberOfClaims": "1", "AgeOfVehicle": "5 years",
                "AgeOfPolicyHolder": "41 to 50", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "1 to 2", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": None,
            "notes": "Mechanic estimate reviewed; OEM tire replacement authorized."
        },
        {
            "id": "CLM-2026-009", "pol_idx": 12, "dt": "2026-08-04", "loc": "Senapati Bapat Road, Pune",
            "acc_desc": "Overnight storm; heavy branch fell from banyan tree on bonnet and windshield.",
            "dmg_desc": "Deep roof dent, windshield shattered, hood replacement required.",
            "repair_est": 92000.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 1, "DayOfWeek": "Tuesday", "Make": "Dodge",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Wednesday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Utility - All Perils",
                "VehicleCategory": "Utility", "VehiclePrice": "40000 to 59000",
                "RepNumber": 6, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "36 to 40", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "All Perils"
            },
            "override_reason": "Society secretary signed witness letter. Photos clearly show tree branch on car.",
            "notes": "Genuine natural catastrophe claim. Fast-track authorized."
        },
        {
            "id": "CLM-2026-010", "pol_idx": 15, "dt": "2026-08-19", "loc": "Tonk Road Flyover, Jaipur",
            "acc_desc": "Low-speed rear end collision during evening commute traffic jam.",
            "dmg_desc": "Rear tailgate pushed inwards, rear bumper damaged.",
            "repair_est": 52000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Aug", "WeekOfMonth": 3, "DayOfWeek": "Wednesday", "Make": "Chevrolet",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Friday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 3, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Utility - Collision",
                "VehicleCategory": "Utility", "VehiclePrice": "40000 to 59000",
                "RepNumber": 9, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "8 to 15",
                "PastNumberOfClaims": "1", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "41 to 50", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "External",
                "NumberOfSuppliments": "1 to 2", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1995, "BasePolicy": "Collision"
            },
            "override_reason": None,
            "notes": "Checking if garage estimate includes pre-existing paint scuffs."
        },

        # --- Group 3: Low Risk & Genuine Fast-Track Claims ---
        {
            "id": "CLM-2026-011", "pol_idx": 0, "dt": "2026-09-12", "loc": "Mumbai-Pune Expressway, Khalapur",
            "acc_desc": "Major multi-car pileup collision in torrential rainfall.",
            "dmg_desc": "Severe structural deformation, broken front radiator, headlights, bumper.",
            "repair_est": 480000.0, "status": "APPROVED",
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
            },
            "override_reason": "Police FIR and highway patrol spot report on record. Genuine high severity claim.",
            "notes": "Fast-tracked settlement approved. Cashless payout direct to authorized service center."
        },
        {
            "id": "CLM-2026-012", "pol_idx": 3, "dt": "2026-09-08", "loc": "SG Highway, Bodakdev, Ahmedabad",
            "acc_desc": "Auto-rickshaw made sudden U-turn and scratched passenger side doors.",
            "dmg_desc": "Both left doors dented with paint transfer, side mirror cracked.",
            "repair_est": 32000.0, "status": "APPROVED",
            "features": {
                "Month": "Sep", "WeekOfMonth": 2, "DayOfWeek": "Tuesday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Wednesday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 2, "Sex": "Female", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 2, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Verified third-party fault with traffic camera snapshot. Fast-track approved.",
            "notes": "Authorized cashless repair at Tata Motors authorized dealership."
        },
        {
            "id": "CLM-2026-013", "pol_idx": 4, "dt": "2026-08-30", "loc": "Ashram Road, Ahmedabad",
            "acc_desc": "Scooter slipped on wet manhole cover during monsoon shower.",
            "dmg_desc": "Right side apron cracked, brake lever bent, silencer shield scratched.",
            "repair_est": 9500.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 5, "DayOfWeek": "Sunday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 1, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "less than 20000",
                "RepNumber": 1, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Minor two-wheeler damage below threshold. Instant digital self-inspection approved.",
            "notes": "Direct UPI reimbursement of Rs 9,500 to customer."
        },
        {
            "id": "CLM-2026-014", "pol_idx": 7, "dt": "2026-09-05", "loc": "Indiranagar 100ft Road, Bengaluru",
            "acc_desc": "Following bus tapped rear bumper while stopping at signal.",
            "dmg_desc": "Rear plastic bumper cover cracked, reverse sensor misaligned.",
            "repair_est": 22000.0, "status": "APPROVED",
            "features": {
                "Month": "Sep", "WeekOfMonth": 1, "DayOfWeek": "Friday", "Make": "Toyota",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 2, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 11, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "BMTC bus depot station manager issued spot acknowledgment letter.",
            "notes": "Instant claim settled under Zero-Depreciation add-on."
        },
        {
            "id": "CLM-2026-015", "pol_idx": 8, "dt": "2026-08-22", "loc": "Kanakapura Road, Bengaluru",
            "acc_desc": "Gravel kicked up by dump truck cracked windshield glass on highway.",
            "dmg_desc": "Laminated front windshield cracked with 15cm spider-web pattern.",
            "repair_est": 18500.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 4, "DayOfWeek": "Saturday", "Make": "Honda",
                "AccidentArea": "Rural", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 4, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Third Party", "PolicyType": "Sedan - All Perils",
                "VehicleCategory": "Sedan", "VehiclePrice": "less than 20000",
                "RepNumber": 3, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "4 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "All Perils"
            },
            "override_reason": "Windshield-only glass claim; no NCB impact per policy conditions.",
            "notes": "Windshield Experts mobile van dispatched; replacement complete."
        },
        {
            "id": "CLM-2026-016", "pol_idx": 9, "dt": "2026-09-01", "loc": "Banjara Hills Road No. 12, Hyderabad",
            "acc_desc": "Motorcycle parked on stand was knocked over by another bike parking beside it.",
            "dmg_desc": "Clutch lever broken, crash guard bent, fuel tank paint chipped.",
            "repair_est": 14000.0, "status": "APPROVED",
            "features": {
                "Month": "Sep", "WeekOfMonth": 1, "DayOfWeek": "Tuesday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Wednesday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 5, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "41 to 50", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Low-risk genuine two-wheeler damage; fast-track approved.",
            "notes": "Direct payout processed to policyholder."
        },
        {
            "id": "CLM-2026-017", "pol_idx": 11, "dt": "2026-08-11", "loc": "Park Street, Kolkata",
            "acc_desc": "Scratched against yellow taxi while maneuvering through congested crossing.",
            "dmg_desc": "Left front fender dented, fog lamp bracket broken.",
            "repair_est": 28000.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 2, "DayOfWeek": "Tuesday", "Make": "Volkswagen",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Wednesday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 2, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 7, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Police traffic challan corroborates taxi collision details.",
            "notes": "Approved for cashless repair at Kolkata authorized service center."
        },
        {
            "id": "CLM-2026-018", "pol_idx": 13, "dt": "2026-08-07", "loc": "FC Road, Deccan Gymkhana, Pune",
            "acc_desc": "Scooter side stand failed on gentle gradient; fell onto footpath kerb.",
            "dmg_desc": "Front mudguard fractured, speedo housing scratched.",
            "repair_est": 6800.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 1, "DayOfWeek": "Friday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Saturday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 1, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Policy Holder", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "less than 20000",
                "RepNumber": 8, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "36 to 40", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Micro-claim below Rs 10k approved via automated AI fast-track rule.",
            "notes": "Instant claim settled in 12 minutes."
        },
        {
            "id": "CLM-2026-019", "pol_idx": 14, "dt": "2026-08-14", "loc": "MG Road, Ernakulam, Kochi",
            "acc_desc": "Cyclist crossed without looking; sudden stop caused rear-end nudge by auto.",
            "dmg_desc": "Rear bumper clips detached, reflector broken.",
            "repair_est": 16500.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 2, "DayOfWeek": "Thursday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Friday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 2, "Sex": "Female", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 4, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Police GD recorded. Genuine minor accident.",
            "notes": "Approved for full bumper realignment."
        },
        {
            "id": "CLM-2026-020", "pol_idx": 16, "dt": "2026-07-18", "loc": "Ajmer Road Elevated Road, Jaipur",
            "acc_desc": "Motorcycle collided with loose metal scrap on carriageway.",
            "dmg_desc": "Front tire blowout, alloy rim bent, front brake disc warped.",
            "repair_est": 18000.0, "status": "APPROVED",
            "features": {
                "Month": "Jul", "WeekOfMonth": 3, "DayOfWeek": "Saturday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Jul",
                "WeekOfMonthClaimed": 3, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "less than 20000",
                "RepNumber": 2, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "5 years",
                "AgeOfPolicyHolder": "41 to 50", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Highway patrol safety log documented metal debris on elevated road.",
            "notes": "Approved for parts replacement."
        },
        {
            "id": "CLM-2026-021", "pol_idx": 17, "dt": "2026-08-01", "loc": "Janpath, Bhubaneswar",
            "acc_desc": "Reversing into residential parking garage scraped compound wall pillar.",
            "dmg_desc": "Right rear quarter panel scratched and small dent.",
            "repair_est": 19500.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 1, "DayOfWeek": "Friday", "Make": "Toyota",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 1, "Sex": "Female", "MaritalStatus": "Married",
                "Fault": "Policy Holder", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "20000 to 29000",
                "RepNumber": 6, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "31 to 35", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "App-based photographic proof verified paint scuff.",
            "notes": "Cashless settlement completed."
        },
        {
            "id": "CLM-2026-022", "pol_idx": 19, "dt": "2026-08-25", "loc": "Anna Salai, Mount Road, Chennai",
            "acc_desc": "Water puddle concealed deep pothole; sudden wheel impact.",
            "dmg_desc": "Front left suspension strut leaking, control arm bushing damaged.",
            "repair_est": 34000.0, "status": "UNDER_INVESTIGATION",
            "features": {
                "Month": "Aug", "WeekOfMonth": 4, "DayOfWeek": "Monday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Tuesday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 4, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Policy Holder", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "20000 to 29000",
                "RepNumber": 9, "Deductible": 400, "DriverRating": 2,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "3 years",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
                "WitnessPresent": "No", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": None,
            "notes": "Underbody inspection scheduled at Hyundai service facility."
        },
        {
            "id": "CLM-2026-023", "pol_idx": 20, "dt": "2026-09-03", "loc": "OMR IT Corridor, Sholinganallur, Chennai",
            "acc_desc": "Motorcycle skidded on wet oil patch near bus bay.",
            "dmg_desc": "Exhaust heat shield bent, front handlebar misaligned, brake lever broken.",
            "repair_est": 16000.0, "status": "APPROVED",
            "features": {
                "Month": "Sep", "WeekOfMonth": 1, "DayOfWeek": "Thursday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Friday", "MonthClaimed": "Sep",
                "WeekOfMonthClaimed": 1, "Sex": "Female", "MaritalStatus": "Single",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "less than 20000",
                "RepNumber": 3, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "26 to 30", "PoliceReportFiled": "No",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "CCTV showed oil slick on road surface. Genuine accident.",
            "notes": "Settled under comprehensive policy."
        },
        {
            "id": "CLM-2026-024", "pol_idx": 22, "dt": "2026-08-16", "loc": "Gangapur Road, Nashik",
            "acc_desc": "Reversing truck scraped parked vehicle outside shopping complex.",
            "dmg_desc": "Front left headlight shattered, fender dented, bumper clips broken.",
            "repair_est": 41000.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 3, "DayOfWeek": "Saturday", "Make": "Honda",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Monday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 3, "Sex": "Female", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 1, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "2 years",
                "AgeOfPolicyHolder": "36 to 40", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Police GD recorded. Shopkeeper provided bystander witness affidavit.",
            "notes": "Approved for cashless bumper & headlamp replacement."
        },
        {
            "id": "CLM-2026-025", "pol_idx": 23, "dt": "2026-08-10", "loc": "Bandar Road, Vijayawada",
            "acc_desc": "Two-wheeler side-swiped stationary car while negotiating sharp corner.",
            "dmg_desc": "Right passenger doors deep scratch, door handle broken.",
            "repair_est": 26000.0, "status": "APPROVED",
            "features": {
                "Month": "Aug", "WeekOfMonth": 2, "DayOfWeek": "Monday", "Make": "Toyota",
                "AccidentArea": "Urban", "DayOfWeekClaimed": "Tuesday", "MonthClaimed": "Aug",
                "WeekOfMonthClaimed": 2, "Sex": "Male", "MaritalStatus": "Married",
                "Fault": "Third Party", "PolicyType": "Sedan - Collision",
                "VehicleCategory": "Sedan", "VehiclePrice": "30000 to 39000",
                "RepNumber": 4, "Deductible": 400, "DriverRating": 1,
                "Days_Policy_Accident": "more than 30", "Days_Policy_Claim": "1 to 7",
                "PastNumberOfClaims": "none", "AgeOfVehicle": "4 years",
                "AgeOfPolicyHolder": "41 to 50", "PoliceReportFiled": "Yes",
                "WitnessPresent": "Yes", "AgentType": "Internal",
                "NumberOfSuppliments": "none", "AddressChange_Claim": "no change",
                "NumberOfCars": "1 vehicle", "Year": 1996, "BasePolicy": "Collision"
            },
            "override_reason": "Clear third-party fault with verified spot inspection report.",
            "notes": "Cashless settlement completed."
        }
    ]

    for c in claim_scenarios:
        cursor.execute("SELECT id FROM claims WHERE id = ?", (c["id"],))
        pol = policies_data[c["pol_idx"]]
        claim_num = f"CLM-2026-{c['id'].split('-')[-1]}"
        
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO claims (
                id, claim_number, policy_id, user_id, accident_date, accident_time, 
                accident_location, incident_description, damage_description, estimated_repair_cost,
                is_drivable, third_party_involved, injury_reported, fatality_reported, 
                police_report_filed, witness_present, fault, accident_area, damage_severity, status
            )
            VALUES (?, ?, ?, ?, ?, '14:30', ?, ?, ?, ?, 1, 0, 0, 0, 1, 1, ?, ?, 0.5, ?)
            """, (
                c["id"], claim_num, pol["id"], pol["uid"], c["dt"],
                c["loc"], c["acc_desc"], c["dmg_desc"], c["repair_est"],
                c["features"].get("Fault", "Policy Holder"),
                c["features"].get("AccidentArea", "Urban"),
                c["status"]
            ))

        # Check model prediction
        cursor.execute("SELECT claim_id FROM model_predictions WHERE claim_id = ?", (c["id"],))
        if not cursor.fetchone():
            # Run authentic machine learning ensemble!
            pred = fraud_svc.predict_claim(c["features"])
            
            cursor.execute("""
            INSERT INTO model_predictions (
                id, claim_id, rf_score, xgb_score, iso_score, ensemble_score,
                threshold_used, risk_level, recommended_action, 
                model_disagreement, disagreement_note, top_contributing_factors
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), c["id"],
                pred["random_forest_score"], pred["xgboost_score"], pred["isolation_forest_score"],
                pred["ensemble_score"], pred["threshold_used"], pred["risk_level"], pred["recommended_action"],
                1 if pred["model_disagreement"] else 0, pred["disagreement_note"],
                json.dumps(pred["top_contributing_factors"])
            ))

        # Check claim decisions
        if c["status"] in ["APPROVED", "REJECTED"]:
            cursor.execute("SELECT id FROM claim_decisions WHERE claim_id = ?", (c["id"],))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO claim_decisions (id, claim_id, admin_id, decision, override_reason, investigator_notes)
                VALUES (?, ?, 'USER-ADMIN-01', ?, ?, ?)
                """, (str(uuid.uuid4()), c["id"], c["status"], c["override_reason"], c["notes"]))
    conn.commit()

    # --- 5. AUDIT LOGS: 40+ Chronological Lifecycle Events ---
    print("[5/5] Generating 45 Immutable Audit Trail Logs...")

    sample_logs = [
        ("USER-ADMIN-01", "ADMIN", "SYSTEM_STARTUP", "SYSTEM", "SECUREWHEELS_CORE", {"message": "Inference ensemble engine loaded with cost threshold 0.40"}),
        ("USER-ADMIN-01", "ADMIN", "RETRAIN_EVALUATION", "MODEL", "ENSEMBLE_V1", {"f1_score": 0.76, "fraud_recall": 0.818, "threshold": 0.40}),
        ("USER-IND-002", "CUSTOMER", "PURCHASE_POLICY", "POLICY", "POL-2026-1004", {"plan": "Zero-Depreciation", "premium": 48900.0}),
        ("USER-IND-003", "CUSTOMER", "REGISTER_VEHICLE", "VEHICLE", "VEH-006", {"reg_no": "DL10CA4521", "model": "Mahindra Thar 4x4"}),
        ("USER-IND-004", "CUSTOMER", "INITIATE_OTP", "SECURITY", "9845300056", {"channel": "SMS_GATEWAY", "status": "OTP_DISPATCHED"}),
        ("USER-IND-004", "CUSTOMER", "VERIFY_OTP", "SECURITY", "9845300056", {"auth_mode": "CHALLENGE_RESPONSE_SUCCESS"}),
        ("USER-ADMIN-01", "ADMIN", "CLAIM_DECISION_REJECTED", "CLAIM", "CLM-2026-001", {"reason": "Staged crash forensic confirmation", "loss_saved": 820000.0}),
        ("USER-ADMIN-01", "ADMIN", "SIU_ESCALATION", "CLAIM", "CLM-2026-002", {"risk_score": 0.88, "flag": "Timing anomaly (12 days post policy)"}),
        ("USER-ADMIN-01", "ADMIN", "CLAIM_DECISION_APPROVED", "CLAIM", "CLM-2026-011", {"type": "FAST_TRACK_GENUINE", "amount": 480000.0}),
        ("USER-ADMIN-01", "ADMIN", "UPDATE_POLICY", "POLICY", "POL-2026-1025", {"old_status": "ACTIVE", "new_status": "SUSPENDED", "reason": "Chassis blacklist"}),
        ("USER-IND-006", "CUSTOMER", "DOWNLOAD_POLICY_PDF", "POLICY", "POL-2026-1011", {"format": "PDF_SCHEDULE", "watermark": "DIGITALLY_SIGNED"}),
        ("USER-ADMIN-01", "ADMIN", "CLAIM_DECISION_APPROVED", "CLAIM", "CLM-2026-006", {"deduction_applied": "15% depreciation", "amount": 65000.0}),
        ("USER-ADMIN-01", "ADMIN", "INSPECT_SHAP_ATTRIBUTION", "CLAIM", "CLM-2026-003", {"top_driver": "Days_Policy_Accident", "shap_val": 0.312}),
        ("USER-ADMIN-01", "ADMIN", "EXPORT_AUDIT_DOSSIER", "SYSTEM", "REPORTING", {"format": "CSV", "claims_count": 25}),
        ("USER-IND-012", "CUSTOMER", "REGISTER_VEHICLE", "VEHICLE", "VEH-021", {"reg_no": "TN09CL4419", "model": "KTM Duke 250"})
    ]

    for log in sample_logs:
        cursor.execute("SELECT id FROM audit_logs WHERE action = ? AND entity_id = ?", (log[2], log[4]))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), log[0], log[1], log[2], log[3], log[4], json.dumps(log[5])))
    conn.commit()
    conn.close()

    print("\n=================================================================")
    print("   ENTERPRISE SEEDING COMPLETE SUCCESSFULLY!                   ")
    print("=================================================================\n")

if __name__ == "__main__":
    seed_rich_platform_data()
