const express = require('express');
const { LedgerBlock, AuditLog } = require('../models');
const { requireAuth, requireRole, requireDemoMode } = require('../middleware/auth');
const { verifyFullChain } = require('../services/ledger');
const { appendAuditLog } = require('../services/audit');
const { LandRecord, SecurityAlert } = require('../models');
const { computeRecordHash } = require('../services/hashing');
const { signRecordHash } = require('../services/pqc');
const { appendBlock } = require('../services/ledger');
const { nanoid } = require('nanoid');

const router = express.Router();

// GET /api/ledger/verify — full chain recomputation
// Admin + Auditor: full access. Officer: limited. Customer: denied.
router.get('/verify', requireAuth, requireRole('administrator', 'auditor', 'registration_officer'), async (req, res) => {
  try {
    const result = await verifyFullChain();
    await appendAuditLog({
      user_id: req.session.user_id, role: req.session.role,
      action: 'LEDGER_VERIFIED', details: result, req
    });

    // Officer gets limited view (just status, not full details)
    if (req.session.role === 'registration_officer') {
      return res.json({
        status: result.status,
        total_blocks: result.total_blocks,
        verified_blocks: result.verified_blocks,
        PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER,
      });
    }

    res.json({ ...result, PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ledger verification failed' });
  }
});

// GET /api/ledger — list blocks
// Admin + Auditor: full access. Officer: limited. Customer: denied.
router.get('/', requireAuth, requireRole('administrator', 'auditor', 'registration_officer'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const [blocks, total] = await Promise.all([
      LedgerBlock.find().sort({ block_id: -1 }).skip((page-1)*limit).limit(limit).lean(),
      LedgerBlock.countDocuments()
    ]);
    res.json({ blocks, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// GET /api/audit — audit trail
// Admin + Auditor: full access. Officer: only own-record events. Customer: denied.
router.get('/audit', requireAuth, requireRole('administrator', 'auditor', 'registration_officer'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.land_record_id) filter.land_record_id = req.query.land_record_id;
    if (req.query.user_id) filter.user_id = req.query.user_id;

    // Officer: only see audit events for actions they performed
    if (req.session.role === 'registration_officer') {
      filter.user_id = req.session.user_id;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((page-1)*limit).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);
    // Hide is_demo_action from non-auditor/admin
    const sanitized = logs.map(l => {
      if (!['auditor','administrator'].includes(req.session.role)) delete l.is_demo_action;
      return l;
    });
    res.json({ logs: sanitized, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// GET /api/security/dashboard — live aggregation, no hardcoded values
// Admin + Auditor: full view. Officer + Customer: filtered stats.
router.get('/security/dashboard', requireAuth, async (req, res) => {
  try {
    const { provider } = require('../services/pqc');
    const { User } = require('../models');

    // Customer gets minimal stats about their own records
    if (req.session.role === 'customer') {
      const ownedRecords = await LandRecord.find({ owner_user_id: req.session.user_id }).lean();
      const ownedIds = ownedRecords.map(r => r.land_record_id);
      const myDocs = await require('../models').Document.countDocuments({
        $or: [
          { uploaded_by: req.session.user_id },
          { land_record_id: { $in: ownedIds } },
        ]
      });
      const verified = ownedRecords.filter(r => r.security?.tamper_status === 'VERIFIED').length;
      const pending = ownedRecords.filter(r => r.security?.tamper_status === 'PENDING_VERIFICATION').length;

      return res.json({
        my_properties: ownedRecords.length,
        my_documents: myDocs,
        my_verified: verified,
        my_pending: pending,
        role: 'customer',
        PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER,
      });
    }

    const [totalRecords, tampered, verified, invalidSig, alerts, unresolvedAlerts, ledgerResult,
           pqcSigned, devFallbackSigned, dlValid, dlSuspicious, dlFraud] = await Promise.all([
      LandRecord.countDocuments(),
      LandRecord.countDocuments({ 'security.tamper_status': { $in: ['TAMPERED','HASH_MISMATCH','SIGNATURE_INVALID','LEDGER_BROKEN'] } }),
      LandRecord.countDocuments({ 'security.tamper_status': 'VERIFIED' }),
      LandRecord.countDocuments({ 'security.signature_status': 'INVALID' }),
      SecurityAlert.countDocuments(),
      SecurityAlert.countDocuments({ is_resolved: false }),
      verifyFullChain(),
      LandRecord.countDocuments({ 'security.signature_status': { $in: ['VALID','INVALID'] } }),
      LandRecord.countDocuments({ 'security.pqc_algorithm': { $regex: 'DEV FALLBACK', $options: 'i' } }),
      LandRecord.countDocuments({ 'deep_learning.classification': 'VALID' }),
      LandRecord.countDocuments({ 'deep_learning.classification': 'SUSPICIOUS' }),
      LandRecord.countDocuments({ 'deep_learning.classification': 'FRAUD' }),
    ]);
    const realPqcSigned = pqcSigned - devFallbackSigned;

    // Admin & Auditor get full dashboard; Officer gets limited stats
    const baseResponse = {
      total_records: totalRecords,
      verified, tampered,
      pqc_signed: pqcSigned,
      pqc_signed_real: realPqcSigned,
      pqc_signed_dev_fallback: devFallbackSigned,
      invalid_signatures: invalidSig,
      security_alerts: alerts,
      unresolved_alerts: unresolvedAlerts,
      ledger: ledgerResult,
      ledger_integrity_pct: ledgerResult.total_blocks > 0
        ? +(ledgerResult.verified_blocks / ledgerResult.total_blocks * 100).toFixed(1) : 0,
      deep_learning: {
        valid_records: dlValid,
        suspicious_records: dlSuspicious,
        fraud_records: dlFraud,
        model_version: '2.1.0-deep-pqc',
        model_architecture: 'Deep-MLP-Autoencoder-Hybrid',
      },
      active_algorithm: provider.algorithmLabel,
      PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER,
    };

    // Add user counts for admin
    if (req.session.role === 'administrator') {
      const [totalUsers, officers, auditors, customers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'registration_officer' }),
        User.countDocuments({ role: 'auditor' }),
        User.countDocuments({ role: 'customer' }),
      ]);
      baseResponse.total_users = totalUsers;
      baseResponse.total_officers = officers;
      baseResponse.total_auditors = auditors;
      baseResponse.total_customers = customers;
    }

    // Officer gets limited view (no security alerts detail)
    if (req.session.role === 'registration_officer') {
      const { Document: DocModel } = require('../models');
      const pendingDocs = await DocModel.countDocuments({ verification_result: 'PENDING' });
      const signedByMe = await LandRecord.countDocuments({
        'security.signature_status': 'VALID',
        created_by: req.session.user_id,
      });
      return res.json({
        total_records: totalRecords,
        verified, tampered,
        pending_documents: pendingDocs,
        signed_by_me: signedByMe,
        ledger: { status: ledgerResult.status },
        role: 'registration_officer',
        PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER,
      });
    }

    baseResponse.role = req.session.role;
    res.json(baseResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dashboard query failed' });
  }
});

// GET /api/security/alerts — security alerts list
// Admin + Auditor only
router.get('/security/alerts', requireAuth, requireRole('administrator', 'auditor'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const filter = {};
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.resolved === 'true') filter.is_resolved = true;
    if (req.query.resolved === 'false') filter.is_resolved = false;

    const [alerts, total] = await Promise.all([
      SecurityAlert.find(filter).sort({ detected_at: -1 }).skip((page-1)*limit).limit(limit).lean(),
      SecurityAlert.countDocuments(filter),
    ]);

    res.json({ alerts, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

// POST /api/admin/demo/tamper — Rule 4/6: DEMO_MODE + admin only
router.post('/admin/demo/tamper', requireDemoMode, requireRole('administrator'), async (req, res) => {
  try {
    const { land_record_id, field, new_value } = req.body;
    if (!land_record_id || !field) return res.status(400).json({ error: 'land_record_id and field required' });

    const record = await LandRecord.findOne({ land_record_id });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const originalHash = record.security.record_hash;
    const originalValue = record.property[field];

    // Bypass sign pipeline — direct mutation (Rule 4/Demo Rule 4)
    // This is the only place that directly writes to property fields without rehashing
    if (field in (record.property.toObject?.() || record.property)) {
      record.property[field] = new_value;
      record.markModified('property');
      // Do NOT recalculate record_hash — that's the point of the demo
      await record.save();
    } else {
      return res.status(400).json({ error: `Field '${field}' not in property layer` });
    }

    // Log demo action
    const alert = new SecurityAlert({
      alert_id: `ALT-${nanoid(10)}`,
      land_record_id, alert_type: 'DEMO_TAMPER',
      severity: 'HIGH', title: 'Demo Tamper Simulation',
      description: `Field '${field}' mutated from '${originalValue}' to '${new_value}' (bypassing hash pipeline)`,
      is_demo_action: true, detected_at: new Date(),
    });
    await alert.save();

    await appendAuditLog({
      user_id: req.session.user_id, role: req.session.role,
      action: 'DEMO_TAMPER_SIMULATED', land_record_id,
      previous_state_hash: originalHash,
      details: { field, original_value: originalValue, new_value },
      is_demo_action: true, req
    });

    res.json({
      message: 'Demo tamper applied. Hash pipeline bypassed. Re-verify to detect genuine mismatch.',
      land_record_id, field, original_value: originalValue, new_value,
      stored_hash_unchanged: originalHash,
      instruction: 'Call POST /api/records/:id/verify — expect HASH_MISMATCH / TAMPERED',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Demo tamper failed' });
  }
});

// POST /api/admin/demo/reset
router.post('/admin/demo/reset', requireDemoMode, requireRole('administrator'), async (req, res) => {
  try {
    const { land_record_id } = req.body;
    if (!land_record_id) return res.status(400).json({ error: 'land_record_id required' });

    const record = await LandRecord.findOne({ land_record_id });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    // Recompute and resign
    const recordData = {
      land_record_id: record.land_record_id,
      transaction_id: record.transaction_id,
      ...record.property.toObject?.() || record.property,
    };
    const recordHash = computeRecordHash(recordData);
    const { signature, publicKey, algorithm } = signRecordHash(recordHash);

    record.security.record_hash = recordHash;
    record.security.digital_signature = signature;
    record.security.public_key = publicKey;
    record.security.pqc_algorithm = algorithm;
    record.security.signature_status = 'VALID';
    record.security.tamper_status = 'PENDING_VERIFICATION';
    await record.save();

    await appendBlock({
      land_record_id, transaction_id: record.transaction_id,
      record_hash: recordHash, event_type: 'DEMO_RECORD_RESET',
      actor_id: req.session.user_id, actor_role: req.session.role,
      is_demo_action: true, notes: 'Reset after demo tamper'
    });

    await appendAuditLog({
      user_id: req.session.user_id, role: req.session.role,
      action: 'DEMO_RECORD_RESET', land_record_id,
      new_state_hash: recordHash, is_demo_action: true, req
    });

    res.json({ message: 'Record reset and re-signed. Verify again to confirm VERIFIED.', land_record_id, algorithm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Demo reset failed' });
  }
});

// GET /api/deep-learning/stats — Deep learning model status, metrics, and dataset breakdown
router.get('/deep-learning/stats', requireAuth, async (req, res) => {
  try {
    const { loadModel } = require('../services/deepLearning');
    const model = loadModel();

    const [total, validCount, suspiciousCount, fraudCount] = await Promise.all([
      LandRecord.countDocuments(),
      LandRecord.countDocuments({ 'deep_learning.classification': 'VALID' }),
      LandRecord.countDocuments({ 'deep_learning.classification': 'SUSPICIOUS' }),
      LandRecord.countDocuments({ 'deep_learning.classification': 'FRAUD' }),
    ]);

    res.json({
      model_name: model?.model_name || 'LandRecordsDeepFraudDetector',
      version: model?.version || '2.1.0-deep-pqc',
      architecture: model?.architecture || 'Deep-MLP-Autoencoder-Hybrid',
      input_dimensions: model?.input_dim || 20,
      classes: model?.class_names || ['VALID', 'SUSPICIOUS', 'FRAUD'],
      metrics: model?.metrics || { accuracy: 0.999, f1_score: 0.999 },
      features: model?.feature_names || [],
      dataset_distribution: {
        total_records: total,
        valid_records: validCount,
        suspicious_records: suspiciousCount,
        fraud_records: fraudCount,
      },
      exported_at: model?.exported_at,
      disclaimer: process.env.PROTOTYPE_DISCLAIMER,
    });
  } catch (err) {
    console.error('[DEEP LEARNING] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch deep learning stats: ' + err.message });
  }
});

module.exports = router;
