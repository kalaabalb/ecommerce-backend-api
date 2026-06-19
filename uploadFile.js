const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedImageTypes = /jpeg|jpg|png|webp/;
const maxUploadSize = 1024 * 1024 * 15;

const createFileFilter = () => (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const hasAllowedExtension = allowedImageTypes.test(extension);
  const hasAllowedMimeType = allowedImageTypes.test(file.mimetype);
  const isFlutterOctetStream = file.mimetype === "application/octet-stream";

  if (
    (hasAllowedMimeType && hasAllowedExtension) ||
    (isFlutterOctetStream && hasAllowedExtension)
  ) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Only image files are allowed. Received ${file.mimetype} (${extension || "no extension"}).`,
    ),
  );
};

const createStorage = (folder, getPublicId) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      format: async (req, file) =>
        path.extname(file.originalname).slice(1).toLowerCase() || "png",
      public_id: getPublicId,
    },
  });

const uploadCategory = multer({
  storage: createStorage(
    "categories",
    () => `category_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  ),
  limits: { fileSize: maxUploadSize },
  fileFilter: createFileFilter(),
});

const uploadProduct = multer({
  storage: createStorage("products", (req, file) => {
    const nameWithoutExt = file.originalname.split(".")[0];
    return `product_${Date.now()}_${nameWithoutExt}`;
  }),
  limits: { fileSize: maxUploadSize },
  fileFilter: createFileFilter(),
});

const uploadPosters = multer({
  storage: createStorage("posters", (req, file) => {
    const nameWithoutExt = file.originalname.split(".")[0];
    return `poster_${Date.now()}_${nameWithoutExt}`;
  }),
  limits: { fileSize: maxUploadSize },
  fileFilter: createFileFilter(),
});

const uploadPaymentProof = multer({
  storage: createStorage(
    "payment-proofs",
    () => `payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  ),
  limits: { fileSize: maxUploadSize },
  fileFilter: createFileFilter(),
});

module.exports = {
  uploadCategory,
  uploadProduct,
  uploadPosters,
  uploadPaymentProof,
  cloudinary,
};
