const AdminUser = require("../model/adminUser");
const {
  REQUIRED_ADMIN_ENV_VARS,
  getConfiguredDefaultAdmin,
} = require("../config/defaultAdmin");

const getMissingAdminProvisioningMessage = () =>
  `Missing required admin provisioning environment variables: ${REQUIRED_ADMIN_ENV_VARS.join(
    ", ",
  )}`;

const ensureDefaultAdminUser = async () => {
  try {
    const configuredAdmin = getConfiguredDefaultAdmin();

    if (!configuredAdmin) {
      const existingAdmin = await AdminUser.exists({});

      if (existingAdmin) {
        return;
      }

      const error = new Error(getMissingAdminProvisioningMessage());

      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn(error.message);
      return;
    }

    const existing = await AdminUser.findOne({ username: configuredAdmin.username });

    if (!existing) {
      await AdminUser.create(configuredAdmin);
      console.log(`Seeded admin user: ${configuredAdmin.username}`);
      return;
    }

    let changed = false;

    if (!existing.isActive) {
      existing.isActive = true;
      changed = true;
    }

    if (existing.name !== configuredAdmin.name) {
      existing.name = configuredAdmin.name;
      changed = true;
    }

    if (existing.email !== configuredAdmin.email) {
      existing.email = configuredAdmin.email;
      changed = true;
    }

    if (existing.clearanceLevel !== configuredAdmin.clearanceLevel) {
      existing.clearanceLevel = configuredAdmin.clearanceLevel;
      changed = true;
    }

    const passwordMatches = await existing.correctPassword(configuredAdmin.password);
    if (!passwordMatches) {
      existing.password = configuredAdmin.password;
      changed = true;
      console.log(`Reset password for admin user: ${configuredAdmin.username}`);
    }

    if (changed) {
      await existing.save();
      console.log(`Updated admin user: ${configuredAdmin.username}`);
    }
  } catch (error) {
    console.error("Failed to ensure default admin user:", error.message);
    throw error;
  }
};

module.exports = ensureDefaultAdminUser;
