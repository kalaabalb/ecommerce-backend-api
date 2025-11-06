const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for categories
const storageCategory = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'categories',
    format: async (req, file) => 'png',
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
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only JPEG, JPG, PNG files are allowed!'));
    }
  }
});

// Cloudinary storage for products
const storageProduct = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    format: async (req, file) => 'png',
    public_id: (req, file) => {
      return `product_${Date.now()}_${file.originalname.split('.')[0]}`;
    },
  },
});

const uploadProduct = multer({
  storage: storageProduct,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only JPEG, JPG, PNG files are allowed!'));
    }
  }
});

// Cloudinary storage for posters
const storagePoster = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posters',
    format: async (req, file) => 'png',
    public_id: (req, file) => {
      return `poster_${Date.now()}_${file.originalname.split('.')[0]}`;
    },
  },
});

const uploadPosters = multer({
  storage: storagePoster,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only JPEG, JPG, PNG files are allowed!'));
    }
  }
});

// Cloudinary storage for payment proofs
const storagePaymentProof = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'payment-proofs',
    format: async (req, file) => 'png',
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
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only JPEG, JPG, PNG files are allowed!'));
    }
  }
});

module.exports = {
    uploadCategory,
    uploadProduct,
    uploadPosters,
    uploadPaymentProof,
    cloudinary
};
