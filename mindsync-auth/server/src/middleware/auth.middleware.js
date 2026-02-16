const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub).select("_id fullName email role isActive");
    if (!user) return res.status(401).json({ message: "Not authenticated." });
    if (!user.isActive) return res.status(403).json({ message: "Account disabled." });

    req.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authenticated." });
  }
};
