import React from 'react';
import { BookOpen, Cpu, Shield, Award, CheckCircle, Zap } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#12304A', marginBottom: '10px' }}>
          Company Overview & AI Architecture
        </h1>
        <p style={{ fontSize: '15px', color: '#64748B' }}>
          SecureWheels General Insurance • Intelligent Motor Insurance & Multimodal Fraud Detection Platform
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '28px', lineHeight: '1.7' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#12304A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color='#1F6FEB' /> Core Underwriting Mission
        </h3>
        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '14px' }}>
          SecureWheels operates an advanced digital motor insurance ecosystem designed to protect policyholders with fair pricing, instantaneous digital policy schedules, and rapid claim adjudication.
        </p>
        <blockquote style={{ borderLeft: '4px solid #1F6FEB', paddingLeft: '16px', color: '#334155', fontStyle: 'italic', margin: '14px 0' }}>
          "Unifying cost-sensitive ensemble machine learning, computer vision damage inspection, and statutory IRDAI valuation corridors to eliminate claims leakage while expediting genuine settlements."
        </blockquote>
        <p style={{ fontSize: '14px', color: '#475569' }}>
          Our platform specializes exclusively in <strong>Motor / Vehicle Insurance</strong> (Private Passenger Cars, Two-Wheelers, and Electric Fleets). This ensures statistical coherence across physical vehicle attributes, collision circumstances, repair estimates, and multi-modal damage photographs.
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#12304A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} color='#6D28D9' /> Triple-Model Ensemble & Cost-Sensitive Optimization
        </h3>
        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '16px' }}>
          Conventional claims processing relies heavily on manual surveyor inspections or naive classifiers with standard 50% thresholding. In real-world motor insurance claims (which exhibit a severe ~6% minority class imbalance), default accuracy is dangerous: a naive model predicting all claims as genuine achieves 94% accuracy while detecting 0% fraud.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'block', color: '#1E293B', marginBottom: '4px' }}>Random Forest</strong>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Supervised tabular baseline capturing non-linear interactions across vehicle and accident features.</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'block', color: '#1E293B', marginBottom: '4px' }}>XGBoost</strong>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Gradient tree boosting with loss-weighted scale_pos_weight tuning to heavily penalize fraud misses.</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'block', color: '#1E293B', marginBottom: '4px' }}>Isolation Forest</strong>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Unsupervised anomaly detector that isolates novel, unprecedented fraud patterns without needing historical labels.</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#12304A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} color='#15803D' /> Platform Capabilities & Regulatory Adherence
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#1E293B', marginBottom: '6px' }}>
              <CheckCircle size={16} color='#15803D' /> IRDAI Statutory IDV Engine
            </strong>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Automated depreciation schedule (5% up to 50%+) based on vehicle manufacturing age, enforcing a ±15% statutory valuation corridor.
            </p>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#1E293B', marginBottom: '6px' }}>
              <CheckCircle size={16} color='#15803D' /> Multimodal Visual Verification
            </strong>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Cross-checks incident descriptions, repair cost estimates, and uploaded damage photographs against learned CarDD visual priors.
            </p>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#1E293B', marginBottom: '6px' }}>
              <CheckCircle size={16} color='#15803D' /> Real-time Fast2SMS & SMTP
            </strong>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Zero-latency OTP authentication on 10-digit mobile numbers and email schedules with dedicated admin email composer.
            </p>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#1E293B', marginBottom: '6px' }}>
              <CheckCircle size={16} color='#15803D' /> Razorpay Enterprise Checkout
            </strong>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Secure payment gateway processing with cryptographic webhook signature verification and sandbox testing support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
