import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  History, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function AuditTrail({ onViewRecord }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [recordIdFilter, setRecordIdFilter] = useState('');

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: targetPage,
        limit: 20,
      });
      if (actionFilter) params.append('action', actionFilter);
      if (recordIdFilter) params.append('land_record_id', recordIdFilter);

      const data = await api.get(`/api/audit?${params.toString()}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Append-Only Audit Trail (Feature 8)</h1>
          <p>
            Immutable chronological record of all user, verification, and administrative actions. Enforced insert-only at the database engine level.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => fetchLogs(page)}>
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: '260px' }}>
            <select
              id="select-audit-action"
              className="form-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Action Types</option>
              <option value="RECORD_CREATED">RECORD_CREATED</option>
              <option value="RECORD_VERIFIED">RECORD_VERIFIED</option>
              <option value="DOCUMENT_VERIFIED">DOCUMENT_VERIFIED</option>
              <option value="LEDGER_VERIFIED">LEDGER_VERIFIED</option>
              <option value="TAMPER_DETECTED">TAMPER_DETECTED</option>
              <option value="DEMO_TAMPER_SIMULATED">DEMO_TAMPER_SIMULATED</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              id="input-audit-record-id"
              type="text"
              className="form-input"
              placeholder="Filter by Land Record ID (e.g. LR-000001)"
              value={recordIdFilter}
              onChange={(e) => setRecordIdFilter(e.target.value)}
            />
          </div>

          <button id="btn-filter-audit" type="submit" className="btn btn-primary">
            <Filter size={15} /> Apply Filter
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor & Role</th>
              <th>Land Record ID</th>
              <th>Previous State Hash</th>
              <th>New State Hash</th>
              <th>Signature Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--color-info)', margin: '0 auto 0.5rem auto' }} />
                  <p>Loading Audit Trail from MongoDB...</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.audit_id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: log.action.includes('TAMPER') ? 'var(--color-tampered-bg)' :
                                       log.action.includes('VERIFIED') ? 'var(--color-verified-bg)' : 'var(--color-info-bg)',
                      color: log.action.includes('TAMPER') ? 'var(--color-tampered)' :
                             log.action.includes('VERIFIED') ? 'var(--color-verified)' : 'var(--color-info)',
                      border: `1px solid ${log.action.includes('TAMPER') ? 'var(--color-tampered-border)' :
                                         log.action.includes('VERIFIED') ? 'var(--color-verified-border)' : 'var(--color-info-border)'}`
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_id || 'SYSTEM'}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{log.role || 'system'}</div>
                  </td>
                  <td>
                    {log.land_record_id ? (
                      <span
                        style={{ fontWeight: 600, color: 'var(--color-info)', cursor: 'pointer' }}
                        onClick={() => onViewRecord(log.land_record_id)}
                      >
                        {log.land_record_id}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td>
                    {log.previous_state_hash ? (
                      <span className="hash-pill" style={{ fontSize: '0.7rem' }}>
                        {log.previous_state_hash.slice(0, 16)}...
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {log.new_state_hash ? (
                      <span className="hash-pill" style={{ fontSize: '0.7rem' }}>
                        {log.new_state_hash.slice(0, 16)}...
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {log.signature_status ? (
                      <span className={`badge ${log.signature_status === 'VALID' ? 'badge-verified' : 'badge-tampered'}`}>
                        {log.signature_status}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.85rem' }}>
          Showing {logs.length} of {total.toLocaleString()} total audit events
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => fetchLogs(page - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            className="btn btn-outline btn-sm"
            disabled={logs.length < 20}
            onClick={() => fetchLogs(page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
