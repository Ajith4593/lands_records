const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const argon2 = require('argon2');
const { User, LandRecord } = require('../src/models');
const { app } = require('../src/index');

describe('RBAC and Role-Based Access Control Test Suite', () => {
  jest.setTimeout(30000);
  let mongoServer;
  let adminSession;
  let officerSession;
  let auditorSession;
  let customerSession;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const pwdHash = await argon2.hash('TestPass@123', { type: argon2.argon2id });

    await User.create([
      { user_id: 'USR-ADMIN', username: 'admin_test', password_hash: pwdHash, role: 'administrator', full_name: 'Admin Test' },
      { user_id: 'USR-OFFICER', username: 'officer_test', password_hash: pwdHash, role: 'registration_officer', full_name: 'Officer Test' },
      { user_id: 'USR-AUDITOR', username: 'auditor_test', password_hash: pwdHash, role: 'auditor', full_name: 'Auditor Test' },
      { user_id: 'USR-CUSTOMER', username: 'customer_test', password_hash: pwdHash, role: 'customer', full_name: 'Customer Test' },
    ]);

    // Create a record owned by customer_test
    await LandRecord.create({
      land_record_id: 'LR-CUST01',
      transaction_id: 'TXN-CUST01',
      owner_user_id: 'USR-CUSTOMER',
      property: {
        price: 2500000,
        transaction_date: new Date(),
        town_city: 'Mumbai',
        postcode: 'MH 400001',
      },
      synthetic_demo: {
        parcel_id: 'PCL-001',
        owner_name: 'Customer Test',
      },
      security: {
        record_hash: 'abc123hash',
        signature_status: 'VALID',
        tamper_status: 'VERIFIED',
      },
    });

    // Login each user
    const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin_test', password: 'TestPass@123' });
    adminSession = adminRes.headers['set-cookie'];

    const offRes = await request(app).post('/api/auth/login').send({ username: 'officer_test', password: 'TestPass@123' });
    officerSession = offRes.headers['set-cookie'];

    const audRes = await request(app).post('/api/auth/login').send({ username: 'auditor_test', password: 'TestPass@123' });
    auditorSession = audRes.headers['set-cookie'];

    const custRes = await request(app).post('/api/auth/login').send({ username: 'customer_test', password: 'TestPass@123' });
    customerSession = custRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('1. Real-Time Self-Registration & Login', () => {
    test('POST /api/auth/register creates user and instant session', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'new_citizen',
          password: 'CitizenPass@123',
          full_name: 'New Citizen',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('customer');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('2. Admin User Management Authorization', () => {
    test('Admin can access GET /api/users', async () => {
      const res = await request(app).get('/api/users').set('Cookie', adminSession);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('Non-admins are rejected from /api/users with 403', async () => {
      const res1 = await request(app).get('/api/users').set('Cookie', officerSession);
      expect(res1.status).toBe(403);

      const res2 = await request(app).get('/api/users').set('Cookie', auditorSession);
      expect(res2.status).toBe(403);

      const res3 = await request(app).get('/api/users').set('Cookie', customerSession);
      expect(res3.status).toBe(403);
    });
  });

  describe('3. Registration Officer Access Control', () => {
    test('Officer can register a land record via POST /api/records', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Cookie', officerSession)
        .send({
          property: {
            price: 3000000,
            paon: 'Flat 101',
            town_city: 'Delhi',
            postcode: 'DL 110001',
          },
          parcel_id: 'PCL-DL-101',
          owner_name: 'Delhi Owner',
        });

      expect([200, 201]).toContain(res.status);
    });

    test('Auditor and Customer are denied from registering land records with 403', async () => {
      const res1 = await request(app)
        .post('/api/records')
        .set('Cookie', auditorSession)
        .send({ property: { price: 100 } });
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post('/api/records')
        .set('Cookie', customerSession)
        .send({ property: { price: 100 } });
      expect(res2.status).toBe(403);
    });
  });

  describe('4. Auditor Access Control', () => {
    test('Auditor can verify ledger chain via GET /api/ledger/verify', async () => {
      const res = await request(app).get('/api/ledger/verify').set('Cookie', auditorSession);
      expect(res.status).toBe(200);
    });

    test('Auditor cannot simulate tamper (admin only)', async () => {
      const res = await request(app)
        .post('/api/admin/demo/tamper')
        .set('Cookie', auditorSession)
        .send({ land_record_id: 'LR-CUST01', field: 'price', new_value: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('5. Customer Resource-Level Ownership', () => {
    test('Customer only receives owned records on GET /api/records', async () => {
      const res = await request(app).get('/api/records').set('Cookie', customerSession);
      expect(res.status).toBe(200);
      expect(res.body.records.length).toBe(1);
      expect(res.body.records[0].land_record_id).toBe('LR-CUST01');
    });

    test('Customer is denied from accessing ledger and audit logs with 403', async () => {
      const res1 = await request(app).get('/api/ledger').set('Cookie', customerSession);
      expect(res1.status).toBe(403);

      const res2 = await request(app).get('/api/audit').set('Cookie', customerSession);
      expect(res2.status).toBe(403);
    });
  });
});
