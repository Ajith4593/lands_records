const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { LedgerBlock, AuditLog } = require('../src/models');
const { appendBlock, verifyFullChain, getLastBlockHash } = require('../src/services/ledger');
const { GENESIS_PREVIOUS_HASH } = require('../src/services/hashing');

describe('Append-Only Cryptographic Ledger (Feature 4)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await LedgerBlock.collection.drop().catch(() => {});
    await AuditLog.collection.drop().catch(() => {});
  });

  test('Genesis block links to GENESIS_PREVIOUS_HASH', async () => {
    const lastHash = await getLastBlockHash();
    expect(lastHash).toBe(GENESIS_PREVIOUS_HASH);

    const block1 = await appendBlock({
      land_record_id: 'LR-000001',
      transaction_id: 'TXN-001',
      record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      event_type: 'RECORD_CREATED',
      actor_id: 'ADMIN',
      actor_role: 'administrator'
    });

    expect(block1.block_id).toBe(1);
    expect(block1.previous_hash).toBe(GENESIS_PREVIOUS_HASH);
    expect(block1.current_hash).toHaveLength(64);
  });

  test('Sequential blocks chain previous_hash correctly', async () => {
    const b1 = await appendBlock({
      land_record_id: 'LR-000001',
      transaction_id: 'TXN-001',
      record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      event_type: 'RECORD_CREATED',
      actor_id: 'OFFICER1',
      actor_role: 'registration_officer'
    });

    const b2 = await appendBlock({
      land_record_id: 'LR-000002',
      transaction_id: 'TXN-002',
      record_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      event_type: 'RECORD_CREATED',
      actor_id: 'OFFICER1',
      actor_role: 'registration_officer'
    });

    expect(b2.block_id).toBe(2);
    expect(b2.previous_hash).toBe(b1.current_hash);
  });

  test('verifyFullChain recomputes all hashes from genesis and verifies intact chain', async () => {
    await appendBlock({
      land_record_id: 'LR-000001',
      transaction_id: 'TXN-001',
      record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      event_type: 'RECORD_CREATED'
    });
    await appendBlock({
      land_record_id: 'LR-000002',
      transaction_id: 'TXN-002',
      record_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      event_type: 'RECORD_CREATED'
    });
    await appendBlock({
      land_record_id: 'LR-000003',
      transaction_id: 'TXN-003',
      record_hash: '3333333333333333333333333333333333333333333333333333333333333333',
      event_type: 'RECORD_CREATED'
    });

    const result = await verifyFullChain();
    expect(result.status).toBe('VERIFIED');
    expect(result.total_blocks).toBe(3);
    expect(result.verified_blocks).toBe(3);
    expect(result.broken_at_block).toBeNull();
  });

  test('verifyFullChain pinpoints exact break location if raw document in Mongo is modified', async () => {
    await appendBlock({
      land_record_id: 'LR-000001',
      transaction_id: 'TXN-001',
      record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      event_type: 'RECORD_CREATED'
    });
    await appendBlock({
      land_record_id: 'LR-000002',
      transaction_id: 'TXN-002',
      record_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      event_type: 'RECORD_CREATED'
    });
    await appendBlock({
      land_record_id: 'LR-000003',
      transaction_id: 'TXN-003',
      record_hash: '3333333333333333333333333333333333333333333333333333333333333333',
      event_type: 'RECORD_CREATED'
    });

    // Directly corrupt raw collection document at block 2 bypassing Mongoose schema hooks
    await LedgerBlock.collection.updateOne(
      { block_id: 2 },
      { $set: { record_hash: '9999999999999999999999999999999999999999999999999999999999999999' } }
    );

    const result = await verifyFullChain();
    expect(result.status).toBe('COMPROMISED');
    expect(result.broken_at_block).toBe(2);
    expect(result.verified_blocks).toBe(1);
  });

  test('Append-Only ODM guard: rejects Mongoose updates and deletions on ledger_blocks and audit_logs', async () => {
    await appendBlock({
      land_record_id: 'LR-000001',
      transaction_id: 'TXN-001',
      record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      event_type: 'RECORD_CREATED'
    });

    await expect(LedgerBlock.updateOne({ block_id: 1 }, { record_hash: 'corrupted' }))
      .rejects.toThrow('Append-only collection: updates and deletions are strictly prohibited');

    await expect(LedgerBlock.deleteOne({ block_id: 1 }))
      .rejects.toThrow('Append-only collection: updates and deletions are strictly prohibited');

    await expect(AuditLog.deleteMany({}))
      .rejects.toThrow('Append-only collection: updates and deletions are strictly prohibited');
  });
});
