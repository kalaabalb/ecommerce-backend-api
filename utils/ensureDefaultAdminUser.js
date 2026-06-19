const AdminUser = require("../model/adminUser");
const { DEFAULT_ADMIN_USERS } = require("../config/defaultAdmin");

const ensureDefaultAdminUser = async () => {
  try {
    for (const admin of DEFAULT_ADMIN_USERS) {
      const existing = await AdminUser.findOne({ username: admin.username });

      if (!existing) {
        await AdminUser.create(admin);
        console.log(`Seeded admin user: ${admin.username}`);
        continue;
      }

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
        console.log(`Reset password for admin user: ${admin.username}`);
      }

      if (changed) {
        await existing.save();
        console.log(`Updated admin user: ${admin.username}`);
      }
    }
  } catch (error) {
    console.error("Failed to ensure default admin user:", error.message);
  }
};

module.exports = ensureDefaultAdminUser;
