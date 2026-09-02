/** Append-only audit log writer. Never updates or deletes (Rule 0.3). */
const { AuditLog } = require('../models');
const { nanoid } = require('nanoid');

async function appendAuditLog({ user_id, role, action, land_record_id,
  previous_state_hash, new_state_hash, signature_status, details, is_demo_action = false, req }) {
  const log = new AuditLog({
    audit_id: `AUD-${nanoid(12)}`,
    user_id, role, action, land_record_id,
    previous_state_hash, new_state_hash, signature_status,
    details, is_demo_action,
    timestamp: new Date(),
    ip_address: req?.ip,
  });
  await log.save();
  return log;
}

module.exports = { appendAuditLog };
