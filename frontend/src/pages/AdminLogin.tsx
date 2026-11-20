import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, UserCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

export const AdminLogin: React.FC = () => {
  const [adminId, setAdminId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanId = adminId.trim().toLowerCase();
    const cleanMobile = adminId.replace(/\D/g, '');

    const isValidAdmin = 
      cleanId === 'securewheelsadmin@gmail.com' ||
      cleanMobile === '9130123270' ||
      cleanId === 'admin';

    if (isValidAdmin && (passkey === 'AdminSecure2026' || passkey === 'admin')) {
      login({
        userId: 'USER-ADMIN-01',
        fullName: 'Chief Claims Administrator',
        role: 'ADMIN'
      });
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials. Please enter authorized Administrator Email (securewheelsadmin@gmail.com) or Mobile (9130123270) and Passkey.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', backgroundColor: '#0F172A' }}>
      <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#1E293B', padding: '36px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', color: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <ShieldAlert size={26} color='#0F172A' />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Claims & Underwriter Portal</h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Restricted Access: Claims Adjudication, Underwriting Corridor Approval & Communications
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#7F1D1D', border: '1px solid #EF4444', color: '#FECACA', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
              Administrator Email or Mobile
            </label>
            <input 
              type='text' 
              value={adminId} 
              onChange={(e) => setAdminId(e.target.value)} 
              placeholder='securewheelsadmin@gmail.com / 9130123270'
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#0F172A', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '14px' }} 
              required 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
              Security Passkey
            </label>
            <input 
              type='password' 
              value={passkey} 
              onChange={(e) => setPasskey(e.target.value)} 
              placeholder='Enter your administrator passkey'
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#0F172A', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '14px' }} 
              required 
            />
          </div>

          <button 
            type='submit' 
            style={{ width: '100%', padding: '12px', backgroundColor: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Lock size={15} /> Access Underwriting & Audit Terminal <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
