import React, { useState } from 'react';
import { api } from '../api/client';
import { 
  FlaskConical, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  RotateCcw, 
  ArrowRight,
  ShieldAlert,
  Zap,
  FileCheck
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function SecurityTesting({ onVerifyRecord }) {
  const [targetId, setTargetId] = useState('LR-000001');
  const [targetField, setTargetField] = useState('price');
  const [newValue, setNewValue] = useState('999999');
  const [tampering, setTampering] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tamperResponse, setTamperResponse] = useState(null);
  const [resetResponse, setResetResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulateTamper = async (e) => {
    e.preventDefault();
    try {
      setTampering(true);
      setError(null);
      setResetResponse(null);

      // Value formatting: price as number
      const parsedValue = targetField === 'price' ? parseFloat(newValue) : newValue;

      const data = await api.post('/api/admin/demo/tamper', {
        land_record_id: targetId.trim(),
        field: targetField,
        new_value: parsedValue,
      });

      setTamperResponse(data);
    } catch (err) {
      setError(err.message || 'Tamper simulation failed');
    } finally {
      setTampering(false);
    }
  };

  const handleResetRecord = async () => {
    try {
      setResetting(true);
      setError(null);
      const data = await api.post('/api/admin/demo/reset', {
        land_record_id: targetId.trim(),
      });
      setResetResponse(data);
      setTamperResponse(null);
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          <Zap size={14} /> Administrator Only • DEMO_MODE Enforced
        </div>
        <h1>Security Testing & Tamper Simulation Studio (Feature 6)</h1>
        <p>
          Simulate a real-world internal DB breach or unauthorized raw database write. The tool directly mutates a stored document field in MongoDB, strictly bypassing the cryptographic signature pipeline.
        </p>
      </div>

      {/* Control Card */}
      <div className="grid-2">
        <div className="card" style={{ borderLeft: '4px solid var(--color-tampered)' }}>
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} color="var(--color-tampered)" />
              Direct DB Mutation Simulator
            </h3>
            <span className="badge badge-tampered">BYPASS PIPELINE</span>
          </div>

          <form onSubmit={handleSimulateTamper} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tamper-target-id">
                Target Land Record ID
              </label>
              <input
                id="tamper-target-id"
                type="text"
                className="form-input"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tamper-target-field">
                Select Property Field to Mutate
              </label>
              <select
                id="tamper-target-field"
                className="form-select"
                value={targetField}
                onChange={(e) => {
                  setTargetField(e.target.value);
                  if (e.target.value === 'price') setNewValue('999999');
                  else if (e.target.value === 'postcode') setNewValue('SW1A 1AA');
                  else setNewValue('MODIFIED STREET NAME');
                }}
              >
                <option value="price">price (e.g. modify registered sale amount)</option>
                <option value="postcode">postcode (e.g. modify geographic boundary)</option>
                <option value="street">street (e.g. modify title address)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tamper-new-value">
                Tampered Value (Written Directly to MongoDB)
              </label>
              <input
                id="tamper-new-value"
                type="text"
                className="form-input"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                id="btn-simulate-tamper"
                type="submit"
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={tampering}
              >
                {tampering ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                <span>{tampering ? 'Mutating Database...' : 'Simulate Direct Tamper'}</span>
              </button>

              <button
                id="btn-reset-record"
                type="button"
                className="btn btn-outline"
                onClick={handleResetRecord}
                disabled={resetting}
                title="Restore and re-sign record"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* Demo Explanation & Instructions Card */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            <FlaskConical size={18} color="var(--color-pqc)" />
            How this Demonstrates Real Integrity
          </h3>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>
              <strong>Direct DB Mutation:</strong> Modifies the field in the MongoDB <code>land_records</code> document without updating <code>record_hash</code> or generating a new PQC signature.
            </li>
            <li>
              <strong>Genuine Detection:</strong> When you navigate to <strong>Verify Record</strong>, the engine recalculates the SHA-256 hash from current values, observes the mismatch against the stored hash, and detects that the signature is invalid.
            </li>
            <li>
              <strong>Audit Logging:</strong> Logs a <code>DEMO_TAMPER_SIMULATED</code> event in <code>audit_logs</code> and raises a security alert.
            </li>
            <li>
              <strong>Restoration:</strong> Click <strong>Reset</strong> to re-compute the canonical hash, re-sign with PQC, and append a reset block to the ledger.
            </li>
          </ol>
        </div>
      </div>

      {/* Error Output */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--color-tampered-border)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <div>
              <h3 style={{ color: '#ef4444' }}>Operation Failed</h3>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tamper Response Notification */}
      {tamperResponse && (
        <div className="card animate-fade-in" style={{
          borderLeft: '5px solid var(--color-tampered)',
          background: 'rgba(239, 68, 68, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} />
                Direct Tamper Simulation Applied Successfully
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                Field <code>{tamperResponse.field}</code> on record <strong>{tamperResponse.land_record_id}</strong> mutated from <code>{String(tamperResponse.original_value)}</code> to <code>{String(tamperResponse.new_value)}</code>.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Stored SHA-256 hash was preserved untouched. Verification will now genuinely fail.
              </p>
            </div>

            <button
              id="btn-verify-tampered-now"
              className="btn btn-danger"
              onClick={() => onVerifyRecord(tamperResponse.land_record_id)}
            >
              <FileCheck size={16} />
              Verify Record Now (Expect TAMPERED) <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Reset Response Notification */}
      {resetResponse && (
        <div className="card animate-fade-in" style={{
          borderLeft: '5px solid var(--color-verified)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ color: 'var(--color-verified)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} />
                Record Successfully Restored & Re-Signed
              </h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Recomputed canonical hash and signed with {resetResponse.algorithm}. Reset block appended to ledger.
              </p>
            </div>

            <button
              className="btn btn-success"
              onClick={() => onVerifyRecord(resetResponse.land_record_id)}
            >
              Verify Record Now (Expect VERIFIED) <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
