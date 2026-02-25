exports.requireAdmin = (req, res, next) => {
  // requireAuth must run before this so req.user exists
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only." });
  }
  next();
};