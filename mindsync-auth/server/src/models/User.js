const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // stored hash only (never store plain password)
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// virtual password field (not stored in db)
userSchema.virtual("password").set(function (plainPassword) {
  this._plainPassword = plainPassword;
});

// ✅ hash BEFORE validation, without using next()
userSchema.pre("validate", async function () {
  if (!this._plainPassword) return;

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this._plainPassword, salt);

  this._plainPassword = undefined;
});

// compare password during login
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
