const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Higher limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration - Allow Flutter apps and common development origins
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://youradminapp.com', 
      'https://yourcustomerapp.com',
      'https://www.youradminapp.com',
      'https://www.yourcustomerapp.com'
    ]
  : [
      'http://localhost:*',
      'http://10.161.175.199:*',
      'http://192.168.*:*',
      'http://127.0.0.1:*',
      'http://0.0.0.0:*',
      // Flutter Android emulator
      'http://10.0.2.2:*',
      // Flutter iOS simulator
      'http://localhost:*',
      // Allow all origins in development for testing
      '*'
    ];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, Flutter apps)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins for testing
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, use strict CORS
    if (allowedOrigins.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return pattern === origin;
    })) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

// Security headers with Helmet - relaxed for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/image/products', express.static(path.join(__dirname, 'public/products')));
app.use('/image/category', express.static(path.join(__dirname, 'public/category')));
app.use('/image/poster', express.static(path.join(__dirname, 'public/posters')));  
app.use('/image/payment-proofs', express.static(path.join(__dirname, 'public/payment-proofs')));
app.use('/admin-users', require('./routes/adminUser'));

// MongoDB connection with better error handling
mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB:', process.env.MONGO_URL ? 'URL provided' : 'No URL found');
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ Connected to Database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Check your .env file for MONGO_URL');
    process.exit(1);
  }
};

connectDB();

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});
db.on('disconnected', () => {
  console.log('MongoDB disconnected - attempting to reconnect...');
});
db.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin || 'No Origin'}`);
  next();
});

// Routes
app.use('/categories', require('./routes/category'));
app.use('/subCategories', require('./routes/subCategory'));
app.use('/brands', require('./routes/brand'));
app.use('/variantTypes', require('./routes/variantType'));
app.use('/variants', require('./routes/variant'));
app.use('/products', require('./routes/product'));
app.use('/couponCodes', require('./routes/couponCode'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
app.use('/verification', require('./routes/verification'));
app.use('/ratings', require('./routes/rating'));
app.use('/admin-users', require('./routes/adminUser'));

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
      cors: 'enabled',
      rateLimit: 'enabled'
    }
  });
}));

// Test route
app.get('/', asyncHandler(async (req, res) => {
  res.json({ 
    success: true, 
    message: 'API working successfully', 
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
}));

// In your main server file, after database connection
const initializeSuperAdmin = async () => {
  try {
    const AdminUser = require('./model/adminUser');
    const superAdminExists = await AdminUser.findOne({ 
      clearanceLevel: 'super_admin'
    });
    
    if (!superAdminExists) {
      const superAdmin = new AdminUser({
        username: 'superadmin',
        password: 'admin123', // Change this in production!
        name: 'Super Administrator',
        email: 'superadmin@yourapp.com',
        clearanceLevel: 'super_admin'
      });
      await superAdmin.save();
      console.log('✅ Super admin user created');
      console.log('🔐 Default credentials:');
      console.log('   Username: superadmin');
      console.log('   Password: admin123');
      console.log('⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

db.once('open', () => {
  console.log('✅ Connected to Database');
  initializeSuperAdmin();
});

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
      '/couponCodes',
      '/posters',
      '/users',
      '/orders',
      '/health'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed',
      yourOrigin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }
  
  // Rate limit error
  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});



// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Local network: http://10.161.175.199:${PORT}/health`);
  console.log(`🔧 CORS: ${process.env.NODE_ENV === 'production' ? 'Strict' : 'Permissive'}`);
});
