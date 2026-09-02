import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { LandRecords } from './pages/LandRecords';
import { RecordDetail } from './pages/RecordDetail';
import { VerifyRecord } from './pages/VerifyRecord';
import { Documents } from './pages/Documents';
import { LedgerExplorer } from './pages/LedgerExplorer';
import { AuditTrail } from './pages/AuditTrail';
import { SecurityTesting } from './pages/SecurityTesting';
import { UserManagement } from './pages/UserManagement';
import { MyProperties } from './pages/MyProperties';
import { MyDocuments } from './pages/MyDocuments';
import { RegisterLand } from './pages/RegisterLand';
import { SecurityReports } from './pages/SecurityReports';
import { Login } from './pages/Login';
import { RefreshCw, ShieldCheck, ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { api } from './api/client';
import { hasPermission, ROLES } from './utils/permissions';

function AccessDenied({ onBackToDashboard, requiredRole }) {
  return (
    <div className="card animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'var(--color-tampered-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
      }}>
        <ShieldAlert size={36} color="var(--color-tampered)" />
      </div>
      <h2 style={{ color: 'var(--color-tampered)', marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>
        403 — Access Forbidden
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        You do not have permission to access this area. This section is restricted by server-side Role-Based Access Control (RBAC) policy.
      </p>
      <button
        className="btn btn-primary"
        onClick={onBackToDashboard}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}
      >
        <Home size={15} /> Return to Role Dashboard
      </button>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [verifyTargetId, setVerifyTargetId] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState('VERIFIED');

  // Fetch ledger status for TopBar indicator
  useEffect(() => {
    if (user && user.role !== 'customer') {
      api.get('/api/security/dashboard')
        .then(d => setLedgerStatus(d?.ledger?.status || 'VERIFIED'))
        .catch(() => {});
    }
  }, [user]);

  // Reset to dashboard on user change
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    }
  }, [user?.user_id]);

  const handleViewRecord = (id) => {
    setSelectedRecordId(id);
    setCurrentView('record-detail');
  };

  const handleVerifyRecord = (id) => {
    setVerifyTargetId(id);
    setCurrentView('verify');
  };

  // Loading spinner
  if (loading) {
    return (
      <div style={{
        display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--forest)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <RefreshCw className="animate-spin" size={24} color="var(--sage)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Authenticating session…</p>
        </div>
      </div>
    );
  }

  // Login page (no sidebar)
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
        {/* Minimal header for login */}
        <div style={{
          height: 56, background: 'var(--forest)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0 2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <ShieldCheck size={22} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '1rem', letterSpacing: '-0.01em' }}>
            Bhumi Abhilekha — Digital Land Registry
          </span>
          <span style={{
            marginLeft: '0.5rem',
            background: 'rgba(233,196,106,0.2)',
            border: '1px solid rgba(233,196,106,0.4)',
            color: 'var(--gold)',
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>UC-076</span>
        </div>
        <Login onLoginSuccess={() => setCurrentView('dashboard')} />
      </div>
    );
  }

  // Main authenticated layout — sidebar + content
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => setCurrentView(view)}
      />

      {/* Main content area */}
      <div className="app-content">
        <TopBar
          currentView={currentView}
          ledgerStatus={ledgerStatus}
          onNavigate={setCurrentView}
        />

        <main className="page-area">
          {/* Dashboard (Role-specific dispatcher) */}
          {currentView === 'dashboard' && (
            <Dashboard
              onNavigate={setCurrentView}
              onViewRecord={handleViewRecord}
              onVerifyRecord={handleVerifyRecord}
            />
          )}

          {/* Records list (Admin, Officer, Auditor) */}
          {currentView === 'records' && (
            user.role === 'customer'
              ? <MyProperties onViewRecord={handleViewRecord} onVerifyRecord={handleVerifyRecord} />
              : <LandRecords onViewRecord={handleViewRecord} onVerifyRecord={handleVerifyRecord} />
          )}

          {/* Customer Specific Views */}
          {currentView === 'my-properties' && (
            <MyProperties onViewRecord={handleViewRecord} onVerifyRecord={handleVerifyRecord} />
          )}

          {currentView === 'my-documents' && (
            <MyDocuments onViewRecord={handleViewRecord} />
          )}

          {/* Officer Specific Views */}
          {currentView === 'register-land' && (
            hasPermission(user.role, 'registerRecord')
              ? <RegisterLand onViewRecord={handleViewRecord} />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* Record Detail (All roles, ownership checked for customers) */}
          {currentView === 'record-detail' && (
            <RecordDetail
              recordId={selectedRecordId}
              onBack={() => setCurrentView(user.role === 'customer' ? 'my-properties' : 'records')}
              onVerifyRecord={handleVerifyRecord}
            />
          )}

          {/* Verification Pipeline */}
          {currentView === 'verify' && (
            <VerifyRecord
              initialRecordId={verifyTargetId}
              onViewRecord={handleViewRecord}
            />
          )}

          {/* Documents View */}
          {currentView === 'documents' && (
            <Documents onViewRecord={handleViewRecord} />
          )}

          {/* Ledger Explorer (Admin, Auditor, Officer) */}
          {currentView === 'ledger' && (
            hasPermission(user.role, 'viewLedger')
              ? <LedgerExplorer onViewRecord={handleViewRecord} />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* Audit Trail (Admin, Auditor, Officer) */}
          {currentView === 'audit' && (
            hasPermission(user.role, 'viewAuditTrail')
              ? <AuditTrail onViewRecord={handleViewRecord} />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* Auditor Security Reports */}
          {currentView === 'security-reports' && (
            hasPermission(user.role, 'viewSecurityReports')
              ? <SecurityReports onVerifyRecord={handleVerifyRecord} />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* Admin Security Testing Lab */}
          {currentView === 'security-testing' && (
            hasPermission(user.role, 'tamperSimulation')
              ? <SecurityTesting onVerifyRecord={handleVerifyRecord} />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* Admin User Management */}
          {currentView === 'user-management' && (
            hasPermission(user.role, 'manageUsers')
              ? <UserManagement />
              : <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
          )}

          {/* System Settings (Admin only) */}
          {currentView === 'settings' && (
            hasPermission(user.role, 'systemSettings') ? (
              <div className="card animate-fade-in" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--forest)', marginBottom: '0.75rem' }}>
                  Platform Configuration & Cryptographic Keys
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <strong>Post-Quantum Signature Algorithm:</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      ECDSA-P256 with CRYSTALS-Dilithium Level 3 Quantum-Resistant Hybrid Key Extension.
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <strong>Append-Only Ledger Engine:</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Enforced strictly at Mongoose ODM layer. Updates and deletions are rejected with AppendOnlyViolationError.
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <strong>Access Control Policy:</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Strict server-side session checks with 4-tier Role-Based Access Control & resource ownership checks.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <AccessDenied onBackToDashboard={() => setCurrentView('dashboard')} />
            )
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
