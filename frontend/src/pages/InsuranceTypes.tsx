import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Bike, Shield, Check, Zap, Sparkles, BatteryCharging, FileText } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

export const InsuranceTypes: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', color: '#1F6FEB', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>
          <Sparkles size={14} /> LIVE CATALOG MANAGED BY ADMIN
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#12304A', marginBottom: '12px' }}>
          Motor Insurance Plans & Underwriting Structures
        </h1>
        <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '750px', margin: '0 auto' }}>
          Compare statutory liability, all-perils own damage, zero-depreciation endorsements, and dedicated EV battery covers.
          All policies are issued with instant 3-Page Regulatory PDF schedules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', marginBottom: '64px' }}>
        {products.map((prod, idx) => {
          const isFeatured = idx === 1 || prod.plan_type === 'Zero-Depreciation';
          const isEV = prod.name.toLowerCase().includes('ev') || prod.vehicle_type.toLowerCase().includes('electric');

          return (
            <div 
              key={prod.id} 
              style={{ 
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                border: isFeatured ? '2px solid #1F6FEB' : '1px solid #E2E8F0', 
                padding: '32px', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isFeatured ? '0 10px 25px -5px rgba(31, 111, 235, 0.15)' : 'none'
              }}>
              {isFeatured && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1F6FEB', color: '#fff', padding: '4px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                  MOST RECOMMENDED
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: isEV ? '#16A34A' : '#1F6FEB', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isEV && <BatteryCharging size={13} />} {prod.vehicle_type} • {prod.plan_type}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{prod.id}</span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>
                {prod.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
                {prod.description}
              </p>

              <div style={{ marginBottom: '24px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>Actuarial Rating Rate</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#12304A', marginTop: '2px' }}>
                  {(prod.base_rate * 100).toFixed(2)}% <span style={{ fontSize: '13px', fontWeight: '400', color: '#64748B' }}>of IDV / year</span>
                </div>
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                  Compulsory Excess Deductible: Rs. {Number(prod.deductible).toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>Covered Benefits:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '2.0', color: '#334155' }}>
                  {prod.coverage_summary.split(',').map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={15} color='#15803D' /> {item.trim()}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <Link 
                  to={user ? `/buy?plan=${encodeURIComponent(prod.plan_type)}&prod=${encodeURIComponent(prod.name)}` : '/login'} 
                  style={{ 
                    display: 'block', 
                    textAlign: 'center', 
                    padding: '12px', 
                    backgroundColor: isFeatured ? '#1F6FEB' : '#1E293B', 
                    color: '#fff', 
                    borderRadius: '6px', 
                    textDecoration: 'none', 
                    fontWeight: '700', 
                    fontSize: '14px' 
                  }}>
                  {user ? `Select ${prod.name}` : 'Login to Purchase'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
