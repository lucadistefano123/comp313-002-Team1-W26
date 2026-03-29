const { trackSystemError } = require("../services/metrics.service");

function resolveErrorCategory(pathname, statusCode) {
  const code = statusCode >= 500 ? `http_${statusCode}` : "http_error";

  if (pathname.startsWith("/api/auth")) return `api.auth.${code}`;
  if (pathname.startsWith("/api/moods")) return `api.moods.${code}`;
  if (pathname.startsWith("/api/clinician")) return `api.clinician.${code}`;
  if (pathname.startsWith("/api/admin")) return `api.admin.${code}`;
  if (pathname.startsWith("/api/export")) return `api.export.${code}`;
  if (pathname.startsWith("/api/flags")) return `api.flags.${code}`;
  if (pathname.startsWith("/api/")) return `api.other.${code}`;

  return `web.${code}`;
}

function createSystemErrorMetricsLogger() {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode < 500) return;

      const category = resolveErrorCategory(req.path || "", res.statusCode);
      trackSystemError(category).catch((err) => {
        console.error("System error metric failed", err.message);
      });
    });

    next();
  };
}

module.exports = {
  createSystemErrorMetricsLogger,
};
