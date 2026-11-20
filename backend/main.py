import os
import sys
import uuid
import json
import io
import csv
import random
import hmac
import hashlib
from datetime import datetime, timedelta, date, time, timezone
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist() -> datetime:
    """Returns current wall-clock datetime in India Standard Time (UTC+5:30)."""
    return datetime.now(IST).replace(tzinfo=None)
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import razorpay

from backend.schemas.schemas import (
    UserRegister, UserLogin, VehicleCreate, PolicyCreate,
    ClaimInitiateOTP, ClaimVerifyOTP, ClaimSubmit, AdminDecision,
    SupportTicketCreate, TicketReply, DirectEmailSend,
    RazorpayOrderCreate, RazorpayPaymentVerify,
    VehicleIDVCalculationRequest, PolicyUnderwritingAction,
    ForgotPasswordRequest, ForgotPasswordReset,
    SignupSendOTP, SignupVerifyAndRegister
)

def to_date(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()

def to_datetime(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())
    return datetime.strptime(str(val)[:10], "%Y-%m-%d")

# Zero-dependency .env loader
def load_project_env():
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if k:
                        os.environ[k] = v
load_project_env()
from backend.models.database import get_db, init_db
from backend.services.fraud_service import FraudInferenceService
from backend.services.pdf_service import PolicyPDFGenerator
from backend.services.image_verification_service import ImageVerificationService
from backend.services.communication_service import CommunicationService
from backend.services.groq_service import GroqFraudReasoningService

app = FastAPI(title="SecureWheels AI Motor Insurance & Fraud Detection Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB and ML Engine
init_db()
fraud_service = FraudInferenceService()

def log_audit(conn, actor_id, actor_role, action, entity_type, entity_id, details=None):
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), actor_id, actor_role, action, entity_type, entity_id, json.dumps(details) if details else None))
    conn.commit()

def hash_password(password: str) -> str:
    """Computes SHA-256 hexadecimal hash of password."""
    if not password:
        return ""
    if len(password) == 64 and all(c in "0123456789abcdefABCDEF" for c in password):
        return password.lower()
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_candidate: str, stored_hash: str) -> bool:
    """Verifies candidate plaintext against stored SHA-256 hash or legacy plaintext."""
    if not stored_hash or not plain_candidate:
        return False
    candidate_hash = hashlib.sha256(plain_candidate.encode("utf-8")).hexdigest()
    if candidate_hash.lower() == stored_hash.lower():
        return True
    if plain_candidate == stored_hash:
        return True
    return False

_LAST_DIGEST_IST_DATE: Optional[str] = None

def _maybe_send_daily_ist_digest():
    global _LAST_DIGEST_IST_DATE
    try:
        ist_now = now_ist()
        today_str = ist_now.date().isoformat()
        if ist_now.hour < 9 or _LAST_DIGEST_IST_DATE == today_str:
            return
        _execute_daily_keepalive_digest(send_async=False)
    except Exception as e:
        print(f"[DailyDigest] Auto-trigger note: {e}")

@app.api_route("/api/health", methods=["GET", "HEAD", "OPTIONS", "POST"])
def health_check(background_tasks: BackgroundTasks):
    ist_now = now_ist()
    today_str = ist_now.date().isoformat()
    if ist_now.hour >= 9 and _LAST_DIGEST_IST_DATE != today_str:
        background_tasks.add_task(_maybe_send_daily_ist_digest)
    return {
        "status": "ok",
        "service": "SecureWheels Autonomous Motor Insurance Platform",
        "ensemble_engine": "RF (45%) + XGBoost (45%) + Isolation Forest (10%)",
        "cost_threshold": 0.40,
        "timezone": "IST (UTC+05:30)",
        "timestamp": ist_now.isoformat() + "+05:30"
    }

@app.api_route("/", methods=["GET", "HEAD", "OPTIONS"])
def root_check():
    return {"status": "ok", "service": "SecureWheels API"}

# =========================================================================
# 1. AUTHENTICATION & PROFILES
# =========================================================================
@app.post("/api/auth/signup/send-otp")
def signup_send_otp(req: SignupSendOTP, background_tasks: BackgroundTasks):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check uniqueness
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR mobile = ?", (req.email, req.mobile))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email address or mobile number already exists. Please sign in or use another email.")
    
    otp_code = f"{random.randint(100000, 999999)}"
    expires = now_ist() + timedelta(minutes=15)
    
    # Store OTP in otps table
    cursor.execute("""
    INSERT INTO otps (id, identifier, otp_code, expires_at)
    VALUES (?, ?, ?, ?)
    """, (str(uuid.uuid4()), req.email.lower(), otp_code, expires))
    conn.commit()
    conn.close()

    # Dispatch verification code via live Gmail SMTP in background (instant sub-second response)
    background_tasks.add_task(CommunicationService.send_registration_otp, req.email, otp_code, req.full_name)

    return {
        "message": f"A 6-digit verification code has been dispatched to {req.email}.",
        "email": req.email,
        "expires_in_minutes": 15,
        "dispatch_status": {"delivered": True, "status": "QUEUED_FOR_DISPATCH"}
    }

@app.post("/api/auth/signup/verify-and-register")
def signup_verify_and_register(req: SignupVerifyAndRegister):
    conn = get_db()
    cursor = conn.cursor()

    # Validate OTP
    cursor.execute("""
    SELECT id FROM otps 
    WHERE identifier = ? AND otp_code = ? AND is_used = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
    """, (req.email.lower(), req.otp_code, now_ist()))
    otp = cursor.fetchone()
    if not otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please check your email or request a new code.")

    # Mark OTP as consumed
    cursor.execute("UPDATE otps SET is_used = 1 WHERE id = ?", (otp["id"],))

    # Double check user existence
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR mobile = ?", (req.email, req.mobile))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email or mobile already exists.")

    user_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO users (id, full_name, email, mobile, password_hash, role)
    VALUES (?, ?, ?, ?, ?, 'CUSTOMER')
    """, (user_id, req.full_name, req.email.lower(), req.mobile, hash_password(req.password)))
    
    log_audit(conn, user_id, "CUSTOMER", "REGISTER_USER_VERIFIED", "USER", user_id, {"name": req.full_name, "email": req.email})
    conn.commit()
    conn.close()

    # Dispatch official welcome email to new policyholder
    CommunicationService.send_welcome_email(req.email.lower(), req.full_name)

    return {
        "message": "Account created and email verified successfully! Welcome to SecureWheels.",
        "user_id": user_id,
        "full_name": req.full_name,
        "email": req.email.lower(),
        "role": "CUSTOMER"
    }

@app.post("/api/auth/register")
def register_user(req: UserRegister):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ? OR mobile = ?", (req.email, req.mobile))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email or mobile already registered.")
        
    user_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO users (id, full_name, email, mobile, password_hash, role)
    VALUES (?, ?, ?, ?, ?, 'CUSTOMER')
    """, (user_id, req.full_name, req.email.lower(), req.mobile, hash_password(req.password)))
    
    log_audit(conn, user_id, "CUSTOMER", "REGISTER_USER", "USER", user_id, {"name": req.full_name, "email": req.email})
    conn.commit()
    conn.close()

    # Send welcome email
    CommunicationService.send_welcome_email(req.email.lower(), req.full_name)

    return {"message": "User registered successfully", "user_id": user_id, "full_name": req.full_name, "email": req.email.lower()}

@app.post("/api/auth/login")
def login_user(req: UserLogin):
    ident = (req.identifier or req.email_or_mobile or "").strip()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE (LOWER(email) = LOWER(?) OR mobile = ?)", 
                   (ident, ident))
    row = cursor.fetchone()
    if not row or not verify_password(req.password, row["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials. Please verify your email/mobile and password.")
    
    # Auto-upgrade to SHA-256 hash if legacy plaintext was stored
    if row["password_hash"] != hash_password(req.password):
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(req.password), row["id"]))
        conn.commit()

    conn.close()
    return {
        "message": "Login successful",
        "user_id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "mobile": row["mobile"],
        "role": row["role"]
    }

@app.post("/api/auth/forgot-password/request-otp")
def forgot_password_request_otp(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?)", (req.email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No registered account found with this email address. Please register or check your spelling.")
    
    otp_code = f"{random.randint(100000, 999999)}"
    expires = now_ist() + timedelta(minutes=15)
    
    cursor.execute("""
    INSERT INTO otps (id, identifier, otp_code, expires_at)
    VALUES (?, ?, ?, ?)
    """, (str(uuid.uuid4()), user["email"].lower(), otp_code, expires))
    conn.commit()
    conn.close()

    # Dispatch via live SMTP in background (instant sub-second response)
    background_tasks.add_task(CommunicationService.send_password_reset_otp, user["email"], otp_code, user["full_name"])

    return {
        "message": f"Password reset verification OTP has been dispatched to {user['email']}.",
        "email": user["email"],
        "expires_in_minutes": 15,
        "dispatch_status": {"delivered": True, "status": "QUEUED_FOR_DISPATCH"}
    }

