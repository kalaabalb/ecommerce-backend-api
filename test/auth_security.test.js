const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";

const userRoutes = require("../routes/user");
const adminRoutes = require("../routes/adminUser");
const orderRoutes = require("../routes/order");
const User = require("../model/user");
const AdminUser = require("../model/adminUser");
const Order = require("../model/order");
const {
  issueAdminToken,
  issueUserToken,
} = require("../middleware/adminAccess");

const originalMethods = {
  userFindOne: User.findOne,
  userFindById: User.findById,
  adminFindOne: AdminUser.findOne,
  adminFindById: AdminUser.findById,
  orderFindById: Order.findById,
  orderFind: Order.find,
  orderSave: Order.prototype.save,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/users", userRoutes);
  app.use("/admin-users", adminRoutes);
  app.use("/orders", orderRoutes);
  return app;
}

function restoreStubs() {
  User.findOne = originalMethods.userFindOne;
  User.findById = originalMethods.userFindById;
  AdminUser.findOne = originalMethods.adminFindOne;
  AdminUser.findById = originalMethods.adminFindById;
  Order.findById = originalMethods.orderFindById;
  Order.find = originalMethods.orderFind;
  Order.prototype.save = originalMethods.orderSave;
}

test.afterEach(() => {
  restoreStubs();
});

test("valid user login returns a signed token", async () => {
  const fakeUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "alice",
    email: "alice@example.com",
    emailVerified: true,
    phone: null,
    phoneVerified: false,
    createdAt: new Date(),
    correctPassword: async () => true,
  };

  User.findOne = async () => fakeUser;

  const app = createApp();
  const response = await request(app)
    .post("/users/login")
    .send({ name: "alice", password: "secret" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.token);

  const tokenData = jwt.verify(response.body.data.token, "test-secret");
  assert.equal(tokenData.role, "user");
  assert.equal(tokenData.sub, fakeUser._id.toString());
});

test("valid admin login returns a signed token", async () => {
  const fakeAdmin = {
    _id: new mongoose.Types.ObjectId(),
    username: "superadmin",
    name: "Super Admin",
    email: "admin@example.com",
    clearanceLevel: "super_admin",
    isActive: true,
    correctPassword: async () => true,
  };

  AdminUser.findOne = async () => fakeAdmin;

  const app = createApp();
  const response = await request(app)
    .post("/admin-users/login")
    .send({ username: "superadmin", password: "secret" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.token);

  const tokenData = jwt.verify(response.body.data.token, "test-secret");
  assert.equal(tokenData.role, "admin");
  assert.equal(tokenData.sub, fakeAdmin._id.toString());
});

test("invalid user credentials are rejected", async () => {
  User.findOne = async () => null;

  const app = createApp();
  const response = await request(app)
    .post("/users/login")
    .send({ name: "alice", password: "wrong" });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("protected user profile route rejects missing token", async () => {
  const app = createApp();
  const response = await request(app).get("/users/profile");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("protected user profile route rejects invalid token", async () => {
  const app = createApp();
  const response = await request(app)
    .get("/users/profile")
    .set("Authorization", "Bearer not-a-valid-token");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("a user cannot impersonate another user when creating an order", async () => {
  const authUserId = new mongoose.Types.ObjectId();
  const fakeUser = {
    _id: authUserId,
    name: "buyer",
    correctPassword: async () => true,
  };

  User.findById = async () => fakeUser;

  let saveCalled = false;
  Order.prototype.save = async function () {
    saveCalled = true;
    return this;
  };

  const app = createApp();
  const token = issueUserToken(fakeUser);
  const response = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      userID: new mongoose.Types.ObjectId().toString(),
      items: [{ productID: "p1", productName: "Product", quantity: 1, price: 10 }],
      totalPrice: 10,
      shippingAddress: { phone: "123", street: "Main", city: "Addis" },
      paymentMethod: "cod",
      orderTotal: { subtotal: 10, total: 10 },
    });

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
  assert.equal(saveCalled, false);
});

test("a user cannot read another user's order", async () => {
  const authUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const fakeUser = {
    _id: authUserId,
    name: "buyer",
    correctPassword: async () => true,
  };

  User.findById = async () => fakeUser;

  const app = createApp();
  const token = issueUserToken(fakeUser);
  const response = await request(app)
    .get(`/orders/orderByUserId/${otherUserId.toString()}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
});

test("admin login token authorizes admin profile access", async () => {
  const fakeAdmin = {
    _id: new mongoose.Types.ObjectId(),
    username: "superadmin",
    name: "Super Admin",
    email: "admin@example.com",
    clearanceLevel: "super_admin",
    isActive: true,
  };

  AdminUser.findById = async () => fakeAdmin;

  const app = createApp();
  const token = issueAdminToken(fakeAdmin);
  const response = await request(app)
    .get("/admin-users/profile")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.username, fakeAdmin.username);
});

test("invalid admin token is rejected", async () => {
  const app = createApp();
  const response = await request(app)
    .get("/admin-users/profile")
    .set("Authorization", "Bearer invalid.admin.token");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});
