import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Link,
  Link2Off,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function LedgerExplorer({ onViewRecord }) {
  const [blocks, setBlocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchBlocks = async (targetPage = page) => {
    try {
      setLoading(true);
      const data = await api.get(`/api/ledger?page=${targetPage}&limit=15`);
      setBlocks(data.blocks || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error('Failed to fetch ledger blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(1);
  }, []);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const result = await api.get('/api/ledger/verify');
      setVerificationResult(result);
    } catch (err) {
      console.error('Ledger verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const isChainIntact = verificationResult?.status === 'VERIFIED';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Append-Only Ledger Explorer (Feature 4)</h1>
          <p>
            Cryptographically linked transaction blocks. Every title creation and signing event is chained using SHA-256 block hashes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button id="btn-verify-full-chain" className="btn btn-primary" onClick={handleVerifyChain} disabled={verifying}>
            {verifying ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
            <span>{verifying ? 'Verifying Genesis Chain...' : 'Verify Entire Ledger Chain'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div className="card animate-fade-in" style={{
          borderLeft: `5px solid ${isChainIntact ? 'var(--color-verified)' : 'var(--color-tampered)'}`,
          background: isChainIntact ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ color: isChainIntact ? 'var(--color-verified)' : 'var(--color-tampered)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isChainIntact ? <CheckCircle2 size={20} /> : <Link2Off size={20} />}
                {verificationResult.message}
              </h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Verified {verificationResult.verified_blocks} of {verificationResult.total_blocks} sequential blocks from Genesis (0000...0000).
              </p>
            </div>
            <StatusBadge status={isChainIntact ? 'VERIFIED' : 'LEDGER_BROKEN'} />
          </div>
        </div>
      )}

      {/* Blocks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Block #</th>
                <th>Event Type</th>
                <th>Land Record</th>
                <th>Current Block Hash (SHA-256)</th>
                <th>Previous Block Hash</th>
                <th>Actor</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--color-info)', margin: '0 auto 0.5rem auto' }} />
                    <p>Loading Ledger Blocks...</p>
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No ledger blocks found.
                  </td>
                </tr>
              ) : (
                blocks.map((b) => (
                  <tr key={b.block_id}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-info)' }}>
                      #{b.block_id}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                        {b.event_type}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                        onClick={() => onViewRecord(b.land_record_id)}
                      >
                        {b.land_record_id}
                      </span>
                    </td>
                    <td>
                      <div className="hash-pill" style={{ fontSize: '0.725rem' }}>
                        {b.current_hash?.slice(0, 24)}...
                      </div>
                    </td>
                    <td>
                      <div className="hash-pill" style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {b.previous_hash === '0'.repeat(64) ? 'GENESIS (0000...0000)' : `${b.previous_hash?.slice(0, 20)}...`}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {b.actor_id} <span style={{ color: 'var(--text-muted)' }}>({b.actor_role})</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.85rem' }}>
          Showing {blocks.length} of {total.toLocaleString()} total blocks in ledger
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => fetchBlocks(page - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            className="btn btn-outline btn-sm"
            disabled={blocks.length < 15}
            onClick={() => fetchBlocks(page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