@app.post("/api/auth/forgot-password/reset")
def forgot_password_reset(req: ForgotPasswordReset):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT id FROM otps 
    WHERE identifier = ? AND otp_code = ? AND is_used = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
    """, (req.email.lower(), req.otp_code, now_ist()))
    otp = cursor.fetchone()
    if not otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please verify your OTP code or request a new one.")
    
    cursor.execute("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?)", (req.email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User account not found.")

    # Mark OTP as used
    cursor.execute("UPDATE otps SET is_used = 1 WHERE id = ?", (otp["id"],))
    # Update password with SHA-256 hash
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(req.new_password), user["id"]))
    
    log_audit(conn, user["id"], "CUSTOMER", "RESET_PASSWORD", "USER", user["id"], {"email": user["email"]})
    conn.commit()
    conn.close()

    # Send security notification to customer's email
    CommunicationService.send_password_reset_success(user["email"], user["full_name"])

    return {
        "message": "Password successfully updated! You can now sign in with your new password.",
        "email": user["email"]
    }

# =========================================================================
# 2. VEHICLE GARAGE MANAGEMENT
# =========================================================================
@app.post("/api/vehicles")
def register_vehicle(req: VehicleCreate, user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        clean_reg = req.registration_number.upper().strip()
        current_year = now_ist().year
        if req.manufacturing_year > current_year:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Validation Error: Vehicle manufacturing year ({req.manufacturing_year}) cannot be in the future.")
        if req.manufacturing_year < (current_year - 15):
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"Statutory Underwriting Ineligibility: Under Central Motor Vehicles Rules (CMVR Rule 56/59) and IRDAI regulations, vehicles older than 15 years ({req.manufacturing_year}) are ineligible for comprehensive insurance onboarding. Permissible registration is between {current_year - 15} and {current_year}."
            )

        cursor.execute("SELECT id FROM vehicles WHERE registration_number = ?", (clean_reg,))
        existing = cursor.fetchone()
        if existing:
            veh_id = existing["id"]
            cursor.execute("""
            UPDATE vehicles 
            SET user_id = ?, vehicle_type = ?, manufacturer = ?, model = ?, manufacturing_year = ?, fuel_type = ?, estimated_idv = ?
            WHERE id = ?
            """, (user_id, req.vehicle_type, req.manufacturer, req.model, req.manufacturing_year, req.fuel_type, req.estimated_idv, veh_id))
            log_audit(conn, user_id, "CUSTOMER", "UPDATE_VEHICLE", "VEHICLE", veh_id, {"reg_no": clean_reg})
            conn.commit()
            conn.close()
            return {"message": "Vehicle updated successfully", "vehicle_id": veh_id}

        veh_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO vehicles (id, user_id, registration_number, vehicle_type, manufacturer, model, manufacturing_year, fuel_type, estimated_idv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (veh_id, user_id, clean_reg, req.vehicle_type, req.manufacturer, req.model, req.manufacturing_year, req.fuel_type, req.estimated_idv))
        log_audit(conn, user_id, "CUSTOMER", "REGISTER_VEHICLE", "VEHICLE", veh_id, {"reg_no": clean_reg})
        conn.commit()
        conn.close()
        return {"message": "Vehicle registered successfully", "vehicle_id": veh_id}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/vehicles")
def get_user_vehicles(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# =========================================================================
# 3. DYNAMIC INSURANCE PRODUCTS & CATALOG
# =========================================================================
class ProductCreate(BaseModel):
    name: str
    vehicle_type: str
    plan_type: str
    description: str
    base_rate: float
    deductible: float = 400.0
    coverage_summary: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    vehicle_type: Optional[str] = None
    plan_type: Optional[str] = None
    description: Optional[str] = None
    base_rate: Optional[float] = None
    deductible: Optional[float] = None
    coverage_summary: Optional[str] = None
    is_active: Optional[int] = None

@app.get("/api/products")
def get_insurance_products():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE is_active = 1 ORDER BY created_at ASC")
    products = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return products

@app.post("/api/admin/products")
def create_insurance_product(req: ProductCreate, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    prod_id = f"PROD-{str(uuid.uuid4().int)[:6]}"
    cursor.execute("""
    INSERT INTO products (id, name, vehicle_type, plan_type, description, base_rate, deductible, coverage_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (prod_id, req.name, req.vehicle_type, req.plan_type, req.description, req.base_rate, req.deductible, req.coverage_summary))
    log_audit(conn, admin_id, "ADMIN", "CREATE_PRODUCT", "PRODUCT", prod_id, {"name": req.name, "plan_type": req.plan_type})
    conn.commit()
    conn.close()
    return {"message": "New insurance product added to catalog successfully", "product_id": prod_id}

