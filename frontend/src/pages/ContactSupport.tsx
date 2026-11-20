import React, { useState } from 'react';
import { Mail, Phone, Clock, MessageSquare, Send, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

export const ContactSupport: React.FC = () => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.mobile || '');
  const [category, setCategory] = useState('CLAIM_QUERY');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone && (cleanPhone.length !== 10 || !['6', '7', '8', '9'].includes(cleanPhone[0]))) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: cleanPhone || null,
          mobile: cleanPhone || null,
          category,
          subject: subject.trim(),
          message: message.trim(),
          user_id: user?.userId || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedTicket(data);
      } else {
        const err = await res.json();
        const msg = typeof err.detail === 'string'
          ? err.detail
          : (Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(', ') : 'Failed to submit support inquiry.');
        setErrorMessage(msg);
      }
    } catch (err: any) {
      setErrorMessage('Network error connecting to support desk server: ' + (err.message || 'Please retry.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#EFF6FF', color: '#1F6FEB', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
          <MessageSquare size={16} /> 24x7 Customer Grievance & Helpdesk
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#12304A', marginBottom: '10px' }}>
          Contact SecureWheels Support
        </h1>
        <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '640px', margin: '0 auto' }}>
          Have a query about your policy schedule, pending claim status, cashless garage network, or payment? Our claims administrators reply directly to your email.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Official Contact Channels */}
        <div style={{ backgroundColor: '#12304A', color: '#fff', borderRadius: '14px', padding: '36px', boxShadow: '0 10px 25px -5px rgba(18, 48, 74, 0.2)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>
            Official Helpdesk Channels
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '28px', lineHeight: '1.6' }}>
            Reach out via our IRDAI-registered composite insurer support infrastructure. All inquiries generate an immutable tracking reference.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={20} color='#60A5FA' />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F1F5F9' }}>Direct Phone & WhatsApp Support</strong>
                <span style={{ fontSize: '14px', color: '#38BDF8', fontWeight: '700' }}>+91 91301 23270</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Official Helpline for Policyholders & Claimants</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={20} color='#34D399' />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F1F5F9' }}>Email Support Desk</strong>
                <span style={{ fontSize: '14px', color: '#34D399', fontWeight: '700' }}>securewheelsadmin@gmail.com</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Live official responses dispatched from Admin Dashboard</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={20} color='#FBBF24' />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F1F5F9' }}>Emergency Breakdown Assistance</strong>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>24 Hours / 7 Days Spot Towing</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#FBBF24', marginTop: '2px' }}>Over 6,200+ cashless partner garages</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={20} color='#A78BFA' />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#F1F5F9' }}>Statutory Ombudsman</strong>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>IRDAI Registration: IRDAI/NL-GEN/2026/088</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>Ombudsman jurisdiction: Mumbai, Delhi, Pune, Bengaluru</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Support Ticket Submission Form */}
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '36px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {submittedTicket ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={54} color='#15803D' style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#12304A', marginBottom: '8px' }}>
                Inquiry Submitted Successfully!
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                Your support ticket has been received and routed to the Chief Claims Administrator.
              </p>

              <div style={{ backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', maxWidth: '420px', margin: '0 auto 24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Ticket Reference:</span>
                  <strong style={{ color: '#1E293B', fontFamily: 'monospace' }}>{submittedTicket.ticket_id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Status:</span>
                  <span style={{ color: '#15803D', fontWeight: '700', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                    OPEN & QUEUED
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Reply Destination:</span>
                  <strong style={{ color: '#1E293B' }}>{email}</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  setSubmittedTicket(null);
                  setSubject('');
                  setMessage('');
                }}
                style={{ padding: '10px 22px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A', marginBottom: '6px' }}>
                Send A Message to Our Team
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
                Fill out the particulars below. You will receive an official response in your email inbox.
              </p>

              {errorMessage && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Full Legal Name
                    </label>
                    <input
                      type='text'
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder='Enter your full name'
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Registered Email Address
                    </label>
                    <input
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='name@example.com'
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Contact Mobile Number
                    </label>
                    <input
                      type='text'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder='10-digit mobile number'
                      maxLength={10}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Inquiry Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' }}>
                      <option value='CLAIM_QUERY'>Cashless Claim / Survey Status</option>
                      <option value='POLICY_ISSUE'>Policy Schedule / Endorsement / NCB</option>
                      <option value='PAYMENT'>Premium Receipt / UPI Payment</option>
                      <option value='GENERAL'>General Grievance / Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Subject Line
                  </label>
                  <input
                    type='text'
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder='Brief summary of your query'
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Detailed Explanation / Particulars
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder='Please provide policy numbers, claim references, or workshop details to expedite resolution...'
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                    required
                  />
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#1F6FEB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                  <Send size={16} /> {loading ? 'Submitting Inquiry to Support Desk...' : 'Transmit Ticket to Claims Administrator'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
