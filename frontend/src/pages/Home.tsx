import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Car, Bike, AlertCircle, ArrowRight, 
  CheckCircle, BarChart3, Lock, Cpu, Eye, FileText, Zap
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section style={{ backgroundColor: '#12304A', color: '#fff', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#38BDF8', marginBottom: '20px' }}>
              <Zap size={14} /> Next-Gen AI Motor Insurance & Fraud Prevention
            </div>
            <h1 style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1.15', marginBottom: '20px', letterSpacing: '-0.5px' }}>
              Instant Motor Insurance, <br />
              <span style={{ color: '#38BDF8' }}>Intelligent AI Adjudication.</span>
            </h1>
            <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#CBD5E1', marginBottom: '32px', maxWidth: '580px' }}>
              Protect your car or two-wheeler with instant policy issuance, automated digital claim processing, 
              and state-of-the-art cost-sensitive ensemble AI that detects fraudulent claims in real time.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Link to='/buy' style={{ padding: '14px 28px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(31, 111, 235, 0.4)' }}>
                    <Car size={18} /> Buy Insurance (Instant Policy) <ArrowRight size={16} />
                  </Link>
                  <Link to='/claim' style={{ padding: '14px 28px', backgroundColor: '#15803D', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(21, 128, 61, 0.4)' }}>
                    <AlertCircle size={18} /> File Instant Claim
                  </Link>
                </>
              ) : (
                <>
                  <Link to='/login' style={{ padding: '14px 28px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(31, 111, 235, 0.4)' }}>
                    <Car size={18} /> Get Covered (Login to Buy) <ArrowRight size={16} />
                  </Link>
                  <Link to='/claim' style={{ padding: '14px 28px', backgroundColor: '#15803D', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(21, 128, 61, 0.4)' }}>
                    <AlertCircle size={18} /> Claim Insurance (OTP Verify)
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Hero Stats Card */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Enterprise Underwriting & ML Performance
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Cost-Sensitive Hybrid Ensemble
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Benchmark Dataset</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>15,420</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Verified Claims</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Fraud Detection Recall</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#34D399' }}>81.8%</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Stacking Out-Of-Fold</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Misclassification Cost</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#FBBF24' }}>-38.3%</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Threshold Optimized</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Digital Policy Issuance</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#38BDF8' }}>&lt; 60s</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Instant Schedule PDF</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color='#34D399' /> Real-time verification with immutable SHA-256 audit logging
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Types Offered */}
      <section style={{ padding: '64px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#12304A', marginBottom: '12px' }}>
            Comprehensive Motor Insurance Categories
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '640px', margin: '0 auto' }}>
            Choose tailor-made coverage with transparent pricing, zero hidden clauses, and instant downloadable PDF schedules.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
          {/* Card 1: Private Car */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Car size={26} color='#1F6FEB' />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>Private Car Comprehensive</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              Complete own-damage coverage against accidents, collisions, fires, theft, and natural calamities with third-party liability protection.
            </p>
            <ul style={{ fontSize: '13px', color: '#334155', listStyle: 'none', padding: 0, lineHeight: '2.2', marginBottom: '24px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> 100% IDV bumper-to-bumper protection</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Cashless repairs at 5,000+ garages</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> 24x7 roadside emergency assistance</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <Link to='/buy' style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#12304A', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
                Select Car Plan
              </Link>
            </div>
          </div>

          {/* Card 2: Two-Wheeler */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Bike size={26} color='#15803D' />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>Two-Wheeler / Bike Policy</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              Dedicated protection for motorcycles and scooters with instant OTP renewals and multi-year coverage discounts.
            </p>
            <ul style={{ fontSize: '13px', color: '#334155', listStyle: 'none', padding: 0, lineHeight: '2.2', marginBottom: '24px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Quick cashless claim settlement</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Multi-year coverage (Up to 3 Years)</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Zero inspection renewal options</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <Link to='/buy' style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#12304A', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
                Select Bike Plan
              </Link>
            </div>
          </div>

          {/* Card 3: Zero-Depreciation */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <ShieldCheck size={26} color='#6D28D9' />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>Zero-Depreciation Add-On</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              Waive standard depreciation deductions on vehicle parts (fiberglass, rubber, plastic, glass) during claim settlements.
            </p>
            <ul style={{ fontSize: '13px', color: '#334155', listStyle: 'none', padding: 0, lineHeight: '2.2', marginBottom: '24px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> 100% claim payout on replaced parts</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Ideal for vehicles under 5 years old</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color='#15803D' /> Engine and gearbox protection included</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <Link to='/insurance-types' style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#6D28D9', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Claim Processing Banner */}
      <section style={{ backgroundColor: '#F8FAFC', padding: '64px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ color: '#15803D', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Frictionless & Fraud-Resistant</span>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#12304A', marginTop: '6px' }}>How Digital Claiming Works</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#12304A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: '800' }}>1</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>OTP Authentication</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                Claimant verifies registered phone or email. Eliminates unauthorized claims and fetches vehicle data directly from policy records.
              </p>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1F6FEB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: '800' }}>2</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Multi-Modal Evidence</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                Customer submits accident details, damage descriptions, and photos. Vision algorithms evaluate damage severity and description match.
              </p>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#15803D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: '800' }}>3</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>AI Ensemble Evaluation</h4>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                Random Forest, XGBoost, and Isolation Forest score the claim. Cost-sensitive thresholding routes genuine claims for instant approval.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
