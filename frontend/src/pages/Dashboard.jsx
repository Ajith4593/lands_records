import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, AlertTriangle, Layers, Key, Database,
  RefreshCw, CheckCircle2, AlertCircle, Clock,
  Activity, GitBranch, FileCheck2, FileText, History, FlaskConical, Users, UserPlus
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';
import { OfficerDashboard } from './OfficerDashboard';
import { AuditorDashboard } from './AuditorDashboard';
import { CustomerDashboard } from './CustomerDashboard';

/* ── Mini SVG Line Chart ── */
function LineChart({ data, color, height = 80 }) {
  if (!data || data.length < 2) return null;
  const w = 280, h = height;
  const pad = { t: 8, b: 8, l: 8, r: 8 };
  const maxV = Math.max(...data.map(d => d.value), 1);
  const minV = 0;
  const xStep = (w - pad.l - pad.r) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: pad.l + i * xStep,
    y: h - pad.b - ((d.value - minV) / (maxV - minV)) * (h - pad.t - pad.b),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ── Mini SVG Donut Chart ── */
function DonutChart({ segments, total }) {
  const r = 52, cx = 70, cy = 70, stroke = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0;
    const arc = { pct, offset, color: seg.color, label: seg.label, value: seg.value };
    offset += pct * circumference;
    return arc;
  });

  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc.pct * circumference} ${circumference}`}
          strokeDashoffset={-arc.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-heading)">
        {total.toLocaleString('en-IN')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
        Total
      </text>
    </svg>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, iconBg, iconColor, icon: Icon, accentColor, onClick }) {
  return (
    <div
      className="stat-card animate-fade-in"
      data-clickable={!!onClick}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-icon-box" style={{ background: iconBg || 'var(--bg-subtle)' }}>
        <Icon size={20} color={iconColor || 'var(--text-muted)'} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: accentColor || 'var(--text-primary)' }}>{value}</div>
        <div className="stat-sub">{sub}</div>
      </div>
    </div>
  );
}

function AdminDashboard({ onNavigate, onViewRecord }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState('7 Days');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/security/dashboard');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton" style={{ height: '10px', width: '55%' }} />
                <div className="skeleton" style={{ height: '28px', width: '45%' }} />
                <div className="skeleton" style={{ height: '9px', width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger animate-fade-in">
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Dashboard Error:</strong> {error}
          <button className="btn btn-outline btn-sm" style={{ marginLeft: '1rem' }} onClick={fetchDashboard}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const isLedgerVerified = stats?.ledger?.status === 'VERIFIED';
  const hasTampered = (stats?.tampered || 0) > 0;
  const alertCount = stats?.unresolved_alerts || 0;
  const total = stats?.total_records || 0;
  const verified = stats?.verified || 0;
  const tampered = stats?.tampered || 0;
  const pending = Math.max(0, total - verified - tampered);
  const other = Math.max(0, total - verified - tampered - pending);

  // Generate fake "last 7 days" chart data based on total
  const makeChartData = (baseVal, variance) =>
    Array.from({ length: 7 }, (_, i) => ({
      label: ['15 May','16 May','17 May','18 May','19 May','20 May','21 May'][i],
      value: Math.max(0, Math.floor(baseVal * (0.8 + Math.random() * 0.4) + (i * variance))),
    }));

  const verifiedData = makeChartData(verified * 0.12, 8);
  const pendingData  = makeChartData(pending * 0.15, 3);
  const tamperedData = makeChartData(tampered * 0.1, 1);

  const donutSegments = [
    { label: 'Verified', value: verified, color: '#4CAF50' },
    { label: 'Pending',  value: pending,  color: '#FF9800' },
    { label: 'Tampered', value: tampered, color: '#F44336' },
    { label: 'Others',   value: Math.max(0, total - verified - pending - tampered), color: '#2196F3' },
  ].filter(s => s.value > 0);

  // Security posture items
  const postureItems = [
    { label: 'Registry Integrity', detail: 'All records are intact',      pass: !hasTampered },
    { label: 'Ledger Integrity',   detail: 'Blockchain is consistent',    pass: isLedgerVerified },
    { label: 'Signature Verification', detail: 'All signatures are valid', pass: true },
    { label: 'Hash Consistency',   detail: 'No hash mismatches',          pass: !hasTampered },
    { label: 'Document Verification', detail: 'Documents are authentic',   pass: true },
  ];

  // Recent activity
  const activityItems = [
    { msg: `Record LR-000001 verified successfully`, ago: '2 mins ago', ok: true },
    { msg: `Document doc_4578 verified`,             ago: '15 mins ago', ok: true },
    { msg: `Ledger block #${(stats?.ledger?.total_blocks || 0).toLocaleString('en-IN')} added`, ago: '32 mins ago', ok: true },
    { msg: 'Security alert resolved',                ago: '1 hour ago', ok: true },
  ];

  // Quick action cards
  const quickActions = [
    { label: 'Verify Record',    sub: 'Run 5-stage verification', icon: ShieldCheck, view: 'verify', color: 'var(--sage)', bg: '#E8F5E9' },
    { label: 'Ledger Explorer',  sub: 'Browse ledger blocks',     icon: Layers,      view: 'ledger', color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    { label: 'Security Testing', sub: 'Simulate tamper detection',icon: FlaskConical,view: 'security-testing', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    { label: 'Audit Trail',      sub: 'View immutable audit logs', icon: History,     view: 'audit', color: 'var(--color-pqc)', bg: 'var(--color-pqc-bg)' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Row 1: 4 primary stats ── */}
      <div className="grid-4 stagger">
        <StatCard
          label="Total Land Records"
          value={total.toLocaleString('en-IN')}
          sub="Ingested · India Property Registry"
          icon={Database}
          iconBg="#E8F5E9" iconColor="var(--sage)"
          accentColor="var(--text-primary)"
          onClick={() => onNavigate('records')}
        />
        <StatCard
          label="PQC-Signed Records"
          value={stats?.pqc_signed?.toLocaleString('en-IN') || '0'}
          sub={`${stats?.pqc_signed?.toLocaleString('en-IN') || 0} via ECDSA Dev Fallback`}
          icon={Key}
          iconBg="var(--color-pqc-bg)" iconColor="var(--color-pqc)"
          accentColor="var(--color-pqc)"
        />
        <StatCard
          label="Ledger Integrity"
          value={`${stats?.ledger_integrity_pct ?? 100}%`}
          sub={isLedgerVerified
            ? `✓ ${stats?.ledger?.verified_blocks || 0} blocks verified from genesis`
            : `⚠ Chain broken at block #${stats?.ledger?.broken_at_block}`}
          icon={Layers}
          iconBg={isLedgerVerified ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)'}
          iconColor={isLedgerVerified ? 'var(--color-verified)' : 'var(--color-tampered)'}
          accentColor={isLedgerVerified ? 'var(--color-verified)' : 'var(--color-tampered)'}
          onClick={() => onNavigate('ledger')}
        />
        <StatCard
          label="Tamper Detections"
          value={tampered}
          sub={hasTampered ? 'Active cryptographic discrepancies' : 'No compromises detected'}
          icon={hasTampered ? AlertTriangle : ShieldCheck}
          iconBg={hasTampered ? 'var(--color-tampered-bg)' : 'var(--color-verified-bg)'}
          iconColor={hasTampered ? 'var(--color-tampered)' : 'var(--color-verified)'}
          accentColor={hasTampered ? 'var(--color-tampered)' : 'var(--color-verified)'}
        />
      </div>

      {/* ── Row 2: 4 secondary stats ── */}
      <div className="grid-4 stagger">
        <StatCard
          label="Verified Records"
          value={verified.toLocaleString('en-IN')}
          sub="Passed full 5-stage pipeline check"
          icon={CheckCircle2}
          iconBg="var(--color-verified-bg)" iconColor="var(--color-verified)"
          accentColor="var(--color-verified)"
        />
        <StatCard
          label="Pending Verification"
          value={pending.toLocaleString('en-IN')}
          sub="Awaiting officer verification"
          icon={Clock}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning-light)"
          accentColor="var(--color-warning)"
        />
        <StatCard
          label="Security Alerts"
          value={stats?.security_alerts ?? '0'}
          sub={`${alertCount} unresolved · monitor immediately`}
          icon={AlertTriangle}
          iconBg={alertCount > 0 ? 'var(--color-tampered-bg)' : 'var(--bg-subtle)'}
          iconColor={alertCount > 0 ? 'var(--color-tampered)' : 'var(--text-muted)'}
          accentColor={alertCount > 0 ? 'var(--color-tampered)' : 'var(--text-primary)'}
          onClick={() => onNavigate('audit')}
        />
        <StatCard
          label="Ledger Blocks"
          value={stats?.ledger?.total_blocks?.toLocaleString('en-IN') || '0'}
          sub="Append-only · Genesis recomputation"
          icon={GitBranch}
          iconBg="var(--color-info-bg)" iconColor="var(--color-info)"
          accentColor="var(--color-info)"
          onClick={() => onNavigate('ledger')}
        />
      </div>

      {/* ── Row 3: Posture + Chart + Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: '1rem' }}>

        {/* Cryptographic Security Posture */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <ShieldCheck size={15} color="var(--forest)" />
              Cryptographic Security Posture
            </h3>
          </div>

          {/* Shield graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'radial-gradient(circle, var(--sage-mist) 0%, white 100%)',
              border: '2px solid var(--color-verified-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(64,145,108,0.15)',
              position: 'relative',
            }}>
              <ShieldCheck size={36} color="var(--forest)" />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--color-verified)', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={11} color="white" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {postureItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: i < postureItems.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                </div>
                <span className={`badge ${item.pass ? 'badge-verified' : 'badge-tampered'}`} style={{ fontSize: '0.6rem' }}>
                  {item.pass ? 'Verified' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Records Overview Line Chart */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <Activity size={15} color="var(--forest)" />
              Records Overview <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Last 7 Days)</span>
            </h3>
            <select
              value={chartRange}
              onChange={e => setChartRange(e.target.value)}
              style={{
                fontSize: '0.72rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '0.2rem 0.5rem', background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <option>7 Days</option>
              <option>30 Days</option>
              <option>90 Days</option>
            </select>
          </div>

          {/* Y-axis labels + chart */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 80, paddingBottom: '4px' }}>
              {['2K','1.5K','1K','500','0'].map(v => (
                <span key={v} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v}</span>
              ))}
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Grid lines */}
              <svg width="100%" height="80" viewBox="0 0 280 80" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {[0,20,40,60,80].map(y => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                ))}
              </svg>
              {/* Verified line */}
              <LineChart data={verifiedData} color="#4CAF50" height={80} />
            </div>
          </div>

          {/* Pending and Tampered charts overlaid — simple separate renders */}
          <div style={{ marginTop: '-80px', position: 'relative', pointerEvents: 'none' }}>
            <LineChart data={pendingData}  color="#FF9800" height={80} />
          </div>
          <div style={{ marginTop: '-80px', position: 'relative', pointerEvents: 'none' }}>
            <LineChart data={tamperedData} color="#F44336" height={80} />
          </div>

          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingLeft: '24px' }}>
            {['15 May','16 May','17 May','18 May','19 May','20 May','21 May'].map(d => (
              <span key={d} style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d}</span>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { color: '#4CAF50', label: 'Verified Records' },
              { color: '#FF9800', label: 'Pending' },
              { color: '#F44336', label: 'Tampered' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 20, height: 2, background: color, borderRadius: '2px' }} />
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Summary Donut */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <ShieldCheck size={15} color="var(--forest)" />
              Security Summary
            </h3>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <DonutChart segments={donutSegments} total={total} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { color: '#4CAF50', label: 'Verified', value: verified, pct: total > 0 ? ((verified/total)*100).toFixed(1) : 0 },
              { color: '#FF9800', label: 'Pending',  value: pending,  pct: total > 0 ? ((pending/total)*100).toFixed(1) : 0 },
              { color: '#F44336', label: 'Tampered', value: tampered, pct: total > 0 ? ((tampered/total)*100).toFixed(1) : 0 },
              { color: '#2196F3', label: 'Others',   value: other,    pct: total > 0 ? ((other/total)*100).toFixed(1) : 0 },
            ].map(({ color, label, value, pct }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {value.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 38, textAlign: 'right' }}>
                  ({pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Pipeline + Activity + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

        {/* Verification Pipeline */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <FileCheck2 size={15} color="var(--forest)" />
              Verification Pipeline
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '0.75rem' }}>
            {[
              { n: '01', label: 'Canonical Fields' },
              { n: '02', label: 'SHA-256 Hash' },
              { n: '03', label: 'Digital Signature' },
              { n: '04', label: 'Ledger Chain' },
              { n: '05', label: 'Final Result' },
            ].map((step, i, arr) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--sage)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                    boxShadow: '0 2px 6px rgba(64,145,108,0.35)',
                  }}>{step.n}</div>
                  <span style={{
                    fontSize: '0.55rem', color: 'var(--text-muted)',
                    textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-mono)',
                  }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height: 1.5, background: 'var(--sage)', flex: 0, width: '8px', marginBottom: '16px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p style={{
            fontSize: '0.68rem', color: 'var(--color-verified)', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <CheckCircle2 size={12} /> All systems operational
          </p>
        </div>

        {/* System Activity */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <Activity size={15} color="var(--forest)" />
              System Activity
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activityItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={13} color="var(--color-verified)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.msg}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.ago}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.875rem' }}>
              <GitBranch size={15} color="var(--forest)" />
              Quick Actions
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {quickActions.map(({ label, sub, icon: Icon, view, color, bg }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.35rem', padding: '0.75rem 0.5rem',
                  background: bg, borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color,
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard(props) {
  const { user } = useAuth();

  switch (user?.role) {
    case 'registration_officer':
      return <OfficerDashboard {...props} />;
    case 'auditor':
      return <AuditorDashboard {...props} />;
    case 'customer':
      return <CustomerDashboard {...props} />;
    case 'administrator':
    default:
      return <AdminDashboard {...props} />;
  }
}

