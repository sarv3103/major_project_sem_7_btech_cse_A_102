import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { resolveApiUrl } from './utils/apiClient';

// Pages
import { Home } from './pages/Home';
import { About } from './pages/About';
import { InsuranceTypes } from './pages/InsuranceTypes';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { BuyInsurance } from './pages/BuyInsurance';
import { ClaimFlow } from './pages/ClaimFlow';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContactSupport } from './pages/ContactSupport';
import { ForgotPassword } from './pages/ForgotPassword';

// Error Boundary to prevent blank white screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('SecureWheels Application caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A', marginBottom: '8px' }}>
            Application View Recovered
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>
            A temporary rendering glitch occurred. SecureWheels has safely caught the state.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              style={{ padding: '10px 20px', backgroundColor: '#1F6FEB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              Return to Home
            </button>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{ padding: '10px 20px', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  React.useEffect(() => {
    // Proactively pre-warm backend cloud instance so it responds instantly on first user action
    fetch(resolveApiUrl('/api/health')).catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F1F5F9' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/about' element={<About />} />
                <Route path='/insurance-types' element={<InsuranceTypes />} />
                <Route path='/contact' element={<ContactSupport />} />
                <Route path='/support' element={<ContactSupport />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route path='/signup' element={<Register />} />
                <Route path='/forgot-password' element={<ForgotPassword />} />
                <Route path='/dashboard' element={<CustomerDashboard />} />
                <Route path='/customer/dashboard' element={<CustomerDashboard />} />
                <Route path='/buy' element={<BuyInsurance />} />
                <Route path='/buy-insurance' element={<BuyInsurance />} />
                <Route path='/claim' element={<ClaimFlow />} />
                <Route path='/claims' element={<ClaimFlow />} />
                <Route path='/admin/login' element={<AdminLogin />} />
                <Route path='/admin/dashboard' element={<AdminDashboard />} />
                <Route path='*' element={<Navigate to='/' replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