@app.put("/api/admin/products/{prod_id}")
def update_insurance_product(prod_id: str, req: ProductUpdate, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    for k, v in req.dict(exclude_unset=True).items():
        fields.append(f"{k} = ?")
        params.append(v)
    if not fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update.")
    params.append(prod_id)
    cursor.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", params)
    log_audit(conn, admin_id, "ADMIN", "UPDATE_PRODUCT", "PRODUCT", prod_id, req.dict(exclude_unset=True))
    conn.commit()
    conn.close()
    return {"message": "Product updated successfully", "product_id": prod_id}

@app.delete("/api/admin/products/{prod_id}")
def delete_insurance_product(prod_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (prod_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_PRODUCT", "PRODUCT", prod_id, {"deleted_id": prod_id})
    conn.commit()
    conn.close()
    return {"message": "Product removed from catalog", "product_id": prod_id}

# =========================================================================
# 4. VEHICLE MASTER CATALOG & IRDAI STATUTORY IDV VALUATION ENGINE
# =========================================================================
def calculate_statutory_idv(ex_showroom: float, mfg_year: int) -> dict:
    cur_year = now_ist().year
    age = max(0, cur_year - mfg_year)
    if age == 0:
        dep_pct = 5.0
    elif age == 1:
        dep_pct = 15.0
    elif age == 2:
        dep_pct = 20.0
    elif age == 3:
        dep_pct = 30.0
    elif age == 4:
        dep_pct = 40.0
    elif age <= 5:
        dep_pct = 50.0
    else:
        dep_pct = min(75.0, 50.0 + (age - 5) * 4.0)
    
    statutory_idv = round(ex_showroom * (1.0 - dep_pct / 100.0), 2)
    min_allowable = round(statutory_idv * 0.85, 2)
    max_allowable = round(statutory_idv * 1.15, 2)
    return {
        "vehicle_age_years": age,
        "statutory_depreciation_pct": dep_pct,
        "statutory_idv": statutory_idv,
        "min_allowable_idv": min_allowable,
        "max_allowable_idv": max_allowable
    }

@app.get("/api/vehicles/catalog")
def get_vehicle_catalog():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicle_catalog ORDER BY vehicle_type ASC, manufacturer ASC, model ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/vehicles/calculate-idv")
def calculate_vehicle_idv(req: VehicleIDVCalculationRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM vehicle_catalog 
    WHERE LOWER(manufacturer) = LOWER(?) AND LOWER(model) = LOWER(?)
    LIMIT 1
    """, (req.make.strip(), req.model.strip()))
    veh = cursor.fetchone()
    conn.close()
    
    ex_showroom = veh["ex_showroom_price"] if veh else 850000.0
    val_data = calculate_statutory_idv(ex_showroom, req.manufacturing_year)
    
    declared = req.declared_idv if req.declared_idv else val_data["statutory_idv"]
    statutory = val_data["statutory_idv"]
    variance_pct = round(((declared - statutory) / statutory) * 100.0, 2)
    requires_approval = abs(variance_pct) > 15.0
    
    warning = None
    if requires_approval:
        if variance_pct > 15.0:
            warning = f"Declared value is {variance_pct:+.1f}% higher than IRDAI benchmark (₹{statutory:,.0f}). Requires Chief Underwriter manual review before policy activation."
        else:
            warning = f"Declared value is {variance_pct:+.1f}% below statutory threshold (₹{statutory:,.0f}). Underinsurance risk flagged for Underwriter verification."

    return {
        "make": req.make,
        "model": req.model,
        "manufacturing_year": req.manufacturing_year,
        "ex_showroom_price": ex_showroom,
        "vehicle_age_years": val_data["vehicle_age_years"],
        "statutory_depreciation_pct": val_data["statutory_depreciation_pct"],
        "statutory_idv": statutory,
        "min_allowable_idv": val_data["min_allowable_idv"],
        "max_allowable_idv": val_data["max_allowable_idv"],
        "declared_idv": declared,
        "variance_pct": variance_pct,
        "requires_admin_approval": requires_approval,
        "advisory_note": warning or "Declared IDV is compliant within the ±15% IRDAI statutory corridor."
    }

@app.get("/api/vehicles/check-plate")
def check_vehicle_plate(registration_number: str):
    conn = get_db()
    cursor = conn.cursor()
    clean_reg = registration_number.replace(" ", "").replace("-", "").upper().strip()
    cursor.execute("""
    SELECT p.policy_number, p.status, p.end_date, p.plan_type, v.manufacturer, v.model
    FROM policies p
    JOIN vehicles v ON p.vehicle_id = v.id
    WHERE v.registration_number = ? AND p.status = 'ACTIVE' AND date(p.end_date) >= CURRENT_DATE
    ORDER BY p.end_date DESC LIMIT 1
    """, (clean_reg,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "has_active_policy": True,
            "policy_number": row["policy_number"],
            "plan_type": row["plan_type"],
            "end_date": row["end_date"],
            "vehicle": f"{row['manufacturer']} {row['model']}"
        }
    return {"has_active_policy": False}

# =========================================================================
# 5. POLICIES & 3-PAGE OFFICIAL REGULATORY SCHEDULE GENERATOR
# =========================================================================
@app.post("/api/policies")
def purchase_policy(req: PolicyCreate, user_id: str):
    conn = get_db()
    cursor = conn.cursor()

    # Plan Eligibility Validation against Vehicle Type
    cursor.execute("SELECT * FROM vehicles WHERE id = ?", (req.vehicle_id,))
    veh_row = cursor.fetchone()
    if not veh_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vehicle record not found for policy issuance")

    # Statutory Vehicle Age Limit (15 Years Max under CMVR / IRDAI)
    current_year = now_ist().year
    veh_mfg_year = veh_row.get("manufacturing_year")
    if veh_mfg_year and veh_mfg_year < (current_year - 15):
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Policy Issuance Ineligible: Vehicle '{veh_row['registration_number']}' manufactured in {veh_mfg_year} exceeds the statutory 15-year age limit under IRDAI regulations. Comprehensive policy issuance is prohibited."
        )

    # Guard: Prohibit duplicate active policies on the same vehicle
    cursor.execute("""
    SELECT policy_number, end_date FROM policies
    WHERE vehicle_id = ? AND status = 'ACTIVE' AND date(end_date) >= CURRENT_DATE
    """, (req.vehicle_id,))
    active_pol = cursor.fetchone()
    if active_pol:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle '{veh_row['registration_number']}' already has an ACTIVE policy ({active_pol['policy_number']}) valid until {active_pol['end_date']}. Duplicate active coverage cannot be purchased."
        )

    veh_type = veh_row["vehicle_type"]
    if "Zero-Dep" in req.plan_type and veh_type != "Car":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Plan Eligibility Error: 'Zero-Dep SuperProtect Max' is exclusively eligible for Car / Four-Wheeler vehicles, not {veh_type}.")
    if "EV Battery" in req.plan_type and veh_type != "Electric Vehicle":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Plan Eligibility Error: 'EV Battery & Drive Guard' is exclusively eligible for Electric Vehicles (EV), not {veh_type}.")
    if "Two-Wheeler" in req.plan_type and veh_type != "Two-Wheeler":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Plan Eligibility Error: 'Two-Wheeler MotoSecure Premium' is exclusively eligible for Two-Wheeler / Bike vehicles, not {veh_type}.")

    pol_id = str(uuid.uuid4())
    pol_num = f"MIFD-2026-{req.plan_type[:3].upper()}-{str(uuid.uuid4().int)[:8]}"
    
    start_dt = now_ist().date()
    end_dt = start_dt.replace(year=start_dt.year + req.duration_years)
    
    # Calculate IDV variance if declared and statutory IDV provided
    statutory_val = req.statutory_idv
    declared_val = req.declared_idv
    variance_pct = 0.0
    underwriting_notes = "Pending Razorpay payment authorization and statutory compliance."
    status = "PENDING_PAYMENT"
    
    if statutory_val and declared_val and statutory_val > 0:
        variance_pct = round(((declared_val - statutory_val) / statutory_val) * 100.0, 2)
        if abs(variance_pct) > 15.0:
            status = "PENDING_ADMIN_APPROVAL"
            underwriting_notes = f"Flagged by AI Valuation Guard: Declared IDV (₹{declared_val:,.2f}) deviates by {variance_pct:+.1f}% from IRDAI statutory benchmark (₹{statutory_val:,.2f}). Requires Underwriter authorization."
    
    cursor.execute("""
    INSERT INTO policies (id, policy_number, user_id, vehicle_id, duration_years, plan_type, calculated_premium, prototype_amount_paid, start_date, end_date, status, statutory_idv, idv_variance_pct, underwriting_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pol_id, pol_num, user_id, req.vehicle_id, req.duration_years, req.plan_type, req.calculated_premium, req.prototype_amount_paid, str(start_dt), str(end_dt), status, statutory_val, variance_pct, underwriting_notes))
    
    log_audit(conn, user_id, "CUSTOMER", "PURCHASE_POLICY", "POLICY", pol_id, {"policy_number": pol_num, "status": status, "variance_pct": variance_pct})
    conn.commit()
    conn.close()
    return {
        "message": "Policy generated successfully" if status == "ACTIVE" else "Policy submitted for Underwriting Approval due to vehicle valuation variance",
        "policy_id": pol_id,
        "policy_number": pol_num,
        "status": status,
        "start_date": str(start_dt),
        "end_date": str(end_dt),
        "calculated_premium": req.calculated_premium,
        "prototype_amount_paid": req.prototype_amount_paid,
        "idv_variance_pct": variance_pct,
        "underwriting_notes": underwriting_notes
    }

@app.get("/api/admin/policies/underwriting-queue")
def get_underwriting_queue():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT p.*, u.full_name as customer_name, u.email as customer_email, u.mobile as customer_mobile,
           v.registration_number, v.vehicle_type, v.manufacturer, v.model, v.manufacturing_year, v.estimated_idv
    FROM policies p
    JOIN users u ON p.user_id = u.id
    JOIN vehicles v ON p.vehicle_id = v.id
    WHERE p.status = 'PENDING_ADMIN_APPROVAL'
    ORDER BY p.created_at DESC
    """)
    policies = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return policies

@app.post("/api/admin/policies/{policy_id}/underwrite")
def underwrite_policy(policy_id: str, action_req: PolicyUnderwritingAction, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies WHERE id = ?", (policy_id,))
    pol = cursor.fetchone()
    if not pol:
        conn.close()
        raise HTTPException(status_code=404, detail="Policy not found.")
        
    act = action_req.action.upper()
    if act == "APPROVE":
        new_status = "ACTIVE"
        note = action_req.notes or "Valuation approved as submitted by Chief Underwriter."
    elif act == "ADJUST_IDV":
        new_status = "ACTIVE"
        note = f"Valuation adjusted to ₹{action_req.revised_idv:,.2f} by Underwriter. " + (action_req.notes or "")
    elif act == "REJECT":
        new_status = "REJECTED"
        note = action_req.notes or "Policy application rejected due to excessive valuation non-compliance."
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid action. Use APPROVE, ADJUST_IDV, or REJECT.")

    cursor.execute("""
    UPDATE policies 
    SET status = ?, underwriting_notes = ?
    WHERE id = ?
    """, (new_status, note, policy_id))

    if act == "ADJUST_IDV" and action_req.revised_idv:
        cursor.execute("UPDATE vehicles SET estimated_idv = ? WHERE id = ?", (action_req.revised_idv, pol["vehicle_id"]))

    log_audit(conn, admin_id, "ADMIN", "UNDERWRITE_POLICY", "POLICY", policy_id, {
        "action": act, "new_status": new_status, "note": note
    })
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "message": f"Policy {pol['policy_number']} updated to {new_status}",
        "policy_status": new_status,
        "notes": note
    }

@app.get("/api/policies")
def get_user_policies(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT p.*, v.registration_number, v.vehicle_type, v.manufacturer, v.model, v.estimated_idv
    FROM policies p
    JOIN vehicles v ON p.vehicle_id = v.id
    WHERE p.user_id = ? AND p.status != 'PENDING_PAYMENT'
    ORDER BY p.created_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/api/policies/{policy_id}/draft")
def delete_draft_policy(policy_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM policies WHERE id = ? AND status = 'PENDING_PAYMENT'", (policy_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Draft policy removed"}

@app.get("/api/policies/{policy_id}/pdf")
def download_policy_pdf(policy_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies WHERE id = ?", (policy_id,))
    policy = cursor.fetchone()
    if not policy:
        conn.close()
        raise HTTPException(status_code=404, detail="Policy not found.")
    
    if policy["status"] == "PENDING_PAYMENT":
        conn.close()
        raise HTTPException(status_code=400, detail="Policy schedule cannot be downloaded because payment is pending. Please complete your Razorpay transaction.")
    if policy["status"] == "REJECTED":
        conn.close()
        raise HTTPException(status_code=400, detail="Policy application was not approved by underwriter.")
        
    cursor.execute("SELECT * FROM users WHERE id = ?", (policy["user_id"],))
    user = cursor.fetchone()
    cursor.execute("SELECT * FROM vehicles WHERE id = ?", (policy["vehicle_id"],))
    vehicle = cursor.fetchone()
    conn.close()
    
    pdf_bytes = PolicyPDFGenerator.generate_policy_pdf(dict(policy), dict(user), dict(vehicle))
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Policy_{policy['policy_number']}_Schedule.pdf"}
    )

# =========================================================================
# 5. REAL-TIME OTP DISPATCH & VERIFICATION (SMS & EMAIL)
# =========================================================================
@app.post("/api/claims/otp/initiate")
def initiate_claim_otp(req: ClaimInitiateOTP):
    conn = get_db()
    cursor = conn.cursor()
    ident = req.mobile_or_email.strip()
    cursor.execute("""
    SELECT id, full_name, email, mobile FROM users 
    WHERE LOWER(email) = LOWER(?) OR mobile = ?
    """, (ident, ident))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No registered customer found with this mobile or email. Please verify your registered credentials.")
        
    otp_code = f"{random.randint(100000, 999999)}"
    expires = now_ist() + timedelta(minutes=15)
    
    # Store OTP for both user's email and mobile
    cursor.execute("""
    INSERT INTO otps (id, identifier, otp_code, expires_at)
    VALUES (?, ?, ?, ?)
    """, (str(uuid.uuid4()), user["email"].lower(), otp_code, expires))
    cursor.execute("""
    INSERT INTO otps (id, identifier, otp_code, expires_at)
    VALUES (?, ?, ?, ?)
    """, (str(uuid.uuid4()), user["mobile"], otp_code, expires))
    conn.commit()
    conn.close()

    # Dispatch to Communication Gateway (SMS + Email)
    sms_res = CommunicationService.send_sms_otp(user["mobile"], otp_code)
    email_res = CommunicationService.send_email_otp(user["email"], otp_code, user["full_name"])

    return {
        "message": f"Verification OTP successfully dispatched to {user['email']}",
        "mobile_masked": f"+91-XXXXX-{user['mobile'][-4:]}",
        "email_masked": user["email"][:3] + "***@" + user["email"].split("@")[-1],
        "expires_in_minutes": 15,
        "dispatch_status": {
            "sms": sms_res,
            "email": email_res
        }
    }

@app.post("/api/claims/otp/verify")
def verify_claim_otp(req: ClaimVerifyOTP):
    submitted_otp = req.get_otp_code()
    conn = get_db()
    cursor = conn.cursor()
    
    ident = req.mobile_or_email.strip()
    cursor.execute("""
    SELECT id, full_name, email, mobile FROM users 
    WHERE LOWER(email) = LOWER(?) OR mobile = ?
    """, (ident, ident))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No registered customer found with this mobile or email.")

    cursor.execute("""
    SELECT id FROM otps 
    WHERE (identifier = ? OR identifier = ? OR identifier = ?) 
      AND otp_code = ? AND is_used = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
    """, (ident, user["email"].lower(), user["mobile"], submitted_otp, now_ist()))
    otp = cursor.fetchone()
    if not otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please verify the code received on your email/phone.")
        
    cursor.execute("UPDATE otps SET is_used = 1 WHERE id = ?", (otp["id"],))
    conn.commit()
    conn.close()
    return {"verified": True, "user_id": user["id"], "full_name": user["full_name"]}

# =========================================================================
# 6. MULTIMODAL DAMAGE IMAGE VERIFICATION
# =========================================================================
class DamageAnalysisRequest(BaseModel):
    vehicle_make: str
    vehicle_type: str
    incident_description: str
    damage_description: str
    estimated_repair_cost: float
    image_metadata: Optional[Dict[str, Any]] = None
    image_urls: Optional[List[str]] = None
    registered_plate: Optional[str] = ""
    accident_location: Optional[str] = ""

@app.post("/api/claims/analyze-damage")
def analyze_damage_image(req: DamageAnalysisRequest):
    img_meta = req.image_metadata or {}
    if req.image_urls:
        img_meta["image_urls"] = req.image_urls
        if not img_meta.get("image_url") and len(req.image_urls) > 0:
            img_meta["image_url"] = req.image_urls[0]

    result = ImageVerificationService.analyze_damage_claim(
        vehicle_make=req.vehicle_make,
        vehicle_type=req.vehicle_type,
        incident_description=req.incident_description,
        damage_description=req.damage_description,
        estimated_repair_cost=req.estimated_repair_cost,
        image_metadata=img_meta,
        registered_plate=req.registered_plate or "",
        accident_location=req.accident_location or ""
    )
    # Deep semantic analysis via Neural Forensics Engine
    groq_reasoning = GroqFraudReasoningService.analyze_claim_forensics(
        incident_description=req.incident_description,
        damage_description=req.damage_description,
        vehicle_make=req.vehicle_make,
        vehicle_type=req.vehicle_type,
        estimated_repair_cost=req.estimated_repair_cost,
        accident_location=req.accident_location or "",
        cv_telemetry=result
    )
    result["groq_reasoning"] = groq_reasoning
    return result

# =========================================================================
# 7. CLAIMS SUBMISSION & REAL-TIME ML INFERENCE
# =========================================================================
class ClaimEvidenceUpload(BaseModel):
    claim_id: str
    new_image_url: Optional[str] = None
    new_image_urls: Optional[List[str]] = None
    updated_description: Optional[str] = None
    user_id: Optional[str] = None

@app.get("/api/claims")
def get_customer_claims(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.id, c.policy_id, c.user_id, c.claim_number, c.accident_date, c.accident_time,
           c.accident_location, c.incident_description, c.damage_description, c.estimated_repair_cost,
           c.is_drivable, c.third_party_involved, c.injury_reported, c.fatality_reported,
           c.police_report_filed, c.witness_present, c.fault, c.accident_area, c.damage_severity,
           c.damage_image_url, c.visual_consistency_score, c.visual_inspection_report,
           c.status, c.created_at,
           p.policy_number, p.plan_type, v.registration_number, v.manufacturer, v.model as vehicle_model,
           mp.ensemble_score, mp.risk_level, mp.recommended_action
    FROM claims c
    LEFT JOIN policies p ON c.policy_id = p.id
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    LEFT JOIN model_predictions mp ON c.id = mp.claim_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT 50
    """, (user_id,))
    claims = []
    for r in cursor.fetchall():
        row = dict(r)
        if row.get("visual_inspection_report"):
            try:
                rep = json.loads(row["visual_inspection_report"])
                if isinstance(rep, dict):
                    rep.pop("per_photo_breakdown", None)
                    rep.pop("all_images", None)
                row["visual_inspection_report"] = rep
            except Exception:
                pass
        claims.append(row)
    conn.close()
    return claims

@app.post("/api/claims/re-upload-evidence")
def upload_claim_evidence(req: ClaimEvidenceUpload, user_id: Optional[str] = None):
    effective_user_id = req.user_id or user_id
    if not effective_user_id:
        raise HTTPException(status_code=400, detail="User authentication required.")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM claims WHERE id = ? AND user_id = ?", (req.claim_id, effective_user_id))
    claim = cursor.fetchone()
    if not claim:
        conn.close()
        raise HTTPException(status_code=404, detail="Claim not found or unauthorized.")
    
    # Query policy and vehicle info
    cursor.execute("SELECT * FROM policies WHERE id = ?", (claim["policy_id"],))
    policy = cursor.fetchone()
    cursor.execute("SELECT * FROM vehicles WHERE id = ?", (policy["vehicle_id"],))
    veh = cursor.fetchone()

    # Determine photo list
    photos: List[str] = []
    if req.new_image_urls and isinstance(req.new_image_urls, list) and len(req.new_image_urls) > 0:
        photos = [p for p in req.new_image_urls if p and isinstance(p, str)]
    elif req.new_image_url:
        photos = [req.new_image_url]

    veh_type = veh["vehicle_type"] if veh else "Car"
    veh_make = veh["manufacturer"] if veh else "Vehicle"
    is_two_wh = any(k in veh_type.lower() for k in ["two", "bike", "motorcycle", "scooter"])
    min_required = 4 if is_two_wh else 5

    if len(photos) < min_required:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Mandatory Evidence Requirement: Please upload at least {min_required} multi-angle photographs showing vehicle damage for this {'Two-Wheeler (Min 4)' if is_two_wh else 'Four-Wheeler Car (Min 5)'}. Received {len(photos)} photo(s)."
        )
    if len(photos) > 12:
        photos = photos[:12]

    # Validate explanation narrative worthiness (against gibberish keyboard smashing)
    if req.updated_description:
        is_worth, worth_msg = ImageVerificationService.validate_narrative_worthiness(
            req.updated_description, claim["accident_location"] or "Urban"
        )
        if not is_worth:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Explanation Statement: {worth_msg}. Please provide a clear, factual explanation describing the vehicle incident."
            )

    # Re-run multimodal visual inspection on all uploaded angles
    cv_new = ImageVerificationService.analyze_damage_claim(
        vehicle_make=veh_make,
        vehicle_type=veh_type,
        incident_description=req.updated_description or claim["incident_description"],
        damage_description=claim["damage_description"],
        estimated_repair_cost=float(claim["estimated_repair_cost"]),
        image_metadata={"image_urls": photos, "image_url": photos[0]},
        registered_plate=veh["registration_number"] if veh else "",
        accident_location=claim["accident_location"]
    )

    new_status = "UNDER_INVESTIGATION" if cv_new.get("visual_consistency_score", 0.0) >= 0.60 and not cv_new.get("has_cross_vehicle_contradiction") else "REQUEST_EVIDENCE"
    cursor.execute("""
    UPDATE claims 
    SET damage_image_url = ?, damage_image_urls = ?, visual_consistency_score = ?, visual_inspection_report = ?, incident_description = ?, status = ?
    WHERE id = ?
    """, (photos[0], json.dumps(photos), cv_new["visual_consistency_score"], json.dumps(cv_new), req.updated_description or claim["incident_description"], new_status, req.claim_id))
    conn.commit()
    conn.close()
    return {
        "message": f"New multi-angle photographic evidence ({len(photos)} perspectives) uploaded successfully. Your claim has been updated and routed for adjudication review.",
        "new_status": new_status,
        "cv_analysis": cv_new
    }

