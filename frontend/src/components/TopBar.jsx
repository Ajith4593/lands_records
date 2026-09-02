import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, RefreshCw, Clock, ShieldCheck, ChevronDown } from 'lucide-react';
import { ROLES, ROLE_METADATA } from '../utils/permissions';

const PAGE_TITLES = {
  dashboard: {
    title: 'Dashboard',
    sub: 'Overview of system activity, verification status, and tasks tailored for your role.'
  },
  records: {
    title: 'Land Records Registry',
    sub: 'Browse, search, and inspect property registration records.'
  },
  'register-land': {
    title: 'Register New Land Record',
    sub: 'Enter official land details, cadastral survey references, and submit for digital signing.'
  },
  'my-properties': {
    title: 'My Property Portfolio',
    sub: 'Inspect verified land assets, ownership title deeds, and digital registration certificates.'
  },
  'my-documents': {
    title: 'My Uploaded Documents',
    sub: 'Manage uploaded deed certificates and check automated cryptographic verification results.'
  },
  verify: {
    title: 'Verification Engine',
    sub: 'Run full 5-stage cryptographic verification pipeline on land records.'
  },
  documents: {
    title: 'Document Verification',
    sub: 'Upload and verify title deed documents against the immutable ledger.'
  },
  ledger: {
    title: 'Block Ledger Explorer',
    sub: 'Inspect the append-only cryptographic chain and SHA-256 blocks.'
  },
  audit: {
    title: 'Immutable Audit Trail',
    sub: 'Chronological log of all system actions, state transitions, and security events.'
  },
  'security-reports': {
    title: 'Security & Integrity Reports',
    sub: 'Auditor review of tamper attempts, signature verifications, and anomalous records.'
  },
  'security-testing': {
    title: 'Security Testing Lab',
    sub: 'Controlled tamper simulation to demonstrate real-time cryptographic detection.'
  },
  'user-management': {
    title: 'User Management & Governance',
    sub: 'Administer platform users, assign roles (Officers, Auditors, Customers), and account statuses.'
  },
  settings: {
    title: 'System Settings',
    sub: 'Configure platform parameters, post-quantum cryptography keys, and demo modes.'
  },
  'record-detail': {
    title: 'Record Detail',
    sub: 'Full property record with cryptographic hash and signature verification.'
  },
};

