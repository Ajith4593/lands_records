import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Database,
  FileCheck2,
  FileText,
  Layers,
  History,
  FlaskConical,
  LogOut,
  UserCircle,
  AlertOctagon,
  ChevronDown,
  Zap,
  Menu,
  X,
} from 'lucide-react';

export function Header({ currentView, setCurrentView }) {
  const { user, logout, login } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async (role) => {
    const creds = {
      administrator: { u: 'admin', p: 'Admin@LandRecords2024' },
      registration_officer: { u: 'officer1', p: 'Officer@2024' },
      auditor: { u: 'auditor1', p: 'Auditor@2024' },
    };
    if (creds[role]) {
      try {
        setSwitching(true);
        setSwitchOpen(false);
        await login(creds[role].u, creds[role].p);
      } catch (err) {
        console.error('Quick switch error:', err);
      } finally {
        setSwitching(false);
      }
    }
  };

  const roleLabels = {
    administrator: 'Administrator',
    registration_officer: 'Reg. Officer',
    auditor: 'Auditor',
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
    { id: 'records', label: 'Records', icon: Database },
    { id: 'verify', label: 'Verify', icon: FileCheck2 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'ledger', label: 'Ledger', icon: Layers },
    { id: 'audit', label: 'Audit', icon: History },
  ];

  if (user?.role === 'administrator') {
    navItems.push({ id: 'security-testing', label: 'Security Lab', icon: FlaskConical, danger: true });
  }

  const roleClass = user?.role === 'administrator'
    ? 'admin'
    : user?.role === 'registration_officer'
      ? 'officer'
      : 'auditor';

  return (
    <>
      {/* ── Prototype Disclaimer Banner ── */}
      <aside aria-label="Prototype Notice" className="disclaimer-banner">
        <AlertOctagon size={13} />
        <span>
          <strong>PROTOTYPE:</strong> Bhumi Abhilekha — Digital Land Records &nbsp;•&nbsp;
          <span style={{ opacity: 0.8 }}>భూమి అభిలేఖ — డిజిటల్ భూ రిజిస్ట్రీ •&nbsp;  भूमि अभिलेख — डिजिटल भूमि रजिस्ट्री</span>
        </span>
      </aside>

      {/* ── Main Header ── */}
      <header className="app-header">
        <div className="header-container">

          {/* Brand */}
          <div
            className="brand-logo"
            onClick={() => setCurrentView('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setCurrentView('dashboard')}
          >
            <div style={{
              width: 38, height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'var(--forest)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldCheck size={22} color="white" />
            </div>
            <div className="brand-title">
              <span>Bhumi Abhilekha</span>
              <span className="brand-subtitle">Land Records & Integrity</span>
            </div>
          </div>

          {/* Nav */}
          {user && (
            <nav className="nav-links" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    className={`nav-item${isActive ? ' active' : ''}${item.danger ? ' danger' : ''}`}
                    onClick={() => setCurrentView(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right: role + actions */}
          <div className="user-badge-group">
            {user ? (
              <>
                {/* Role pill with quick-switch dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className={`role-pill ${roleClass}`}
                    onClick={() => setSwitchOpen(v => !v)}
                    title="Click to switch demo account"
                    style={{ cursor: 'pointer' }}
                    disabled={switching}
                  >
                    {switching
                      ? <Zap size={11} className="animate-spin" />
                      : <UserCircle size={12} />
                    }
                    {roleLabels[user.role] || user.role}
                    <ChevronDown
                      size={11}
                      style={{
                        opacity: 0.7,
                        transition: 'transform 0.2s',
                        transform: switchOpen ? 'rotate(180deg)' : 'none'
                      }}
                    />
                  </button>

                  {switchOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.4rem',
                      minWidth: '200px',
                      zIndex: 200,
                      boxShadow: 'var(--shadow-lg)',
                      animation: 'fadeInUp 0.15s ease forwards',
                    }}>
                      <p style={{
                        fontSize: '0.65rem', color: 'var(--text-muted)',
                        padding: '0.3rem 0.5rem',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        fontFamily: 'var(--font-mono)',
                        borderBottom: '1px solid var(--border)',
                        marginBottom: '0.3rem',
                      }}>
                        Switch Demo Account
                      </p>
                      {[
                        { role: 'administrator', label: 'Administrator', cls: 'admin', note: 'Full Access' },
                        { role: 'registration_officer', label: 'Reg. Officer', cls: 'officer', note: 'Sign & Verify' },
                        { role: 'auditor', label: 'Auditor', cls: 'auditor', note: 'Read Only' },
                      ].map(({ role, label, cls, note }) => (
                        <button
                          key={role}
                          onClick={() => handleQuickSwitch(role)}
                          disabled={user.role === role}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: user.role === role ? 'var(--sage-mist)' : 'transparent',
                            border: '1px solid transparent',
                            cursor: user.role === role ? 'default' : 'pointer',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (user.role !== role) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = user.role === role ? 'var(--sage-mist)' : 'transparent'; }}
                        >
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>
                          <span className={`role-pill ${cls}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{note}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  id="btn-logout"
                  className="btn btn-outline btn-sm"
                  onClick={logout}
                  title="Sign out of session"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                id="btn-login-header"
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentView('login')}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
