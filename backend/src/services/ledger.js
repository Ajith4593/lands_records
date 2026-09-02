/**
 * Ledger Service — UC-076 Land Record Integrity Platform
 * Append-only ledger chain. Rule 4 compliance: insert-only writes,
 * full genesis recomputation for verification (never cached status).
 */
const { LedgerBlock } = require('../models');
const { computeBlockHash, GENESIS_PREVIOUS_HASH } = require('./hashing');
const { signRecordHash } = require('./pqc');

/**
 * Get the current_hash of the most recent block (or genesis sentinel).
 */
async function getLastBlockHash() {
  const last = await LedgerBlock.findOne().sort({ block_id: -1 }).lean();
  return last ? last.current_hash : GENESIS_PREVIOUS_HASH;
}

/**
 * Get next sequential block ID.
 */
async function getNextBlockId() {
  const last = await LedgerBlock.findOne().sort({ block_id: -1 }).lean();
  return last ? last.block_id + 1 : 1;
}

/**
 * Append a new block — INSERT ONLY. Never updates.
 */
async function appendBlock({ land_record_id, transaction_id, record_hash,
  event_type, actor_id, actor_role, is_demo_action = false, deep_learning, notes }) {

  const previous_hash = await getLastBlockHash();
  const block_id = await getNextBlockId();
  const timestamp = new Date().toISOString();

  const current_hash = computeBlockHash({
    block_id, record_hash, previous_hash, timestamp, event_type
  });

  const { signature } = signRecordHash(current_hash);

  const block = new LedgerBlock({
    block_id, land_record_id, transaction_id,
    timestamp: new Date(timestamp),
    event_type, record_hash, previous_hash, current_hash,
    digital_signature: signature,
    actor_id, actor_role, is_demo_action,
    deep_learning: deep_learning ? {
      classification: deep_learning.classification,
      anomaly_score: deep_learning.anomaly_score
    } : undefined,
    notes
  });

  await block.save(); // MongoDB-level insert only
  return { block_id, previous_hash, current_hash, record_hash, timestamp, event_type };
}

/**
 * Full chain recomputation from genesis. Rule 4/Feature 4.
 * Returns exact block where chain breaks, if any.
 */
async function verifyFullChain() {
  const blocks = await LedgerBlock.find().sort({ block_id: 1 }).lean();
  if (!blocks.length) return { status: 'EMPTY', total_blocks: 0, verified_blocks: 0, broken_at_block: null, message: 'Ledger is empty' };

  let previous_hash = GENESIS_PREVIOUS_HASH;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.previous_hash !== previous_hash) {
      return { status: 'COMPROMISED', total_blocks: blocks.length, verified_blocks: i,
        broken_at_block: b.block_id, message: `⚠ Ledger Integrity Compromised at block ${b.block_id}` };
    }
    const ts = b.timestamp instanceof Date ? b.timestamp.toISOString() : String(b.timestamp);
    const expected = computeBlockHash({
      block_id: b.block_id, record_hash: b.record_hash,
      previous_hash: b.previous_hash, timestamp: ts, event_type: b.event_type
    });
    if (expected !== b.current_hash) {
      return { status: 'COMPROMISED', total_blocks: blocks.length, verified_blocks: i,
        broken_at_block: b.block_id, message: `⚠ Block ${b.block_id} hash mismatch` };
    }
    previous_hash = b.current_hash;
  }
  return { status: 'VERIFIED', total_blocks: blocks.length, verified_blocks: blocks.length,
    broken_at_block: null, message: '✓ Ledger Integrity Verified' };
}

module.exports = { appendBlock, verifyFullChain, getLastBlockHash };
