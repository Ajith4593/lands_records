const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const argon2 = require('argon2');
const { User, LandRecord } = require('../src/models');
const { app } = require('../src/index');

describe('Session Authentication & Role-Based Access Control (Feature 9)', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create test users
    const adminHash = await argon2.hash('Admin@123', { type: argon2.argon2id });
    const officerHash = await argon2.hash('Officer@123', { type: argon2.argon2id });
    const auditorHash = await argon2.hash('Auditor@123', { type: argon2.argon2id });

    await User.create([
      { user_id: 'U-ADMIN', username: 'admin_test', password_hash: adminHash, role: 'administrator' },
      { user_id: 'U-OFFICER', username: 'officer_test', password_hash: officerHash, role: 'registration_officer' },
      { user_id: 'U-AUDITOR', username: 'auditor_test', password_hash: auditorHash, role: 'auditor' },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('POST /api/auth/login sets session cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('administrator');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('connect.sid');
  });

  test('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test', password: 'WRONG_PASSWORD' });

    expect(res.status).toBe(401);
  });

  test('Unauthenticated request to protected route is rejected with 401', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  test('Authenticated session allows access to protected routes', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'officer_test', password: 'Officer@123' });

    const res = await agent.get('/api/records');
    expect(res.status).toBe(200);
    expect(res.body.records).toBeDefined();
  });

  test('RBAC: Auditor is forbidden from admin tamper route (403)', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'auditor_test', password: 'Auditor@123' });

    const res = await agent
      .post('/api/admin/demo/tamper')
      .send({ land_record_id: 'LR-000001', field: 'price', new_value: 99999 });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  test('RBAC: Administrator can access admin tamper route', async () => {
    // Create a dummy record
    await LandRecord.create({
      land_record_id: 'LR-ADMIN-01',
      transaction_id: 'TXN-ADMIN-01',
      property: { price: 100000, transaction_date: new Date() },
      security: { record_hash: 'abc' }
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'admin_test', password: 'Admin@123' });

    const res = await agent
      .post('/api/admin/demo/tamper')
      .send({ land_record_id: 'LR-ADMIN-01', field: 'price', new_value: 500000 });

    expect(res.status).toBe(200);
    expect(res.body.stored_hash_unchanged).toBe('abc');
  });

  test('POST /api/auth/logout destroys session', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'officer_test', password: 'Officer@123' });

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const afterLogoutRes = await agent.get('/api/auth/me');
    expect(afterLogoutRes.status).toBe(401);
  });
});
