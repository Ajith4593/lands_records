import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  PlusCircle,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  MapPin,
  FileText,
  User,
  IndianRupee,
  Layers,
} from 'lucide-react';

export function RegisterLand({ onViewRecord }) {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    price: 4500000,
    paon: 'Flat 402, Shanti Heights',
    saon: 'Wing B',
    street: 'MG Road, Kothrud',
    locality: 'Kothrud',
    town_city: 'Pune',
    district: 'Pune',
    county: 'Maharashtra',
    postcode: 'MH 411038',
    property_type: 'Flat/Apartment',
    duration: 'Freehold',
    new_build: false,
    parcel_id: 'PCL-MH-PUN-084',
    survey_number: 'SRV-894/2A',
    owner_name: 'Rajesh Kumar',
    owner_user_id: '',
    land_area: 1250,
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load customer users if possible
  useEffect(() => {
    api.get('/api/users?role=customer')
      .then(res => {
        setCustomers(res.users || []);
        if (res.users?.length > 0) {
          setFormData(f => ({ ...f, owner_user_id: res.users[0].user_id, owner_name: res.users[0].full_name || res.users[0].username }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      const payload = {
        property: {
          price: Number(formData.price),
          paon: formData.paon,
          saon: formData.saon,
          street: formData.street,
          locality: formData.locality,
          town_city: formData.town_city,
          district: formData.district,
          county: formData.county,
          postcode: formData.postcode,
          property_type: formData.property_type,
          duration: formData.duration,
          new_build: Boolean(formData.new_build),
          transaction_date: new Date(),
        },
        parcel_id: formData.parcel_id,
        survey_number: formData.survey_number,
        owner_name: formData.owner_name,
        owner_user_id: formData.owner_user_id || undefined,
        land_area: Number(formData.land_area),
      };

      const res = await api.post('/api/records', payload);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to register land record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--forest)' }}>
          <PlusCircle size={22} color="var(--forest)" /> Land Record Registration & Digital Sealing
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
          Enter cadastral boundary, ownership details, and property value. Submitting automatically calculates the canonical SHA-256 hash, generates a digital signature, and appends a ledger block.
        </p>
      </div>

      {result && (
        <div className="alert alert-success animate-fade-in" style={{ padding: '1.25rem' }}>
          <CheckCircle2 size={24} color="var(--color-verified)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--color-verified)' }}>
              Land Record Successfully Registered & Signed!
            </h3>
            <p style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.82rem' }}>
              Assigned Record ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{result.land_record_id}</strong> &nbsp;|&nbsp;
              Transaction UUID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{result.transaction_id}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onViewRecord(result.land_record_id)}
              >
                Inspect Registered Record
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setResult(null);
                  setFormData(f => ({ ...f, parcel_id: `PCL-MH-${Math.floor(100 + Math.random()*900)}` }));
                }}
              >
                Register Another Record
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Section 1: Property Location & Address */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--forest)' }}>
            <MapPin size={16} /> 1. Property Location & Cadastral Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Primary Address / Building Name *
              </label>
              <input
                type="text"
                required
                value={formData.paon}
                onChange={e => setFormData({ ...formData, paon: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Secondary Address / Wing / Unit
              </label>
              <input
                type="text"
                value={formData.saon}
                onChange={e => setFormData({ ...formData, saon: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Street / Road *
              </label>
              <input
                type="text"
                required
                value={formData.street}
                onChange={e => setFormData({ ...formData, street: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Locality / Area
              </label>
              <input
                type="text"
                value={formData.locality}
                onChange={e => setFormData({ ...formData, locality: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Town / City *
              </label>
              <input
                type="text"
                required
                value={formData.town_city}
                onChange={e => setFormData({ ...formData, town_city: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Postal Code *
              </label>
              <input
                type="text"
                required
                value={formData.postcode}
                onChange={e => setFormData({ ...formData, postcode: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Cadastral Survey & Ownership */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--forest)' }}>
            <Building size={16} /> 2. Cadastral Survey & Proprietorship
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Cadastral Parcel ID *
              </label>
              <input
                type="text"
                required
                value={formData.parcel_id}
                onChange={e => setFormData({ ...formData, parcel_id: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Survey Reference Number *
              </label>
              <input
                type="text"
                required
                value={formData.survey_number}
                onChange={e => setFormData({ ...formData, survey_number: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Registered Owner Name *
              </label>
              <input
                type="text"
                required
                value={formData.owner_name}
                onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Link to Registered Citizen Account
              </label>
              <select
                value={formData.owner_user_id}
                onChange={e => {
                  const selectedId = e.target.value;
                  const c = customers.find(u => u.user_id === selectedId);
                  setFormData({
                    ...formData,
                    owner_user_id: selectedId,
                    owner_name: c?.full_name || formData.owner_name,
                  });
                }}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'white' }}
              >
                <option value="">-- No Account Link / General Citizen --</option>
                {customers.map(c => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.full_name || c.username} ({c.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Land Area (Sq. Ft) *
              </label>
              <input
                type="number"
                required
                value={formData.land_area}
                onChange={e => setFormData({ ...formData, land_area: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Registered Consideration Value (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
            style={{
              padding: '0.75rem 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Key size={18} />}
            {submitting ? 'Calculating Hash & Signing...' : 'Digitally Sign & Register Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
