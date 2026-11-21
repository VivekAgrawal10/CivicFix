require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const reportRoutes = require('./src/routes/report.routes');
const workorderRoutes = require('./src/routes/workorder.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const languageRoutes = require('./src/routes/language.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const aiRoutes = require('./src/routes/ai.routes');
const roadhealthRoutes = require('./src/routes/roadhealth.routes');
const mapsRoutes = require('./src/routes/maps.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io);

// Connect to MySQL (creates the database/tables if missing; exits with a clear message if unreachable)
const dbReady = connectDB();

// Security middleware
// crossOriginResourcePolicy relaxed so the separately-hosted frontend can display /uploads images
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
}));

// Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'CivicFix API is running', build: 'v8', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/workorders', workorderRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', languageRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/roadhealth', roadhealthRoutes);
app.use('/api/v1/maps', mapsRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Start accepting traffic only once the database is ready.
// (When imported by tests, NODE_ENV=test and PORT=0 are used, so the listener binds an ephemeral port.)
const listening = Promise.resolve(dbReady).then(
  () =>
    new Promise((resolve) => {
      server.listen(PORT, () => {
        console.log(`🚀 CivicFix server running on port ${server.address().port} in ${process.env.NODE_ENV || 'development'} mode`);
        resolve();
      });
    })
);
listening.catch((err) => {
  console.error('Server failed to start:', err.message);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
});

module.exports = { app, io, server, ready: listening };
