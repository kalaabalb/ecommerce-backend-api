const REQUIRED_ADMIN_ENV_VARS = [
  "ADMIN_USERNAME",
  "ADMIN_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const getConfiguredDefaultAdmin = () => {
  const missingVariables = REQUIRED_ADMIN_ENV_VARS.filter(
    (variable) => !process.env[variable],
  );

  if (missingVariables.length > 0) {
    return null;
  }

  return {
    username: process.env.ADMIN_USERNAME,
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    clearanceLevel: "super_admin",
  };
};

module.exports = {
  REQUIRED_ADMIN_ENV_VARS,
  getConfiguredDefaultAdmin,
};