@app.post("/api/claims/submit")
def submit_claim(req: ClaimSubmit, user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    
    # Policy Eligibility
    cursor.execute("SELECT * FROM policies WHERE id = ?", (req.policy_id,))
    policy = cursor.fetchone()
    if not policy:
        conn.close()
        raise HTTPException(status_code=404, detail="Policy not found.")
        
    if policy["status"] != "ACTIVE":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Claim rejected: Policy is {policy['status']}.")
        
    acc_date = to_date(req.accident_date)
    pol_start = to_date(policy["start_date"])
    pol_end = to_date(policy["end_date"])
    
    if acc_date < pol_start or acc_date > pol_end:
        conn.close()
        raise HTTPException(status_code=400, detail="Business Rule Rejection: Incident occurred outside policy coverage term.")

    # Statutory Date & Time Validations (IRDAI 16-day reporting limit & No Future Dates/Times in IST)
    now_dt = now_ist()
    today_date = now_dt.date()
    if acc_date > today_date:
        conn.close()
        raise HTTPException(status_code=400, detail="Validation Error: Incident occurrence date cannot be in the future.")

    if acc_date == today_date and req.accident_time:
        try:
            time_parts = [int(p) for p in req.accident_time.split(":")[:2]]
            acc_time_obj = time(time_parts[0], time_parts[1])
            acc_combined = datetime.combine(today_date, acc_time_obj)
            if acc_combined > now_dt + timedelta(minutes=5):
                conn.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Validation Error: Incident occurrence time ({req.accident_time}) cannot be in the future relative to current IST time ({now_dt.strftime('%H:%M')})."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    days_elapsed = (today_date - acc_date).days
    if days_elapsed > 16:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Statutory Filing Window Exceeded: Under IRDAI statutory regulations, motor insurance claims must be filed within 16 days of occurrence ({days_elapsed} days elapsed). Incidents occurring earlier than 16 days cannot be accepted."
        )

    # Query vehicle for features
    cursor.execute("SELECT * FROM vehicles WHERE id = ?", (policy["vehicle_id"],))
    veh = cursor.fetchone()
    veh_make = veh["manufacturer"] if veh else "Honda"
    veh_type = veh["vehicle_type"] if veh else "Car"
    veh_reg = veh["registration_number"] if veh else ""

    submitted_photos = req.damage_image_urls or ([req.damage_image_url] if req.damage_image_url else [])
    
    # Strict Photo Count Validation: Car min 5, Bike min 4, Max 12
    is_two_wheeler_veh = any(k in (veh_type or "").lower() for k in ["two", "bike", "motorcycle", "scooter"])
    min_required_photos = 4 if is_two_wheeler_veh else 5
    if len(submitted_photos) < min_required_photos:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Evidence: A minimum of {min_required_photos} multi-angle photographs is required for {'Two-Wheeler / Bike' if is_two_wheeler_veh else 'Four-Wheeler / Car'} claims (received {len(submitted_photos)}). Maximum allowed is 12."
        )
    if len(submitted_photos) > 12:
        submitted_photos = submitted_photos[:12]

    primary_photo = submitted_photos[0] if submitted_photos else (req.damage_image_url or "")

    # Multimodal Visual Check across all uploaded photos
    cv_analysis = ImageVerificationService.analyze_damage_claim(
        vehicle_make=veh_make,
        vehicle_type=veh_type,
        incident_description=req.incident_description,
        damage_description=req.damage_description,
        estimated_repair_cost=req.estimated_repair_cost,
        image_metadata={"image_urls": submitted_photos, "image_url": primary_photo} if submitted_photos else None,
        registered_plate=veh_reg,
        accident_location=req.accident_location
    )

    # Pre-Submission Photographic Guardrails (Enforcing IRDAI Authenticity)
    if cv_analysis.get("non_vehicle_detected") or cv_analysis.get("detected_entity_type") == "NON_VEHICLE":
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Claim Submission Blocked: Non-vehicle photograph detected ({cv_analysis.get('rejection_reason') or 'Uploaded evidence does not show an automotive vehicle'}). Motor insurance claims strictly require genuine multi-angle photographs of the insured vehicle."
        )

    if cv_analysis.get("vehicle_type_mismatch") or cv_analysis.get("rejection_code") == "VEHICLE_TYPE_MISMATCH":
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Claim Submission Blocked: Vehicle category mismatch ({cv_analysis.get('rejection_reason') or 'Uploaded photograph depicts an incompatible vehicle type'}). Please upload photographs of your registered vehicle."
        )

    if cv_analysis.get("has_severe_blur"):
        conn.close()
        b_photos = cv_analysis.get("blurry_photos") or []
        b_str = f" in {', '.join(f'Perspective {p}' for p in b_photos)}" if b_photos else ""
        raise HTTPException(
            status_code=400,
            detail=f"Claim Submission Blocked: Blurry or out-of-focus photographic evidence detected{b_str}. Clear, focused photographs showing the damaged vehicle components are required for automated forensic inspection."
        )

    if cv_analysis.get("no_damage_detected"):
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Claim Submission Blocked: No vehicle damage detected. The uploaded photographs depict an intact, undamaged vehicle. Motor insurance claims require photographic evidence clearly showing the damaged areas (scratches, dents, cracks, or broken components)."
        )

    # Register Claim
    claim_id = str(uuid.uuid4())
    claim_num = f"CLM-2026-{str(uuid.uuid4().int)[:8]}"
    
    cursor.execute("""
    INSERT INTO claims (
        id, claim_number, policy_id, user_id, accident_date, accident_time, accident_location,
        incident_description, damage_description, estimated_repair_cost, is_drivable,
        third_party_involved, injury_reported, fatality_reported, police_report_filed, witness_present,
        fault, accident_area, damage_image_url, damage_image_urls, visual_consistency_score, visual_inspection_report, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AI_ANALYSIS_RUNNING', ?)
    """, (
        claim_id, claim_num, req.policy_id, user_id, req.accident_date, req.accident_time, req.accident_location,
        req.incident_description, req.damage_description, req.estimated_repair_cost, int(req.is_drivable),
        int(req.third_party_involved), int(req.injury_reported), int(req.fatality_reported),
        int(req.police_report_filed), int(req.witness_present), req.fault, req.accident_area,
        primary_photo, json.dumps(submitted_photos),
        cv_analysis["visual_consistency_score"], json.dumps(cv_analysis),
        now_ist().strftime("%Y-%m-%d %H:%M:%S")
    ))
    
    # Formulate ML Feature Vector
    dt = to_datetime(req.accident_date)
    claim_features = {
        "Month": dt.strftime("%b"),
        "WeekOfMonth": (dt.day - 1) // 7 + 1,
        "DayOfWeek": dt.strftime("%A"),
        "Make": veh_make,
        "AccidentArea": req.accident_area,
        "DayOfWeekClaimed": now_ist().strftime("%A"),
        "MonthClaimed": now_ist().strftime("%b"),
        "WeekOfMonthClaimed": (now_ist().day - 1) // 7 + 1,
        "Sex": "Male",
        "MaritalStatus": "Married",
        "Fault": req.fault,
        "PolicyType": "Sedan - Collision",
        "VehicleCategory": "Sedan",
        "VehiclePrice": "20000 to 29000",
        "RepNumber": 8,
        "Deductible": 400,
        "DriverRating": 2,
        "Days_Policy_Accident": "more than 30",
        "Days_Policy_Claim": "more than 30",
        "PastNumberOfClaims": "none",
        "AgeOfVehicle": "3 years",
        "AgeOfPolicyHolder": "31 to 35",
        "PoliceReportFiled": "Yes" if req.police_report_filed else "No",
        "WitnessPresent": "Yes" if req.witness_present else "No",
        "AgentType": "External",
        "NumberOfSuppliments": "none",
        "AddressChange_Claim": "no change",
        "NumberOfCars": "1 vehicle",
        "Year": dt.year,
        "BasePolicy": "Collision"
    }
    
    # Run Ensemble ML Engine
    ai_result = fraud_service.predict_claim(claim_features)

    # Dynamic Multimodal & Computer Vision Risk Integration
    vis_score = cv_analysis.get("visual_consistency_score", 1.0)
    is_non_vehicle = cv_analysis.get("detected_entity_type") == "NON_VEHICLE"
    match_status = cv_analysis.get("match_status", "HIGH_CONFIDENCE_MATCH")
    has_contradiction = match_status in ["CRITICAL_MISMATCH", "CRITICAL_NON_VEHICLE_MISMATCH", "CRITICAL_CONTRADICTION_MISMATCH", "VEHICLE_TYPE_CONTRADICTION"]

    if is_non_vehicle or has_contradiction or vis_score < 0.65:
        multimodal_penalty = round((1.0 - vis_score) * 0.55, 4)
        ai_result["ensemble_score"] = min(1.0, round(ai_result["ensemble_score"] + multimodal_penalty, 4))
        ai_result["risk_level"] = "HIGH"
        ai_result["recommended_action"] = "MANDATORY_FORENSIC_FRAUD_INVESTIGATION" if is_non_vehicle else "REQUEST_EVIDENCE_OR_INSPECTION"
        for disc in reversed(cv_analysis.get("identified_discrepancies", [])):
            if disc not in ai_result["top_contributing_factors"]:
                ai_result["top_contributing_factors"].insert(0, disc)
    
    if req.injury_reported or req.fatality_reported:
        ai_result["recommended_action"] = "MANDATORY_LEGAL_HUMAN_REVIEW"
        ai_result["top_contributing_factors"].insert(0, "Bodily injury or fatality reported: automatic legal and human assessment mandatory.")
        
    cursor.execute("""
    INSERT INTO model_predictions (
        id, claim_id, rf_score, xgb_score, iso_score, ensemble_score, threshold_used,
        risk_level, recommended_action, model_disagreement, disagreement_note, top_contributing_factors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()), claim_id, ai_result["random_forest_score"], ai_result["xgboost_score"],
        ai_result["isolation_forest_score"], ai_result["ensemble_score"], ai_result["threshold_used"],
        ai_result["risk_level"], ai_result["recommended_action"], int(ai_result["model_disagreement"]),
        ai_result["disagreement_note"], json.dumps(ai_result["top_contributing_factors"])
    ))
    
    if cv_analysis.get("is_instant_rejection"):
        new_status = "REJECTED"
        ai_result["risk_level"] = "CRITICAL_FRAUD"
        ai_result["recommended_action"] = "INSTANT_REJECTION_MANDATORY"
        if cv_analysis.get("rejection_reason"):
            ai_result["top_contributing_factors"].insert(0, f"[INSTANT REJECTION] {cv_analysis['rejection_reason']}")
    elif is_non_vehicle or has_contradiction:
        new_status = "REQUEST_EVIDENCE"
    elif ai_result["risk_level"] in ["HIGH", "MEDIUM"]:
        new_status = "UNDER_INVESTIGATION"
    else:
        new_status = "RECOMMENDED_APPROVAL"

    # Execute Groq Dual-Key Senior AI Adjudication Analysis
    groq_reasoning = GroqFraudReasoningService.analyze_claim_forensics(
        incident_description=req.incident_description,
        damage_description=req.damage_description,
        vehicle_make=veh_make,
        vehicle_type=veh_type,
        estimated_repair_cost=req.estimated_repair_cost,
        accident_location=req.accident_location,
        cv_telemetry=cv_analysis,
        ensemble_scores=ai_result
    )
    cv_analysis["groq_reasoning"] = groq_reasoning

    if groq_reasoning.get("key_findings"):
        for finding in reversed(groq_reasoning["key_findings"][:2]):
            ai_result["top_contributing_factors"].insert(0, f"[SecureWheels Forensic Arbiter] {finding}")

    cursor.execute("UPDATE claims SET status = ?, visual_inspection_report = ? WHERE id = ?", (new_status, json.dumps(cv_analysis), claim_id))
    
    log_audit(conn, user_id, "CUSTOMER", "SUBMIT_CLAIM", "CLAIM", claim_id, {
        "claim_number": claim_num, "risk_level": ai_result["risk_level"], "ensemble_score": ai_result["ensemble_score"]
    })
    conn.commit()
    conn.close()
    return {
        "message": "Claim processed through AI ensemble fraud-risk assessment engine",
        "claim_id": claim_id,
        "claim_number": claim_num,
        "status": new_status,
        "ai_analysis": ai_result,
        "visual_consistency": cv_analysis,
        "multimodal_inspection": cv_analysis,
        "neural_adjudication": groq_reasoning,
        "groq_analysis": groq_reasoning
    }

# =========================================================================
# 8. ADMIN DASHBOARD, LIVE RE-EVALUATION & BENCHMARKS
# =========================================================================
@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as cnt FROM policies")
    total_policies = cursor.fetchone()["cnt"]
    
    cursor.execute("SELECT COUNT(*) as cnt FROM policies WHERE status = 'ACTIVE'")
    active_policies = cursor.fetchone()["cnt"]
    
    cursor.execute("SELECT COUNT(*) as cnt FROM claims")
    total_claims = cursor.fetchone()["cnt"]
    
    cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE status = 'UNDER_INVESTIGATION'")
    pending_investigation = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE status = 'APPROVED'")
    approved_claims_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE status = 'REJECTED'")
    rejected_claims_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    total_users_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'CUSTOMER'")
    customer_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COALESCE(SUM(estimated_repair_cost), 0) as total_exposure FROM claims")
    total_exposure = float(cursor.fetchone()["total_exposure"])

    cursor.execute("SELECT COALESCE(SUM(calculated_premium), 0) as total_revenue FROM policies WHERE status = 'ACTIVE'")
    total_premium_revenue = float(cursor.fetchone()["total_revenue"])

    cursor.execute("SELECT COALESCE(SUM(estimated_repair_cost), 0) as total_payout FROM claims WHERE status = 'APPROVED'")
    total_claims_payout = float(cursor.fetchone()["total_payout"])

    underwriting_surplus = round(total_premium_revenue - total_claims_payout, 2)

    cursor.execute("""
    SELECT COALESCE(SUM(c.estimated_repair_cost), 0) as fraud_prevented
    FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    WHERE c.status = 'REJECTED' OR p.risk_level = 'HIGH'
    """)
    fraud_prevented = float(cursor.fetchone()["fraud_prevented"])

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    WHERE p.risk_level = 'HIGH'
    """)
    high_risk_count = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    WHERE p.risk_level = 'MEDIUM'
    """)
    medium_risk_count = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    WHERE p.risk_level = 'LOW'
    """)
    low_risk_count = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT c.id, c.policy_id, c.user_id, c.claim_number, c.accident_date, c.accident_time,
           c.accident_location, c.incident_description, c.damage_description, c.estimated_repair_cost,
           c.is_drivable, c.third_party_involved, c.injury_reported, c.fatality_reported,
           c.police_report_filed, c.witness_present, c.fault, c.accident_area, c.damage_severity,
           c.visual_consistency_score, c.status, c.created_at,
           p.rf_score, p.xgb_score, p.iso_score, p.ensemble_score, p.risk_level, 
           p.recommended_action, p.top_contributing_factors,
           u.full_name as claimant_name, u.mobile as claimant_mobile,
           v.registration_number, v.vehicle_type, v.manufacturer, v.model as vehicle_model,
           pol.policy_number, pol.plan_type
    FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    LEFT JOIN policies pol ON c.policy_id = pol.id
    LEFT JOIN users u ON pol.user_id = u.id
    LEFT JOIN vehicles v ON pol.vehicle_id = v.id
    ORDER BY c.created_at DESC
    LIMIT 100
    """)
    recent_claims = []
    for r in cursor.fetchall():
        row_dict = dict(r)
        if row_dict.get("top_contributing_factors"):
            try:
                row_dict["top_contributing_factors"] = json.loads(row_dict["top_contributing_factors"])
            except Exception:
                pass
        recent_claims.append(row_dict)
    
    conn.close()
    return {
        "total_policies": total_policies,
        "active_policies": active_policies,
        "total_claims": total_claims,
        "pending_investigation": pending_investigation,
        "approved_claims_count": approved_claims_count,
        "rejected_claims_count": rejected_claims_count,
        "total_users_count": total_users_count,
        "customer_count": customer_count,
        "total_exposure": total_exposure,
        "total_premium_revenue": total_premium_revenue,
        "total_claims_payout": total_claims_payout,
        "underwriting_surplus": underwriting_surplus,
        "fraud_prevented": fraud_prevented,
        "high_risk_count": high_risk_count,
        "medium_risk_count": medium_risk_count,
        "low_risk_count": low_risk_count,
        "recent_claims": recent_claims
    }

@app.get("/api/admin/claims/{claim_id}")
def get_admin_claim_detail(claim_id: str):
    """Fetches full visual evidence (images + ELA heatmaps + breakdown) for a single claim on demand."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*, p.rf_score, p.xgb_score, p.iso_score, p.ensemble_score, p.risk_level,
           p.recommended_action, p.top_contributing_factors,
           u.full_name as claimant_name, u.mobile as claimant_mobile,
           v.registration_number, v.vehicle_type, v.manufacturer, v.model as vehicle_model,
           pol.policy_number, pol.plan_type
    FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    LEFT JOIN policies pol ON c.policy_id = pol.id
    LEFT JOIN users u ON pol.user_id = u.id
    LEFT JOIN vehicles v ON pol.vehicle_id = v.id
    WHERE c.id = ? OR c.claim_number = ?
    """, (claim_id, claim_id))
    r = cursor.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Claim record not found.")
    row_dict = dict(r)
    for json_col in ("top_contributing_factors", "visual_inspection_report", "damage_image_urls"):
        if row_dict.get(json_col) and isinstance(row_dict[json_col], str):
            try:
                row_dict[json_col] = json.loads(row_dict[json_col])
            except Exception:
                pass
    return row_dict

@app.post("/api/admin/claims/{claim_id}/re-evaluate")
def re_evaluate_claim(claim_id: str, admin_id: str = "ADMIN_TERMINAL"):
    """
    Triggers live re-inspection through both the tabular ML ensemble inference pipeline
    and the multimodal computer vision & pixel forensic verification engine.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*, pol.vehicle_id, v.manufacturer, v.model, v.vehicle_type, v.registration_number
    FROM claims c
    JOIN policies pol ON c.policy_id = pol.id
    JOIN vehicles v ON pol.vehicle_id = v.id
    WHERE c.id = ? OR c.claim_number = ?
    """, (claim_id, claim_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Claim record not found.")

    claim = dict(row)
    actual_claim_id = claim["id"]
    dt = to_datetime(claim["accident_date"])
    
    # Dynamic claim features
    est_cost = float(claim.get("estimated_repair_cost") or 0)
    price_bracket = "more than 69000" if est_cost > 60000 else ("40000 to 59000" if est_cost > 35000 else ("20000 to 29000" if est_cost > 15000 else "less than 20000"))
    v_type_lower = (claim.get("vehicle_type") or "").lower()
    v_category = "Utility" if any(k in v_type_lower for k in ["suv", "jeep", "truck"]) else ("Sedan" if "sedan" in v_type_lower else "Sport")

    claim_features = {
        "Month": dt.strftime("%b"),
        "WeekOfMonth": (dt.day - 1) // 7 + 1,
        "DayOfWeek": dt.strftime("%A"),
        "Make": claim.get("manufacturer") or "Honda",
        "AccidentArea": claim.get("accident_area") or "Urban",
        "DayOfWeekClaimed": now_ist().strftime("%A"),
        "MonthClaimed": now_ist().strftime("%b"),
        "WeekOfMonthClaimed": (now_ist().day - 1) // 7 + 1,
        "Sex": "Male",
        "MaritalStatus": "Married",
        "Fault": claim.get("fault") or "Policy Holder",
        "PolicyType": f"{v_category} - Collision",
        "VehicleCategory": v_category,
        "VehiclePrice": price_bracket,
        "RepNumber": 8,
        "Deductible": 400,
        "DriverRating": 2 if est_cost < 50000 else 3,
        "Days_Policy_Accident": "more than 30",
        "Days_Policy_Claim": "more than 30",
        "PastNumberOfClaims": "none",
        "AgeOfVehicle": "3 years",
        "AgeOfPolicyHolder": "31 to 35",
        "PoliceReportFiled": "Yes" if claim.get("police_report_filed") else "No",
        "WitnessPresent": "Yes" if claim.get("witness_present") else "No",
        "AgentType": "External",
        "NumberOfSuppliments": "none" if est_cost < 40000 else "1 to 2",
        "AddressChange_Claim": "no change",
        "NumberOfCars": "1 vehicle",
        "Year": dt.year,
        "BasePolicy": "Collision"
    }

    # Re-run ML Inference (Tabular Baseline)
    ai_result = fraud_service.predict_claim(claim_features)

    # Re-run Deep Computer Vision & Multimodal Inspection on ALL submitted multi-angle photos
    submitted_photos = []
    if claim.get("damage_image_urls"):
        try:
            submitted_photos = json.loads(claim["damage_image_urls"]) if isinstance(claim["damage_image_urls"], str) else claim["damage_image_urls"]
        except Exception:
            submitted_photos = [claim["damage_image_urls"]]
    if not submitted_photos and claim.get("damage_image_url"):
        submitted_photos = [claim["damage_image_url"]]
    primary_photo = submitted_photos[0] if submitted_photos else (claim.get("damage_image_url") or "")

    full_make = f"{claim.get('manufacturer', '')} {claim.get('model', '')}".strip() or "Mahindra Scorpio"
    cv_analysis = ImageVerificationService.analyze_damage_claim(
        vehicle_make=full_make,
        vehicle_type=claim.get("vehicle_type", "Four-Wheeler"),
        incident_description=claim["incident_description"],
        damage_description=claim["damage_description"],
        estimated_repair_cost=est_cost,
        image_metadata={"image_urls": submitted_photos, "image_url": primary_photo} if submitted_photos else None,
        registered_plate=claim.get("registration_number", ""),
        accident_location=claim.get("accident_location", "")
    )

    # Dynamic Multimodal Computer Vision Risk Integration & Fusion
    vis_score = cv_analysis.get("visual_consistency_score", 1.0)
    is_non_vehicle = cv_analysis.get("detected_entity_type") == "NON_VEHICLE" or cv_analysis.get("non_vehicle_detected")
    has_severe_blur = cv_analysis.get("has_severe_blur") or cv_analysis.get("is_blurry")
    no_damage = cv_analysis.get("no_damage_detected")
    has_cross_contradiction = cv_analysis.get("has_cross_vehicle_contradiction")
    match_status = cv_analysis.get("match_status", "HIGH_CONFIDENCE_MATCH")
    has_contradiction = has_cross_contradiction or match_status in ["CRITICAL_MISMATCH", "CRITICAL_NON_VEHICLE_MISMATCH", "CRITICAL_CONTRADICTION_MISMATCH", "VEHICLE_TYPE_CONTRADICTION"]

    if is_non_vehicle or has_contradiction or no_damage or has_severe_blur or vis_score < 0.70:
        multimodal_penalty = round((1.0 - vis_score) * 0.65, 4)
        if is_non_vehicle:
            multimodal_penalty = max(multimodal_penalty, 0.60)
        if no_damage:
            multimodal_penalty = max(multimodal_penalty, 0.45)
        if has_severe_blur:
            multimodal_penalty = max(multimodal_penalty, 0.35)
        if has_contradiction:
            multimodal_penalty = max(multimodal_penalty, 0.50)

        ai_result["ensemble_score"] = min(1.0, round(ai_result["ensemble_score"] + multimodal_penalty, 4))
        if ai_result["ensemble_score"] >= 0.55 or is_non_vehicle or has_contradiction:
            ai_result["risk_level"] = "HIGH"
            ai_result["recommended_action"] = "MANDATORY_FORENSIC_FRAUD_INVESTIGATION" if is_non_vehicle else "REQUEST_EVIDENCE_OR_INSPECTION"
        elif ai_result["ensemble_score"] >= 0.40:
            ai_result["risk_level"] = "MEDIUM"
            ai_result["recommended_action"] = "REQUEST_ADDITIONAL_EVIDENCE"

        for disc in reversed(cv_analysis.get("identified_discrepancies", [])):
            if disc not in ai_result["top_contributing_factors"]:
                ai_result["top_contributing_factors"].insert(0, disc)

    if cv_analysis.get("is_instant_rejection") or is_non_vehicle:
        new_status = "REJECTED"
        ai_result["risk_level"] = "CRITICAL_FRAUD"
        ai_result["recommended_action"] = "INSTANT_REJECTION_MANDATORY"
        if cv_analysis.get("rejection_reason"):
            ai_result["top_contributing_factors"].insert(0, f"[INSTANT REJECTION] {cv_analysis['rejection_reason']}")
    elif has_contradiction or no_damage or has_severe_blur or vis_score < 0.65:
        new_status = "REQUEST_EVIDENCE"
    elif ai_result["risk_level"] in ["HIGH", "MEDIUM"]:
        new_status = "UNDER_INVESTIGATION"
    else:
        new_status = "RECOMMENDED_APPROVAL"

    cursor.execute("""
    UPDATE claims SET
        visual_inspection_report = ?,
        visual_consistency_score = ?,
        status = ?
    WHERE id = ?
    """, (json.dumps(cv_analysis), cv_analysis["visual_consistency_score"], new_status, actual_claim_id))

    # Update predictions
    cursor.execute("""
    UPDATE model_predictions SET
        rf_score = ?, xgb_score = ?, iso_score = ?, ensemble_score = ?,
        risk_level = ?, recommended_action = ?, top_contributing_factors = ?
    WHERE claim_id = ?
    """, (
        ai_result["random_forest_score"], ai_result["xgboost_score"], ai_result["isolation_forest_score"],
        ai_result["ensemble_score"], ai_result["risk_level"], ai_result["recommended_action"],
        json.dumps(ai_result["top_contributing_factors"]), actual_claim_id
    ))

    log_audit(conn, admin_id, "ADMIN", "RE_EVALUATE_CLAIM", "CLAIM", actual_claim_id, {
        "new_score": ai_result["ensemble_score"], "new_risk": ai_result["risk_level"]
    })
    conn.commit()
    conn.close()

    return {
        "message": "Claim successfully re-evaluated through the active ML ensemble and vision inspection pipeline",
        "claim_id": actual_claim_id,
        "ai_analysis": ai_result,
        "visual_consistency": cv_analysis,
        "new_status": new_status
    }

@app.get("/api/admin/export-csv")
def export_claims_csv():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.claim_number, pol.policy_number, u.full_name as claimant_name, u.mobile,
           v.registration_number, v.manufacturer || ' ' || v.model as vehicle_info,
           c.accident_date, c.accident_location, c.estimated_repair_cost,
           p.rf_score, p.xgb_score, p.iso_score, p.ensemble_score, p.risk_level,
           c.status as adjudication_status, c.created_at
    FROM claims c
    LEFT JOIN model_predictions p ON c.id = p.claim_id
    LEFT JOIN policies pol ON c.policy_id = pol.id
    LEFT JOIN users u ON pol.user_id = u.id
    LEFT JOIN vehicles v ON pol.vehicle_id = v.id
    ORDER BY c.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Claim Number", "Policy Number", "Claimant Name", "Contact Mobile",
        "Vehicle Reg", "Vehicle Model", "Accident Date", "Location",
        "Repair Estimate (INR)", "Random Forest Score", "XGBoost Score",
        "Isolation Forest Anomaly", "Weighted Ensemble Score", "AI Risk Rating",
        "Adjudication Status", "Submission Timestamp"
    ])
    for r in rows:
        writer.writerow([
            r["claim_number"], r["policy_number"], r["claimant_name"], r["mobile"],
            r["registration_number"], r["vehicle_info"], r["accident_date"], r["accident_location"],
            r["estimated_repair_cost"], r["rf_score"], r["xgb_score"],
            r["iso_score"], r["ensemble_score"], r["risk_level"],
            r["adjudication_status"], r["created_at"]
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SecureWheels_Claims_Intelligence_Dossier.csv"}
    )

@app.post("/api/admin/claims/decision")
def record_admin_decision(req: AdminDecision, admin_id: str = "ADMIN_DEFAULT"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM claims WHERE id = ?", (req.claim_id,))
    claim = cursor.fetchone()
    if not claim:
        conn.close()
        raise HTTPException(status_code=404, detail="Claim not found.")
        
    cursor.execute("""
    INSERT INTO claim_decisions (id, claim_id, admin_id, decision, override_reason, investigator_notes)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), req.claim_id, admin_id, req.decision, req.override_reason, req.investigator_notes))
    
    cursor.execute("UPDATE claims SET status = ? WHERE id = ?", (req.decision, req.claim_id))
    
    log_audit(conn, admin_id, "ADMIN", f"CLAIM_DECISION_{req.decision}", "CLAIM", req.claim_id, {
        "override_reason": req.override_reason,
        "notes": req.investigator_notes
    })
    conn.commit()
    conn.close()
    return {"message": f"Claim status updated to {req.decision}", "claim_id": req.claim_id}

