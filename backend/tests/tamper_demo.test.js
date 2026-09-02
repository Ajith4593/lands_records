const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { LandRecord, LedgerBlock, AuditLog, SecurityAlert } = require('../src/models');
const { computeRecordHash } = require('../src/services/hashing');
const { signRecordHash } = require('../src/services/pqc');
const { appendBlock } = require('../src/services/ledger');
const { verifyRecord } = require('../src/services/verification');

describe('Verification Engine & Tamper Detection Simulation (Features 5 & 6)', () => {
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
    await LandRecord.collection.drop().catch(() => {});
    await LedgerBlock.collection.drop().catch(() => {});
    await AuditLog.collection.drop().catch(() => {});
    await SecurityAlert.collection.drop().catch(() => {});
  });

  async function createSignedRecord(id = 'LR-000100', price = 250000) {
    const property = {
      price,
      transaction_date: new Date('2022-05-15T00:00:00.000Z'),
      postcode: 'BN6 8AA',
      property_type: 'Semi-Detached',
      new_build: false,
      duration: 'Freehold',
      paon: '10',
      saon: null,
      street: 'HIGH STREET',
      locality: 'KEYMER',
      town_city: 'HASSOCKS',
      district: 'MID SUSSEX',
      county: 'WEST SUSSEX',
      ppd_category: 'A',
    };

    const recordForHash = {
      land_record_id: id,
      transaction_id: `TXN-${id}`,
      ...property
    };

    const hash = computeRecordHash(recordForHash);
    const { signature, publicKey, algorithm } = signRecordHash(hash);

    const record = new LandRecord({
      land_record_id: id,
      transaction_id: `TXN-${id}`,
      property,
      synthetic_demo: {
        is_synthetic: true,
        parcel_id: 'PAR-123456',
        owner_name: 'John Doe'
      },
      security: {
        record_hash: hash,
        digital_signature: signature,
        public_key: publicKey,
        pqc_algorithm: algorithm,
        signature_status: 'VALID',
        tamper_status: 'PENDING_VERIFICATION',
        signed_at: new Date()
      }
    });

    await record.save();

    await appendBlock({
      land_record_id: id,
      transaction_id: `TXN-${id}`,
      record_hash: hash,
      event_type: 'RECORD_CREATED',
      actor_id: 'TEST_USER',
      actor_role: 'registration_officer'
    });

    return record;
  }

  test('Freshly created and signed record verifies successfully (VERIFIED)', async () => {
    await createSignedRecord('LR-000100', 250000);

    const result = await verifyRecord('LR-000100', 'AUDITOR', 'auditor');
    expect(result.status).toBe('VERIFIED');
    expect(result.steps.hash_match).toBe(true);
    expect(result.steps.signature_valid).toBe(true);
    expect(result.steps.ledger_status).toBe('VERIFIED');
    expect(result.tampered).toBe(false);
  });

  test('Direct DB mutation bypassing sign pipeline is genuinely caught by recomputation (TAMPERED)', async () => {
    await createSignedRecord('LR-000200', 300000);

    // Initial check: VERIFIED
    let result = await verifyRecord('LR-000200', 'AUDITOR', 'auditor');
    expect(result.status).toBe('VERIFIED');

    // Simulate direct tamper: mutate price field without re-signing or updating record_hash
    const rec = await LandRecord.findOne({ land_record_id: 'LR-000200' });
    rec.property.price = 999999;
    rec.markModified('property');
    await rec.save();

    // Verification must genuinely recompute hash and catch discrepancy
    result = await verifyRecord('LR-000200', 'AUDITOR', 'auditor');
    expect(result.status).toBe('HASH_MISMATCH');
    expect(result.steps.hash_match).toBe(false);
    expect(result.steps.hash_status).toBe('MISMATCH');
    expect(result.tampered).toBe(true);
    expect(result.risk.risk_score).toBeGreaterThanOrEqual(40);
  });

  test('Signature corruption triggers SIGNATURE_INVALID detection', async () => {
    await createSignedRecord('LR-000300', 400000);

    // Corrupt digital signature directly in DB
    const rec = await LandRecord.findOne({ land_record_id: 'LR-000300' });
    rec.security.digital_signature = 'deadbeef'.repeat(16);
    await rec.save();

    const result = await verifyRecord('LR-000300', 'AUDITOR', 'auditor');
    expect(result.status).toBe('SIGNATURE_INVALID');
    expect(result.steps.signature_valid).toBe(false);
    expect(result.tampered).toBe(true);
  });

  test('Audit log records verification and tamper events', async () => {
    await createSignedRecord('LR-000400', 180000);
    await verifyRecord('LR-000400', 'AUDITOR', 'auditor');

    const logs = await AuditLog.find({ land_record_id: 'LR-000400' }).lean();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(l => l.action === 'RECORD_VERIFIED')).toBe(true);
  });
});
