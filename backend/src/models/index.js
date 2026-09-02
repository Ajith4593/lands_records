const mongoose = require('mongoose');

// ── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true, lowercase: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['registration_officer', 'auditor', 'administrator', 'customer'], default: 'registration_officer' },
  full_name: String,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  last_login: Date,
});

// ── Land Record ───────────────────────────────────────────────────────────────
const landRecordSchema = new mongoose.Schema({
  land_record_id: { type: String, unique: true, required: true, index: true },
  transaction_id: { type: String, unique: true, required: true, index: true },

  // Real PPD data
  property: {
    price: { type: Number, required: true },
    transaction_date: { type: Date, required: true },
    postcode: String,
    property_type: String,       // Human label
    property_type_raw: String,   // D/S/T/F/O
    new_build: Boolean,
    duration: String,            // Freehold/Leasehold/Unknown
    duration_raw: String,
    paon: String,
    saon: String,
    street: String,
    locality: String,
    town_city: String,
    district: String,
    county: String,
    ppd_category: String,
    ppd_category_label: String,
    record_status: String,
  },

  // Synthetic demo fields — is_synthetic: true always set (Rule 0.1)
  synthetic_demo: {
    is_synthetic: { type: Boolean, default: true },
    parcel_id: String,
    survey_number: String,
    owner_id: String,
    owner_name: String,
    land_area: Number,
    // Postcode centroid — approximate, labeled as such (Rule 9 from v1)
    latitude: Number,
    longitude: Number,
    location_label: { type: String, default: 'Approximate Location (postcode centroid)' },
    ownership_status: String,
    mortgage_status: String,
    encumbrance_status: String,
    dispute_status: String,
  },

  // Computed security fields — genuinely computed, NOT synthetic
  security: {
    record_hash: String,
    pqc_algorithm: String,       // Exact algorithm that signed this record (Rule 2)
    digital_signature: String,
    public_key: String,
    signature_status: { type: String, enum: ['VALID', 'INVALID', 'PENDING', 'NOT_SIGNED'], default: 'NOT_SIGNED' },
    tamper_status: {
      type: String,
      enum: ['VERIFIED', 'TAMPERED', 'HASH_MISMATCH', 'SIGNATURE_INVALID', 'LEDGER_BROKEN', 'PENDING_VERIFICATION', 'CANCELED', 'DISPUTED'],
      default: 'PENDING_VERIFICATION'
    },
    signed_at: Date,
    verified_at: Date,
    key_version: { type: Number, default: 1 },
    risk_score: { type: Number, default: 0 },
    risk_band: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    risk_indicators: [{ rule: String, points: Number, description: String }],
  },

  // Deep Learning Fraud & Anomaly Detection Model Results
  deep_learning: {
    classification: { type: String, enum: ['VALID', 'SUSPICIOUS', 'FRAUD'], default: 'VALID' },
    confidence: { type: Number, default: 95.0 },
    anomaly_score: { type: Number, default: 0 },
    reconstruction_mse: { type: Number, default: 0 },
    probabilities: {
      valid: { type: Number, default: 0.95 },
      suspicious: { type: Number, default: 0.04 },
      fraud: { type: Number, default: 0.01 },
    },
    anomaly_flags: [String],
    model_version: { type: String, default: '2.1.0-deep-pqc' },
    model_architecture: { type: String, default: 'Deep-MLP-Autoencoder-Hybrid' },
    evaluated_at: { type: Date, default: Date.now },
  },

  owner_user_id: { type: String, index: true },  // Customer ownership linkage
  created_by: String,
  verified_by: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

landRecordSchema.index({ 'property.postcode': 1 });
landRecordSchema.index({ 'property.town_city': 1 });
landRecordSchema.index({ 'security.tamper_status': 1 });

// ── Ledger Block (append-only) ────────────────────────────────────────────────
const ledgerBlockSchema = new mongoose.Schema({
  block_id: { type: Number, unique: true, required: true },
  land_record_id: { type: String, required: true, index: true },
  transaction_id: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  event_type: { type: String, required: true },
  record_hash: { type: String, required: true },
  previous_hash: { type: String, required: true },
  current_hash: { type: String, required: true },
  digital_signature: String,
  actor_id: String,
  actor_role: String,
  is_demo_action: { type: Boolean, default: false },
  deep_learning: {
    classification: String,
    anomaly_score: Number,
  },
  notes: String,
}, { timestamps: false });

// Enforce append-only at ODM layer (Rule 0.3)
const rejectMutation = function(next) {
  const err = new Error('Append-only collection: updates and deletions are strictly prohibited on ledger_blocks.');
  err.name = 'AppendOnlyViolationError';
  return next(err);
};
ledgerBlockSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete', 'findOneAndRemove'], rejectMutation);

// ── Audit Log (append-only) ───────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  audit_id: { type: String, unique: true, required: true },
  user_id: String,
  role: String,
  action: { type: String, required: true },
  land_record_id: { type: String, index: true },
  timestamp: { type: Date, default: Date.now },
  ip_address: String,
  previous_state_hash: String,
  new_state_hash: String,
  signature_status: String,
  details: mongoose.Schema.Types.Mixed,
  is_demo_action: { type: Boolean, default: false },
}, { timestamps: false });

// Enforce append-only at ODM layer (Rule 0.3)
const rejectAuditMutation = function(next) {
  const err = new Error('Append-only collection: updates and deletions are strictly prohibited on audit_logs.');
  err.name = 'AppendOnlyViolationError';
  return next(err);
};
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete', 'findOneAndRemove'], rejectAuditMutation);

// ── Document ──────────────────────────────────────────────────────────────────
const documentSchema = new mongoose.Schema({
  document_id: { type: String, unique: true, required: true },
  land_record_id: { type: String, required: true, index: true },     // resolved internal ID
  reference_id: { type: String, required: true },  // user-supplied explicit reference (Rule 7)
  filename: String,
  file_type: String,
  file_size_bytes: Number,
  document_hash: String,
  uploaded_by: String,
  uploaded_at: { type: Date, default: Date.now },
  verification_result: { type: String, enum: ['AUTHENTIC', 'SUSPICIOUS', 'PENDING'] },
  is_synthetic: { type: Boolean, default: false },
  verification_detail: mongoose.Schema.Types.Mixed,
}, { timestamps: false });

// ── Security Alert ─────────────────────────────────────────────────────────────
const securityAlertSchema = new mongoose.Schema({
  alert_id: { type: String, unique: true, required: true },
  land_record_id: String,
  alert_type: String,
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  title: String,
  description: String,
  detected_at: { type: Date, default: Date.now },
  is_resolved: { type: Boolean, default: false },
  resolved_at: Date,
  is_demo_action: { type: Boolean, default: false },
  risk_indicators: mongoose.Schema.Types.Mixed,
}, { timestamps: false });

module.exports = {
  User: mongoose.model('User', userSchema),
  LandRecord: mongoose.model('LandRecord', landRecordSchema),
  LedgerBlock: mongoose.model('LedgerBlock', ledgerBlockSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Document: mongoose.model('Document', documentSchema),
  SecurityAlert: mongoose.model('SecurityAlert', securityAlertSchema),
};