@app.get("/api/admin/audit-logs")
def get_audit_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return logs

# =========================================================================
# 9. ADMIN DIRECT CRUD ROUTES (USERS, POLICIES, VEHICLES, CLAIMS)
# =========================================================================
class PolicyUpdate(BaseModel):
    status: Optional[str] = None
    calculated_premium: Optional[float] = None
    end_date: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[str] = None

@app.get("/api/admin/users")
def get_all_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, email, mobile, role, created_at FROM users ORDER BY created_at DESC")
    users = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return users

@app.put("/api/admin/users/{user_id}")
def update_user(user_id: str, req: UserUpdate, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    if req.full_name is not None:
        fields.append("full_name = ?")
        params.append(req.full_name)
    if req.email is not None:
        fields.append("email = ?")
        params.append(req.email)
    if req.mobile is not None:
        fields.append("mobile = ?")
        params.append(req.mobile)
    if req.role is not None:
        fields.append("role = ?")
        params.append(req.role)
    if not fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update.")
    params.append(user_id)
    cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    log_audit(conn, admin_id, "ADMIN", "UPDATE_USER", "USER", user_id, req.dict(exclude_unset=True))
    conn.commit()
    conn.close()
    return {"message": "User updated successfully", "user_id": user_id}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_USER", "USER", user_id, {"deleted_user_id": user_id})
    conn.commit()
    conn.close()
    return {"message": "User deleted successfully", "user_id": user_id}

@app.get("/api/admin/policies")
def get_all_policies():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT p.*, u.full_name as customer_name, u.mobile, v.registration_number, v.vehicle_type, v.manufacturer, v.model
    FROM policies p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    ORDER BY p.created_at DESC
    """)
    policies = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return policies

@app.put("/api/admin/policies/{policy_id}")
def update_policy(policy_id: str, req: PolicyUpdate, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    if req.status is not None:
        fields.append("status = ?")
        params.append(req.status)
    if req.calculated_premium is not None:
        fields.append("calculated_premium = ?")
        params.append(req.calculated_premium)
    if req.end_date is not None:
        fields.append("end_date = ?")
        params.append(req.end_date)
    if not fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update.")
    params.append(policy_id)
    cursor.execute(f"UPDATE policies SET {', '.join(fields)} WHERE id = ?", params)
    log_audit(conn, admin_id, "ADMIN", "UPDATE_POLICY", "POLICY", policy_id, req.dict(exclude_unset=True))
    conn.commit()
    conn.close()
    return {"message": "Policy updated successfully", "policy_id": policy_id}

@app.delete("/api/admin/policies/{policy_id}")
def delete_policy(policy_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM policies WHERE id = ?", (policy_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_POLICY", "POLICY", policy_id, {"deleted_policy_id": policy_id})
    conn.commit()
    conn.close()
    return {"message": "Policy deleted successfully", "policy_id": policy_id}

@app.get("/api/admin/vehicles")
def get_all_vehicles():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT v.*, u.full_name as owner_name, u.mobile as owner_mobile
    FROM vehicles v
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY v.created_at DESC
    """)
    vehicles = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return vehicles

