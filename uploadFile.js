const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Debug Cloudinary configuration
console.log('🔧 Cloudinary Config Check:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'MISSING');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'MISSING');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Enhanced file filter with better debugging
const createFileFilter = (type) => {
  return function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    console.log(`📁 ${type} File upload check:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname),
      extnameValid: extname,
      mimetypeValid: mimetype
    });

    if (mimetype && extname) {
      console.log(`✅ ${type} File accepted:`, file.originalname);
      return cb(null, true);
    } else {
      console.log(`❌ ${type} File rejected:`, file.originalname, 'Mimetype:', file.mimetype, 'Extension:', path.extname(file.originalname));
      cb(new Error(`Error: Only JPEG, JPG, PNG, WEBP files are allowed! Got: ${file.mimetype} with extension ${path.extname(file.originalname)}`));
    }
  };
};

// Cloudinary storage for categories
const storageCategory = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'categories',
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.replace('.', '') || 'png';
    },
    public_id: (req, file) => {
      return `category_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },
  },
});

const uploadCategory = multer({
  storage: storageCategory,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: createFileFilter('Category')
});

// Cloudinary storage for products
const storageProduct = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.replace('.', '') || 'png';
    },
    public_id: (req, file) => {
      const nameWithoutExt = file.originalname.split('.')[0];
      return `product_${Date.now()}_${nameWithoutExt}`;
    },
  },
});

const uploadProduct = multer({
  storage: storageProduct,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: createFileFilter('Product')
});

// Cloudinary storage for posters
const storagePoster = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posters',
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.replace('.', '') || 'png';
    },
    public_id: (req, file) => {
      const nameWithoutExt = file.originalname.split('.')[0];
      return `poster_${Date.now()}_${nameWithoutExt}`;
    },
  },
});

const uploadPosters = multer({
  storage: storagePoster,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: createFileFilter('Poster')
});

// Cloudinary storage for payment proofs
const storagePaymentProof = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'payment-proofs',
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.replace('.', '') || 'png';
    },
    public_id: (req, file) => {
      return `payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },
  },
});

const uploadPaymentProof = multer({
  storage: storagePaymentProof,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: createFileFilter('Payment')
});

module.exports = {
    uploadCategory,
    uploadProduct,
    uploadPosters,
    uploadPaymentProof,
    cloudinary
};