export function TopBar({ currentView, ledgerStatus, onNavigate }) {
  const { user, login } = useAuth();
  const [roleOpen, setRoleOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const isLedgerOk = ledgerStatus === 'VERIFIED' || !ledgerStatus;

  const handleRoleSwitch = async (role) => {
    const creds = {
      administrator: { u: 'admin', p: 'Admin@LandRecords2024' },
      registration_officer: { u: 'officer1', p: 'Officer@2024' },
      auditor: { u: 'auditor1', p: 'Auditor@2024' },
      customer: { u: 'customer1', p: 'Customer@2024' },
    };
    if (creds[role] && user?.role !== role) {
      try {
        setSwitching(true);
        setRoleOpen(false);
        await login(creds[role].u, creds[role].p);
        onNavigate('dashboard');
      } catch (err) {
        console.error('Role switch failed:', err);
      } finally {
        setSwitching(false);
      }
    }
  };

  const roleMeta = ROLE_METADATA[user?.role] || {
    label: user?.role || 'User',
    shortLabel: 'User',
  };

  return (
    <>
      {/* Disclaimer strip */}
      <div className="disclaimer-banner">
        <span>
          <strong>PROTOTYPE:</strong> Bhumi Abhilekha — Digital Land Records &nbsp;•&nbsp;
          <span style={{ opacity: 0.75 }}>భూమి అభిలేఖ — డిజిటల్ భూ రిజిస్ట్రీ &nbsp;•&nbsp; भूमि अभिलेख — डिजिटल भूमि रजिस्ट्री</span>
        </span>
      </div>

      {/* Main top bar */}
      <header className="top-bar">
        {/* Page icon + title */}
        <div className="top-bar-title" style={{ gap: '0.7rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'var(--mint)',
            border: '1px solid var(--color-verified-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--forest)', flexShrink: 0,
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', lineHeight: 1.2 }}>
              {PAGE_TITLES[currentView]?.title || 'Bhumi Abhilekha'}
            </h2>
            {PAGE_TITLES[currentView]?.sub && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', lineHeight: 1.3 }}>
                {PAGE_TITLES[currentView].sub}
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="top-bar-search">
          <Search size={14} color="var(--text-muted)" style={{
            position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            placeholder={
              user?.role === 'customer'
                ? "Search my properties, deed documents..."
                : "Search records, transactions, documents..."
            }
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value) {
                if (user?.role === 'customer') {
                  onNavigate('my-properties');
                } else {
                  onNavigate('records');
                }
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="top-bar-actions">
          {/* Refresh */}
          <button
            className="top-bar-icon-btn"
            onClick={() => window.location.reload()}
            title="Refresh"
            style={{ fontSize: '0.75rem', gap: '0.35rem', width: 'auto', padding: '0 0.65rem', borderRadius: 'var(--radius-md)' }}
          >
            <RefreshCw size={13} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Refresh</span>
          </button>

          {/* Time */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 0.25rem',
          }}>
            <Clock size={12} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>{now}</span>
          </div>

          {/* Notification bell */}
          <button className="top-bar-icon-btn" title="Alerts & Notifications">
            <Bell size={15} />
            <span className="notif-badge">●</span>
          </button>

          {/* Ledger status chip (Admin/Auditor/Officer) */}
          {user?.role !== 'customer' && (
            <div className={`ledger-status-chip`} style={{
              background: isLedgerOk ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
              color: isLedgerOk ? 'var(--color-verified)' : 'var(--color-tampered)',
              borderColor: isLedgerOk ? 'var(--color-verified-border)' : 'var(--color-tampered-border)',
            }}>
              <span className={`pulse-dot${isLedgerOk ? '' : ' danger'}`} />
              {isLedgerOk ? 'Ledger Intact' : 'Chain Broken'}
            </div>
          )}

          {/* Role chip & Quick Switcher */}
          {user && (
            <div style={{ position: 'relative' }}>
              <button
                className="role-chip"
                onClick={() => setRoleOpen(v => !v)}
                style={{
                  background: 'var(--sage-mist)',
                  color: 'var(--forest)',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {switching ? <RefreshCw size={11} className="animate-spin" /> : null}
                <span>{roleMeta.shortLabel}</span>
                <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: roleOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {roleOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.4rem',
                  minWidth: '200px',
                  zIndex: 300,
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'fadeInUp 0.15s ease',
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0.3rem 0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Switch Demo Role
                  </div>
                  {[
                    { role: ROLES.ADMIN, label: 'Administrator', sub: 'Full System Access' },
                    { role: ROLES.OFFICER, label: 'Registration Officer', sub: 'Land Registration' },
                    { role: ROLES.AUDITOR, label: 'Independent Auditor', sub: 'Audit & Verify' },
                    { role: ROLES.CUSTOMER, label: 'Citizen / Customer', sub: 'My Properties' },
                  ].map(({ role, label, sub }) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      style={{
                        display: 'block', width: '100%',
                        padding: '0.45rem 0.65rem', textAlign: 'left',
                        background: user.role === role ? 'var(--sage-mist)' : 'transparent',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-sm)',
                        cursor: user.role === role ? 'default' : 'pointer',
                        marginBottom: '0.15rem',
                      }}
                      onMouseEnter={e => { if (user.role !== role) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = user.role === role ? 'var(--sage-mist)' : 'transparent'; }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{label}</span>
                        {user.role === role && <span style={{ fontSize: '0.65rem', color: 'var(--sage)', fontWeight: 700 }}>Active</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
