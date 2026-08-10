const DEFAULT_ADMIN_USERS = [
  {
    username: process.env.ADMIN_USERNAME || "superadmin",
    name: process.env.ADMIN_NAME || "Super Admin",
    email: process.env.ADMIN_EMAIL || "superadmin@yourapp.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
    clearanceLevel: "super_admin",
  },
];

module.exports = {
  DEFAULT_ADMIN_USERS,
};
