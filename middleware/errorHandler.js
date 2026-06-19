const errorHandler = (error, req, res, next) => {
  console.error("API error:", error);

  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy: Origin not allowed",
    });
  }

  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

module.exports = errorHandler;
