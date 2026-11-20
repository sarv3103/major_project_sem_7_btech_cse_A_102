import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Car, AlertTriangle, User, LogOut, ShieldAlert, FileText, Info } from 'lucide-react';
import { useAuth } from './AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ backgroundColor: '#12304A', color: '#fff', borderBottom: '1px solid #1E293B', position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Top micro bar */}
      <div style={{ backgroundColor: '#0B192C', padding: '4px 28px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
        <span>SecureWheels General Insurance • Licensed Composite Insurer (IRDAI Reg. 182)</span>
        <span>24x7 Claims Helpline: 1800-889-9433 • WhatsApp Support: +91 91301 23270</span>
      </div>

      {/* Main navigation */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to='/' style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#1F6FEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color='#fff' />
          </div>
          <div>
            <div style={{ fontSize: '19px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: '1.1' }}>
              Secure<span style={{ color: '#38BDF8' }}>Wheels</span>
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '500' }}>General Motor Insurance & Fraud Shield</div>
          </div>
        </Link>

        {/* Center Links */}
        <div style={{ display: 'flex', gap: '22px', fontSize: '14px', fontWeight: '600' }}>
          <Link to='/' style={{ color: '#E2E8F0', textDecoration: 'none' }}>Home</Link>
          <Link to='/insurance-types' style={{ color: '#E2E8F0', textDecoration: 'none' }}>Plans & Coverage</Link>
          <Link to='/contact' style={{ color: '#E2E8F0', textDecoration: 'none' }}>Contact & Helpdesk</Link>
          <Link to='/about' style={{ color: '#E2E8F0', textDecoration: 'none' }}>About & Technology</Link>
          {user && user.role === 'CUSTOMER' && (
            <Link to='/dashboard' style={{ color: '#38BDF8', textDecoration: 'none' }}>My Account</Link>
          )}
          {user && user.role === 'ADMIN' && (
            <Link to='/admin/dashboard' style={{ color: '#F59E0B', textDecoration: 'none' }}>Admin Terminal</Link>
          )}
        </div>

        {/* Right CTA / Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color='#38BDF8' />
                <strong>{user.fullName}</strong> ({user.role})
              </span>
              <button 
                onClick={handleLogout}
                style={{ 
                  backgroundColor: '#DC2626', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '7px 14px', 
                  borderRadius: '6px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link 
                to='/login' 
                style={{ 
                  color: '#fff', 
                  border: '1px solid #38BDF8', 
                  padding: '7px 14px', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  fontSize: '13px', 
                  fontWeight: '600' 
                }}>
                Customer Sign In
              </Link>
              <Link 
                to='/register' 
                style={{ 
                  backgroundColor: '#1F6FEB', 
                  color: '#fff', 
                  border: '1px solid #1F6FEB', 
                  padding: '7px 14px', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  fontSize: '13px', 
                  fontWeight: '700' 
                }}>
                Sign Up
              </Link>
              <Link 
                to='/admin/login' 
                style={{ 
                  backgroundColor: '#1E293B', 
                  color: '#F59E0B', 
                  border: '1px solid #F59E0B', 
                  padding: '7px 12px', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  fontSize: '13px', 
                  fontWeight: '600' 
                }}>
                Admin Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
