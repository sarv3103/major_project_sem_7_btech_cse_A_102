-- ==============================================================================
-- SECUREWHEELS AI: RELATIONAL DATABASE SCHEMA DEFINITION
-- Academic Project: Insurance Claim Fraud Detection using Ensemble Learning
-- Semester VII Major Project (B.Tech CSE, 2026)
-- Target Database: SQLite 3 (Development/Local) -> Supabase PostgreSQL (Production)
-- Location: d:\INSURANCE_CLAIM_BTECH_PROJECT\database\insurance_platform.db
-- ==============================================================================

-- 1. USERS TABLE
-- Stores credentials and profiles for customers, insurance surveyors, and administrators
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',  -- 'CUSTOMER', 'ADMIN', 'INVESTIGATOR'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VEHICLES TABLE
-- Registered vehicles owned by policyholders with motor particulars and estimated IDV
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    registration_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,             -- 'Car', 'Two-Wheeler', 'Commercial'
    manufacturer TEXT NOT NULL,             -- e.g., 'Honda', 'Maruti Suzuki', 'Hyundai'
    model TEXT NOT NULL,                    -- e.g., 'City', 'Swift Dzire', 'Creta'
    manufacturing_year INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,                -- 'Petrol', 'Diesel', 'CNG', 'Electric'
    estimated_idv REAL NOT NULL,            -- Insured Declared Value in INR
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. POLICIES TABLE
-- Insurance contracts issued with coverage duration, IRDAI underwriting and premium data
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    policy_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    duration_years INTEGER NOT NULL,
    plan_type TEXT NOT NULL,                -- 'Comprehensive', 'Zero-Depreciation', 'Third-Party'
    calculated_premium REAL NOT NULL,
    prototype_amount_paid REAL DEFAULT 1.0,
    payment_method TEXT DEFAULT 'Simulated UPI Sandbox',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',  -- 'ACTIVE', 'EXPIRED', 'CANCELLED'
    statutory_idv REAL,
    idv_variance_pct REAL DEFAULT 0.0,
    underwriting_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

-- 4. OTPS TABLE
-- Ephemeral 6-digit cryptographic authentication tokens sent via live Gmail SMTP
CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,              -- Email address or phone number
    otp_code TEXT NOT NULL,                -- 6-digit verification code
    expires_at TIMESTAMP NOT NULL,
    is_used INTEGER DEFAULT 0              -- 0 = Active/Unused, 1 = Consumed
);

-- 5. CLAIMS TABLE
-- Detailed accident claims filed by customers including narrative, parts damage and photos
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
    fault TEXT DEFAULT 'Policy Holder',     -- 'Policy Holder', 'Third Party'
    accident_area TEXT DEFAULT 'Urban',     -- 'Urban', 'Rural'
    damage_severity REAL DEFAULT 0.0,
    status TEXT DEFAULT 'SUBMITTED',       -- 'SUBMITTED', 'APPROVED', 'REJECTED', 'UNDER_INVESTIGATION'
    damage_image_url TEXT,                 -- Base64 or URI of uploaded vehicle photo
    visual_consistency_score REAL DEFAULT 0.90,
    visual_inspection_report TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES policies (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 6. MODEL PREDICTIONS TABLE
-- AI ensemble inference audit: Random Forest, XGBoost, Isolation Forest & SHAP weights
CREATE TABLE IF NOT EXISTS model_predictions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    rf_score REAL NOT NULL,                 -- Random Forest probability
    xgb_score REAL NOT NULL,                -- XGBoost probability
    iso_score REAL NOT NULL,                -- Isolation Forest anomaly score
    ensemble_score REAL NOT NULL,           -- Weighted composite fraud risk score (0.0 to 1.0)
    threshold_used REAL NOT NULL,           -- Cost-sensitive cut-off threshold (e.g. 0.40)
    risk_level TEXT NOT NULL,               -- 'LOW', 'MEDIUM', 'HIGH'
    recommended_action TEXT NOT NULL,       -- 'AUTO_APPROVE', 'MANUAL_REVIEW', 'SPECIAL_INVESTIGATION'
    model_disagreement INTEGER DEFAULT 0,  -- 1 if base classifiers diverge significantly
    disagreement_note TEXT,
    top_contributing_factors TEXT,          -- JSON list of top SHAP feature attributions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
);

-- 7. CLAIM DECISIONS TABLE
-- Human surveyor / admin adjudication actions, override reasons, and SIU audit trail
CREATE TABLE IF NOT EXISTS claim_decisions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    decision TEXT NOT NULL,                 -- 'APPROVED', 'REJECTED', 'REFERRED_TO_SIU'
    override_reason TEXT,                   -- Mandatory if human decision differs from AI recommendation
    investigator_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
);

-- 8. AUDIT LOGS TABLE
-- Immutable security trail tracking all critical system and user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,                   -- e.g. 'USER_LOGIN', 'POLICY_PURCHASE', 'CLAIM_SUBMITTED'
    entity_type TEXT NOT NULL,              -- e.g. 'POLICY', 'CLAIM', 'PAYMENT'
    entity_id TEXT NOT NULL,
    details TEXT,                           -- JSON metadata or explanation
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRODUCTS TABLE
-- Dynamic insurance coverage plans managed by administrators (e.g. Zero-Dep, Comprehensive)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    description TEXT NOT NULL,
    base_rate REAL NOT NULL,                -- Rate multiplier for premium computation
    deductible REAL DEFAULT 400.0,
    coverage_summary TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. SUPPORT TICKETS TABLE
-- Customer inquiries, policy questions, and support resolutions
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    category TEXT NOT NULL,                 -- 'CLAIM_QUERY', 'POLICY_ISSUE', 'PAYMENT', 'GENERAL'
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',            -- 'OPEN', 'IN_PROGRESS', 'RESOLVED'
    admin_reply TEXT,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SENT EMAILS TABLE
-- Outbound email communications ledger (e.g. OTP notifications, welcome kits, certificates)
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
);

-- 12. PAYMENT TRANSACTIONS TABLE
-- Razorpay orders, payment IDs, and transaction audit trails
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    payment_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'CREATED',         -- 'CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED'
    provider TEXT DEFAULT 'RAZORPAY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. VEHICLE CATALOG TABLE
-- Standard vehicle variants, ex-showroom valuations, and engine CC reference data
CREATE TABLE IF NOT EXISTS vehicle_catalog (
    id TEXT PRIMARY KEY,
    vehicle_type TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    ex_showroom_price REAL NOT NULL,
    engine_cc INTEGER DEFAULT 1200,
    seating_capacity INTEGER DEFAULT 5
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_vehicle_id ON policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_model_predictions_claim_id ON model_predictions(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier);
