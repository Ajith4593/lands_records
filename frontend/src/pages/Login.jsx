import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  ShieldCheck, Lock, User, KeyRound, AlertCircle, RefreshCw,
  Eye, EyeOff, Zap, UserPlus, LogIn, Mail, CheckCircle2
} from 'lucide-react';

const PRESETS = [
  { u: 'admin',     p: 'Admin@LandRecords2024', role: 'Administrator', cls: 'admin',   note: 'Full Access + User Governance & Lab' },
  { u: 'officer1',  p: 'Officer@2024',          role: 'Reg. Officer',  cls: 'officer', note: 'Create, Sign & Register Land Deeds' },
  { u: 'auditor1',  p: 'Auditor@2024',          role: 'Auditor',       cls: 'auditor', note: 'Inspect Hashes, Ledger & Audit Trail' },
  { u: 'customer1', p: 'Customer@2024',         role: 'Customer',      cls: 'customer', note: 'View Owned Properties & Deeds' },
];

export function Login({ onLoginSuccess }) {
  const { login, checkSession } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@LandRecords2024');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Registration state
  const [regData, setRegData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'customer',
  });
  const [regSuccess, setRegSuccess] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(username, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/auth/register', regData);
      setRegSuccess(res.message || 'Registration successful!');
      // Check session to update context user state
      await checkSession();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Government Seal Header */}
        <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--forest)',
            color: 'white',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)',
          }}>
            <ShieldCheck size={38} />
          </div>
          <h1 style={{ color: 'var(--forest)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Bhumi Abhilekha — Land Registry Portal
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Quantum-Safe Multi-Role Access Control · UC-076 · Server-Side Session Auth
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
        }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: tab === 'login' ? 'white' : 'transparent',
              color: tab === 'login' ? 'var(--forest)' : 'var(--text-secondary)',
              boxShadow: tab === 'login' ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: tab === 'register' ? 'white' : 'transparent',
              color: tab === 'register' ? 'var(--forest)' : 'var(--text-secondary)',
              boxShadow: tab === 'register' ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={15} /> Citizen Registration
          </button>
        </div>

        {/* Main Card */}
        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-strong)' }}>

          {/* Green accent top band */}
          <div style={{
            height: 4, background: 'var(--forest)',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            margin: '-2rem -2rem 1.5rem -2rem',
          }} />

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {regSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{regSuccess}</span>
            </div>
          )}

          {/* ── Sign In Form ── */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-username">Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="input-username"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                  <User
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="input-password"
                    type={showPwd ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: '2.4rem', paddingRight: '2.4rem' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <KeyRound
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    style={{
                      position: 'absolute', right: '0.8rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: 0
                    }}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.25rem' }}
                disabled={loading}
              >
                {loading
                  ? <><RefreshCw size={16} className="animate-spin" /> Authenticating Session...</>
                  : <><Lock size={16} /> Sign In to Registry</>
                }
              </button>
            </form>
          )}

          {/* ── Real-Time Self-Registration Form ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    value={regData.full_name}
                    onChange={e => setRegData({ ...regData, full_name: e.target.value })}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="e.g. ramesh_patel"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    value={regData.username}
                    onChange={e => setRegData({ ...regData, username: e.target.value })}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@example.com"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    value={regData.email}
                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                  />
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Create Password (min 6 chars) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Choose a secure password"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem', paddingRight: '2.4rem' }}
                    value={regData.password}
                    onChange={e => setRegData({ ...regData, password: e.target.value })}
                  />
                  <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.35rem' }}
                disabled={loading}
              >
                {loading
                  ? <><RefreshCw size={16} className="animate-spin" /> Creating Account & Session...</>
                  : <><UserPlus size={16} /> Register & Enter Dashboard</>
                }
              </button>
            </form>
          )}

          {/* Security tech note */}
          <div style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ color: 'var(--pine)', fontWeight: 600 }}>ℹ</span>&nbsp;
            Argon2id password hashing · MongoDB session store · httpOnly cookie · Strict RBAC
          </div>
        </div>

        {/* Evaluator Quick Presets (4 Roles) */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <p className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: '0.75rem' }}>
            <Zap size={14} color="var(--gold-deep)" />
            Evaluator One-Click 4-Role Presets
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {PRESETS.map(({ u, p, role, cls, note }) => (
              <button
                key={u}
                id={`preset-${u}`}
                type="button"
                onClick={() => {
                  setTab('login');
                  setUsername(u);
                  setPassword(p);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: username === u && tab === 'login' ? 'var(--sage-mist)' : 'var(--bg-subtle)',
                  border: `1px solid ${username === u && tab === 'login' ? 'var(--color-verified-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={13} color="var(--forest)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                      {u}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.7rem', margin: '0.1rem 0 0 1.2rem', color: 'var(--text-muted)' }}>{note}</p>
                </div>
                <span className={`role-pill ${cls}`} style={{ fontSize: '0.6rem', padding: '0.12rem 0.45rem' }}>{role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