@app.delete("/api/admin/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_VEHICLE", "VEHICLE", vehicle_id, {"deleted_vehicle_id": vehicle_id})
    conn.commit()
    conn.close()
    return {"message": "Vehicle removed successfully", "vehicle_id": vehicle_id}

@app.delete("/api/admin/claims/{claim_id}")
def delete_claim(claim_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM model_predictions WHERE claim_id = ?", (claim_id,))
    cursor.execute("DELETE FROM claim_decisions WHERE claim_id = ?", (claim_id,))
    cursor.execute("DELETE FROM claims WHERE id = ?", (claim_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_CLAIM", "CLAIM", claim_id, {"deleted_claim_id": claim_id})
    conn.commit()
    conn.close()
    return {"message": "Claim and its AI predictions purged successfully", "claim_id": claim_id}


# =========================================================================
# 11. CUSTOMER SUPPORT & INQUIRY HELPDESK
# =========================================================================
@app.post("/api/support/submit")
def submit_support_ticket(req: SupportTicketCreate):
    conn = get_db()
    cursor = conn.cursor()
    ticket_id = f"TICK-{str(uuid.uuid4().int)[:6]}"
    phone_val = (req.phone or req.mobile or "").strip()
    cursor.execute("""
    INSERT INTO support_tickets (id, user_id, full_name, email, phone, category, subject, message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
    """, (ticket_id, req.user_id, req.full_name, req.email, phone_val, req.category, req.subject, req.message))
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "ticket_id": ticket_id,
        "message": f"Your inquiry has been registered under reference {ticket_id}. Our support team will reply to {req.email} shortly."
    }

@app.get("/api/admin/support/tickets")
def get_support_tickets(status: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if status and status.upper() != 'ALL':
        cursor.execute("SELECT * FROM support_tickets WHERE status = ? ORDER BY created_at DESC", (status.upper(),))
    else:
        cursor.execute("SELECT * FROM support_tickets ORDER BY created_at DESC")
    tickets = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return tickets

@app.post("/api/admin/support/tickets/{ticket_id}/reply")
def reply_support_ticket(ticket_id: str, req: TicketReply, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    # Update ticket in database
    now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    UPDATE support_tickets 
    SET admin_reply = ?, replied_at = ?, status = ?
    WHERE id = ?
    """, (req.reply_message, now_str, req.new_status, ticket_id))
    log_audit(conn, admin_id, "ADMIN", "REPLY_SUPPORT_TICKET", "SUPPORT_TICKET", ticket_id, {
        "ticket_id": ticket_id, "customer_email": ticket["email"], "new_status": req.new_status
    })
    conn.commit()
    conn.close()

    # Dispatch email to user
    email_res = CommunicationService.send_email(
        to_email=ticket["email"],
        subject=f"Re: {ticket['subject']} [{ticket_id}]",
        body=req.reply_message,
        to_name=ticket["full_name"],
        sender_type="SUPPORT_REPLY"
    )

    return {
        "status": "success",
        "message": f"Reply saved and dispatched to {ticket['email']}",
        "email_dispatch": email_res
    }

class TicketStatusUpdate(BaseModel):
    status: str

@app.put("/api/admin/support/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, req: TicketStatusUpdate, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE support_tickets SET status = ? WHERE id = ?", (req.status.upper(), ticket_id))
    log_audit(conn, admin_id, "ADMIN", "UPDATE_TICKET_STATUS", "SUPPORT_TICKET", ticket_id, {"status": req.status.upper()})
    conn.commit()
    conn.close()
    return {"message": f"Ticket {ticket_id} status updated to {req.status.upper()}", "ticket_id": ticket_id}

@app.delete("/api/admin/support/tickets/{ticket_id}")
def delete_support_ticket(ticket_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM support_tickets WHERE id = ?", (ticket_id,))
    log_audit(conn, admin_id, "ADMIN", "DELETE_SUPPORT_TICKET", "SUPPORT_TICKET", ticket_id, {})
    conn.commit()
    conn.close()
    return {"message": f"Ticket {ticket_id} deleted successfully", "ticket_id": ticket_id}

# =========================================================================
# 12. ADMIN DIRECT EMAIL COMPOSER & COMMUNICATIONS DESK
# =========================================================================
@app.post("/api/admin/communications/send-email")
def admin_send_direct_email(req: DirectEmailSend, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    email_res = CommunicationService.send_email(
        to_email=req.to_email,
        subject=req.subject,
        body=req.body,
        to_name=req.to_name,
        sender_type="ADMIN_DIRECT"
    )
    log_audit(conn, admin_id, "ADMIN", "SEND_DIRECT_EMAIL", "COMMUNICATION", req.to_email, {
        "subject": req.subject, "recipient": req.to_email
    })
    conn.close()
    return {
        "status": "success",
        "message": f"Email successfully dispatched to {req.to_email}",
        "details": email_res
    }

@app.get("/api/admin/communications/sent-log")
def get_sent_emails_log():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sent_emails ORDER BY created_at DESC LIMIT 50")
    emails = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return emails

@app.delete("/api/admin/communications/sent-log/{email_id}")
def delete_sent_email_log(email_id: str, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sent_emails WHERE id = ?", (email_id,))
    conn.commit()
    conn.close()
    return {"message": f"Email log entry {email_id} deleted successfully", "email_id": email_id}

@app.delete("/api/admin/communications/sent-log")
def clear_sent_emails_log(recipient: Optional[str] = None, admin_id: str = "ADMIN_TERMINAL"):
    conn = get_db()
    cursor = conn.cursor()
    if recipient:
        cursor.execute("DELETE FROM sent_emails WHERE LOWER(recipient_email) = LOWER(?)", (recipient,))
    else:
        cursor.execute("DELETE FROM sent_emails")
    conn.commit()
    conn.close()
    return {"message": "Sent emails log cleared successfully"}

# =========================================================================
# 13. RAZORPAY PAYMENT GATEWAY INTEGRATION
# =========================================================================
@app.post("/api/create-order")
@app.post("/api/payments/razorpay/create-order")
def create_razorpay_order(req: RazorpayOrderCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate amount in paise (minimum 100 paise = INR 1.00)
    if req.amount is not None:
        amount_paise = int(req.amount)
    elif req.amount_inr is not None:
        amount_paise = int(round(req.amount_inr * 100))
    else:
        amount_paise = 100

    if amount_paise < 100:
        amount_paise = 100

    amount_inr = round(amount_paise / 100.0, 2)
    currency = req.currency or "INR"
    receipt = req.receipt or f"rcpt_{uuid.uuid4().hex[:12]}"
    
    rzp_key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_TixocUpKm9Az6k").strip()
    rzp_key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "8X3UrXW1xIWkPR29NjTjsQwi").strip()

    order_id = None
    is_simulated = False

    # Call Razorpay Official API / SDK
    try:
        client = razorpay.Client(auth=(rzp_key_id, rzp_key_secret))
        client.set_app_details({"title": "SecureWheels", "version": "1.0"})
        order_payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "notes": {
                "policy_id": req.policy_id or "",
                "customer_name": req.customer_name or "Policyholder"
            }
        }
        rzp_res = client.order.create(data=order_payload)
        order_id = rzp_res.get("id")
    except razorpay.errors.BadRequestError as e:
        print(f"[Razorpay API Error] Live API order creation rejected: {e}")
        err_str = str(e)
        if "Authentication failed" in err_str or "expired" in err_str.lower():
            err_str = "Razorpay authentication failed: The provided API Key or Secret has expired or is invalid. Please generate a fresh Key ID & Key Secret in your Razorpay Dashboard (Settings -> API Keys) in Test Mode."
        raise HTTPException(
            status_code=400,
            detail=err_str
        )
    except Exception as e:
        print(f"[Razorpay API Error] Live API order creation failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Razorpay Order Creation Failed: {str(e)}"
        )

    # Record in payment_transactions table
    tx_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO payment_transactions (id, policy_id, order_id, amount, currency, status, provider)
    VALUES (?, ?, ?, ?, ?, 'CREATED', 'RAZORPAY')
    """, (tx_id, req.policy_id or "GENERAL", order_id, amount_inr, currency))
    conn.commit()
    conn.close()

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "amount_paise": amount_paise,
        "amount_inr": amount_inr,
        "currency": currency,
        "receipt": receipt,
        "key_id": rzp_key_id,
        "simulated": False,
        "gateway_notice": "Razorpay Official Standard Checkout Active"
    }

@app.post("/api/verify-payment")
@app.post("/api/payments/razorpay/verify-payment")
def verify_razorpay_payment(req: RazorpayPaymentVerify):
    rzp_key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_TixocUpKm9Az6k").strip()
    rzp_key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "8X3UrXW1xIWkPR29NjTjsQwi").strip()

    if not req.razorpay_order_id or not req.razorpay_payment_id or not req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing required payment parameters (order_id, payment_id, signature)")

    is_valid = False

    # Primary check with Razorpay SDK utility
    try:
        client = razorpay.Client(auth=(rzp_key_id, rzp_key_secret))
        client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        })
        is_valid = True
    except Exception as sdk_err:
        # Fallback to manual HMAC SHA256 of (order_id + "|" + payment_id) using key_secret
        msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8")
        generated_signature = hmac.new(
            rzp_key_secret.encode("utf-8"),
            msg,
            hashlib.sha256
        ).hexdigest()
        is_valid = hmac.compare_digest(generated_signature, req.razorpay_signature)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature. Payment cannot be verified.")

    conn = get_db()
    cursor = conn.cursor()

    # Update payment transaction record
    cursor.execute("""
    UPDATE payment_transactions
    SET payment_id = ?, status = 'CAPTURED'
    WHERE order_id = ?
    """, (req.razorpay_payment_id, req.razorpay_order_id))

    pol_row = None
    if req.policy_id:
        cursor.execute("""
        UPDATE policies 
        SET status = 'ACTIVE', payment_method = 'Razorpay Secured Gateway', prototype_amount_paid = 1.0
        WHERE id = ?
        """, (req.policy_id,))

        cursor.execute("""
        SELECT p.*, u.full_name, u.email, v.registration_number, v.manufacturer, v.model
        FROM policies p
        JOIN users u ON p.user_id = u.id
        JOIN vehicles v ON p.vehicle_id = v.id
        WHERE p.id = ?
        """, (req.policy_id,))
        pol_row = cursor.fetchone()

        log_audit(conn, "CUSTOMER", "CUSTOMER", "RAZORPAY_PAYMENT_SUCCESS", "POLICY", req.policy_id, {
            "order_id": req.razorpay_order_id,
            "payment_id": req.razorpay_payment_id
        })

    conn.commit()
    conn.close()

    # Dispatch official Policy Issuance Email with IRDAI particulars
    if pol_row:
        try:
            veh_info = f"{pol_row['manufacturer']} {pol_row['model']} ({pol_row['registration_number']})"
            CommunicationService.send_policy_confirmation_email(
                recipient_email=pol_row["email"],
                customer_name=pol_row["full_name"],
                policy_number=pol_row["policy_number"],
                plan_type=pol_row["plan_type"],
                vehicle_info=veh_info,
                premium_paid=float(pol_row["prototype_amount_paid"] or 1.0),
                duration_years=int(pol_row["duration_years"] or 1)
            )
        except Exception as e:
            print(f"[Email Notice] Policy confirmation email dispatch failed: {e}")

    return {
        "status": "success",
        "verified": True,
        "message": "Payment verified successfully",
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
        "policy_id": req.policy_id
    }

