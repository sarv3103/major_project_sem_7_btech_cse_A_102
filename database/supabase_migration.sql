-- ===============================================================================
-- SECUREWHEELS AI MOTOR INSURANCE PLATFORM: SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Compatible with Supabase SQL Editor and Standalone PostgreSQL 14+
-- ===============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    manufacturing_year INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,
    estimated_idv NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Policies Table
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    policy_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    duration_years INTEGER NOT NULL,
    plan_type TEXT NOT NULL,
    calculated_premium NUMERIC(10, 2) NOT NULL,
    prototype_amount_paid NUMERIC(10, 2) DEFAULT 1.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. OTP Records Table
CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    identifier TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used INTEGER DEFAULT 0
);

-- 5. Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    claim_number TEXT UNIQUE NOT NULL,
    policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accident_date DATE NOT NULL,
    accident_time TEXT NOT NULL,
    accident_location TEXT NOT NULL,
    incident_description TEXT NOT NULL,
    damage_description TEXT NOT NULL,
    estimated_repair_cost NUMERIC(12, 2) NOT NULL,
    is_drivable INTEGER DEFAULT 1,
    third_party_involved INTEGER DEFAULT 0,
    injury_reported INTEGER DEFAULT 0,
    fatality_reported INTEGER DEFAULT 0,
    police_report_filed INTEGER DEFAULT 0,
    witness_present INTEGER DEFAULT 0,
    fault TEXT DEFAULT 'Policy Holder',
    accident_area TEXT DEFAULT 'Urban',
    damage_severity NUMERIC(4, 2) DEFAULT 0.0,
    damage_image_url TEXT,
    visual_consistency_score NUMERIC(4, 2) DEFAULT 0.90,
    visual_inspection_report TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Model Predictions Table
CREATE TABLE IF NOT EXISTS model_predictions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    rf_score NUMERIC(6, 4) NOT NULL,
    xgb_score NUMERIC(6, 4) NOT NULL,
    iso_score NUMERIC(6, 4) NOT NULL,
    ensemble_score NUMERIC(6, 4) NOT NULL,
    threshold_used NUMERIC(4, 2) NOT NULL,
    risk_level TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    model_disagreement INTEGER DEFAULT 0,
    disagreement_note TEXT,
    top_contributing_factors TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Claim Decisions Table
CREATE TABLE IF NOT EXISTS claim_decisions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    admin_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    override_reason TEXT,
    investigator_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    actor_id TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Dynamic Insurance Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    description TEXT NOT NULL,
    base_rate NUMERIC(6, 4) NOT NULL,
    deductible NUMERIC(10, 2) DEFAULT 400.00,
    coverage_summary TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Sample Permissive Development Policy (can be restricted for production auth)
CREATE POLICY "Allow public read on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read on active policies" ON policies FOR SELECT USING (true);
