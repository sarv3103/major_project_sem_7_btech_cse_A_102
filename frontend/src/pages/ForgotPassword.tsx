import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, KeyRound, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { resilientFetch } from '../utils/apiClient';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverWarming, setServerWarming] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  // Password criteria helper
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    setServerWarming(false);
    try {
      const res = await resilientFetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || `A 6-digit recovery code has been dispatched to ${cleanEmail}. Please check your inbox.`);
        setStep(2);
      } else {
        const msg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : 'Unable to send OTP.');
        setError(msg);
      }
    } catch (err: any) {
      setError('Network error while requesting password reset. Please try again.');
    } finally {
      setLoading(false);
      setServerWarming(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the exact 6-digit OTP code sent to your email.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (e.g. @, #, $).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    setServerWarming(false);
    try {
      const res = await resilientFetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        onWarmup: setServerWarming,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp_code: cleanOtp,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        const msg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : 'Password reset failed.');
        setError(msg);
      }
    } catch (err: any) {
      setError('Network error while resetting password. Please try again.');
    } finally {
      setLoading(false);
      setServerWarming(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: '460px', width: '100%', backgroundColor: '#fff', padding: '36px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <KeyRound size={26} color='#1F6FEB' />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A' }}>
            {step === 3 ? 'Password Reset Complete' : 'Forgot Account Password?'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {step === 1 && 'Enter your registered email address to receive a secure recovery code'}
            {step === 2 && `Enter the 6-digit code sent to ${email} and choose a new password`}
            {step === 3 && 'Your credentials have been updated. You can now log into your account.'}
          </p>
        </div>

        {/* Feedback Alerts */}
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

        {successMsg && step === 2 && (
          <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Registered Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color='#94A3B8' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='e.g. sarveshkulkarni502@gmail.com'
                  style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1F6FEB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className='animate-spin' /> Sending Verification Code...
                </>
              ) : (
                <>
                  Send Recovery Code <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link to='/login' style={{ color: '#64748B', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  6-Digit Verification Code
                </label>
                <button
                  type='button'
                  onClick={() => { setStep(1); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#1F6FEB', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >
                  Change Email
                </button>
              </div>
              <input
                type='text'
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder='Enter 6-digit OTP'
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #3B82F6',
                  borderRadius: '6px',
                  fontSize: '20px',
                  fontWeight: '800',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  color: '#1E293B',
                  backgroundColor: '#F8FAFC'
                }}
                required
                autoFocus
              />
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                Enter the 6-digit verification code sent strictly to your registered email address.
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                New Password (minimum 8 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='Create strong password'
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Re-enter new password'
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#16A34A',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className='animate-spin' /> Updating Password...
                </>
              ) : (
                <>
                  <Lock size={16} /> Reset Password & Authenticate
                </>
              )}
            </button>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <button
                type='button'
                onClick={handleRequestOtp}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#1F6FEB', cursor: 'pointer', padding: 0, fontWeight: '600' }}
              >
                Resend Verification Code
              </button>
              <Link to='/login' style={{ color: '#64748B', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color='#16A34A' />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#14532D', marginBottom: '8px' }}>
              Password Reset Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              Your account password has been safely updated. A confirmation receipt was also sent to <strong>{email}</strong>. You can now log into SecureWheels with your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1F6FEB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Proceed to Customer Sign In <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Footer Support Info */}
        <div style={{ marginTop: '28px', borderTop: '1px solid #F1F5F9', paddingTop: '16px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
          Need live assistance? Call <strong>+91 91301 23270</strong> or email <strong style={{ color: '#64748B' }}>securewheelsadmin@gmail.com</strong>
        </div>

      </div>
    </div>
  );
};
