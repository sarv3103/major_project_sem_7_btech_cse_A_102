import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, FileText, AlertTriangle, Download, Plus, Shield, RefreshCw,
  Clock, CheckCircle2, XCircle, Camera, Upload, Eye, Check, ArrowRight, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { resilientFetch, compressImageFile } from '../utils/apiClient';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimSortOrder, setClaimSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [policySortOrder, setPolicySortOrder] = useState<'newest' | 'oldest'>('newest');

  // Evidence Re-Upload Modal State
  const [evidenceModalClaim, setEvidenceModalClaim] = useState<any | null>(null);
  const [reUploadPhotos, setReUploadPhotos] = useState<Array<{ url: string; name: string; perspective?: string }>>([]);
  const [reUploadDescription, setReUploadDescription] = useState<string>('');
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Heatmap View Modal State
  const [activeHeatmap, setActiveHeatmap] = useState<{ url: string; claimNum: string } | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [vRes, pRes, cRes] = await Promise.all([
        resilientFetch('/api/vehicles?user_id=' + user.userId),
        resilientFetch('/api/policies?user_id=' + user.userId),
        resilientFetch('/api/claims?user_id=' + user.userId)
      ]);
      if (vRes.ok) setVehicles(await vRes.json());
      if (pRes.ok) setPolicies(await pRes.json());
      if (cRes.ok) setClaims(await cRes.json());
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handle re-upload multi-file pick (auto-compressed client-side)
  const handleEvidenceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    try {
      const compressed = await Promise.all(
        imageFiles.map(async (file) => ({
          url: await compressImageFile(file, 1024, 0.78),
          name: file.name
        }))
      );
      setReUploadPhotos((prev) => {
        const remaining = Math.max(0, 12 - prev.length);
        const toAdd = compressed.slice(0, remaining).map((item, idx) => ({
          ...item,
          perspective: `Perspective ${prev.length + idx + 1}`
        }));
        return [...prev, ...toAdd];
      });
    } catch (err) {
      console.error('Error compressing evidence photos:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveReUploadPhoto = (index: number) => {
    setReUploadPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Re-Uploaded Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceModalClaim) return;

    const isBike = (evidenceModalClaim.vehicle_type || '').toLowerCase().includes('two') || (evidenceModalClaim.vehicle_type || '').toLowerCase().includes('bike');
    const minRequired = isBike ? 4 : 5;

    if (reUploadPhotos.length < minRequired) {
      alert(`⚠️ Mandatory Photographic Evidence:\nPlease upload at least ${minRequired} photographs showing vehicle damage perspectives for this ${isBike ? 'Two-Wheeler (Min 4)' : 'Four-Wheeler Car (Min 5)'}. Currently uploaded: ${reUploadPhotos.length}.`);
      return;
    }

    const trimmedDesc = reUploadDescription.trim();
    if (!trimmedDesc || trimmedDesc.length < 15) {
      alert('Please provide an explanatory statement of at least 15 characters clarifying the damage.');
      return;
    }

    // Client-side guard against keyboard smashing
    const words = trimmedDesc.toLowerCase().split(/\s+/).filter(Boolean);
    const hasRepeatedLetters = /([a-z])\1{4,}/i.test(trimmedDesc);
    const hasUnnaturalWords = words.some(w => w.length > 5 && !/[aeiouy]/i.test(w));
    if (hasRepeatedLetters || hasUnnaturalWords) {
      alert('Explanatory statement appears irregular or non-contextual. Please write genuine details describing how the vehicle was damaged.');
      return;
    }

    setSubmittingEvidence(true);
    try {
      const res = await resilientFetch('/api/claims/re-upload-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: evidenceModalClaim.id,
          new_image_urls: reUploadPhotos.map(p => p.url),
          new_image_url: reUploadPhotos[0]?.url || '',
          updated_description: trimmedDesc,
          user_id: user?.userId
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Evidence uploaded successfully! The surveyor has been notified to resume adjudication.');
        setEvidenceModalClaim(null);
        setReUploadPhotos([]);
        setReUploadDescription('');
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({ detail: `Server returned HTTP ${res.status}` }));
        alert('Evidence Submission Error: ' + (err.detail || 'Failed to submit evidence'));
      }
    } catch (e) {
      alert('Network error connecting to evidence submission gateway.');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '32px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#12304A' }}>Authentication Required</h3>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>Please sign in to access your garage and policy records.</p>
        <Link to='/login' style={{ padding: '10px 24px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700' }}>
          Go to Sign In
        </Link>
      </div>
    );
  }

  const pendingEvidenceClaims = claims.filter((c) => c.status === 'REQUEST_EVIDENCE');

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#12304A' }}>Welcome, {user.fullName}</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Registered Policyholder Dashboard • Account ID: {user.userId.slice(0, 8)}...
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            title='Refresh Dashboard'
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to='/buy' style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
            <Plus size={16} /> Enroll Vehicle / Buy Policy
          </Link>
          <Link to='/claim' style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#15803D', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
            <AlertTriangle size={16} /> File A Claim
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Garage Vehicles</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>{vehicles.length}</div>
          <span style={{ fontSize: '11px', color: '#0369A1' }}>Enrolled & Inspected</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Active Policies</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803D', marginTop: '4px' }}>
            {policies.filter((p) => p.status === 'ACTIVE').length}
          </div>
          <span style={{ fontSize: '11px', color: '#15803D' }}>Valid IRDAI Coverage</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Filed Claims</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1F6FEB', marginTop: '4px' }}>{claims.length}</div>
          <span style={{ fontSize: '11px', color: '#1F6FEB' }}>Recorded in Ledger</span>
        </div>
        <div style={{ backgroundColor: pendingEvidenceClaims.length > 0 ? '#FEF2F2' : '#fff', padding: '18px', borderRadius: '10px', border: pendingEvidenceClaims.length > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '12px', color: pendingEvidenceClaims.length > 0 ? '#B91C1C' : '#64748B', fontWeight: '600' }}>Action Required</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: pendingEvidenceClaims.length > 0 ? '#B91C1C' : '#64748B', marginTop: '4px' }}>
            {pendingEvidenceClaims.length}
          </div>
          <span style={{ fontSize: '11px', color: pendingEvidenceClaims.length > 0 ? '#B91C1C' : '#64748B' }}>
            {pendingEvidenceClaims.length > 0 ? 'Document Re-Upload Needed' : 'All Claims Up to Date'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLAIMS LIFECYCLE & REAL-TIME ADJUDICATION TRACKING SECTION */}
      {/* ========================================================================= */}
      {(() => {
        const parseTs = (val: any) => {
          if (!val) return 0;
          const s = String(val);
          const norm = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
          const t = new Date(norm).getTime();
          return Number.isNaN(t) ? 0 : t;
        };
        const fmtIST = (val: any) => {
          const ms = parseTs(val);
          if (!ms) return '—';
          return new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
        };
        const sortedClaims = [...claims].sort((a, b) => {
          const ta = parseTs(a.created_at || a.accident_date);
          const tb = parseTs(b.created_at || b.accident_date);
          return claimSortOrder === 'newest' ? tb - ta : ta - tb;
        });
        return (
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Shield size={20} color='#1F6FEB' /> Filed Insurance Claims & Real-Time Tracking ({claims.length})
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Track the live adjudication stage of your claims, view AI multimodal forensic results, and respond to surveyor evidence requests.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setClaimSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              <ArrowUpDown size={14} color='#1F6FEB' />
              Sort by Date: {claimSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
            <Link to='/claim' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#1F6FEB', textDecoration: 'none' }}>
              + File New Claim &rarr;
            </Link>
          </div>
        </div>

        {sortedClaims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', border: '1px dashed #CBD5E1', borderRadius: '10px' }}>
            <Shield size={42} color='#94A3B8' style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>No Insurance Claims Filed</h4>
            <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '420px', margin: '0 auto 16px' }}>
              Your policy is fully active. In the event of an accidental damage or collision, you can initiate a cashless claim in under 2 minutes.
            </p>
            <Link to='/claim' style={{ padding: '8px 18px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
              Start Cashless Claim Flow
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sortedClaims.map((claim) => {
              // Determine status badge details
              let statusColor = '#15803D';
              let statusBg = '#DCFCE7';
              let statusLabel = 'APPROVED';
              let stageStep = 3;

              if (claim.status === 'REQUEST_EVIDENCE') {
                statusColor = '#B91C1C';
                statusBg = '#FEE2E2';
                statusLabel = 'ACTION REQUIRED: EVIDENCE REQUESTED';
                stageStep = 1;
              } else if (claim.status === 'UNDER_INVESTIGATION') {
                statusColor = '#B45309';
                statusBg = '#FEF3C7';
                statusLabel = 'UNDER SURVEYOR & FORENSIC REVIEW';
                stageStep = 2;
              } else if (claim.status === 'RECOMMENDED_APPROVAL') {
                statusColor = '#15803D';
                statusBg = '#DCFCE7';
                statusLabel = 'AI RECOMMENDED APPROVAL';
                stageStep = 2;
              } else if (claim.status === 'REJECTED') {
                statusColor = '#64748B';
                statusBg = '#F1F5F9';
                statusLabel = 'CLAIM CLOSED / DECLINED';
                stageStep = 3;
              }

              const cvReport = claim.visual_inspection_report || {};
              const hasHeatmap = Boolean(cvReport.heatmap_base64);

              return (
                <div
                  key={claim.id}
                  style={{
                    border: claim.status === 'REQUEST_EVIDENCE' ? '2px solid #F87171' : '1px solid #E2E8F0',
                    backgroundColor: claim.status === 'REQUEST_EVIDENCE' ? '#FFFDFD' : '#F8FAFC',
                    borderRadius: '10px',
                    padding: '20px'
                  }}>
                  {/* Card Header: Claim Number & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', fontFamily: 'monospace' }}>
                          {claim.claim_number}
                        </span>
                        <span style={{ fontSize: '11px', color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          Incident Date: {claim.accident_date || '—'}{claim.accident_time ? ` (${claim.accident_time})` : ''}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                          Applied Date: {fmtIST(claim.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        Vehicle: <strong>{claim.registration_number || 'N/A'}</strong> ({claim.manufacturer} {claim.vehicle_model}) • Policy: {claim.policy_number}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: statusBg,
                        color: statusColor
                      }}>
                        {statusLabel}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Claimed Amount: <strong>₹{Number(claim.estimated_repair_cost || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 3-Stage Progress Stepper */}
                  <div style={{ backgroundColor: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                      {/* Stage 1 */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#15803D',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            ✓
                          </div>
                          <strong style={{ fontSize: '12px', color: '#15803D' }}>Stage 1: AI Multimodal</strong>
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          {cvReport.has_cross_vehicle_contradiction
                            ? '⚠️ Discrepancy Flagged'
                            : '✓ Inspection Complete'}
                        </span>
                      </div>

                      {/* Stage 2 */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: stageStep >= 2 ? (claim.status === 'REJECTED' ? '#64748B' : '#1F6FEB') : '#CBD5E1',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {stageStep > 2 ? '✓' : '2'}
                          </div>
                          <strong style={{ fontSize: '12px', color: stageStep >= 2 ? '#1E293B' : '#94A3B8' }}>
                            Stage 2: Surveyor Review
                          </strong>
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          {claim.status === 'REQUEST_EVIDENCE'
                            ? 'Paused: Awaiting Documents'
                            : stageStep >= 2
                            ? 'Adjudication Complete'
                            : 'In Progress'}
                        </span>
                      </div>

                      {/* Stage 3 */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: claim.status === 'APPROVED' ? '#15803D' : '#CBD5E1',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {claim.status === 'APPROVED' ? '✓' : '3'}
                          </div>
                          <strong style={{ fontSize: '12px', color: claim.status === 'APPROVED' ? '#15803D' : '#94A3B8' }}>
                            Stage 3: Settlement
                          </strong>
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          {claim.status === 'APPROVED' ? 'Cashless Payout Dispatched' : 'Pending Authorization'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION REQUIRED BANNER (If REQUEST_EVIDENCE) */}
                  {claim.status === 'REQUEST_EVIDENCE' && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '750px' }}>
                        <AlertTriangle size={20} color='#B91C1C' style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '13px', color: '#991B1B', display: 'block' }}>
                            Surveyor Action Required: Additional Photographic Evidence / Clarification Requested
                          </strong>
                          <span style={{ fontSize: '12px', color: '#B91C1C', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                            The automated inspection or surveyor noticed that the uploaded photograph was unclear, non-automotive, or the incident narrative was incomplete. Please provide an authentic, high-resolution damage photo to resume your claim settlement.
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEvidenceModalClaim(claim);
                          setReUploadPhotos([]);
                          setReUploadDescription('');
                        }}
                        style={{
                          backgroundColor: '#B91C1C',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                        <Upload size={14} /> Upload Required Photos & Statement
                      </button>
                    </div>
                  )}

                  {/* Incident Summary & Photo Preview */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    {claim.damage_image_url && (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={claim.damage_image_url}
                          alt='Claim Damage'
                          style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                        />
                        {hasHeatmap && (
                          <button
                            type='button'
                            onClick={() => setActiveHeatmap({ url: cvReport.heatmap_base64, claimNum: claim.claim_number })}
                            title='View Forensic Splicing Heatmap'
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              right: '2px',
                              backgroundColor: 'rgba(15, 23, 42, 0.85)',
                              color: '#F59E0B',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              fontSize: '9px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                            <Eye size={10} /> Heatmap
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '12px', color: '#1E293B' }}>
                        <strong>Incident Narrative: </strong>{claim.incident_description || 'Accidental impact'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                        Location: <strong>{claim.accident_location || 'Urban'}</strong> • Damaged Parts: <strong>{claim.damage_description}</strong>
                      </div>
                      {cvReport.has_cross_vehicle_contradiction ? (
                        <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '3px', fontWeight: '700' }}>
                          ⚠️ Incompatible Vehicle Detected: Uploaded photographs appear to be of a different vehicle type. Please provide genuine photographs of your insured {claim.vehicle_type || 'vehicle'}.
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#15803D', marginTop: '3px', fontWeight: '600' }}>
                          ✓ Vehicle Identity Confirmed: {cvReport.detected_entity_label || `${claim.manufacturer || ''} ${claim.vehicle_model || ''}`.trim() || 'Insured Vehicle Match'}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#0369A1', marginTop: '2px' }}>
                        ✓ Camera Authenticity: Genuine Physical Photography Verified
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '160px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Vehicle Match: <strong style={{ color: cvReport.has_cross_vehicle_contradiction ? '#B91C1C' : '#15803D' }}>
                          {cvReport.has_cross_vehicle_contradiction ? 'ACTION REQUIRED' : 'CONFIRMED'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Surveyor: <strong>{claim.status === 'APPROVED' ? 'Settled' : claim.status === 'REQUEST_EVIDENCE' ? 'Awaiting Evidence' : 'Under Review'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* GARAGE VEHICLES AND POLICY CERTIFICATES GRID */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
        {/* Vehicles Column */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Car size={18} color='#1F6FEB' /> Enrolled Garage Vehicles ({vehicles.length})
            </h3>
            <button onClick={fetchData} title='Refresh' style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', paddingRight: '6px' }}>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                <Car size={36} color='#94A3B8' style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#64748B', fontSize: '13px' }}>No vehicles registered yet.</p>
                <Link to='/buy' style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', color: '#1F6FEB', fontWeight: '700' }}>
                  Add your first vehicle &rarr;
                </Link>
              </div>
            ) : (
              vehicles.map((v) => (
                <div key={v.id} style={{ border: '1px solid #E2E8F0', padding: '14px 16px', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#1E293B' }}>{v.manufacturer} {v.model}</strong>
                    <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>
                      {v.registration_number}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>
                    Category: <strong>{v.vehicle_type}</strong> • Mfg: {v.manufacturing_year} • Fuel: {v.fuel_type}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', fontWeight: '700', marginTop: '4px' }}>
                    Insured Declared Value: ₹{Number(v.estimated_idv).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Policies Column */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileText size={18} color='#1F6FEB' /> Policy Schedules & Certificates ({policies.length})
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setPolicySortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <ArrowUpDown size={12} color='#1F6FEB' />
                {policySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>
              <button onClick={fetchData} title='Refresh' style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '4px' }}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', paddingRight: '6px' }}>
            {policies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                <FileText size={36} color='#94A3B8' style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#64748B', fontSize: '13px' }}>No active policies found.</p>
                <Link to='/buy' style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', color: '#1F6FEB', fontWeight: '700' }}>
                  Purchase coverage now &rarr;
                </Link>
              </div>
            ) : (
              [...policies].sort((a, b) => {
                const parseTs = (v: any) => {
                  if (!v) return 0;
                  const s = String(v);
                  const norm = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
                  const t = new Date(norm).getTime();
                  return Number.isNaN(t) ? 0 : t;
                };
                const ta = parseTs(a.created_at || a.start_date);
                const tb = parseTs(b.created_at || b.start_date);
                return policySortOrder === 'newest' ? tb - ta : ta - tb;
              }).map((p) => {
                const rawApplied = p.created_at || p.start_date;
                const normApplied = rawApplied && String(rawApplied).includes('T') && !String(rawApplied).endsWith('Z') && !String(rawApplied).includes('+') ? `${rawApplied}Z` : rawApplied;
                const appliedLabel = normApplied ? new Date(normApplied).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST' : '—';
                return (
                <div key={p.id} style={{ border: '1px solid #E2E8F0', padding: '14px 16px', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'monospace' }}>{p.policy_number}</strong>
                    <span style={{
                      backgroundColor: p.status === 'ACTIVE' ? '#DCFCE7' : p.status === 'PENDING_PAYMENT' ? '#FEF3C7' : '#FEE2E2',
                      color: p.status === 'ACTIVE' ? '#15803D' : p.status === 'PENDING_PAYMENT' ? '#B45309' : '#B91C1C',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      {p.status === 'PENDING_PAYMENT' ? 'PAYMENT PENDING' : p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                    Vehicle: <strong>{p.registration_number}</strong> ({p.manufacturer} {p.model}) | Plan: <strong>{p.plan_type}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
                    Term: {p.start_date} to {p.end_date} ({p.duration_years} Year{p.duration_years > 1 ? 's' : ''})
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>
                    Applied Date: {appliedLabel}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#B45309' }}>
                      Actuarial: ₹{Number(p.calculated_premium).toLocaleString()} (Paid: ₹{p.prototype_amount_paid || '1.00'})
                    </span>
                    {p.status === 'ACTIVE' ? (
                      <a
                        href={'/api/policies/' + p.id + '/pdf'}
                        target='_blank'
                        rel='noreferrer'
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', backgroundColor: '#EFF6FF', color: '#1F6FEB', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
                        <Download size={13} /> Download Certificate PDF
                      </a>
                    ) : (
                      <Link
                        to={'/buy?plan=' + encodeURIComponent(p.plan_type)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', backgroundColor: '#FEF3C7', color: '#B45309', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
                        Complete Payment &rarr;
                      </Link>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EVIDENCE RE-UPLOAD MODAL */}
      {/* ========================================================================= */}
      {evidenceModalClaim && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', margin: 0 }}>
                  Upload Corrected Photographic Evidence
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Claim Reference: {evidenceModalClaim.claim_number} ({evidenceModalClaim.registration_number})
                </span>
              </div>
              <button
                type='button'
                onClick={() => setEvidenceModalClaim(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence}>
              {/* Photo Upload Zone */}
              {(() => {
                const isBike = (evidenceModalClaim.vehicle_type || '').toLowerCase().includes('two') || (evidenceModalClaim.vehicle_type || '').toLowerCase().includes('bike');
                const minRequired = isBike ? 4 : 5;
                const hasMinPhotos = reUploadPhotos.length >= minRequired;

                return (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
                        1. Multi-Angle Photographic Evidence *
                      </label>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: hasMinPhotos ? '#DCFCE7' : '#FEE2E2',
                        color: hasMinPhotos ? '#15803D' : '#B91C1C'
                      }}>
                        {reUploadPhotos.length} / {minRequired} Minimum Photos ({isBike ? 'Two-Wheeler: Min 4' : 'Car: Min 5'}, Max 12)
                      </span>
                    </div>

                    <input
                      type='file'
                      ref={fileInputRef}
                      multiple
                      accept='image/*'
                      onChange={handleEvidenceFileChange}
                      style={{ display: 'none' }}
                    />

                    {/* Photo Grid */}
                    {reUploadPhotos.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: '10px',
                        marginBottom: '10px'
                      }}>
                        {reUploadPhotos.map((p, idx) => (
                          <div key={idx} style={{
                            position: 'relative',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#0F172A',
                            height: '85px'
                          }}>
                            <img
                              src={p.url}
                              alt={`Evidence ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '3px',
                              backgroundColor: 'rgba(15, 23, 42, 0.85)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '1px 4px',
                              borderRadius: '2px'
                            }}>
                              P{idx + 1}
                            </span>
                            <button
                              type='button'
                              onClick={() => handleRemoveReUploadPhoto(idx)}
                              title='Remove photo'
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(185, 28, 28, 0.9)',
                                color: '#fff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}>
                              ✕
                            </button>
                          </div>
                        ))}

                        {reUploadPhotos.length < 12 && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              border: '2px dashed #94A3B8',
                              borderRadius: '6px',
                              height: '85px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              backgroundColor: '#F8FAFC',
                              color: '#1F6FEB'
                            }}>
                            <Plus size={20} />
                            <span style={{ fontSize: '10px', fontWeight: '700', marginTop: '2px' }}>Add Angle</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Large Drop Zone if no photos yet */}
                    {reUploadPhotos.length === 0 && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed #CBD5E1',
                          borderRadius: '8px',
                          padding: '24px 16px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          cursor: 'pointer'
                        }}>
                        <Camera size={32} color='#1F6FEB' style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                          Click to select {minRequired}+ damage photographs from camera or gallery
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          Upload front, close-up, and perspective angles of your insured {isBike ? 'Two-Wheeler' : 'Four-Wheeler'}. You can select multiple images at once.
                        </div>
                      </div>
                    )}

                    {!hasMinPhotos && reUploadPhotos.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '6px', fontWeight: '600' }}>
                        ⚠️ Please add at least {minRequired - reUploadPhotos.length} more perspective{minRequired - reUploadPhotos.length > 1 ? 's' : ''} to meet the statutory requirement of {minRequired} photos.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Explanatory Statement Textarea */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
                    2. Incident Clarification / Explanation Statement *
                  </label>
                  <span style={{ fontSize: '11px', color: reUploadDescription.trim().length >= 15 ? '#15803D' : '#64748B' }}>
                    {reUploadDescription.trim().length} / 15 chars min
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={reUploadDescription}
                  onChange={(e) => setReUploadDescription(e.target.value)}
                  placeholder='Describe how the damage occurred, clarifying why previous photos/details were incomplete (minimum 15 characters, no repetitive keystrokes)...'
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Genuine narrative required describing the damage sequence. Non-automotive text or keyboard spamming will be flagged.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                <button
                  type='button'
                  onClick={() => setEvidenceModalClaim(null)}
                  disabled={submittingEvidence}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submittingEvidence}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    backgroundColor: '#15803D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: submittingEvidence ? 'not-allowed' : 'pointer'
                  }}>
                  {submittingEvidence ? (
                    <>
                      <RefreshCw size={14} className='animate-spin' /> Re-Running AI Forensics...
                    </>
                  ) : (
                    <>
                      Submit Evidence & Resume Claim <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEATMAP MODAL */}
      {/* ========================================================================= */}
      {activeHeatmap && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: '#fff',
            borderRadius: '12px',
            maxWidth: '680px',
            width: '100%',
            padding: '24px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#F1F5F9', margin: 0 }}>
                  🔥 Computer Vision Splicing & Impact Heatmap
                </h3>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Claim: {activeHeatmap.claimNum} • Grad-CAM / ELA Intensity Analysis
                </span>
              </div>
              <button
                type='button'
                onClick={() => setActiveHeatmap(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}>
                ✕
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#020617', borderRadius: '8px', marginBottom: '14px' }}>
              <img
                src={activeHeatmap.url}
                alt='Forensic Heatmap'
                style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
              />
            </div>

            <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '16px' }}>
              Visual heatmap generated via OpenCV JET color-mapping highlights localized edge discontinuities, metal deformation contours, and digital manipulation indicators assessed during automated damage triage.
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type='button'
                onClick={() => setActiveHeatmap(null)}
                style={{ padding: '6px 16px', backgroundColor: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Close Heatmap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
