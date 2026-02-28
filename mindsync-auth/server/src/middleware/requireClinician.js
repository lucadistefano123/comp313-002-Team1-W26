module.exports = function requireClinician(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  const role = req.user.role;
  if (role === "clinician" || role === "admin") return next();

  return res.status(403).json({ message: "Forbidden" });
};