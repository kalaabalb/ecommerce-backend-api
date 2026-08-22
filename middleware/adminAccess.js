const jwt = require("jsonwebtoken");
const AdminUser = require("../model/adminUser");
const User = require("../model/user");

const DEFAULT_JWT_SECRET = "yomoblies-development-only-secret";
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const getJwtSecret = () => {
  if (JWT_SECRET) {
    return JWT_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }

  return DEFAULT_JWT_SECRET;
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
};

const getCurrentAdmin = async (req) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);

  if (payload.role !== "admin") {
    return null;
  }

  return AdminUser.findById(payload.sub);
};

const signAccessToken = (payload, expiresIn = JWT_EXPIRES_IN) =>
  jwt.sign({ ...payload, tokenType: "access" }, getJwtSecret(), { expiresIn });

const issueUserToken = (user) =>
  signAccessToken({
    sub: user._id.toString(),
    role: "user",
  });

const issueAdminToken = (adminUser) =>
  signAccessToken({
    sub: adminUser._id.toString(),
    role: "admin",
    clearanceLevel: adminUser.clearanceLevel,
  });

const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret());

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const toPublicAdminUser = (adminUser) => ({
  _id: adminUser._id,
  username: adminUser.username,
  name: adminUser.name,
  email: adminUser.email,
  clearanceLevel: adminUser.clearanceLevel,
  isActive: adminUser.isActive,
  createdBy: adminUser.createdBy,
  createdAt: adminUser.createdAt,
  updatedAt: adminUser.updatedAt,
});

const loadUser = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      req.authUser = null;
      return next();
    }

    const payload = verifyAccessToken(token);
    if (payload.role !== "user") {
      req.authUser = null;
      return next();
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      req.authUser = null;
      return next();
    }

    req.authUser = user;
    next();
  } catch (error) {
    req.authUser = null;
    next();
  }
};

const requireUserAuth = async (req, res, next) => {
  try {
    await loadUser(req, res, () => {});

    if (!req.authUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const loadAdmin = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      req.adminUser = null;
      return next();
    }

    const payload = verifyAccessToken(token);
    if (payload.role !== "admin") {
      req.adminUser = null;
      return next();
    }

    const adminUser = await AdminUser.findById(payload.sub);

    if (adminUser && adminUser.isActive) {
      req.adminUser = adminUser;
    } else {
      req.adminUser = null;
    }

    next();
  } catch (error) {
    req.adminUser = null;
    next();
  }
};

const requireAdminAuth = async (req, res, next) => {
  try {
    await loadAdmin(req, res, () => {});

    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireSuperAdmin = async (req, res, next) => {
  try {
    if (req.adminUser?.clearanceLevel !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const buildOwnedQuery = (req, query = {}) => {
  if (!req.adminUser || req.adminUser.clearanceLevel === "super_admin") {
    return query;
  }

  return {
    ...query,
    $or: [
      { createdBy: req.adminUser._id },
      { createdBy: null },
      { createdBy: { $exists: false } },
    ],
  };
};

const canAccessOwnedDocument = (req, document) => {
  if (!req.adminUser || req.adminUser.clearanceLevel === "super_admin") {
    return true;
  }

  if (!document?.createdBy) {
    return true;
  }

  return document.createdBy.toString() === req.adminUser._id.toString();
};

const assignOwnedDocument = (req, document) => {
  if (req.adminUser && !document.createdBy) {
    document.createdBy = req.adminUser._id;
  }
};

module.exports = {
  assignOwnedDocument,
  buildOwnedQuery,
  canAccessOwnedDocument,
  getJwtSecret,
  getCurrentAdmin,
  getTokenFromRequest,
  issueAdminToken,
  issueUserToken,
  loadAdmin,
  loadUser,
  requireAdminAuth,
  requireUserAuth,
  requireSuperAdmin,
  signAccessToken,
  toPublicUser,
  toPublicAdminUser,
  verifyAccessToken,
};