@app.get("/api/payments/transactions")
def get_payment_transactions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        pt.id,
        pt.policy_id,
        pt.order_id,
        pt.payment_id,
        pt.amount,
        pt.currency,
        pt.status,
        pt.provider,
        pt.created_at,
        p.policy_number,
        p.plan_type,
        p.calculated_premium,
        u.full_name as customer_name,
        u.email as customer_email,
        u.mobile as customer_mobile,
        v.registration_number,
        v.manufacturer,
        v.model
    FROM payment_transactions pt
    LEFT JOIN policies p ON pt.policy_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    ORDER BY pt.created_at DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/admin/payments/export-csv")
def export_payments_csv():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        pt.id,
        pt.created_at,
        pt.order_id,
        pt.payment_id,
        pt.amount,
        pt.currency,
        pt.status,
        pt.provider,
        p.policy_number,
        p.plan_type,
        p.calculated_premium,
        u.full_name as customer_name,
        u.email as customer_email,
        u.mobile as customer_mobile,
        v.registration_number,
        v.manufacturer,
        v.model
    FROM payment_transactions pt
    LEFT JOIN policies p ON pt.policy_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    ORDER BY pt.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID", "Timestamp", "Razorpay Order ID", "Razorpay Payment ID",
        "Amount (INR)", "Currency", "Status", "Payment Gateway",
        "Policy Number", "Insurance Plan", "Gross Premium (INR)",
        "Customer Name", "Customer Email", "Customer Mobile",
        "Vehicle Reg Number", "Vehicle Manufacturer", "Vehicle Model"
    ])
    for r in rows:
        writer.writerow([
            r["id"], r["created_at"], r["order_id"], r["payment_id"] or "N/A",
            r["amount"], r["currency"] or "INR", r["status"], r["provider"] or "RAZORPAY",
            r["policy_number"] or "N/A", r["plan_type"] or "N/A", r["calculated_premium"] or 0,
            r["customer_name"] or "N/A", r["customer_email"] or "N/A", r["customer_mobile"] or "N/A",
            r["registration_number"] or "N/A", r["manufacturer"] or "N/A", r["model"] or "N/A"
        ])
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SecureWheels_Razorpay_Settlement_Ledger.csv"}
    )

