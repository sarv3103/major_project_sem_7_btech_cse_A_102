import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "insurance_platform.db")

class _PgCursorWrapper:
    def __init__(self, cursor):
        self._cur = cursor

    def execute(self, query, params=None):
        if query.strip().upper().startswith("PRAGMA"):
            return None
        if params is not None:
            pg_query = query.replace("?", "%s")
            return self._cur.execute(pg_query, params)
        return self._cur.execute(query)

    def executemany(self, query, seq_of_params):
        pg_query = query.replace("?", "%s")
        return self._cur.executemany(pg_query, seq_of_params)

    def fetchone(self):
        try:
            return self._cur.fetchone()
        except Exception:
            return None

    def fetchall(self):
        try:
            return self._cur.fetchall()
        except Exception:
            return []

    def __iter__(self):
        return iter(self._cur)

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        return self._cur.lastrowid

    def close(self):
        self._cur.close()

class _PgConnWrapper:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        from psycopg2.extras import RealDictCursor
        return _PgCursorWrapper(self._conn.cursor(cursor_factory=RealDictCursor))

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def get_db():
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if database_url:
        try:
            import psycopg2
            conn = psycopg2.connect(database_url)
            return _PgConnWrapper(conn)
        except Exception as e:
            print(f"[Database] Warning: Could not connect to PostgreSQL ({e}). Falling back to SQLite.")

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    if isinstance(conn, _PgConnWrapper):
        print("[Database] Production Supabase PostgreSQL connected and active.")
        try:
            pg_cur = conn.cursor()
            pg_cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS damage_image_urls TEXT")
            pg_cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS damage_image_url TEXT")
            pg_cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS visual_consistency_score DOUBLE PRECISION DEFAULT 0.90")
            pg_cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS visual_inspection_report TEXT")
            pg_cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            pg_cur.execute("ALTER TABLE claims ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP")
            pg_cur.execute("UPDATE claims SET created_at = COALESCE(created_at, accident_date::timestamp, CURRENT_TIMESTAMP) WHERE created_at IS NULL")
            pg_cur.execute("ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Simulated UPI Sandbox'")
            pg_cur.execute("ALTER TABLE policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            pg_cur.execute("ALTER TABLE policies ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP")
            pg_cur.execute("UPDATE policies SET created_at = COALESCE(created_at, start_date::timestamp, CURRENT_TIMESTAMP) WHERE created_at IS NULL")
            conn.commit()
        except Exception as pg_err:
            print(f"[Database] PostgreSQL schema migration note: {pg_err}")
            conn.rollback()
        conn.close()
        return
    cursor = conn.cursor()
    
    # 1. Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Vehicles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        registration_number TEXT UNIQUE NOT NULL,
        vehicle_type TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        manufacturing_year INTEGER NOT NULL,
        fuel_type TEXT NOT NULL,
        estimated_idv REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # 3. Policies
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        policy_number TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        vehicle_id TEXT NOT NULL,
        duration_years INTEGER NOT NULL,
        plan_type TEXT NOT NULL,
        calculated_premium REAL NOT NULL,
        prototype_amount_paid REAL DEFAULT 1.0,
        payment_method TEXT DEFAULT 'Simulated UPI Sandbox',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    )
    """)
    
    cursor.execute("PRAGMA table_info(policies)")
    pol_cols = [col["name"] for col in cursor.fetchall()]
    if "payment_method" not in pol_cols:
        cursor.execute("ALTER TABLE policies ADD COLUMN payment_method TEXT DEFAULT 'Simulated UPI Sandbox'")
    
    # 4. OTP records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otps (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used INTEGER DEFAULT 0
    )
    """)
    
    # 5. Claims
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        claim_number TEXT UNIQUE NOT NULL,
        policy_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        accident_date TEXT NOT NULL,
        accident_time TEXT NOT NULL,
        accident_location TEXT NOT NULL,
        incident_description TEXT NOT NULL,
        damage_description TEXT NOT NULL,
        estimated_repair_cost REAL NOT NULL,
        is_drivable INTEGER DEFAULT 1,
        third_party_involved INTEGER DEFAULT 0,
        injury_reported INTEGER DEFAULT 0,
        fatality_reported INTEGER DEFAULT 0,
        police_report_filed INTEGER DEFAULT 0,
        witness_present INTEGER DEFAULT 0,
        fault TEXT DEFAULT 'Policy Holder',
        accident_area TEXT DEFAULT 'Urban',
        damage_severity REAL DEFAULT 0.0,
        status TEXT DEFAULT 'SUBMITTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (policy_id) REFERENCES policies (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # 6. Model Predictions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_predictions (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        rf_score REAL NOT NULL,
        xgb_score REAL NOT NULL,
        iso_score REAL NOT NULL,
        ensemble_score REAL NOT NULL,
        threshold_used REAL NOT NULL,
        risk_level TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        model_disagreement INTEGER DEFAULT 0,
        disagreement_note TEXT,
        top_contributing_factors TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES claims (id)
    )
    """)
    
    # 7. Claim Decisions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claim_decisions (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        admin_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        override_reason TEXT,
        investigator_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES claims (id)
    )
    """)
    
    # 8. Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 9. Dynamic Insurance Products (Admin-Managed Catalog)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        plan_type TEXT NOT NULL,
        description TEXT NOT NULL,
        base_rate REAL NOT NULL,
        deductible REAL DEFAULT 400.0,
        coverage_summary TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Check & add visual inspection columns to claims if missing
    cursor.execute("PRAGMA table_info(claims)")
    columns = [col["name"] for col in cursor.fetchall()]
    if "damage_image_url" not in columns:
        cursor.execute("ALTER TABLE claims ADD COLUMN damage_image_url TEXT")
    if "damage_image_urls" not in columns:
        cursor.execute("ALTER TABLE claims ADD COLUMN damage_image_urls TEXT")
    if "visual_consistency_score" not in columns:
        cursor.execute("ALTER TABLE claims ADD COLUMN visual_consistency_score REAL DEFAULT 0.90")
    if "visual_inspection_report" not in columns:
        cursor.execute("ALTER TABLE claims ADD COLUMN visual_inspection_report TEXT")

    # Seed Default Insurance Products if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM products")
    if cursor.fetchone()["cnt"] == 0:
        default_products = [
            (
                "PROD-001", "Comprehensive Shield Pro", "All Vehicles", "Comprehensive",
                "Full own-damage indemnity, natural calamity protection, fire, theft, and compulsory third-party legal liability.",
                0.024, 400.0,
                "Accidental Collision, Fire, Theft, Flood Inundation, 24x7 Roadside Assistance, Cashless Network Garage Access"
            ),
            (
                "PROD-002", "Zero-Dep SuperProtect Max", "Car", "Zero-Depreciation",
                "100% bumper-to-bumper claim reimbursement without any depreciation deduction on metal, plastic, fiberglass, or rubber parts.",
                0.032, 1000.0,
                "Zero Depreciation on All Spares, Unlimited Claims, Engine & Gearbox Protector, Key & Lock Replacement, Consumables Cover"
            ),
            (
                "PROD-003", "Third-Party Legal Essential", "All Vehicles", "Third-Party",
                "Mandatory statutory coverage under Section 146 of the Motor Vehicles Act 1988 for third-party bodily injury, fatality, and property damage.",
                0.008, 0.0,
                "Unlimited Third-Party Bodily Injury / Death, Property Damage up to Rs. 7.5 Lakhs, Compulsory Personal Accident Cover Rs. 15 Lakhs"
            ),
            (
                "PROD-004", "EV Battery & Drive Guard", "Electric Vehicle", "Comprehensive",
                "Specialized policy tailored for Electric Vehicles (EVs) covering high-voltage lithium battery pack degradation, water ingress, charger damage, and electric motor burnout.",
                0.028, 500.0,
                "High-Voltage Battery Pack Cover, EV Wallbox Home Charger Protection, Overheating & Thermal Runaway, Dedicated EV Towing"
            ),
            (
                "PROD-005", "Two-Wheeler MotoSecure Premium", "Two-Wheeler", "Comprehensive",
                "Designed specifically for motorcycles, cruisers, and electric scooters with enhanced helmet cover and zero-depreciation replacement.",
                0.022, 200.0,
                "Two-Wheeler Own Damage, Helmet & Riding Gear Replacement up to Rs. 5,000, 24x7 Spot Repair, Puncture & Fuel Assistance"
            )
        ]
        cursor.executemany("""
        INSERT INTO products (id, name, vehicle_type, plan_type, description, base_rate, deductible, coverage_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, default_products)
        conn.commit()

    # 10. Customer Support Tickets (Helpdesk & Inquiries)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN',
        admin_reply TEXT,
        replied_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 11. Dispatched Outbound Emails Audit Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sent_emails (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sender_type TEXT DEFAULT 'ADMIN_DIRECT',
        status TEXT DEFAULT 'SENT',
        provider TEXT DEFAULT 'SMTP / SecureWheels Gateway',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 12. Razorpay & Payment Gateway Transactions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        policy_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        payment_id TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'CREATED',
        provider TEXT DEFAULT 'RAZORPAY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema initialized successfully at:", DB_PATH)
