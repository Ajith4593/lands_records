import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  AlertTriangle,
  ShieldCheck,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Lock,
  Layers,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function SecurityReports({ onVerifyRecord }) {
  const [alerts, setAlerts] = useState([]);
  const [tamperedRecords, setTamperedRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = '?limit=50';
      if (severityFilter) query += `&severity=${severityFilter}`;

      const [alertsData, recordsData, statsData] = await Promise.all([
        api.get(`/api/security/alerts${query}`),
        api.get('/api/records?tamper_status=TAMPERED&limit=20'),
        api.get('/api/security/dashboard'),
      ]);

      setAlerts(alertsData.alerts || []);
      setTamperedRecords(recordsData.records || []);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to load security reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [severityFilter]);

  const handleExportReport = () => {
    const reportContent = `================================================================================
           BHUMI ABHILEKHA — AUDIT & CRYPTOGRAPHIC COMPLIANCE REPORT
================================================================================
Generated: ${new Date().toISOString()}
Platform Version: 2.0.0 (UC-076)
Active Signature Algorithm: ${stats?.active_algorithm || 'ECDSA / PQC Fallback'}
Ledger Integrity: ${stats?.ledger?.status || 'VERIFIED'} (${stats?.ledger?.verified_blocks || 0} blocks verified)

--------------------------------------------------------------------------------
1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Total Ingested Records:      ${stats?.total_records || 0}
Verified Intact Records:     ${stats?.verified || 0}
Tampered / Mismatched:       ${stats?.tampered || 0}
Invalid Digital Signatures:  ${stats?.invalid_signatures || 0}
Total Security Alerts:       ${stats?.security_alerts || 0}
Unresolved Discrepancies:    ${stats?.unresolved_alerts || 0}

--------------------------------------------------------------------------------
2. RECORD DISCREPANCY LOGS
--------------------------------------------------------------------------------
${tamperedRecords.length === 0 ? 'No active record discrepancies found.' : tamperedRecords.map(r => `
- Record ID: ${r.land_record_id}
  Status: ${r.security?.tamper_status}
  Stored Hash: ${r.security?.record_hash}
  Postcode: ${r.property?.postcode}
  Owner: ${r.synthetic_demo?.owner_name}
`).join('\n')}

--------------------------------------------------------------------------------
3. DETECTED SECURITY INCIDENTS (${alerts.length} ALERTS)
--------------------------------------------------------------------------------
${alerts.map(a => `
[${a.severity || 'INFO'}] ${a.title || a.alert_type}
Target: ${a.land_record_id || 'SYSTEM'} | Detected: ${new Date(a.detected_at).toISOString()}
Description: ${a.description}
`).join('\n')}

================================================================================
PROTOTYPE DISCLAIMER:
Prototype system for demonstration purposes only. Not a legally authoritative land registry.
================================================================================
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Compliance_Report_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Export */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--forest)' }}>
            <AlertTriangle size={22} color="#E65100" /> Security, Tamper & Audit Reports
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Auditor incident review, cryptographic hash mismatches, and compliance reporting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleExportReport}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={15} /> Export Audit Report (.txt)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4 stagger">
        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: '#FFEBEE' }}>
            <AlertTriangle size={20} color="var(--color-tampered)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Tampered Records</div>
            <div className="stat-value" style={{ color: 'var(--color-tampered)' }}>{stats?.tampered || 0}</div>
            <div className="stat-sub">Hash pipeline violations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: '#FFF3E0' }}>
            <Lock size={20} color="#E65100" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Signature Failures</div>
            <div className="stat-value" style={{ color: '#E65100' }}>{stats?.invalid_signatures || 0}</div>
            <div className="stat-sub">Failed ECDSA / PQC check</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: 'var(--color-verified-bg)' }}>
            <Layers size={20} color="var(--color-verified)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Ledger Integrity</div>
            <div className="stat-value" style={{ color: 'var(--color-verified)' }}>
              {stats?.ledger?.status || 'VERIFIED'}
            </div>
            <div className="stat-sub">{stats?.ledger?.verified_blocks || 0} blocks intact</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: '#E3F2FD' }}>
            <CheckCircle2 size={20} color="#1565C0" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Total Verified</div>
            <div className="stat-value" style={{ color: '#1565C0' }}>{stats?.verified || 0}</div>
            <div className="stat-sub">100% Cryptographic Match</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter Alerts by Severity:</span>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', background: 'white' }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <button className="btn btn-outline btn-sm" onClick={fetchReports}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Incidents Table */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          Security Alerts & Tamper Audit Logs ({alerts.length})
        </h3>

        {loading && alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--sage)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading security logs...</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger" style={{ margin: '1rem' }}>
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={36} color="var(--color-verified)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--forest)' }}>
              No Security Discrepancies Recorded
            </h3>
            <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              All records and blocks have passed their cryptographic integrity checks.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Incident Title</th>
                  <th>Description</th>
                  <th>Target Record</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.alert_id}>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered-bg)' : 'var(--color-warning-bg)',
                        color: a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered)' : 'var(--color-warning)',
                        border: `1px solid ${a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered-border)' : 'var(--color-warning-border)'}`,
                      }}>
                        {a.severity || 'INFO'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.title || a.alert_type}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.alert_id}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                      {a.description}
                    </td>
                    <td>
                      {a.land_record_id ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem' }}>
                          {a.land_record_id}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Global</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(a.detected_at).toLocaleString()}
                    </td>
                    <td>
                      {a.land_record_id && (
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => onVerifyRecord(a.land_record_id)}
                        >
                          Verify Record
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
