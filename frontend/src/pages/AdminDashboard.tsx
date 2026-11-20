import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, RefreshCw, FileCheck, CheckCircle, XCircle, 
  Trash2, Edit, Users, Car, FileText, AlertTriangle, Search,
  Download, DollarSign, TrendingUp, ShieldCheck, Eye, Zap,
  Layers, Sliders, Cpu, Activity, PlusCircle, Check, ArrowRight, Camera,
  Mail, Send, Reply, CreditCard, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { resilientFetch } from '../utils/apiClient';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'claims' | 'policies' | 'products' | 'pipeline' | 'inbox' | 'vehicles' | 'users' | 'audit' | 'payments'>('claims');
  
  // Data states
  const [dashData, setDashData] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'ALL' | 'CAPTURED' | 'CREATED'>('ALL');
  const [policySortOrder, setPolicySortOrder] = useState<'newest' | 'oldest'>('newest');
  const [claimSortOrder, setClaimSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Support Inbox & Communications States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [sentEmailsLog, setSentEmailsLog] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedTicketToReply, setSelectedTicketToReply] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyNewStatus, setReplyNewStatus] = useState('RESOLVED');
  
  // Compose Email Modal
  const [composeModal, setComposeModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Adjudication modal
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [overrideDecision, setOverrideDecision] = useState('APPROVED');
  const [overrideReason, setOverrideReason] = useState('');
  const [investigatorNotes, setInvestigatorNotes] = useState('');
  const [reEvalSuccess, setReEvalSuccess] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  
  // Edit policy modal
  const [editPolicyModal, setEditPolicyModal] = useState<any>(null);
  const [editPolicyStatus, setEditPolicyStatus] = useState('ACTIVE');
  const [editPolicyPremium, setEditPolicyPremium] = useState(15000);

  // Edit user modal
  const [editUserModal, setEditUserModal] = useState<any>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserMobile, setEditUserMobile] = useState('');
  const [editUserRole, setEditUserRole] = useState('CUSTOMER');

  // New product modal
  const [addProductModal, setAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdVehicle, setNewProdVehicle] = useState('All Vehicles');
  const [newProdPlan, setNewProdPlan] = useState('Comprehensive');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdRate, setNewProdRate] = useState(0.025);
  const [newProdDeductible, setNewProdDeductible] = useState(400);
  const [newProdCoverage, setNewProdCoverage] = useState('');

  const [loading, setLoading] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'APPROVED' | 'REJECTED' | 'UNDER_INVESTIGATION'>('ALL');

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const fetchAllAdminData = async () => {
    try {
      const [dRes, pRes, vRes, uRes, aRes, prodRes, tRes, sRes, payRes] = await Promise.all([
        resilientFetch('/api/admin/dashboard'),
        resilientFetch('/api/admin/policies'),
        resilientFetch('/api/admin/vehicles'),
        resilientFetch('/api/admin/users'),
        resilientFetch('/api/admin/audit-logs'),
        resilientFetch('/api/products'),
        resilientFetch('/api/admin/support/tickets'),
        resilientFetch('/api/admin/communications/sent-log'),
        resilientFetch('/api/payments/transactions')
      ]);
      if (dRes.ok) setDashData(await dRes.json());
      if (pRes.ok) setPolicies(await pRes.json());
      if (vRes.ok) setVehicles(await vRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
      if (prodRes.ok) setProductsList(await prodRes.json());
      if (tRes.ok) setSupportTickets(await tRes.json());
      if (sRes.ok) setSentEmailsLog(await sRes.json());
      if (payRes && payRes.ok) setPaymentsList(await payRes.json());
      return;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAllAdminData();
    }
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  // --- CRUD & ADJUDICATION ACTIONS ---
  const handleDecisionSubmit = async () => {
    if (!selectedClaim) return;
    setLoading(true);
    try {
      const res = await resilientFetch('/api/admin/claims/decision?admin_id=' + user.userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: selectedClaim.id,
          decision: overrideDecision,
          override_reason: overrideReason || 'Adjudicated via administrator intelligence review.',
          investigator_notes: investigatorNotes || 'Audited by claims team.'
        })
      });
      if (res.ok) {
        setSelectedClaim(null);
        setOverrideReason('');
        setInvestigatorNotes('');
        fetchAllAdminData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReEvaluate = async (claimId: string) => {
    setLoading(true);
    setReEvalSuccess(false);
    try {
      const res = await resilientFetch(`/api/admin/claims/${claimId}/re-evaluate?admin_id=${user.userId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelectedClaim((prev: any) => ({
          ...prev,
          rf_score: data.ai_analysis.random_forest_score,
          xgb_score: data.ai_analysis.xgboost_score,
          iso_score: data.ai_analysis.isolation_forest_score,
          ensemble_score: data.ai_analysis.ensemble_score,
          risk_level: data.ai_analysis.risk_level,
          recommended_action: data.ai_analysis.recommended_action,
          top_contributing_factors: data.ai_analysis.top_contributing_factors,
          visual_consistency_score: data.visual_consistency?.visual_consistency_score ?? prev.visual_consistency_score,
          visual_inspection_report: data.visual_consistency || prev.visual_inspection_report,
          status: data.new_status || prev.status
        }));
        setReEvalSuccess(true);
        setTimeout(() => setReEvalSuccess(false), 4000);
        fetchAllAdminData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFastTrackApprove = async (claim: any) => {
    if (!confirm(`Fast-track instant approval for Claim ${claim.claim_number} (Rs. ${Number(claim.estimated_repair_cost).toLocaleString()})?`)) return;
    try {
      const res = await resilientFetch('/api/admin/claims/decision?admin_id=' + user.userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: claim.id,
          decision: 'APPROVED',
          override_reason: 'Automated 1-click Fast-Track settlement approved based on genuine AI profile (<0.20 score).',
          investigator_notes: 'Fast-track policyholder settlement dispatched.'
        })
      });
      if (res.ok) fetchAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!confirm('Are you sure you want to permanently delete this claim and its AI scoring records?')) return;
    const res = await fetch('/api/admin/claims/' + claimId + '?admin_id=' + user.userId, { method: 'DELETE' });
    if (res.ok) fetchAllAdminData();
  };

  const handleUpdatePolicy = async () => {
    if (!editPolicyModal) return;
    const res = await fetch('/api/admin/policies/' + editPolicyModal.id + '?admin_id=' + user.userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: editPolicyStatus,
        calculated_premium: Number(editPolicyPremium)
      })
    });
    if (res.ok) {
      setEditPolicyModal(null);
      fetchAllAdminData();
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Delete this policy schedule permanently?')) return;
    const res = await fetch('/api/admin/policies/' + policyId + '?admin_id=' + user.userId, { method: 'DELETE' });
    if (res.ok) fetchAllAdminData();
  };

  const handleUnderwritePolicy = async (policyId: string, action: 'APPROVE' | 'ADJUST_IDV' | 'REJECT', revisedIdv?: number, notes?: string) => {
    try {
      const res = await fetch(`/api/admin/policies/${policyId}/underwrite?admin_id=${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          revised_idv: revisedIdv,
          notes: notes || `Underwriting action: ${action}`
        })
      });
      if (res.ok) {
        fetchAllAdminData();
      } else {
        alert('Failed to process underwriting action.');
      }
    } catch (e) {
      alert('Error updating underwriting status.');
    }
  };

  const handleUpdateUser = async () => {
    if (!editUserModal) return;
    try {
      const res = await fetch('/api/admin/users/' + editUserModal.id + '?admin_id=' + user.userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editUserName,
          email: editUserEmail,
          mobile: editUserMobile,
          role: editUserRole
        })
      });
      if (res.ok) {
        setEditUserModal(null);
        fetchAllAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update user profile.');
      }
    } catch (e) {
      alert('Error updating user.');
    }
  };

  const exportPaymentsExcel = () => {
    if (!paymentsList || paymentsList.length === 0) {
      alert('No payment records available to export.');
      return;
    }
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Razorpay Order ID',
      'Razorpay Payment ID',
      'Amount (INR)',
      'Currency',
      'Payment Status',
      'Payment Gateway',
      'Policy Number',
      'Insurance Plan',
      'Gross Premium (INR)',
      'Customer Name',
      'Customer Email',
      'Customer Mobile',
      'Vehicle Reg Number',
      'Vehicle Manufacturer',
      'Vehicle Model'
    ];
    const rows = paymentsList.map(tx => [
      `"${tx.id || ''}"`,
      `"${tx.created_at || ''}"`,
      `"${tx.order_id || ''}"`,
      `"${tx.payment_id || 'N/A'}"`,
      `"${tx.amount || 1.0}"`,
      `"${tx.currency || 'INR'}"`,
      `"${tx.status || ''}"`,
      `"${tx.provider || 'RAZORPAY'}"`,
      `"${tx.policy_number || 'N/A'}"`,
      `"${tx.plan_type || 'N/A'}"`,
      `"${tx.calculated_premium || 0}"`,
      `"${(tx.customer_name || 'Policyholder').replace(/"/g, '""')}"`,
      `"${(tx.customer_email || '').replace(/"/g, '""')}"`,
      `"${(tx.customer_mobile || '').replace(/"/g, '""')}"`,
      `"${(tx.registration_number || '').replace(/"/g, '""')}"`,
      `"${(tx.manufacturer || '').replace(/"/g, '""')}"`,
      `"${(tx.model || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Razorpay_Settlement_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Mark this support ticket as RESOLVED/CLOSED?')) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/status?admin_id=${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      if (res.ok) fetchAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Permanently delete this support ticket from the system?')) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}?admin_id=${user.userId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSentEmail = async (emailId: string) => {
    if (!confirm('Remove this email record from outbound log?')) return;
    try {
      const res = await fetch(`/api/admin/communications/sent-log/${emailId}?admin_id=${user.userId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearSentEmails = async () => {
    if (!confirm('Are you sure you want to clear all outbound email logs?')) return;
    try {
      const res = await fetch(`/api/admin/communications/sent-log?admin_id=${user.userId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplyTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketToReply) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketToReply.id}/reply?admin_id=${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_message: replyMessage,
          new_status: replyNewStatus
        })
      });
      if (res.ok) {
        alert(`Reply dispatched to ${selectedTicketToReply.email} successfully!`);
        setSelectedTicketToReply(null);
        setReplyMessage('');
        fetchAllAdminData();
      } else {
        alert('Failed to dispatch reply.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirectEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/communications/send-email?admin_id=${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: emailTo,
          to_name: emailToName,
          subject: emailSubject,
          body: emailBody
        })
      });
      if (res.ok) {
        alert(`Email successfully dispatched to ${emailTo}!`);
        setComposeModal(false);
        setEmailTo('');
        setEmailToName('');
        setEmailSubject('');
        setEmailBody('');
        fetchAllAdminData();
      } else {
        alert('Failed to send email.');
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const applyEmailTemplate = (templateKey: string) => {
    if (templateKey === 'welcome') {
      setEmailSubject('SecureWheels AI - Official Policy Schedule & Certificate Issued');
      setEmailBody(`Dear Policyholder,\n\nWe are pleased to confirm that your motor insurance coverage is now active. Your official 3-page IRDAI Policy Schedule has been generated and enrolled in the central database.\n\nYou may access your digital certificate and cashless garage network 24x7 from your customer dashboard.\n\nWarm regards,\nSecureWheels Underwriting Desk`);
    } else if (templateKey === 'survey') {
      setEmailSubject('SecureWheels AI - Cashless Claim Surveyor Appointed');
      setEmailBody(`Dear Customer,\n\nRegarding your filed motor claim, our automated adjudication desk has assigned an independent surveyor for on-site physical inspection at your network garage.\n\nPlease ensure the vehicle registration certificate (RC) and driver license are available during inspection.\n\nWarm regards,\nSecureWheels Claims Inspection Desk`);
    } else if (templateKey === 'approval') {
      setEmailSubject('SecureWheels AI - Cashless Repair Claim Approved');
      setEmailBody(`Dear Customer,\n\nWe are pleased to inform you that your insurance claim has been officially APPROVED after multi-model AI ensemble and surveyor verification.\n\nThe authorized network workshop has been directed to commence cashless repairs immediately without delay.\n\nWarm regards,\nChief Claims Auditor, SecureWheels AI`);
    } else if (templateKey === 'ncb') {
      setEmailSubject('SecureWheels AI - No Claim Bonus (NCB) Retention Verified');
      setEmailBody(`Dear Customer,\n\nYour previous insurer No Claim Bonus (NCB) retention documents have been verified and applied to your active policy schedule. A revised endorsement schedule has been recorded in the central repository.\n\nWarm regards,\nSecureWheels Policy Services Desk`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products?admin_id=' + user.userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          vehicle_type: newProdVehicle,
          plan_type: newProdPlan,
          description: newProdDesc,
          base_rate: Number(newProdRate),
          deductible: Number(newProdDeductible),
          coverage_summary: newProdCoverage
        })
      });
      if (res.ok) {
        setAddProductModal(false);
        setNewProdName('');
        setNewProdDesc('');
        setNewProdCoverage('');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('Remove this product from live customer catalog?')) return;
    const res = await fetch(`/api/admin/products/${prodId}?admin_id=${user.userId}`, { method: 'DELETE' });
    if (res.ok) fetchAllAdminData();
  };

  const handleDeleteVehicle = async (vehId: string) => {
    if (!confirm('Remove this vehicle record from database?')) return;
    const res = await fetch('/api/admin/vehicles/' + vehId + '?admin_id=' + user.userId, { method: 'DELETE' });
    if (res.ok) fetchAllAdminData();
  };

  const handleDeleteUser = async (uId: string) => {
    if (!confirm('Delete user profile and credentials?')) return;
    const res = await fetch('/api/admin/users/' + uId + '?admin_id=' + user.userId, { method: 'DELETE' });
    if (res.ok) fetchAllAdminData();
  };

  const parseTimestampMs = (val: any) => {
    if (!val) return 0;
    const s = String(val);
    const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
    const t = new Date(normalized).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const formatIST = (val: any, fallbackVal: any = null) => {
    let ms = parseTimestampMs(val);
    if (!ms && fallbackVal) {
      ms = parseTimestampMs(fallbackVal);
    }
    if (!ms) return '—';
    return new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
  };

  const sortedPolicies = [...policies].sort((a, b) => {
    const ta = parseTimestampMs(a.created_at || a.start_date);
    const tb = parseTimestampMs(b.created_at || b.start_date);
    return policySortOrder === 'newest' ? tb - ta : ta - tb;
  });

  // Filter & Sort Claims
  const filteredClaims = (dashData?.recent_claims || []).filter((c: any) => {
    const term = filterSearch.toLowerCase();
    const matchesSearch = filterSearch === '' || 
      (c.claim_number || '').toLowerCase().includes(term) ||
      (c.claimant_name || '').toLowerCase().includes(term) ||
      (c.registration_number || '').toLowerCase().includes(term) ||
      (c.vehicle_model || '').toLowerCase().includes(term) ||
      (c.accident_location || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (riskFilter === 'ALL') return true;
    if (riskFilter === 'HIGH') return c.risk_level === 'HIGH';
    if (riskFilter === 'MEDIUM') return c.risk_level === 'MEDIUM';
    if (riskFilter === 'LOW') return c.risk_level === 'LOW';
    if (riskFilter === 'APPROVED') return c.status === 'APPROVED';
    if (riskFilter === 'REJECTED') return c.status === 'REJECTED';
    if (riskFilter === 'UNDER_INVESTIGATION') return c.status === 'UNDER_INVESTIGATION';
    return true;
  }).sort((a: any, b: any) => {
    const ta = parseTimestampMs(a.created_at || a.accident_date);
    const tb = parseTimestampMs(b.created_at || b.accident_date);
    return claimSortOrder === 'newest' ? tb - ta : ta - tb;
  });

  const totalClaimsCount = dashData?.total_claims || 1;
  const highPercent = Math.round(((dashData?.high_risk_count || 0) / totalClaimsCount) * 100);
  const medPercent = Math.round(((dashData?.medium_risk_count || 0) / totalClaimsCount) * 100);
  const lowPercent = Math.max(0, 100 - highPercent - medPercent);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#1E293B', padding: '24px', borderRadius: '12px', color: '#fff' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <ShieldAlert size={24} color='#F59E0B' />
            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>Executive Claims Terminal & AI Intelligence Suite</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>
            Officer: <strong>{user.fullName}</strong> • Real-Time Database Access • Cost-Sensitive Operating Threshold: <strong>0.40</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href='/api/admin/export-csv'
            download='SecureWheels_Claims_Intelligence_Dossier.csv'
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
            <Download size={15} /> Export Dossier (.CSV)
          </a>
          <button 
            onClick={fetchAllAdminData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            <RefreshCw size={15} /> Refresh All Datasets
          </button>
        </div>
      </div>

      {/* Financial & Underwriting Exposure KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Policies In-Force</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>{dashData?.active_policies || 0}</div>
          <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600' }}>Active Vehicle Fleet</span>
        </div>

        <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
          <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Premium Revenue</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A', marginTop: '4px' }}>
            ₹{Number(dashData?.total_premium_revenue || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: '600' }}>Collected Actuarial Funds</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Claims Payouts</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#D97706', marginTop: '4px' }}>
            ₹{Number(dashData?.total_claims_payout || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#B45309', fontWeight: '600' }}>{dashData?.approved_claims_count || 0} Approved Claims</span>
        </div>

        <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Fraud Saved by AI</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803D', marginTop: '4px' }}>
            ₹{Number(dashData?.fraud_prevented || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#15803D', fontWeight: '700' }}>Flagged / Repudiated</span>
        </div>

        <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '10px', border: '1px solid #FECACA' }}>
          <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: '700', textTransform: 'uppercase' }}>High Risk Flags</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>{dashData?.high_risk_count || 0}</div>
          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>Mandatory SIU Review</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Customer Accounts</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>{dashData?.total_users_count || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{dashData?.customer_count || 0} Verified Owners</span>
        </div>
      </div>

      {/* Visual Risk Distribution Meter */}
      <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
            Tri-Model Ensemble Fraud Risk Distribution (Cost-Sensitive Matrix Optimized)
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#EF4444', borderRadius: '2px' }}></span>
              High Risk: <strong>{dashData?.high_risk_count || 0} ({highPercent}%)</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#F59E0B', borderRadius: '2px' }}></span>
              Suspicious: <strong>{dashData?.medium_risk_count || 0} ({medPercent}%)</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '2px' }}></span>
              Genuine Fast-Track: <strong>{dashData?.low_risk_count || 0} ({lowPercent}%)</strong>
            </span>
          </div>
        </div>

        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#E2E8F0', display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: `${highPercent}%`, backgroundColor: '#EF4444' }} title={`High Risk: ${highPercent}%`}></div>
          <div style={{ width: `${medPercent}%`, backgroundColor: '#F59E0B' }} title={`Suspicious: ${medPercent}%`}></div>
          <div style={{ width: `${lowPercent}%`, backgroundColor: '#10B981' }} title={`Genuine: ${lowPercent}%`}></div>
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('claims')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'claims' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'claims' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} /> Claims Adjudication ({dashData?.recent_claims?.length || 0})
        </button>
        <button 
          onClick={() => setActiveTab('pipeline')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'pipeline' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'pipeline' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} /> ML Pipeline & Benchmarks
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'products' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'products' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={16} /> Products Catalog ({productsList.length})
        </button>
        <button 
          onClick={() => setActiveTab('inbox')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'inbox' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'inbox' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mail size={16} /> Support Inbox & Email Center ({supportTickets.filter(t => t.status === 'OPEN').length > 0 ? `${supportTickets.filter(t => t.status === 'OPEN').length} New` : supportTickets.length})
        </button>
        <button 
          onClick={() => setActiveTab('policies')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'policies' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'policies' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} /> Policy Schedules ({policies.length})
          {policies.filter((p: any) => p.status === 'PENDING_ADMIN_APPROVAL').length > 0 && (
            <span style={{ backgroundColor: '#F59E0B', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', marginLeft: '2px', fontWeight: '800' }}>
              {policies.filter((p: any) => p.status === 'PENDING_ADMIN_APPROVAL').length} Underwriting
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('vehicles')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'vehicles' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'vehicles' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Car size={16} /> Fleet Vehicles ({vehicles.length})
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'users' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'users' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} /> Accounts ({usersList.length})
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'audit' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'audit' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileCheck size={16} /> Immutable Audit ({auditLogs.length})
        </button>
        <button 
          onClick={() => setActiveTab('payments')} 
          style={{ padding: '10px 18px', border: 'none', background: 'none', borderBottom: activeTab === 'payments' ? '3px solid #1F6FEB' : 'none', fontWeight: '700', color: activeTab === 'payments' ? '#1F6FEB' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CreditCard size={16} /> Razorpay Payments ({paymentsList.length})
        </button>
      </div>

      {/* TAB 1: CLAIMS QUEUE */}
      {activeTab === 'claims' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginRight: '4px' }}>Filter:</span>
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW', 'UNDER_INVESTIGATION', 'APPROVED', 'REJECTED'] as const).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setRiskFilter(tag)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid',
                    borderColor: riskFilter === tag ? '#1F6FEB' : '#E2E8F0',
                    backgroundColor: riskFilter === tag ? '#EFF6FF' : '#F8FAFC',
                    color: riskFilter === tag ? '#1F6FEB' : '#64748B',
                    cursor: 'pointer'
                  }}>
                  {tag === 'ALL' ? `All (${dashData?.recent_claims?.length || 0})` :
                   tag === 'HIGH' ? `High Risk (${dashData?.high_risk_count || 0})` :
                   tag === 'MEDIUM' ? `Suspicious (${dashData?.medium_risk_count || 0})` :
                   tag === 'LOW' ? `Genuine (${dashData?.low_risk_count || 0})` :
                   tag.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setClaimSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
                title="Toggle Claim Date Sort Order"
              >
                <ArrowUpDown size={14} color="#1F6FEB" />
                Sort by Date: {claimSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
                <input
                  type='text'
                  placeholder='Search claim, claimant, reg no, location...'
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Claim Ref</th>
                  <th style={{ padding: '10px' }}>Policyholder & Vehicle</th>
                  <th style={{ padding: '10px' }}>Accident & Damage</th>
                  <th style={{ padding: '10px' }}>Repair Est.</th>
                  <th style={{ padding: '10px' }}>RF</th>
                  <th style={{ padding: '10px' }}>XGB</th>
                  <th style={{ padding: '10px' }}>IF</th>
                  <th style={{ padding: '10px' }}>Ensemble</th>
                  <th style={{ padding: '10px' }}>CV Match</th>
                  <th style={{ padding: '10px' }}>Risk Rating</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px', fontWeight: '800', color: '#1E293B' }}>
                      {c.claim_number}
                      <div style={{ fontSize: '10px', color: '#475569', fontWeight: '600', marginTop: '2px' }}>
                        Incident: {c.accident_date || '—'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '500' }}>
                        Applied: {formatIST(c.created_at)}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{c.claimant_name || 'Policyholder'}</div>
                      <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: '600' }}>
                        {c.registration_number || 'REG-N/A'} • {c.manufacturer || ''} {c.vehicle_model || ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px', maxWidth: '200px' }}>
                      <div style={{ fontWeight: '600', color: '#334155' }}>{c.accident_location}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.damage_description || c.incident_description}
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: '700', color: '#0F172A' }}>
                      ₹{Number(c.estimated_repair_cost).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', color: '#475569' }}>{c.rf_score != null ? c.rf_score : '-'}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{c.xgb_score != null ? c.xgb_score : '-'}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{c.iso_score != null ? c.iso_score : '-'}</td>
                    <td style={{ padding: '10px', fontWeight: '800', color: c.ensemble_score >= 0.40 ? '#DC2626' : '#16A34A' }}>
                      {c.ensemble_score != null ? c.ensemble_score : '-'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                        backgroundColor: (c.visual_consistency_score ?? 0.90) >= 0.8 ? '#DCFCE7' : '#FEE2E2',
                        color: (c.visual_consistency_score ?? 0.90) >= 0.8 ? '#15803D' : '#B91C1C'
                      }}>
                        {Math.round((c.visual_consistency_score ?? 0.90) * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800',
                        backgroundColor: c.risk_level === 'LOW' ? '#DCFCE7' : c.risk_level === 'MEDIUM' ? '#FEF3C7' : '#FEE2E2',
                        color: c.risk_level === 'LOW' ? '#15803D' : c.risk_level === 'MEDIUM' ? '#B45309' : '#B91C1C'
                      }}>
                        {c.risk_level || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: c.status === 'APPROVED' ? '#DCFCE7' : c.status === 'REJECTED' ? '#FEE2E2' : '#EFF6FF',
                        color: c.status === 'APPROVED' ? '#15803D' : c.status === 'REJECTED' ? '#B91C1C' : '#1F6FEB'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button 
                          onClick={async () => {
                            setSelectedClaim(c);
                            setOverrideDecision(c.risk_level === 'HIGH' ? 'REJECTED' : 'APPROVED');
                            try {
                              const detailRes = await resilientFetch(`/api/admin/claims/${c.id}`);
                              if (detailRes.ok) {
                                const fullClaim = await detailRes.json();
                                setSelectedClaim((prev: any) => (prev?.id === c.id ? { ...prev, ...fullClaim } : prev));
                              }
                            } catch (err) {
                              console.warn('Could not load full claim dossier evidence:', err);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', backgroundColor: '#1E293B', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                          <Eye size={12} /> Dossier
                        </button>
                        {c.risk_level === 'LOW' && c.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleFastTrackApprove(c)}
                            title='Instant 1-Click Approval'
                            style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '5px 8px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                            <Zap size={12} /> Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteClaim(c.id)}
                          title='Purge record'
                          style={{ padding: '5px 8px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ML PIPELINE & BENCHMARKS */}
      {activeTab === 'pipeline' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', marginBottom: '8px' }}>
            Machine Learning Architecture & Cost-Sensitive Ensemble Pipeline
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Rigorous zero-leakage pipeline evaluated with 5-Fold Stratified Cross-Validation on all 15,420 historical automobile claims.
          </p>

          {/* Flowchart Diagram */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1F6FEB' }}>STAGE 1</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>Zero-Leakage Preprocessing</div>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Drops PolicyNumber. Imputes zero for missing Age. Encodes categories using ColumnTransformer strictly fit on training folds.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#10B981' }}>STAGE 2 (RF)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>Random Forest (45%)</div>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                100 estimators with balanced subsample weights. Robust to feature interactions and outliers.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B' }}>STAGE 3 (XGB)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>XGBoost Classifier (45%)</div>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Gradient boosting with max_depth=5, scale_pos_weight tuned for 6% minority fraud class.
              </p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#8B5CF6' }}>STAGE 4 (IF)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>Isolation Forest (10%)</div>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Unsupervised anomaly detector identifying zero-day and anomalous claim distributions.
              </p>
            </div>

            <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '8px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626' }}>STAGE 5 (DECISION)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#991B1B', marginTop: '2px' }}>Cost Cutoff: 0.40</div>
              <p style={{ fontSize: '11px', color: '#B91C1C', marginTop: '6px' }}>
                Asymmetric matrix: False Negatives penalized 5x more than False Positives ($C_{'{'}FN{'}'} = 5 \times C_{'{'}FP{'}'}$).
              </p>
            </div>
          </div>

          {/* Model Benchmark Performance Matrix */}
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', marginBottom: '12px' }}>
            Empirical Benchmark Comparison Across All Evaluated Models (15,420 Claims)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '28px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Model Architecture</th>
                <th style={{ padding: '10px' }}>Fraud Recall</th>
                <th style={{ padding: '10px' }}>Precision</th>
                <th style={{ padding: '10px' }}>F1-Score</th>
                <th style={{ padding: '10px' }}>ROC-AUC</th>
                <th style={{ padding: '10px' }}>Cost Metric (INR Relative)</th>
                <th style={{ padding: '10px' }}>Operational Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: '700' }}>Logistic Regression (Baseline)</td>
                <td style={{ padding: '10px' }}>54.10%</td>
                <td style={{ padding: '10px' }}>18.20%</td>
                <td style={{ padding: '10px' }}>0.272</td>
                <td style={{ padding: '10px' }}>0.710</td>
                <td style={{ padding: '10px', color: '#DC2626' }}>11,200.0</td>
                <td style={{ padding: '10px' }}><span style={{ color: '#64748B' }}>Baseline Benchmark</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: '700' }}>Isolation Forest (Anomaly Only)</td>
                <td style={{ padding: '10px' }}>41.20%</td>
                <td style={{ padding: '10px' }}>14.80%</td>
                <td style={{ padding: '10px' }}>0.218</td>
                <td style={{ padding: '10px' }}>0.635</td>
                <td style={{ padding: '10px', color: '#DC2626' }}>14,300.0</td>
                <td style={{ padding: '10px' }}><span style={{ color: '#64748B' }}>Secondary Detector</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: '700' }}>Random Forest (Supervised Bagging)</td>
                <td style={{ padding: '10px' }}>68.20%</td>
                <td style={{ padding: '10px' }}>42.10%</td>
                <td style={{ padding: '10px' }}>0.521</td>
                <td style={{ padding: '10px' }}>0.824</td>
                <td style={{ padding: '10px' }}>7,850.0</td>
                <td style={{ padding: '10px' }}><span style={{ color: '#0F172A' }}>Ensemble Core Member</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: '700' }}>XGBoost Classifier (Gradient Boost)</td>
                <td style={{ padding: '10px' }}>71.40%</td>
                <td style={{ padding: '10px' }}>46.50%</td>
                <td style={{ padding: '10px' }}>0.563</td>
                <td style={{ padding: '10px' }}>0.841</td>
                <td style={{ padding: '10px' }}>6,420.0</td>
                <td style={{ padding: '10px' }}><span style={{ color: '#0F172A' }}>Ensemble Core Member</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: '700' }}>Stacking Meta-Learner (Logistic Reg)</td>
                <td style={{ padding: '10px', color: '#15803D', fontWeight: '700' }}>81.80%</td>
                <td style={{ padding: '10px' }}>38.90%</td>
                <td style={{ padding: '10px' }}>0.527</td>
                <td style={{ padding: '10px' }}>0.835</td>
                <td style={{ padding: '10px' }}>5,910.0</td>
                <td style={{ padding: '10px' }}><span style={{ color: '#0F172A' }}>Research Comparison</span></td>
              </tr>
              <tr style={{ backgroundColor: '#F0FDF4', borderBottom: '2px solid #86EFAC' }}>
                <td style={{ padding: '10px', fontWeight: '800', color: '#166534' }}>
                  Weighted Ensemble (RF 45% + XGB 45% + IF 10% @ 0.40 Cutoff)
                </td>
                <td style={{ padding: '10px', fontWeight: '800', color: '#166534' }}>73.35%</td>
                <td style={{ padding: '10px', fontWeight: '800', color: '#166534' }}>44.80%</td>
                <td style={{ padding: '10px', fontWeight: '800', color: '#166534' }}>0.556</td>
                <td style={{ padding: '10px', fontWeight: '800', color: '#166534' }}>0.844</td>
                <td style={{ padding: '10px', fontWeight: '800', color: '#15803D' }}>5,695.0 (MINIMUM COST)</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: '800', fontSize: '11px' }}>
                    ACTIVE PRODUCTION
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TreeSHAP Explainability Summary */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
              TreeSHAP Global Factor Importance Attribution (Top Fraud Predictors)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <strong>1. Days_Policy_Accident:</strong>
                <div style={{ color: '#64748B' }}>Accidents within 1-7 days of inception (+0.312 SHAP impact).</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <strong>2. Fault Assignment:</strong>
                <div style={{ color: '#64748B' }}>Sole policyholder liability without third party (+0.245 SHAP impact).</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <strong>3. PastNumberOfClaims:</strong>
                <div style={{ color: '#64748B' }}>History of 2-4 or more prior claims (+0.218 SHAP impact).</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <strong>4. Vehicle Price Tier:</strong>
                <div style={{ color: '#64748B' }}>High-tier vehicle claims ($69,000+) (+0.185 SHAP impact).</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC PRODUCT CATALOG MANAGEMENT */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#12304A', margin: 0 }}>
                Insurance Products Catalog & Offerings
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                Create, edit, and publish new insurance products directly from the UI to the public sales store.
              </p>
            </div>
            <button
              onClick={() => setAddProductModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              <PlusCircle size={15} /> Add New Insurance Product
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Product Ref</th>
                <th style={{ padding: '10px' }}>Plan Name</th>
                <th style={{ padding: '10px' }}>Vehicle Class</th>
                <th style={{ padding: '10px' }}>Plan Type</th>
                <th style={{ padding: '10px' }}>Base Tariff Rate</th>
                <th style={{ padding: '10px' }}>Deductible</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productsList.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px' }}>{prod.id}</td>
                  <td style={{ padding: '10px', fontWeight: '700' }}>
                    <div>{prod.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{prod.description}</div>
                  </td>
                  <td style={{ padding: '10px' }}>{prod.vehicle_type}</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{prod.plan_type}</td>
                  <td style={{ padding: '10px' }}>{(prod.base_rate * 100).toFixed(2)}% of IDV</td>
                  <td style={{ padding: '10px' }}>Rs. {Number(prod.deductible).toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: prod.is_active ? '#DCFCE7' : '#FEE2E2', color: prod.is_active ? '#15803D' : '#B91C1C' }}>
                      {prod.is_active ? 'LIVE ON STORE' : 'DISABLED'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: POLICIES */}
      {/* SUPPORT INBOX & DIRECT EMAIL CENTER TAB */}
      {activeTab === 'inbox' && (
        <div>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '18px 24px', borderRadius: '10px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} color='#1F6FEB' /> Customer Communications & Helpdesk Desk
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                Inspect inquiries from website contact form, reply directly to policyholders via email, or write custom emails to any address.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setComposeModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                <Send size={15} /> + Compose Email to Anyone
              </button>
            </div>
          </div>

          {/* Ticket Stats & Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTicketFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid ' + (ticketFilter === st ? '#1F6FEB' : '#CBD5E1'),
                    backgroundColor: ticketFilter === st ? '#EFF6FF' : '#fff',
                    color: ticketFilter === st ? '#1F6FEB' : '#475569',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'ALL' ? 'All Inquiries' : st === 'OPEN' ? `Open Tickets (${supportTickets.filter(t => t.status === 'OPEN').length})` : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Showing {supportTickets.filter(t => ticketFilter === 'ALL' || t.status === ticketFilter).length} tickets • {sentEmailsLog.length} outbound emails logged
            </span>
          </div>

          {/* Support Tickets Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 16px' }}>Ticket ID</th>
                  <th style={{ padding: '12px 16px' }}>User Particulars</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Subject & Inquiry Message</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {supportTickets
                  .filter(t => ticketFilter === 'ALL' || t.status === ticketFilter)
                  .map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#1E293B' }}>
                        {t.id}
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'normal' }}>{t.created_at}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#12304A', display: 'block' }}>{t.full_name}</strong>
                        <span style={{ color: '#1F6FEB', fontSize: '12px' }}>{t.email}</span>
                        {t.phone && <div style={{ color: '#64748B', fontSize: '11px' }}>{t.phone}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                          {t.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '340px' }}>
                        <strong style={{ display: 'block', color: '#1E293B', marginBottom: '4px' }}>{t.subject}</strong>
                        <div style={{ color: '#64748B', fontSize: '12px', lineHeight: '1.4' }}>{t.message}</div>
                        {t.admin_reply && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '11px', color: '#15803D' }}>
                            <strong>Replied ({t.replied_at}):</strong> {t.admin_reply}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: t.status === 'RESOLVED' ? '#DCFCE7' : t.status === 'IN_PROGRESS' ? '#FEF3C7' : '#FEE2E2',
                          color: t.status === 'RESOLVED' ? '#15803D' : t.status === 'IN_PROGRESS' ? '#B45309' : '#B91C1C'
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedTicketToReply(t);
                            setReplyMessage(t.admin_reply || `Dear ${t.full_name},\n\nThank you for reaching out to SecureWheels Support.\n\n`);
                            setReplyNewStatus('RESOLVED');
                          }}
                          style={{ padding: '6px 12px', backgroundColor: '#12304A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Reply size={13} /> {t.admin_reply ? 'Update' : 'Reply'}
                        </button>
                        {t.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleCloseTicket(t.id)}
                            title='Mark Ticket Resolved / Closed'
                            style={{ padding: '6px 10px', backgroundColor: '#DCFCE7', color: '#15803D', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          title='Permanently Delete Ticket'
                          style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Section: Dispatched Outbound Emails Log */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#12304A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} color='#10B981' /> Outbound Dispatched Emails Log ({sentEmailsLog.length} Records)
              </h4>
              {sentEmailsLog.length > 0 && (
                <button
                  onClick={handleClearSentEmails}
                  style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={12} /> Clear Outbound Log
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                    <th style={{ padding: '10px 12px' }}>Sent Time</th>
                    <th style={{ padding: '10px 12px' }}>Recipient</th>
                    <th style={{ padding: '10px 12px' }}>Subject Line</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>Status & Gateway</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sentEmailsLog.map((em) => (
                    <tr key={em.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{em.created_at}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <strong style={{ color: '#1E293B' }}>{em.recipient_name}</strong>
                        <div style={{ color: '#1F6FEB' }}>{em.recipient_email}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: '320px' }}>{em.subject}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {em.sender_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: '#15803D', fontWeight: '700', display: 'block' }}>{em.status}</span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>{em.provider}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteSentEmail(em.id)}
                          title='Delete email log record'
                          style={{ padding: '4px 8px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          
          {/* UNDERWRITING APPROVAL QUEUE */}
          {sortedPolicies.filter((p: any) => p.status === 'PENDING_ADMIN_APPROVAL').length > 0 && (
            <div style={{ backgroundColor: '#FFFBEB', border: '2px solid #FCD34D', borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color='#D97706' />
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#92400E', margin: 0 }}>
                    Underwriting Approval Queue ({sortedPolicies.filter((p: any) => p.status === 'PENDING_ADMIN_APPROVAL').length} Policies Flagged for Valuation Variance)
                  </h4>
                </div>
                <button
                  onClick={() => setPolicySortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #F59E0B',
                    backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  <ArrowUpDown size={14} />
                  Sort by Date: {policySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#B45309', margin: '0 0 16px 0' }}>
                These policies have declared IDVs that deviate from the statutory IRDAI depreciation schedule by more than ±15%. Review the declared vs. benchmark valuation and authorize or adjust.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedPolicies.filter((p: any) => p.status === 'PENDING_ADMIN_APPROVAL').map((pol: any) => (
                  <div key={pol.id} style={{ backgroundColor: '#fff', border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px', color: '#1E293B', fontFamily: 'monospace' }}>{pol.policy_number}</strong>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309' }}>
                          Variance: {pol.idv_variance_pct > 0 ? `+${pol.idv_variance_pct}` : pol.idv_variance_pct}%
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                          Applied: {formatIST(pol.created_at || pol.start_date)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>
                        Customer: <strong>{pol.customer_name}</strong> ({pol.mobile}) • Vehicle: <strong>{pol.manufacturer} {pol.model}</strong> ({pol.registration_number})
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        Statutory IRDAI Benchmark: <strong>₹{Number(pol.statutory_idv || 0).toLocaleString()}</strong> | Declared IDV: <strong style={{ color: '#D97706' }}>₹{Number(pol.estimated_idv || 0).toLocaleString()}</strong>
                      </div>
                      {pol.underwriting_notes && (
                        <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', fontStyle: 'italic' }}>
                          {pol.underwriting_notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleUnderwritePolicy(pol.id, 'APPROVE')}
                        style={{ padding: '8px 14px', backgroundColor: '#15803D', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        Approve Declared IDV
                      </button>
                      {pol.statutory_idv && (
                        <button
                          onClick={() => handleUnderwritePolicy(pol.id, 'ADJUST_IDV', pol.statutory_idv)}
                          style={{ padding: '8px 14px', backgroundColor: '#0284C7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                          Adjust to Statutory (₹{Number(pol.statutory_idv).toLocaleString()})
                        </button>
                      )}
                      <button
                        onClick={() => handleUnderwritePolicy(pol.id, 'REJECT')}
                        style={{ padding: '8px 14px', backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        Reject Policy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#12304A', margin: 0 }}>
              Policy Schedules & Actuarial Premiums
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setPolicySortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <ArrowUpDown size={14} color="#1F6FEB" />
                Sort by Date: {policySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Total In-Force / Applications: <strong>{sortedPolicies.length}</strong>
              </span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Policy Number</th>
                <th style={{ padding: '10px' }}>Customer</th>
                <th style={{ padding: '10px' }}>Vehicle</th>
                <th style={{ padding: '10px' }}>Plan Tier</th>
                <th style={{ padding: '10px' }}>Term</th>
                <th style={{ padding: '10px' }}>Premium (Rs.)</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPolicies.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontWeight: '700', color: '#1F6FEB' }}>{p.policy_number}</td>
                  <td style={{ padding: '10px' }}>{p.customer_name} ({p.mobile})</td>
                  <td style={{ padding: '10px' }}>{p.manufacturer} {p.model} ({p.registration_number})</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{p.plan_type}</td>
                  <td style={{ padding: '10px' }}>
                    {p.start_date} to {p.end_date}
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '500', marginTop: '2px' }}>
                      Applied: {formatIST(p.created_at || p.start_date)}
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontWeight: '700' }}>Rs. {Number(p.calculated_premium).toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: p.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: p.status === 'ACTIVE' ? '#15803D' : '#B91C1C' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                    <a
                      href={`/api/policies/${p.id}/pdf`}
                      target='_blank'
                      rel='noreferrer'
                      title='Download 3-Page Regulatory PDF'
                      style={{ padding: '6px 10px', backgroundColor: '#F1F5F9', color: '#0F172A', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      <Download size={13} />
                    </a>
                    <button 
                      onClick={() => { setEditPolicyModal(p); setEditPolicyStatus(p.status); setEditPolicyPremium(p.calculated_premium); }}
                      style={{ padding: '6px 10px', backgroundColor: '#EFF6FF', color: '#1F6FEB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Edit size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeletePolicy(p.id)}
                      style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: VEHICLES */}
      {activeTab === 'vehicles' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#12304A' }}>Enrolled Vehicles Fleet Database</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Reg Number</th>
                <th style={{ padding: '10px' }}>Owner</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Make & Model</th>
                <th style={{ padding: '10px' }}>Mfg Year</th>
                <th style={{ padding: '10px' }}>Insured Declared Value (IDV)</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontWeight: '700', color: '#0369A1' }}>{v.registration_number}</td>
                  <td style={{ padding: '10px' }}>{v.owner_name} ({v.owner_mobile})</td>
                  <td style={{ padding: '10px' }}>{v.vehicle_type}</td>
                  <td style={{ padding: '10px' }}>{v.manufacturer} {v.model}</td>
                  <td style={{ padding: '10px' }}>{v.manufacturing_year}</td>
                  <td style={{ padding: '10px', fontWeight: '700', color: '#15803D' }}>Rs. {Number(v.estimated_idv).toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => handleDeleteVehicle(v.id)}
                      style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: USERS */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#12304A' }}>Policyholders & Claims Officers</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>User ID</th>
                <th style={{ padding: '10px' }}>Full Name</th>
                <th style={{ padding: '10px' }}>Mobile Number</th>
                <th style={{ padding: '10px' }}>Email</th>
                <th style={{ padding: '10px' }}>Access Role</th>
                <th style={{ padding: '10px' }}>Registered At</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px' }}>{u.id.slice(0, 8)}...</td>
                  <td style={{ padding: '10px', fontWeight: '700' }}>{u.full_name}</td>
                  <td style={{ padding: '10px' }}>{u.mobile}</td>
                  <td style={{ padding: '10px' }}>{u.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: u.role === 'ADMIN' ? '#FEF3C7' : '#EFF6FF', color: u.role === 'ADMIN' ? '#B45309' : '#1F6FEB' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#64748B' }}>{u.created_at}</td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => {
                        setEditUserModal(u);
                        setEditUserName(u.full_name);
                        setEditUserEmail(u.email);
                        setEditUserMobile(u.mobile);
                        setEditUserRole(u.role);
                      }}
                      title='Edit User Profile'
                      style={{ padding: '6px 10px', backgroundColor: '#EFF6FF', color: '#1F6FEB', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700' }}>
                      <Edit size={12} /> Edit
                    </button>
                    {u.id !== user.userId && (
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        title='Delete User Account'
                        style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={18} color='#15803D' /> Immutable Decision & Security Audit Trail
          </h3>
          <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC' }}>
                <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Actor</th>
                  <th style={{ padding: '10px 14px' }}>Action Logged</th>
                  <th style={{ padding: '10px 14px' }}>Entity Type</th>
                  <th style={{ padding: '10px 14px' }}>Details Payload</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{log.timestamp}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700' }}>{log.actor_role}</td>
                    <td style={{ padding: '10px 14px', color: '#1F6FEB', fontWeight: '600' }}>{log.action}</td>
                    <td style={{ padding: '10px 14px' }}>{log.entity_type} ({log.entity_id ? log.entity_id.slice(0, 10) : ''}...)</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: RAZORPAY PAYMENT TRANSACTIONS */}
      {activeTab === 'payments' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color='#1F6FEB' /> Razorpay Gateway Transactions & Settlement Ledger
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Audited payment capture records synchronized with policies, customers, and vehicles
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href='/api/admin/payments/export-csv'
                download='SecureWheels_Razorpay_Settlement_Ledger.csv'
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#10B981', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                <Download size={14} /> Export CSV (.CSV)
              </a>
              <button
                type='button'
                onClick={exportPaymentsExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#0284C7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                <FileText size={14} /> Download Excel (.CSV)
              </button>
              <button
                type='button'
                onClick={fetchAllAdminData}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '11px', color: '#15803D', fontWeight: '800', textTransform: 'uppercase' }}>Gross Revenue Captured</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                ₹{paymentsList.filter((p: any) => p.status === 'CAPTURED').reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                {paymentsList.filter((p: any) => p.status === 'CAPTURED').length} captured order transactions
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Captured Payments</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803D', marginTop: '4px' }}>
                {paymentsList.filter((p: any) => p.status === 'CAPTURED').length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Verified & activated policies</div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Pending / Created Orders</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', marginTop: '4px' }}>
                {paymentsList.filter((p: any) => p.status === 'CREATED').length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Awaiting gateway authorization</div>
            </div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Razorpay Gateway</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1F6FEB', marginTop: '8px' }}>
                Live Test Mode (INR)
              </div>
              <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>HMAC-SHA256 SDK Verified</div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px', maxWidth: '500px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} color='#94A3B8' style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type='text'
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  placeholder='Search by customer, email, order ID, payment ID, policy, reg...'
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Status:</span>
              <select
                value={paymentsStatusFilter}
                onChange={(e) => setPaymentsStatusFilter(e.target.value as any)}
                style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', backgroundColor: '#fff', color: '#334155', fontWeight: '600' }}>
                <option value='ALL'>All Statuses ({paymentsList.length})</option>
                <option value='CAPTURED'>Captured Only ({paymentsList.filter((p: any) => p.status === 'CAPTURED').length})</option>
                <option value='CREATED'>Created / Pending Only ({paymentsList.filter((p: any) => p.status === 'CREATED').length})</option>
              </select>
            </div>
          </div>

          {paymentsList.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
              No Razorpay payment transactions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Transaction Time</th>
                    <th style={{ padding: '12px 14px' }}>Razorpay Order / Payment ID</th>
                    <th style={{ padding: '12px 14px' }}>Customer Particulars</th>
                    <th style={{ padding: '12px 14px' }}>Policy & Plan</th>
                    <th style={{ padding: '12px 14px' }}>Vehicle</th>
                    <th style={{ padding: '12px 14px' }}>Amount</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList
                    .filter((tx: any) => {
                      if (paymentsStatusFilter !== 'ALL' && tx.status !== paymentsStatusFilter) return false;
                      if (!paymentsSearch.trim()) return true;
                      const q = paymentsSearch.toLowerCase();
                      return (
                        (tx.order_id && tx.order_id.toLowerCase().includes(q)) ||
                        (tx.payment_id && tx.payment_id.toLowerCase().includes(q)) ||
                        (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
                        (tx.customer_email && tx.customer_email.toLowerCase().includes(q)) ||
                        (tx.customer_mobile && tx.customer_mobile.toLowerCase().includes(q)) ||
                        (tx.policy_number && tx.policy_number.toLowerCase().includes(q)) ||
                        (tx.registration_number && tx.registration_number.toLowerCase().includes(q)) ||
                        (tx.plan_type && tx.plan_type.toLowerCase().includes(q))
                      );
                    })
                    .map((tx: any) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {tx.created_at || '-'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1E293B', fontSize: '11px' }}>
                            Order: {tx.order_id}
                          </div>
                          {tx.payment_id ? (
                            <div style={{ fontFamily: 'monospace', color: '#15803D', fontSize: '11px', marginTop: '2px', fontWeight: '700' }}>
                              Pay ID: {tx.payment_id}
                            </div>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94A3B8' }}>Awaiting Capture</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: '#1E293B', display: 'block' }}>{tx.customer_name || 'Policyholder'}</strong>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>{tx.customer_email || '-'}</span>
                          <span style={{ color: '#64748B', fontSize: '11px' }}>{tx.customer_mobile || '-'}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: '700', color: '#1F6FEB', display: 'block' }}>{tx.policy_number || 'N/A'}</span>
                          <span style={{ color: '#475569', fontSize: '11px' }}>{tx.plan_type || '-'}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: '#1E293B', display: 'block' }}>{tx.registration_number || '-'}</strong>
                          <span style={{ color: '#64748B', fontSize: '11px' }}>{tx.manufacturer} {tx.model}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#15803D', whiteSpace: 'nowrap' }}>
                          ₹{Number(tx.amount || 1.0).toFixed(2)} {tx.currency || 'INR'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                            backgroundColor: tx.status === 'CAPTURED' ? '#DCFCE7' : tx.status === 'CREATED' ? '#FEF3C7' : '#FEE2E2',
                            color: tx.status === 'CAPTURED' ? '#15803D' : tx.status === 'CREATED' ? '#B45309' : '#B91C1C'
                          }}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAILED CLAIM CASE DOSSIER & MULTIMODAL INSPECTOR MODAL */}
      {selectedClaim && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', width: '740px', maxHeight: '92vh', overflowY: 'auto', padding: '28px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            {/* Header with Re-Evaluate Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', margin: 0 }}>
                  Case Dossier: {selectedClaim.claim_number}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Claimant: <strong>{selectedClaim.claimant_name || 'Policyholder'}</strong> ({selectedClaim.claimant_mobile || 'N/A'})
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  disabled={loading}
                  onClick={() => handleReEvaluate(selectedClaim.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Re-evaluating...' : 'Re-Evaluate Through Pipeline'}
                </button>

                <span style={{ 
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800',
                  backgroundColor: selectedClaim.risk_level === 'HIGH' ? '#FEE2E2' : selectedClaim.risk_level === 'MEDIUM' ? '#FEF3C7' : '#DCFCE7',
                  color: selectedClaim.risk_level === 'HIGH' ? '#B91C1C' : selectedClaim.risk_level === 'MEDIUM' ? '#B45309' : '#15803D'
                }}>
                  {selectedClaim.risk_level} RISK
                </span>
              </div>
            </div>

            {reEvalSuccess && (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px', borderRadius: '6px', color: '#065F46', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Pipeline Re-evaluation Complete: Real-time scores and SHAP factors updated!
              </div>
            )}

            {/* Complete Customer-Filled Incident Particulars */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '14px', fontSize: '12px' }}>
              <div style={{ fontWeight: '800', color: '#0F172A', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                Customer Submission Particulars (Full Statement)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                <div><strong>Vehicle:</strong> {selectedClaim.manufacturer} {selectedClaim.vehicle_model}</div>
                <div><strong>Registration No:</strong> {selectedClaim.registration_number || 'N/A'}</div>
                <div><strong>Claimed Repair Est:</strong> Rs. {Number(selectedClaim.estimated_repair_cost).toLocaleString()}</div>
                <div><strong>Incident Date & Time:</strong> {selectedClaim.accident_date} ({selectedClaim.accident_time || '14:30'})</div>
                <div><strong>Applied Date:</strong> {formatIST(selectedClaim.created_at || selectedClaim.accident_date)}</div>
                <div><strong>Location:</strong> {selectedClaim.accident_location}</div>
                <div><strong>Area Type:</strong> {selectedClaim.accident_area || 'Urban'}</div>
                <div><strong>Assigned Fault:</strong> {selectedClaim.fault || 'Policy Holder'}</div>
                <div><strong>Police Report Filed:</strong> {selectedClaim.police_report_filed ? 'Yes' : 'No'}</div>
                <div><strong>Witness Present:</strong> {selectedClaim.witness_present ? 'Yes' : 'No'}</div>
                <div><strong>Vehicle Drivable:</strong> {selectedClaim.is_drivable ? 'Yes' : 'No'}</div>
                <div><strong>Third Party Involved:</strong> {selectedClaim.third_party_involved ? 'Yes' : 'No'}</div>
                <div><strong>Injuries Reported:</strong> {selectedClaim.injury_reported ? 'Yes (Mandatory Review)' : 'None'}</div>
              </div>

              <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '4px' }}>
                <div style={{ marginBottom: '4px' }}><strong>Incident Narrative:</strong> {selectedClaim.incident_description}</div>
                <div><strong>Damage Description:</strong> {selectedClaim.damage_description}</div>
              </div>
            </div>

            {/* Multimodal Damage Visual & Forensic Inspector */}
            <div style={{ backgroundColor: '#FAF5FF', padding: '14px', borderRadius: '8px', border: '1px solid #E9D5FF', marginBottom: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '800', color: '#6B21A8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <Camera size={16} /> Multimodal Computer Vision & Forensic Inspection
                </span>
                <span style={{ 
                  fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '4px',
                  backgroundColor: (selectedClaim.visual_consistency_score ?? 0.90) >= 0.80 ? '#DCFCE7' : ((selectedClaim.visual_consistency_score ?? 0.90) >= 0.55 ? '#FEF3C7' : '#FEE2E2'),
                  color: (selectedClaim.visual_consistency_score ?? 0.90) >= 0.80 ? '#15803D' : ((selectedClaim.visual_consistency_score ?? 0.90) >= 0.55 ? '#B45309' : '#B91C1C')
                }}>
                  Visual Match: {Math.round((selectedClaim.visual_consistency_score ?? 0.90) * 100)}% ({selectedClaim.visual_inspection_report?.match_status || 'HIGH_CONFIDENCE_MATCH'})
                </span>
              </div>

              {/* Photo & Forensic Heatmap Viewer */}
              {(() => {
                // Extract all claim evidence photos across all fields
                const evidencePhotos: Array<{ url: string; label: string; heatmap?: string }> = [];
                
                // First: parse all URLs from damage_image_urls
                let rawUrls: string[] = [];
                if (selectedClaim.damage_image_urls) {
                  let parsed = selectedClaim.damage_image_urls;
                  if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch { parsed = [parsed]; }
                  }
                  if (Array.isArray(parsed)) rawUrls = parsed.filter(Boolean);
                }

                const repImgs = selectedClaim.visual_inspection_report?.all_images;
                const repList = Array.isArray(repImgs) ? repImgs : [];
                const breakdowns = selectedClaim.visual_inspection_report?.per_photo_breakdown || [];

                if (rawUrls.length > 0) {
                  // Authoritative list of submitted URLs
                  rawUrls.forEach((u: string, i: number) => {
                    const matchedRep = repList.find((it: any) => (it.image_url || it.url) === u) || repList[i];
                    const matchedBreakdown = breakdowns.find((b: any) => b.photo_index === i + 1) || breakdowns[i];
                    evidencePhotos.push({
                      url: u,
                      label: matchedRep?.perspective || matchedBreakdown?.perspective_label || (i === 0 ? 'Front / Primary View' : i === 1 ? 'Damage Close-Up' : i === 2 ? 'Rear / Angle View' : `Perspective ${i + 1}`),
                      heatmap: matchedRep?.heatmap_base64 || (i === 0 ? selectedClaim.visual_inspection_report?.heatmap_base64 : undefined)
                    });
                  });
                } else if (repList.length > 0) {
                  repList.forEach((it: any, i: number) => {
                    const u = it.image_url || it.url;
                    if (u) {
                      evidencePhotos.push({
                        url: u,
                        label: it.perspective || (i === 0 ? 'Front / Primary View' : i === 1 ? 'Damage Close-Up' : i === 2 ? 'Rear / Angle View' : `Perspective ${i + 1}`),
                        heatmap: it.heatmap_base64
                      });
                    }
                  });
                } else if (selectedClaim.damage_image_url) {
                  evidencePhotos.push({
                    url: selectedClaim.damage_image_url,
                    label: 'Primary Evidence Photo',
                    heatmap: selectedClaim.visual_inspection_report?.heatmap_base64
                  });
                }

                if (evidencePhotos.length === 0) return null;

                const activeIdx = selectedPhotoIdx % evidencePhotos.length;
                const activePhoto = evidencePhotos[activeIdx] || evidencePhotos[0];
                const activeHeatmap = activePhoto.heatmap || selectedClaim.visual_inspection_report?.heatmap_base64;

                return (
                  <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #E2E8F0', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '12px' }}>
                          📸 Visual Evidence Dossier
                        </span>
                        <span style={{ fontSize: '10px', backgroundColor: '#F3E8FF', color: '#6B21A8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {evidencePhotos.length} Photograph{evidencePhotos.length > 1 ? 's' : ''} Provided
                        </span>
                      </div>
                      {activeHeatmap && (
                        <button 
                          type="button"
                          onClick={() => setShowHeatmap(!showHeatmap)}
                          style={{
                            backgroundColor: showHeatmap ? '#6B21A8' : '#F1F5F9',
                            color: showHeatmap ? '#fff' : '#1E293B',
                            border: '1px solid #CBD5E1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Zap size={12} /> {showHeatmap ? 'View Original Photo' : 'Toggle Forensic Heatmap'}
                        </button>
                      )}
                    </div>

                    {/* Main Image Viewport */}
                    <div style={{ textAlign: 'center', height: '230px', overflow: 'hidden', borderRadius: '6px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', position: 'relative' }}>
                      <img 
                        src={showHeatmap && activeHeatmap ? activeHeatmap : activePhoto.url} 
                        alt="Crash Evidence / Heatmap" 
                        style={{ maxHeight: '230px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                      <div style={{ position: 'absolute', bottom: '6px', left: '8px', backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                        {showHeatmap && activeHeatmap ? '🔥 Error-Level Splicing Heatmap' : `📷 Photo ${activeIdx + 1} of ${evidencePhotos.length}: ${activePhoto.label}`}
                      </div>
                    </div>

                    {/* Multi-Photo Interactive Thumbnail Strip */}
                    {evidencePhotos.length > 1 && (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Click to Inspect Angle / Perspective ({evidencePhotos.length} Photos):
                        </div>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {evidencePhotos.map((p, idx) => {
                            const isSelected = idx === activeIdx;
                            return (
                              <div
                                key={idx}
                                onClick={() => { setSelectedPhotoIdx(idx); setShowHeatmap(false); }}
                                style={{
                                  minWidth: '85px',
                                  maxWidth: '100px',
                                  flexShrink: 0,
                                  border: isSelected ? '2px solid #9333EA' : '1px solid #E2E8F0',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? '#FAF5FF' : '#F8FAFC',
                                  transition: 'all 0.15s ease'
                                }}>
                                <div style={{ height: '54px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <img src={p.url} alt={`Thumbnail ${idx + 1}`} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ padding: '3px 4px', textAlign: 'center', fontSize: '9px', fontWeight: '700', color: isSelected ? '#6B21A8' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  P{idx + 1}: {p.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Multi-Perspective Breakdown Matrix */}
                    {Array.isArray(selectedClaim.visual_inspection_report?.per_photo_breakdown) && selectedClaim.visual_inspection_report.per_photo_breakdown.length > 0 && (
                      <div style={{ marginTop: '10px', backgroundColor: '#FAF5FF', borderRadius: '6px', border: '1px solid #E9D5FF', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B21A8', textTransform: 'uppercase' }}>
                            🔍 Multi-Perspective Vision Adjudication Matrix ({selectedClaim.visual_inspection_report.per_photo_breakdown.length} Perspectives)
                          </span>
                          {selectedClaim.visual_inspection_report.has_cross_vehicle_contradiction && (
                            <span style={{ fontSize: '10px', backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                              🚨 Contradiction Flagged
                            </span>
                          )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#EDE9FE', borderBottom: '1px solid #DDD6FE', textAlign: 'left', color: '#581C87' }}>
                                <th style={{ padding: '5px 8px' }}>Angle</th>
                                <th style={{ padding: '5px 8px' }}>Detected Subject</th>
                                <th style={{ padding: '5px 8px' }}>Policy Match</th>
                                <th style={{ padding: '5px 8px' }}>Confidence</th>
                                <th style={{ padding: '5px 8px' }}>Forensic Observation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedClaim.visual_inspection_report.per_photo_breakdown.map((row: any, rIdx: number) => {
                                const isContradiction = row.matches_insured_vehicle === false;
                                return (
                                  <tr key={rIdx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isContradiction ? '#FEF2F2' : rIdx % 2 === 0 ? '#fff' : '#FDF4FF' }}>
                                    <td style={{ padding: '5px 8px', fontWeight: '700', color: '#1E293B' }}>
                                      {row.perspective_label || `Perspective ${row.photo_index || rIdx + 1}`}
                                    </td>
                                    <td style={{ padding: '5px 8px', fontWeight: '700', color: isContradiction ? '#B91C1C' : '#1E293B' }}>
                                      {row.detected_entity || 'Vehicle'}
                                    </td>
                                    <td style={{ padding: '5px 8px' }}>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isContradiction ? '#FEE2E2' : '#DCFCE7',
                                        color: isContradiction ? '#B91C1C' : '#15803D'
                                      }}>
                                        {isContradiction ? '❌ MISMATCH' : '✓ COMPATIBLE'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: '700' }}>
                                      {Math.round((row.match_confidence || 0.9) * 100)}%
                                    </td>
                                    <td style={{ padding: '5px 8px', color: isContradiction ? '#991B1B' : '#475569', fontSize: '10px' }}>
                                      {row.damage_observed || row.notes || 'Damage aligned with automotive structure'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Forensic Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>Classified Entity</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: selectedClaim.visual_inspection_report?.detected_entity_type === 'NON_VEHICLE' ? '#B91C1C' : '#581C87' }}>
                    {selectedClaim.visual_inspection_report?.detected_entity_label || 'Standard Vehicle'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>Dominant Body Paint</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedClaim.visual_inspection_report?.dominant_color_hex || '#94A3B8', border: '1px solid #CBD5E1', display: 'inline-block' }}></span>
                    {selectedClaim.visual_inspection_report?.dominant_paint_color || 'Standard Silver'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>Damage Pattern</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#B45309' }}>
                    {selectedClaim.visual_inspection_report?.damage_patterns?.primary_damage_type || selectedClaim.visual_inspection_report?.detected_severity_tier || 'Deformation'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>AI-Generated Risk</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: (selectedClaim.visual_inspection_report?.ai_generation_risk_score ?? 0.12) > 0.40 ? '#B91C1C' : '#15803D' }}>
                    {selectedClaim.visual_inspection_report?.ai_generation_verdict || 'AUTHENTIC_CAPTURE'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>Plate Geometry Check</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF' }}>
                    {selectedClaim.registration_number || selectedClaim.visual_inspection_report?.license_plate_verification?.status || 'VERIFIED'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '10px', color: '#6B21A8', fontWeight: '600' }}>Orientation Invariance</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155' }}>
                    {selectedClaim.visual_inspection_report?.orientation_normalization || 'Canonical (0°)'}
                  </div>
                </div>
              </div>

              {/* Stated vs Detected Damage Consistency */}
              <div style={{ color: '#581C87', marginBottom: '6px', fontSize: '11px' }}>
                Vehicle Underwriting Profile: <strong>{selectedClaim.manufacturer} ({selectedClaim.vehicle_type || 'Car'})</strong> • Plate: <strong>{selectedClaim.registration_number}</strong>
              </div>

              {/* Detected Components */}
              {selectedClaim.visual_inspection_report?.detected_parts && (
                <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#6B21A8' }}>Visual Components:</span>
                  {selectedClaim.visual_inspection_report.detected_parts.map((p: string, i: number) => (
                    <span key={i} style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Instant Rejection or Discrepancies Alert */}
              {selectedClaim.visual_inspection_report?.is_instant_rejection && (
                <div style={{ backgroundColor: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', color: '#991B1B' }}>
                  <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B91C1C', marginBottom: '4px' }}>
                    <AlertTriangle size={15} /> 🛑 Automated Forensic Instant Rejection ({selectedClaim.visual_inspection_report.rejection_code || 'MISMATCH'})
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: '1.45', fontWeight: '600' }}>
                    {selectedClaim.visual_inspection_report.rejection_reason || 'Visual evidence strictly contradicts the registered vehicle underwriting profile.'}
                  </div>
                </div>
              )}

              {/* Discrepancies & Contradiction Alerts */}
              {selectedClaim.visual_inspection_report?.identified_discrepancies?.length > 0 ? (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px', color: '#991B1B' }}>
                  <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <AlertTriangle size={13} /> Stated Claim vs. Visual Inspection Contradiction:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px' }}>
                    {selectedClaim.visual_inspection_report.identified_discrepancies.map((disc: string, idx: number) => (
                      <li key={idx}>{disc}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ color: '#15803D', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={13} /> No conflicting damage indicators found between visual analysis and written claim.
                </div>
              )}
            </div>

            {/* Dedicated Vehicle Identity & Anti-Spoofing Verification Model */}
            {selectedClaim.visual_inspection_report?.vehicle_verification && (
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '800', fontSize: '13px' }}>
                    <Car size={16} color='#16A34A' /> Vehicle Verification Model: <strong>{selectedClaim.visual_inspection_report.vehicle_verification.verification_status}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {selectedClaim.visual_inspection_report.vehicle_verification.total_photos_analyzed || 1} Perspective{(selectedClaim.visual_inspection_report.vehicle_verification.total_photos_analyzed || 1) > 1 ? 's' : ''} Analyzed
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      backgroundColor: selectedClaim.visual_inspection_report.vehicle_verification.cross_photo_match ? '#DCFCE7' : '#FEE2E2',
                      color: selectedClaim.visual_inspection_report.vehicle_verification.cross_photo_match ? '#166534' : '#991B1B'
                    }}>
                      Confidence: {((selectedClaim.visual_inspection_report.vehicle_verification.match_confidence ?? 0.92) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#166534', marginBottom: '6px', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                  <span>Anti-Spoofing Authenticator: <strong>{selectedClaim.visual_inspection_report.vehicle_verification.anti_spoofing?.verdict?.replace(/_/g, ' ') || 'AUTHENTIC CAPTURE'}</strong> (Sensor Certainty: {((selectedClaim.visual_inspection_report.vehicle_verification.anti_spoofing?.confidence ?? 0.94) * 100).toFixed(0)}%) • Inter-Angle Consistency: <strong>{((selectedClaim.visual_inspection_report.vehicle_verification.multi_angle_consistency_score ?? 0.90) * 100).toFixed(0)}%</strong></span>
                </div>

                {Array.isArray(selectedClaim.visual_inspection_report.vehicle_verification.findings) && selectedClaim.visual_inspection_report.vehicle_verification.findings.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#14532D', lineHeight: '1.45' }}>
                    {selectedClaim.visual_inspection_report.vehicle_verification.findings.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* SecureWheels Autonomous Forensic Arbiter Dossier */}
            {selectedClaim.visual_inspection_report?.groq_reasoning && (
              <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #D8B4FE', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B21A8', fontWeight: '800', fontSize: '13px' }}>
                    <Cpu size={16} /> SecureWheels Senior Forensic Arbiter (Neural Reasoning Engine)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {selectedClaim.visual_inspection_report.groq_reasoning.active_model || 'SecureWheels Forensic-XL'}
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontWeight: '800',
                      backgroundColor: (selectedClaim.visual_inspection_report.groq_reasoning.credibility_score ?? 80) >= 70 ? '#DCFCE7' : '#FEE2E2',
                      color: (selectedClaim.visual_inspection_report.groq_reasoning.credibility_score ?? 80) >= 70 ? '#166534' : '#991B1B'
                    }}>
                      Credibility: {selectedClaim.visual_inspection_report.groq_reasoning.credibility_score ?? 80}%
                    </span>
                  </div>
                </div>

                {selectedClaim.visual_inspection_report.groq_reasoning.executive_summary && (
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.45', marginBottom: '8px', backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #EDE9FE' }}>
                    <strong style={{ color: '#581C87' }}>Executive Summary: </strong>
                    {selectedClaim.visual_inspection_report.groq_reasoning.executive_summary}
                  </div>
                )}

                {Array.isArray(selectedClaim.visual_inspection_report.groq_reasoning.key_findings) && selectedClaim.visual_inspection_report.groq_reasoning.key_findings.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B21A8', marginBottom: '2px' }}>Forensic Cross-Check Findings:</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#4B5563' }}>
                      {selectedClaim.visual_inspection_report.groq_reasoning.key_findings.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(selectedClaim.visual_inspection_report.groq_reasoning.recommended_investigative_steps) && selectedClaim.visual_inspection_report.groq_reasoning.recommended_investigative_steps.length > 0 && (
                  <div style={{ backgroundColor: '#F3E8FF', borderRadius: '4px', padding: '6px 8px', fontSize: '11px', color: '#581C87' }}>
                    <span style={{ fontWeight: '700' }}>Surveyor Directives: </span>
                    {selectedClaim.visual_inspection_report.groq_reasoning.recommended_investigative_steps.join(' • ')}
                  </div>
                )}
              </div>
            )}

            {/* AI Multi-Model Ensemble Intelligence Box */}
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Tri-Model Ensemble Score: <strong>{selectedClaim.ensemble_score}</strong>
                </span>
                <span style={{ fontSize: '11px', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                  Optimal Decision Threshold: 0.40
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Random Forest (45%)</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{selectedClaim.rf_score ?? '-'}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>XGBoost (45%)</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{selectedClaim.xgb_score ?? '-'}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Isolation Forest (10%)</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{selectedClaim.iso_score ?? '-'}</div>
                </div>
              </div>

              {/* Explainable Factor Vectors (SHAP) */}
              <div style={{ fontSize: '12px' }}>
                <span style={{ fontWeight: '700', color: '#1E40AF', display: 'block', marginBottom: '4px' }}>
                  TreeSHAP Root-Cause Feature Attribution:
                </span>
                {Array.isArray(selectedClaim.top_contributing_factors) && selectedClaim.top_contributing_factors.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#1E3A8A' }}>
                    {selectedClaim.top_contributing_factors.map((factor: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '2px' }}>{factor}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#64748B', fontStyle: 'italic' }}>
                    • Genuine baseline profile: no anomalous timing, frequency, or liability spikes detected.
                  </div>
                )}
              </div>
            </div>

            {/* Decision Select & Rationale */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>Adjudicator Decision</label>
              <select 
                value={overrideDecision} 
                onChange={(e) => setOverrideDecision(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                <option value='APPROVED'>Approve Claim (Disburse Cashless Payout)</option>
                <option value='REJECTED'>Repudiate / Reject Claim (Fraud Suspected)</option>
                <option value='REQUEST_EVIDENCE'>Request Forensic Evidence & Re-survey</option>
                <option value='UNDER_INVESTIGATION'>Hold Under Investigation</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                Mandatory Audit Rationale (Recorded into Immutable Ledger)
              </label>
              <textarea 
                rows={2} 
                value={overrideReason} 
                onChange={(e) => setOverrideReason(e.target.value)} 
                placeholder='Specify investigative findings or justification for decision...' 
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }} 
                required 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type='button' 
                onClick={() => setSelectedClaim(null)} 
                style={{ padding: '9px 16px', backgroundColor: '#E2E8F0', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                Close Dossier
              </button>
              <button 
                type='button' 
                disabled={loading}
                onClick={handleDecisionSubmit} 
                style={{ 
                  padding: '9px 20px', 
                  backgroundColor: overrideDecision === 'REJECTED' ? '#DC2626' : '#15803D', 
                  color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' 
                }}>
                {loading ? 'Committing...' : `Commit Decision (${overrideDecision})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {addProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '500px', padding: '28px', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', marginBottom: '14px' }}>Add New Insurance Product for Sale</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Product / Plan Name</label>
                <input required type='text' value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder='e.g. EV Battery & Drive Guard' style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Vehicle Class</label>
                  <select value={newProdVehicle} onChange={(e) => setNewProdVehicle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                    <option value='All Vehicles'>All Vehicles</option>
                    <option value='Car'>Car</option>
                    <option value='Two-Wheeler'>Two-Wheeler</option>
                    <option value='Electric Vehicle'>Electric Vehicle</option>
                    <option value='Commercial Vehicle'>Commercial Vehicle</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Coverage Tier</label>
                  <select value={newProdPlan} onChange={(e) => setNewProdPlan(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                    <option value='Comprehensive'>Comprehensive</option>
                    <option value='Zero-Depreciation'>Zero-Depreciation</option>
                    <option value='Third-Party'>Third-Party</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Base Tariff Rate (Decimal)</label>
                  <input required type='number' step='0.001' value={newProdRate} onChange={(e) => setNewProdRate(Number(e.target.value))} placeholder='0.025' style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Deductible (Rs.)</label>
                  <input required type='number' value={newProdDeductible} onChange={(e) => setNewProdDeductible(Number(e.target.value))} placeholder='400' style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Marketing Description</label>
                <textarea rows={2} required value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} placeholder='Short description of coverage features...' style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Coverage Summary Keypoints</label>
                <input required type='text' value={newProdCoverage} onChange={(e) => setNewProdCoverage(e.target.value)} placeholder='Comma-separated highlights (e.g. Battery Protect, Zero-Dep, Cashless)' style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type='button' onClick={() => setAddProductModal(false)} style={{ padding: '8px 16px', backgroundColor: '#E2E8F0', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type='submit' style={{ padding: '8px 18px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>Publish to Catalog</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLY TO SUPPORT TICKET MODAL */}
      {selectedTicketToReply && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '640px', maxWidth: '95vw', padding: '28px', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A' }}>Reply to Ticket: {selectedTicketToReply.id}</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Recipient: <strong>{selectedTicketToReply.full_name}</strong> ({selectedTicketToReply.email})</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1F6FEB' }}>
                {selectedTicketToReply.category}
              </span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '18px', fontSize: '13px' }}>
              <strong style={{ color: '#1E293B', display: 'block', marginBottom: '4px' }}>Subject: {selectedTicketToReply.subject}</strong>
              <p style={{ color: '#475569', margin: 0, lineHeight: '1.5' }}>{selectedTicketToReply.message}</p>
            </div>

            <form onSubmit={handleReplyTicketSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Official Email Reply Text</label>
                <textarea
                  rows={6}
                  required
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder='Write an official response. This will be transmitted directly to the customer via email...'
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', lineHeight: '1.6' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Update Ticket Resolution Status</label>
                <select
                  value={replyNewStatus}
                  onChange={(e) => setReplyNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value='RESOLVED'>RESOLVED (Inquiry closed, explanation provided)</option>
                  <option value='IN_PROGRESS'>IN_PROGRESS (Investigating, waiting for surveyor/documents)</option>
                  <option value='OPEN'>OPEN (Keep ticket pending)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type='button'
                  onClick={() => setSelectedTicketToReply(null)}
                  style={{ padding: '10px 18px', backgroundColor: '#E2E8F0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  style={{ padding: '10px 22px', backgroundColor: '#15803D', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} /> {loading ? 'Transmitting Email...' : 'Send Reply via Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPOSE EMAIL TO ANYONE MODAL */}
      {composeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '680px', maxWidth: '95vw', padding: '28px', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={18} color='#1F6FEB' /> Compose Official Email
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Write an email to any customer, policyholder, surveyor, or garage from the Admin Terminal.</span>
              </div>
              <button
                type='button'
                onClick={() => setComposeModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}>
                ×
              </button>
            </div>

            {/* Quick Template Picker */}
            <div style={{ backgroundColor: '#EFF6FF', padding: '12px 16px', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF', display: 'block', marginBottom: '6px' }}>
                Quick Professional Templates:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type='button'
                  onClick={() => applyEmailTemplate('welcome')}
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fff', border: '1px solid #93C5FD', borderRadius: '4px', cursor: 'pointer', color: '#1E40AF' }}>
                  Policy Welcome
                </button>
                <button
                  type='button'
                  onClick={() => applyEmailTemplate('survey')}
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fff', border: '1px solid #93C5FD', borderRadius: '4px', cursor: 'pointer', color: '#1E40AF' }}>
                  Surveyor Appointment
                </button>
                <button
                  type='button'
                  onClick={() => applyEmailTemplate('approval')}
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fff', border: '1px solid #93C5FD', borderRadius: '4px', cursor: 'pointer', color: '#1E40AF' }}>
                  Claim Approved Notice
                </button>
                <button
                  type='button'
                  onClick={() => applyEmailTemplate('ncb')}
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fff', border: '1px solid #93C5FD', borderRadius: '4px', cursor: 'pointer', color: '#1E40AF' }}>
                  NCB Confirmation
                </button>
              </div>
            </div>

            <form onSubmit={handleDirectEmailSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Recipient Email Address</label>
                  <input
                    type='email'
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder='e.g. claimant@example.com'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Recipient Name (Optional)</label>
                  <input
                    type='text'
                    value={emailToName}
                    onChange={(e) => setEmailToName(e.target.value)}
                    placeholder='e.g. Rajesh Kumar'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Subject Line</label>
                <input
                  type='text'
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder='SecureWheels AI - Official Notice...'
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Email Body (HTML/Plain Text)</label>
                <textarea
                  rows={7}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder='Type your message here...'
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', lineHeight: '1.6' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type='button'
                  onClick={() => setComposeModal(false)}
                  style={{ padding: '10px 18px', backgroundColor: '#E2E8F0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={sendingEmail}
                  style={{ padding: '10px 24px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} /> {sendingEmail ? 'Dispatching...' : 'Dispatch Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT POLICY MODAL */}
      {editPolicyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '460px', padding: '28px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>Edit Policy: {editPolicyModal.policy_number}</h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Policy Status</label>
              <select value={editPolicyStatus} onChange={(e) => setEditPolicyStatus(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                <option value='ACTIVE'>ACTIVE</option>
                <option value='SUSPENDED'>SUSPENDED</option>
                <option value='EXPIRED'>EXPIRED</option>
                <option value='CANCELLED'>CANCELLED</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Calculated Premium (Rs.)</label>
              <input type='number' value={editPolicyPremium} onChange={(e) => setEditPolicyPremium(Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEditPolicyModal(null)} style={{ padding: '8px 16px', backgroundColor: '#E2E8F0', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdatePolicy} style={{ padding: '8px 18px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '480px', maxWidth: '95vw', padding: '28px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#12304A', margin: 0 }}>Edit User Profile</h3>
              <button onClick={() => setEditUserModal(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Full Legal Name</label>
                <input required type='text' value={editUserName} onChange={(e) => setEditUserName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Email Address</label>
                <input required type='email' value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Mobile Number</label>
                <input required type='tel' value={editUserMobile} onChange={(e) => setEditUserMobile(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>System Access Role</label>
                <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}>
                  <option value='CUSTOMER'>CUSTOMER (Policyholder)</option>
                  <option value='INVESTIGATOR'>INVESTIGATOR (Surveyor)</option>
                  <option value='ADMIN'>ADMIN (Full Administrative Rights)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type='button' onClick={() => setEditUserModal(null)} style={{ padding: '8px 16px', backgroundColor: '#E2E8F0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                <button type='submit' style={{ padding: '8px 18px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
