const { trackFeatureUsage } = require("../services/metrics.service");

function createFeatureUsageTracker(featureKey) {
  return (req, res, next) => {
    if (req.method === "OPTIONS" || req.method === "HEAD") {
      return next();
    }

    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        trackFeatureUsage(featureKey).catch((err) => {
          console.error("Feature usage metric failed", err.message);
        });
      }
    });

    next();
  };
}

module.exports = {
  createFeatureUsageTracker,
};
