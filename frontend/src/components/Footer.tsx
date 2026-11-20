import React from 'react';
import { Shield, Mail, Phone, ExternalLink, Award, FileCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#0B192C', color: '#94A3B8', padding: '48px 24px 24px', borderTop: '1px solid #1E293B', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '36px', marginBottom: '36px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '18px', fontWeight: '800', marginBottom: '12px' }}>
            <Shield color='#38BDF8' size={22} /> SecureWheels General Insurance
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94A3B8', marginBottom: '16px' }}>
            A leading digital motor insurer delivering instant policy issuance, automated digital claim settlements, 
            and AI-driven multimodal fraud detection with explainable ML architecture.
          </p>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Licensed Composite General Insurer • IRDAI Registration No. 182.
          </div>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Motor Policies</h4>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: '2' }}>
            <li>Private Car Comprehensive</li>
            <li>Two-Wheeler Own Damage</li>
            <li>Zero-Depreciation Shield</li>
            <li>Third-Party Statutory Cover</li>
            <li>EV Special Battery Protection</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>AI & Technology</h4>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: '2' }}>
            <li>Cost-Sensitive Ensemble ML</li>
            <li>Computer Vision Damage Analysis</li>
            <li>TreeSHAP Explainability</li>
            <li>IRDAI Statutory Depreciation Engine</li>
            <li>Fast2SMS & Razorpay Integration</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Regulatory Disclosures</h4>
          <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#94A3B8', marginBottom: '10px' }}>
            SecureWheels General Insurance Company Ltd. Registered Office: Financial Centre, Bandra-Kurla Complex, Mumbai 400051.
          </p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
            CIN: U66010MH2026PLC987654 • 24x7 Ombudsman Redressal Cell & IRDAI Bima Bharosa integrated.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', borderTop: '1px solid #1E293B', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', flexWrap: 'wrap', gap: '10px' }}>
        <span>&copy; 2026 SecureWheels General Insurance Company Ltd. All rights reserved.</span>
        <span>Insurance is the subject matter of solicitation. Policy terms and conditions apply.</span>
      </div>
    </footer>
  );
};
