import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Lock,
  UserCheck,
  UserX,
  X,
  Mail,
  KeyRound,
} from 'lucide-react';
import { ROLE_METADATA, ROLES } from '../utils/permissions';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'registration_officer',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = '?';
      if (roleFilter) query += `role=${roleFilter}&`;
      if (statusFilter) query += `is_active=${statusFilter}&`;
      if (searchQuery) query += `q=${encodeURIComponent(searchQuery)}&`;

      const data = await api.get(`/api/users${query}`);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Create User ──
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await api.post('/api/users', formData);
      setShowAddModal(false);
      setFormData({ username: '', password: '', full_name: '', email: '', role: 'registration_officer' });
      showToast(`User ${formData.username} created successfully.`);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit User ──
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await api.put(`/api/users/${selectedUser.user_id}`, {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password || undefined,
      });

      if (formData.role !== selectedUser.role) {
        await api.put(`/api/users/${selectedUser.user_id}/role`, { role: formData.role });
      }

      setShowEditModal(false);
      setSelectedUser(null);
      showToast(`User ${selectedUser.username} updated successfully.`);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Status ──
  const handleToggleStatus = async (user) => {
    const actionName = user.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} user ${user.username}?`)) return;

    try {
      await api.put(`/api/users/${user.user_id}/status`, { is_active: !user.is_active });
      showToast(`User ${user.username} ${!user.is_active ? 'activated' : 'deactivated'}.`);
      fetchUsers();
    } catch (err) {
      alert(err.message || `Failed to ${actionName} user`);
    }
  };

  // ── Delete User ──
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanent Action: Are you sure you want to delete user ${user.username}? This will generate a critical audit entry.`)) return;

    try {
      await api.delete(`/api/users/${user.user_id}`);
      showToast(`User ${user.username} deleted.`);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="alert alert-success animate-fade-in" style={{ position: 'sticky', top: '1rem', zIndex: 100 }}>
          <CheckCircle2 size={18} />
          <div>{toastMessage}</div>
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={22} color="var(--forest)" /> System User Management & RBAC
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Manage platform accounts, enforce separation of duties, and provision Officers, Auditors, and Customers.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData({ username: '', password: '', full_name: '', email: '', role: 'registration_officer' });
            setFormError(null);
            setShowAddModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by username, name, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
              }}
            />
          </form>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              background: 'white',
            }}
          >
            <option value="">All Roles</option>
            <option value="administrator">Administrator</option>
            <option value="registration_officer">Registration Officer</option>
            <option value="auditor">Auditor</option>
            <option value="customer">Customer</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              background: 'white',
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated</option>
          </select>

          <button className="btn btn-outline btn-sm" onClick={fetchUsers} title="Refresh list">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading && users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--sage)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading system users...</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger" style={{ margin: '1rem' }}>
            <AlertTriangle size={18} />
            <div>{error}</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID / Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const meta = ROLE_METADATA[u.role] || { label: u.role, color: 'var(--forest)' };
                  return (
                    <tr key={u.user_id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--forest)' }}>
                          {u.username}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {u.user_id}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: '0.82rem' }}>
                        {u.full_name || '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {u.email || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: meta.accentBg || 'rgba(0,0,0,0.06)',
                          color: meta.color,
                          border: `1px solid ${meta.color}40`,
                        }}>
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: u.is_active ? 'var(--color-verified)' : 'var(--color-tampered)',
                        }}>
                          {u.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => openEditModal(u)}
                            title="Edit User"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className={`btn btn-xs ${u.is_active ? 'btn-outline' : 'btn-primary'}`}
                            onClick={() => handleToggleStatus(u)}
                            title={u.is_active ? 'Deactivate User' : 'Activate User'}
                            style={u.is_active ? { color: 'var(--color-warning)' } : {}}
                          >
                            {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                          </button>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            style={{ color: 'var(--color-tampered)', borderColor: 'var(--color-tampered-border)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserPlus size={18} color="var(--forest)" /> Provision New User
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <div>{formError}</div>
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. officer_pune"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ananya Deshmukh"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. ananya@registry.gov.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Password (min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Strong password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Assigned RBAC Role *
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'white' }}
                >
                  <option value="registration_officer">Registration Officer (Create & Sign Records)</option>
                  <option value="auditor">Auditor (Independent Read & Verify)</option>
                  <option value="customer">Customer / Citizen (My Properties & Documents)</option>
                  <option value="administrator">Administrator (Full System Governance)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {showEditModal && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 size={18} color="var(--forest)" /> Edit User: {selectedUser.username}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <div>{formError}</div>
              </div>
            )}

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Change Role
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'white' }}
                >
                  <option value="registration_officer">Registration Officer</option>
                  <option value="auditor">Auditor</option>
                  <option value="customer">Customer / Citizen</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Reset Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