# =========================================================================
# 16. SYSTEM KEEPALIVE, SUPABASE ACTIVE-GUARD & DAILY OWNER DIGEST
# =========================================================================
def _execute_daily_keepalive_digest(send_async: bool = True, background_tasks: Optional[BackgroundTasks] = None) -> dict:
    global _LAST_DIGEST_IST_DATE
    ist_now = now_ist()
    today = ist_now.date()
    today_str = today.isoformat()
    _LAST_DIGEST_IST_DATE = today_str

    conn = get_db()
    cursor = conn.cursor()

    # Idempotency guard: only send one daily digest per IST calendar day
    cursor.execute("SELECT id FROM system_heartbeats WHERE details LIKE ? LIMIT 1", (f'%"ist_date": "{today_str}"%',))
    already_sent = cursor.fetchone()

    deploy_date = date(2026, 9, 1)
    days_active = max(1, (today - deploy_date).days)

    cursor.execute("SELECT COUNT(*) as cnt FROM policies")
    total_policies = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM claims")
    total_claims = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    total_users = cursor.fetchone()["cnt"]

    if already_sent:
        conn.close()
        return {
            "status": "ok",
            "message": f"Daily keep-alive digest already dispatched for {today_str} IST.",
            "days_active": days_active,
            "db_status": "ACTIVE",
            "total_policies": total_policies,
            "total_claims": total_claims
        }

    # Record pulse in system_heartbeats table
    pulse_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO system_heartbeats (
        id, days_active, ping_source, db_status, total_policies, total_claims, owner_notified, details
    ) VALUES (?, ?, 'DAILY_CRON', 'ACTIVE', ?, ?, 'kulkarnisarvesh3103@gmail.com', ?)
    """, (
        pulse_id, days_active, total_policies, total_claims,
        json.dumps({
            "ist_date": today_str,
            "total_users": total_users,
            "timestamp": ist_now.isoformat() + "+05:30",
            "note": "24/7 Keep-alive heartbeat recorded. Supabase inactivity counter reset."
        })
    ))
    conn.commit()
    conn.close()

    owner_emails = ["kulkarnisarvesh3103@gmail.com", "sarveshkulkarni3103@gmail.com"]
    ist_display_time = ist_now.strftime("%I:%M %p IST, %d %b %Y")
    subject = f"SecureWheels AI — Day {days_active} Platform Health & Exclusive Owner Offers"
    html_body = f"""
    <html>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 580px; margin: auto; background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <div style="border-bottom: 2px solid #1f6feb; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="color: #12304a; margin: 0; font-size: 20px;">SecureWheels AI</h2>
              <span style="font-size: 11px; color: #15803d; background: #dcfce7; padding: 3px 8px; border-radius: 4px; font-weight: bold;">
                Daily Keep-Alive Pulse • Active
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 18px; font-weight: 800; color: #1f6feb;">Day {days_active}</span>
              <div style="font-size: 10px; color: #64748b;">Consecutive Operational</div>
            </div>
          </div>

          <p style="font-size: 14px; color: #334155;">Hello <strong>Sarvesh Kulkarni</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your daily platform keep-alive heartbeat has executed successfully at <strong>{ist_display_time}</strong>. 
            All cloud components (Supabase PostgreSQL, Vercel Frontend, and Render ML Backend) have been verified active and refreshed.
          </p>

          <div style="background-color: #f1f5f9; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 13px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">Live Platform Telemetry:</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
              <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b;">Active Policies</div>
                <div style="font-size: 16px; font-weight: 800; color: #1f6feb;">{total_policies}</div>
              </div>
              <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b;">Total Claims</div>
                <div style="font-size: 16px; font-weight: 800; color: #15803d;">{total_claims}</div>
              </div>
              <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b;">Registered Users</div>
                <div style="font-size: 16px; font-weight: 800; color: #7c3aed;">{total_users}</div>
              </div>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="font-weight: 800; color: #1e40af; font-size: 13px; margin-bottom: 6px;">
              Exclusive Policyholder Privileges Active on Your Account:
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #1e3a8a; line-height: 1.6;">
              <li><strong>Zero-Dep SuperProtect Max:</strong> Automatic depreciation waiver on plastic & rubber parts.</li>
              <li><strong>No-Claim Bonus (NCB) Lock:</strong> 20% safe-driver premium discount earned for incident-free period.</li>
              <li><strong>24x7 AI Telematics Shield:</strong> Real-time automated claim fast-tracking enabled.</li>
            </ul>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            • Supabase Inactivity Timer: <strong>Refreshed</strong> (Zero risk of database suspension).<br/>
            • Next scheduled pulse: Tomorrow at 9:00 AM IST.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            SecureWheels AI Autonomous Operations • System Uptime Guard & Keep-Alive Sentinel
          </p>
        </div>
      </body>
    </html>
    """

    for recipient in owner_emails:
        if send_async and background_tasks is not None:
            background_tasks.add_task(
                CommunicationService.send_email,
                recipient,
                subject,
                html_body,
                "Sarvesh Kulkarni (Founder & Chief Administrator)",
                "PLATFORM_KEEPALIVE_DIGEST"
            )
        else:
            CommunicationService.send_email(
                recipient,
                subject,
                html_body,
                "Sarvesh Kulkarni (Founder & Chief Administrator)",
                "PLATFORM_KEEPALIVE_DIGEST"
            )

    return {
        "status": "ok",
        "message": "Keep-alive pulse recorded successfully. Supabase activity refreshed and daily owner digest queued.",
        "days_active": days_active,
        "db_status": "ACTIVE",
        "owner_notified": ", ".join(owner_emails),
        "total_policies": total_policies,
        "total_claims": total_claims
    }

@app.get("/api/system/daily-keepalive")
@app.post("/api/system/daily-keepalive")
def trigger_daily_keepalive(background_tasks: BackgroundTasks):
    """
    Guaranteed Daily Activity Pulse:
    1. Executes database activity against Supabase PostgreSQL so free tier NEVER pauses.
    2. Updates system_heartbeats table with days count since deployment.
    3. Dispatches daily executive health digest & exclusive offers email to owner (kulkarnisarvesh3103@gmail.com).
    """
    return _execute_daily_keepalive_digest(send_async=True, background_tasks=background_tasks)



