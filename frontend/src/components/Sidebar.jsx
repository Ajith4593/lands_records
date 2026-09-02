import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ChevronDown,
  LogOut,
  Zap,
  UserCheck,
} from 'lucide-react';
import { getNavItems, ROLE_METADATA, ROLES } from '../utils/permissions';

const LOGO_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
    <path d="M12 4l2.5 5.5H20l-4.5 3.5 1.5 6L12 16l-5 3 1.5-6L4 9.5h5.5L12 4z"
      fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
  </svg>
);

export function Sidebar({ currentView, setCurrentView }) {
  const { user, logout, login } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async (role) => {
    const creds = {
      administrator: { u: 'admin', p: 'Admin@LandRecords2024' },
      registration_officer: { u: 'officer1', p: 'Officer@2024' },
      auditor: { u: 'auditor1', p: 'Auditor@2024' },
      customer: { u: 'customer1', p: 'Customer@2024' },
    };
    if (creds[role]) {
      try {
        setSwitching(true);
        setSwitchOpen(false);
        await login(creds[role].u, creds[role].p);
        setCurrentView('dashboard');
      } catch (err) {
        console.error('Quick switch error:', err);
      } finally {
        setSwitching(false);
      }
    }
  };

  const navItems = getNavItems(user?.role);
  const roleMeta = ROLE_METADATA[user?.role] || {
    label: user?.role || 'User',
    shortLabel: 'User',
    color: 'var(--sage)',
  };

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <aside className="app-sidebar">
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo-icon" style={{ color: 'var(--forest)' }}>
            {LOGO_SVG}
          </div>
          <div>
            <div className="sidebar-brand-name">Bhumi Abhilekha</div>
            <div className="sidebar-brand-sub">Digital Land Registry</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
          <span className="sidebar-badge" style={{ flex: 1 }}>
            ◈ Quantum-Safe Ledgers
          </span>
          <span style={{
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--gold)',
            background: 'rgba(233,196,106,0.15)',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {roleMeta.shortLabel}
          </span>
        </div>
      </div>

      {/* ── Navigation (Strictly Role-Specific) ── */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{roleMeta.shortLabel} Navigation</span>
        </div>

        {navItems.map(({ id, label, icon: Icon, danger, highlight }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`nav-item${currentView === id ? ' active' : ''}${danger ? ' danger' : ''}`}
            style={highlight ? {
              borderLeft: '3px solid var(--gold)',
              background: currentView === id ? 'var(--sidebar-active)' : 'rgba(233, 196, 106, 0.08)',
            } : {}}
            onClick={() => setCurrentView(id)}
            aria-current={currentView === id ? 'page' : undefined}
          >
            <Icon size={16} color={highlight ? 'var(--gold)' : undefined} />
            <span style={{ flex: 1 }}>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── User Footer & Quick Role Switcher ── */}
      {user && (
        <div style={{ padding: '0 0.5rem 0.5rem' }}>
          <div
            className="sidebar-user"
            onClick={() => setSwitchOpen(v => !v)}
            title="Click to switch account or sign out"
          >
            <div className="sidebar-avatar" style={{ background: roleMeta.color }}>
              {switching ? <Zap size={14} className="animate-spin" /> : userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name || user.username}
              </div>
              <div className="sidebar-user-role" style={{ color: 'var(--gold)' }}>
                {roleMeta.label}
              </div>
            </div>
            <ChevronDown
              size={13}
              color="rgba(255,255,255,0.4)"
              style={{ transition: 'transform 0.2s', transform: switchOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
            />
          </div>

          {/* Switch dropdown */}
          {switchOpen && (
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem',
              marginTop: '0.25rem',
              animation: 'fadeInUp 0.15s ease forwards',
            }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', padding: '0.2rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Switch Demo Role
              </div>
              {[
                { role: ROLES.ADMIN, label: 'Administrator', note: 'Full Control' },
                { role: ROLES.OFFICER, label: 'Reg. Officer', note: 'Registrar' },
                { role: ROLES.AUDITOR, label: 'Auditor', note: 'Verification' },
                { role: ROLES.CUSTOMER, label: 'Customer', note: 'Properties' },
              ].map(({ role, label, note }) => (
                <button
                  key={role}
                  onClick={() => handleQuickSwitch(role)}
                  disabled={user.role === role}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: user.role === role ? 'rgba(255,255,255,0.15)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: user.role === role ? 'default' : 'pointer',
                    marginBottom: '0.1rem',
                  }}
                  onMouseEnter={e => { if (user.role !== role) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = user.role === role ? 'rgba(255,255,255,0.15)' : 'transparent'; }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>{note}</span>
                </button>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                <button
                  id="btn-logout"
                  onClick={logout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent', border: '1px solid transparent',
                    cursor: 'pointer', color: 'rgba(255,100,100,0.9)',
                    fontSize: '0.78rem', fontWeight: 500,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,100,100,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
