const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const { APP_VERSION } = require("./config/app");
const ensureDefaultAdminUser = require("./utils/ensureDefaultAdminUser");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();

// Rate limiting for IPv6 - INCREASED LIMITS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 1000 : 10000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = forwarded.split(",");
      return ips[0].trim();
    }
    return req.socket.remoteAddress;
  },
  skip: (req) => {
    if (
      req.url === "/health" ||
      req.url === "/" ||
      req.url.includes("/users/login") ||
      req.url.includes("/admin-users/login")
    ) {
      return true;
    }
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  },
});

app.use(limiter);

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://yonasmarketplace-backend.onrender.com",
        "http://localhost:3000",
        "http://localhost:3001",
      ]
    : [
        "http://localhost:*",
        "http://10.161.175.199:*",
        "http://192.168.*:*",
        "http://127.0.0.1:*",
        "http://0.0.0.0:*",
        "http://10.0.2.2:*",
        "*",
      ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (
        allowedOrigins.some((pattern) => {
          if (pattern.includes("*")) {
            const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
            return regex.test(origin);
          }
          return pattern === origin;
        })
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  }),
);

// Handle preflight requests
app.options("*", cors());

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB connection
mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      console.error("❌ MONGO_URL environment variable is missing");
      return;
    }

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

connectDB();

const db = mongoose.connection;
db.on("error", (error) => {
  console.error("❌ MongoDB connection error:", error);
});
db.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});
db.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

app.use(requestLogger);

// Routes
app.use("/categories", require("./routes/category"));
app.use("/subCategories", require("./routes/subCategory"));
app.use("/brands", require("./routes/brand"));
app.use("/variantTypes", require("./routes/variantType"));
app.use("/variants", require("./routes/variant"));
app.use("/products", require("./routes/product"));
app.use("/posters", require("./routes/poster"));
app.use("/users", require("./routes/user"));
app.use("/admin-users", require("./routes/adminUser"));
app.use("/orders", require("./routes/order"));
app.use("/payment", require("./routes/payment"));
app.use("/notification", require("./routes/notification"));
app.use("/verification", require("./routes/verification"));
app.use("/ratings", require("./routes/rating"));

// Health check route
app.get(
  "/health",
  asyncHandler(async (req, res) => {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    res.json({
      success: true,
      message: "API is healthy",
      data: {
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || "development",
        platform: "Render",
        version: APP_VERSION,
      },
    });
  }),
);

// Test route
app.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: "API working successfully on Render",
      data: {
        version: APP_VERSION,
        environment: process.env.NODE_ENV || "development",
        database:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

// Initialize database connection
db.once("open", async () => {
  try {
    console.log("✅ Connected to Database");
    await ensureDefaultAdminUser();
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
});

app.use(notFound);
app.use(errorHandler);

// Render port binding
const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
