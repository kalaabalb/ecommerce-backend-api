const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const AdminUser = require('./model/adminUser');

dotenv.config();

const app = express();

// Rate limiting for IPv6 - INCREASED LIMITS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',');
      return ips[0].trim();
    }
    return req.socket.remoteAddress;
  },
  skip: (req) => {
    if (
      req.url === '/health' ||
      req.url === '/' ||
      req.url.includes('/users/login') ||
      req.url.includes('/admin-users/login')
    ) {
      return true;
    }
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }
});

app.use(limiter);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://yonasmarketplace-backend.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ]
  : [
      'http://localhost:*',
      'http://10.161.175.199:*',
      'http://192.168.*:*',
      'http://127.0.0.1:*',
      'http://0.0.0.0:*',
      'http://10.0.2.2:*',
      '*'
    ];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return pattern === origin;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    
    if (!mongoUrl) {
      console.error('❌ MONGO_URL environment variable is missing');
      return;
    }
    
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});
db.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});
db.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/categories', require('./routes/category'));
app.use('/subCategories', require('./routes/subCategory'));
app.use('/brands', require('./routes/brand'));
app.use('/variantTypes', require('./routes/variantType'));
app.use('/variants', require('./routes/variant'));
app.use('/products', require('./routes/product'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user'));
app.use('/admin-users', require('./routes/adminUser'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
app.use('/verification', require('./routes/verification'));
app.use('/ratings', require('./routes/rating'));

// Health check route
app.get('/health', asyncHandler(async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    success: true, 
    message: 'API is healthy', 
      data: {
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development',
        platform: 'Render',
        version: '1.0.1'
      }
    });
}));

// Test route
app.get('/', asyncHandler(async (req, res) => {
  res.json({ 
    success: true, 
    message: 'API working successfully on Render', 
    data: {
      version: '1.0.1',
      environment: process.env.NODE_ENV || 'development',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }
  });
}));

// Initialize database connection
db.once('open', async () => {
  console.log('✅ Connected to Database');
  await ensureDefaultAdminUser();
});

const ensureDefaultAdminUser = async () => {
  try {
    const defaults = [
      {
        username: 'superadmin',
        name: 'Super Admin',
        email: 'superadmin@yourapp.com',
        password: 'admin123',
        clearanceLevel: 'super_admin'
      }
    ];

    for (const admin of defaults) {
      const existing = await AdminUser.findOne({ username: admin.username });
      if (!existing) {
        await AdminUser.create(admin);
        console.log(`✅ Seeded admin user: ${admin.username}`);
      } else {
        let changed = false;

        if (!existing.isActive) {
          existing.isActive = true;
          changed = true;
        }

        if (existing.name !== admin.name) {
          existing.name = admin.name;
          changed = true;
        }

        if (existing.email !== admin.email) {
          existing.email = admin.email;
          changed = true;
        }

        if (existing.clearanceLevel !== admin.clearanceLevel) {
          existing.clearanceLevel = admin.clearanceLevel;
          changed = true;
        }

        const passwordMatches = await existing.correctPassword(admin.password);
        if (!passwordMatches) {
          existing.password = admin.password;
          changed = true;
          console.log(`🔐 Reset password for admin user: ${admin.username}`);
        }

        if (changed) {
          await existing.save();
          console.log(`✅ Updated admin user: ${admin.username}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to ensure default admin user:', error.message);
  }
};

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/categories',
      '/subCategories', 
      '/brands',
      '/variantTypes',
      '/variants',
      '/products',
      '/posters',
      '/users',
      '/admin-users',
      '/orders',
      '/payment',
      '/notification',
      '/verification',
      '/ratings',
      '/health'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🔴 Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed'
    });
  }
  
  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// Render port binding
const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
