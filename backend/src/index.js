/**
 * Main Express Server Entry Point — UC-076 Land Record Integrity Platform
 * Session-based auth, MongoDB, rate limiting, CORS, no JWT.
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const documentRoutes = require('./routes/documents');
const ledgerRoutes = require('./routes/ledger');
const usersRoutes = require('./routes/users');
const { seedUsers, seedRecords, assignCustomerOwnership } = require('../scripts/seed');

const PROTOTYPE_DISCLAIMER = process.env.PROTOTYPE_DISCLAIMER ||
  'Prototype system for demonstration purposes only. Not a legally authoritative land registry.';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/landrecords';

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in prototype dev mode
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Helper to Connect DB (with Embedded Fallback) ─────────────────────────────
let embeddedMongo = null;

async function connectToMongo() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 });
    console.log('[DB] MongoDB connected:', MONGO_URI.replace(/\/\/.*@/, '//***@'));
    return MONGO_URI;
  } catch (err) {
    console.log('[DB] Local/configured MongoDB not found. Starting embedded MongoDB engine...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      embeddedMongo = await MongoMemoryServer.create({ instance: { dbName: 'landrecords' } });
      const embeddedUri = embeddedMongo.getUri();
      await mongoose.connect(embeddedUri);
      console.log('[DB] Embedded MongoDB connected:', embeddedUri);
      return embeddedUri;
    } catch (memErr) {
      console.error('[DB FATAL] Failed to initialize embedded MongoDB:', memErr.message);
      throw err;
    }
  }
}

// Configure Session store
const sessionStore = MongoStore.create({
  clientPromise: new Promise((resolve) => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.getClient()) {
      return resolve(mongoose.connection.getClient());
    }
    mongoose.connection.once('open', () => {
      resolve(mongoose.connection.getClient());
    });
  }),
  collectionName: 'sessions',
  ttl: 60 * 60 * 8, // 8h
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production_uc076',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8h
  }
}));

// Attach prototype disclaimer to all responses
app.use((req, res, next) => {
  res.locals.disclaimer = PROTOTYPE_DISCLAIMER;
  res.setHeader('X-Prototype-Disclaimer', PROTOTYPE_DISCLAIMER);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api', ledgerRoutes); // audit, security/dashboard, admin routes

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  disclaimer: PROTOTYPE_DISCLAIMER,
  demo_mode: process.env.DEMO_MODE !== 'false',
  pqc_provider: process.env.PQC_PROVIDER || 'ecdsa_dev_fallback',
  timestamp: new Date().toISOString(),
}));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));
}

// Error handler — never expose stack traces to client
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── DB & Start ────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectToMongo();

    // Auto-seed if database is empty or missing customers
    const { User, LandRecord } = require('./models');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[AUTO-SEED] Seeding initial users and records...');
      await seedUsers();
      await seedRecords();
      await assignCustomerOwnership();
    } else {
      // Ensure customer users exist if older seed ran
      await seedUsers();
      await assignCustomerOwnership();
    }

    const server = app.listen(PORT, () => {
      console.log(`[SERVER] Running on http://localhost:${PORT}`);
      console.log(`[SECURITY] Demo mode active: ${process.env.DEMO_MODE !== 'false'}`);
      console.log(`[NOTICE] ${PROTOTYPE_DISCLAIMER}`);
    });

    return server;
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, connectToMongo };
