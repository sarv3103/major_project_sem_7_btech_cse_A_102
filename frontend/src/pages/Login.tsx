import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { resilientFetch } from '../utils/apiClient';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverWarming, setServerWarming] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUrl = (location.state as any)?.from || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdent = identifier.trim();
    if (!cleanIdent) {
      setError('Please enter your registered email or 10-digit mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setServerWarming(false);

    try {
      const res = await resilientFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({
          identifier: cleanIdent,
          email_or_mobile: cleanIdent,
          password
        })
      });

      if (res.ok) {
        const data = await res.json();
        login({
          userId: data.user_id,
          fullName: data.full_name,
          email: data.email,
          mobile: data.mobile,
          role: data.role
        });
        navigate(redirectUrl);
      } else {
        const err = await res.json();
        const msg = typeof err.detail === 'string'
          ? err.detail
          : (Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(', ') : 'Invalid login credentials.');
        setError(msg);
      }
    } catch (e: any) {
      setError('Unable to connect to authentication service. Please check your network or try again.');
    } finally {
      setLoading(false);
      setServerWarming(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#fff', padding: '36px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Shield size={26} color='#1F6FEB' />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A' }}>Policyholder Sign In</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Access your garage, policy documents, and claims
          </p>
        </div>

        {serverWarming && (
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={15} className="animate-spin" />
            <span>Connecting to SecureWheels secure cloud instance... Please hold on while the server initializes.</span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Registered Email or 10-Digit Mobile
            </label>
            <input 
              type='text' 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)} 
              placeholder='Enter your email or 10-digit mobile' 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }} 
              required 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                Password
              </label>
              <Link to='/forgot-password' style={{ fontSize: '12px', color: '#1F6FEB', fontWeight: '600', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <input 
              type='password' 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder='Enter your account password' 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} 
              required 
            />
          </div>

          <button 
            type='submit' 
            disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Lock size={16} /> {loading ? 'Signing In...' : 'Sign In to Account'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
            New to SecureWheels Insurance?
          </div>
          <Link
            to='/register'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '9px 16px',
              backgroundColor: '#0F172A',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            Create New Policyholder Account <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
          Looking to insure a new vehicle?{' '}
          <Link to='/buy' style={{ color: '#1F6FEB', fontWeight: '700', textDecoration: 'none' }}>
            Purchase Coverage Now <ArrowRight size={13} style={{ display: 'inline' }} />
          </Link>
        </div>
      </div>
    </div>

  );
};
