/**
 * Auth middleware — session-based RBAC (no JWT).
 * Every route checks req.session.user_id and req.session.role server-side.
 */
const { LandRecord, Document } = require('../models');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  // Flatten so callers can pass arrays: requireRole(['admin','auditor']) or requireRole('admin','auditor')
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.session?.user_id) return res.status(401).json({ error: 'Authentication required' });
    if (!allowed.includes(req.session.role)) {
      return res.status(403).json({ error: `Access denied. You do not have permission to perform this action.` });
    }
    next();
  };
}

/**
 * Resource-level ownership middleware for customers.
 * Non-customer roles pass through. Customers must own the resource.
 * @param {'record'|'document'} resourceType
 */
function requireOwnership(resourceType) {
  return async (req, res, next) => {
    if (!req.session?.user_id) return res.status(401).json({ error: 'Authentication required' });

    // Non-customer roles bypass ownership check (they have broader access via role middleware)
    if (req.session.role !== 'customer') return next();

    const userId = req.session.user_id;

    try {
      if (resourceType === 'record') {
        const recordId = req.params.id;
        if (!recordId) return res.status(400).json({ error: 'Record ID required' });

        const record = await LandRecord.findOne({
          $or: [{ land_record_id: recordId }, { transaction_id: recordId }]
        }).lean();

        if (!record) return res.status(404).json({ error: 'Record not found' });

        if (record.owner_user_id !== userId) {
          return res.status(403).json({ error: 'You do not have permission to access this record.' });
        }

        // Attach resolved record to request for downstream use
        req.resolvedRecord = record;
      }

      if (resourceType === 'document') {
        const docId = req.params.id;
        if (!docId) return next(); // Some document routes don't use :id

        const doc = await Document.findOne({
          $or: [{ document_id: docId }, { land_record_id: docId }]
        }).lean();

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Check if customer uploaded it OR owns the linked record
        if (doc.uploaded_by === userId) return next();

        const record = await LandRecord.findOne({ land_record_id: doc.land_record_id }).lean();
        if (record && record.owner_user_id === userId) return next();

        return res.status(403).json({ error: 'You do not have permission to access this document.' });
      }

      next();
    } catch (err) {
      console.error('[AUTH] Ownership check error:', err.message);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

function requireDemoMode(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(403).json({ error: 'Demo controls disabled. Set DEMO_MODE=true.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireDemoMode, requireOwnership };
