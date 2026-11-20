import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { resilientFetch } from '../utils/apiClient';

export const Register: React.FC = () => {
  const [step, setStep] = useState<'DETAILS' | 'VERIFY_OTP'>('DETAILS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [serverWarming, setServerWarming] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Password criteria helper
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  // STEP 1: Submit details and request 6-digit email OTP
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 1. Full Name Validation
    const trimmedName = fullName.trim();
    if (/\d/.test(trimmedName)) {
      setError('Numbers are not allowed in name.');
      return;
    }
    if (!/^[a-zA-Z\s.]+$/.test(trimmedName)) {
      setError('Special characters or symbols are not allowed in name. Use alphabetic letters only.');
      return;
    }
    const nameParts = trimmedName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setError("Full Name must contain at least First Name and Last Name (e.g. 'Sarvesh Kulkarni').");
      return;
    }
    for (const part of nameParts) {
      if (!/^[A-Z][a-zA-Z]*$/.test(part)) {
        setError(`Each part of your name must begin with a capital letter (e.g. 'Sarvesh Kulkarni'). Found '${part}'.`);
        return;
      }
    }

    // 2. Mobile Number Validation
    if (/[a-zA-Z]/.test(mobile)) {
      setError('Characters or letters are not allowed in mobile number. Please enter numeric digits only.');
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '').trim();
    if (cleanMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!'6789'.includes(cleanMobile[0])) {
      setError('Mobile number must begin with 6, 7, 8, or 9 (Indian telecom standard).');
      return;
    }

    // 3. Password Validation
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special character (e.g. @, #, $).');
      return;
    }

    setLoading(true);

    try {
      const res = await resilientFetch('/api/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({
          full_name: trimmedName,
          email: email.trim().toLowerCase(),
          mobile: cleanMobile,
          password
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || `Verification code sent to ${email}`);
        setStep('VERIFY_OTP');
      } else {
        const msg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : 'Unable to initiate verification.');
        setError(msg);
      }
    } catch (e: any) {
      setError('Unable to reach server. Please wait a few seconds and try again (cloud instance may be initializing).');
    } finally {
      setLoading(false);
      setServerWarming(false);
    }
  };

  // STEP 2: Verify 6-digit OTP and complete account creation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otpCode.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await resilientFetch('/api/auth/signup/verify-and-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.replace(/\D/g, '').trim(),
          password,
          otp_code: cleanOtp
        })
      });

      const data = await res.json();
      if (res.ok) {
        login({
          userId: data.user_id,
          fullName: data.full_name,
          email: data.email,
          mobile: mobile.replace(/\D/g, '').trim(),
          role: 'CUSTOMER'
        });
        navigate('/dashboard');
      } else {
        const msg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : 'Verification failed.');
        setError(msg);
      }
    } catch (e: any) {
      setError('Unable to communicate with server. Please try again.');
    } finally {
      setLoading(false);
      setServerWarming(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError('');
    setResending(true);
    try {
      const res = await resilientFetch('/api/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.replace(/\D/g, '').trim(),
          password
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`A fresh verification code has been dispatched to ${email}.`);
      } else {
        setError(data.detail || 'Failed to resend code.');
      }
    } catch (e: any) {
      setError('Network communication error. Please try again.');
    } finally {
      setResending(false);
      setServerWarming(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#fff', padding: '36px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            {step === 'DETAILS' ? <Shield size={26} color='#1F6FEB' /> : <KeyRound size={26} color='#15803D' />}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A' }}>
            {step === 'DETAILS' ? 'Create Policyholder Account' : 'Verify Your Email Address'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {step === 'DETAILS' 
              ? 'Enroll your vehicles, buy verified policies & file instant claims' 
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {serverWarming && (
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={15} className="animate-spin" />
            <span>Connecting to SecureWheels secure cloud instance... Please hold on while the server initializes.</span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {step === 'DETAILS' ? (
          <form onSubmit={handleInitiateSignup}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Full Legal Name (First & Last, Capitalized)
              </label>
              <input 
                type='text' 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder='e.g. Sarvesh Kulkarni' 
                style={{ width: '100%', padding: '10px 14px', border: /\d/.test(fullName) ? '1px solid #EF4444' : '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }} 
                required 
              />
              {/\d/.test(fullName) && (
                <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                  ⚠️ Numbers are not allowed in name. Please use alphabetic letters only.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Mobile Number (10 Digits)
              </label>
              <input 
                type='tel' 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
                placeholder='10-digit mobile number' 
                style={{ width: '100%', padding: '10px 14px', border: /[a-zA-Z]/.test(mobile) ? '1px solid #EF4444' : '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }} 
                required 
              />
              {/[a-zA-Z]/.test(mobile) && (
                <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                  ⚠️ Characters or letters are not allowed in mobile number. Please enter numeric digits only (0-9).
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Email Address (Will be verified via OTP)
              </label>
              <input 
                type='email' 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder='name@domain.com' 
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }} 
                required 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Password (min 8 chars with upper, lower, number, symbol)
              </label>
              <input 
                type='password' 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder='Create strong password' 
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }} 
                required 
              />
              {/* Password Requirement Badges */}
              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                <div style={{ color: hasMinLength ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{hasMinLength ? '✓' : '○'}</span> 8+ Characters
                </div>
                <div style={{ color: hasUpper ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{hasUpper ? '✓' : '○'}</span> Uppercase Letter (A-Z)
                </div>
                <div style={{ color: hasLower ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{hasLower ? '✓' : '○'}</span> Lowercase Letter (a-z)
                </div>
                <div style={{ color: hasDigit ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{hasDigit ? '✓' : '○'}</span> Number (0-9)
                </div>
                <div style={{ color: hasSpecial ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}>
                  <span>{hasSpecial ? '✓' : '○'}</span> Special Character (!@#$%^&*...)
                </div>
              </div>
            </div>

            <button 
              type='submit' 
              disabled={loading} 
              style={{ width: '100%', padding: '12px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Sending Verification Code...' : <>Verify Email & Continue <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '6px' }}>
                We sent a 6-digit confirmation code to:
              </span>
              <strong style={{ fontSize: '15px', color: '#1E293B', display: 'block', wordBreak: 'break-all' }}>
                {email}
              </strong>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                Delivered via live Gmail SMTP relay. Please check your inbox or spam folder.
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', textAlign: 'center' }}>
                Enter 6-Digit Email Verification Code
              </label>
              <input 
                type='text' 
                maxLength={6}
                value={otpCode} 
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                placeholder='• • • • • •' 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #1F6FEB', 
                  borderRadius: '8px', 
                  fontSize: '24px', 
                  letterSpacing: '10px', 
                  textAlign: 'center',
                  fontWeight: '800',
                  color: '#12304A',
                  backgroundColor: '#EFF6FF'
                }} 
                required 
                autoFocus
              />
            </div>

            <button 
              type='submit' 
              disabled={loading || otpCode.length !== 6} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: otpCode.length === 6 ? '#15803D' : '#94A3B8', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: '700', 
                fontSize: '14px', 
                cursor: otpCode.length === 6 ? 'pointer' : 'not-allowed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}>
              {loading ? 'Activating Account...' : <>Confirm & Activate Account <CheckCircle2 size={16} /></>}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13px' }}>
              <button
                type='button'
                onClick={() => setStep('DETAILS')}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                <ArrowLeft size={14} /> Edit Information
              </button>

              <button
                type='button'
                disabled={resending}
                onClick={handleResendOtp}
                style={{ background: 'none', border: 'none', color: '#1F6FEB', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} /> {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
          Already registered? <Link to='/login' style={{ color: '#1F6FEB', fontWeight: '700', textDecoration: 'none' }}>Sign In Here</Link>
        </div>
      </div>
    </div>
  );
};
