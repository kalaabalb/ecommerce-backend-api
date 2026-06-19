const AdminUser = require("../model/adminUser");

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.headers["x-admin-token"]?.toString()?.trim() || null;
};

const getCurrentAdmin = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  return AdminUser.findById(token);
};

const loadAdmin = async (req, res, next) => {
  try {
    const adminUser = await getCurrentAdmin(req);

    if (adminUser && adminUser.isActive) {
      req.adminUser = adminUser;
    } else {
      req.adminUser = null;
    }

    next();
  } catch (error) {
    next(error);
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
  getCurrentAdmin,
  getTokenFromRequest,
  loadAdmin,
  requireAdminAuth,
  requireSuperAdmin,
  toPublicAdminUser,
};
