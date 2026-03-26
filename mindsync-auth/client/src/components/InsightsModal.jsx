import { useMemo } from "react";

export default function InsightsModal({ isOpen, onClose, period = 7, entries = [] }) {
  const insights = useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        summary: {},
        insights: "No entries yet. Log moods for a quick summary and suggestions.",
      };
    }

    const ratings = entries.map((e) => e.rating);
    const allTags = entries.flatMap((e) => e.tags || []);
    const tagCounts = {};
    allTags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });

    const avgRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    const maxRating = Math.max(...ratings);
    const minRating = Math.min(...ratings);

    const trend = ratings.length > 1 ? (ratings[0] < ratings[ratings.length - 1] ? "improving" : ratings[0] > ratings[ratings.length - 1] ? "declining" : "stable") : "stable";

    const topEmotions = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));

    const half = Math.floor(ratings.length / 2);
    const firstHalf = ratings.slice(0, half);
    const secondHalf = ratings.slice(half);
    const recentAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avgRating;
    const olderAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avgRating;

    const moodChangeAlert = Math.abs(recentAvg - olderAvg) > 1.8 ? `Mood has ${recentAvg > olderAvg ? "improved" : "declined"} significantly in this period.` : null;

    const tagCorrelations = Object.entries(tagCounts).map(([tag]) => {
      const tagRatings = entries.filter((e) => (e.tags || []).includes(tag)).map((e) => e.rating);
      return {
        tag,
        avgRating: Math.round((tagRatings.reduce((a, b) => a + b, 0) / tagRatings.length) * 10) / 10,
      };
    }).sort((a, b) => a.avgRating - b.avgRating);

    const suggestion = avgRating <= 4
      ? "Try journaling one positive thing each day and incorporate short walks or breathing exercises."
      : avgRating <= 7
      ? "Keep up the good progress; maintain routines that support energy and rest."
      : "Great mood overall! Celebrate small wins and keep self-care habits strong.";

    const computedInsights = `In the last ${period} days, your average mood is ${avgRating}/10, range ${minRating}-${maxRating}. You appear ${trend}. ${moodChangeAlert || ""}

Top feelings: ${topEmotions.map((e) => `${e.tag} (${e.count})`).join(", ")}.

Suggested action: ${suggestion}`;

    return {
      summary: {
        totalEntries: entries.length,
        avgRating,
        maxRating,
        minRating,
        trend,
        topEmotions,
        moodChangeAlert,
        tagCorrelations: tagCorrelations.slice(0, 5),
        period: `Last ${period} days`,
      },
      insights: computedInsights,
    };
  }, [entries, period]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.h2}>✨ Your Mood Insights</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Average Mood</div>
              <div style={styles.statValue}> {insights.summary.avgRating ?? "-"}/10</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Entries</div>
              <div style={styles.statValue}> {insights.summary.totalEntries ?? 0}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Trend</div>
              <div style={styles.statValue}>{insights.summary.trend || "-"}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Range</div>
              <div style={styles.statValue}> {insights.summary.minRating ?? "-"}-{insights.summary.maxRating ?? "-"}</div>
            </div>
          </div>

          {insights.summary.moodChangeAlert && <div style={styles.alert}>⚠️ {insights.summary.moodChangeAlert}</div>}

          {insights.summary.topEmotions && insights.summary.topEmotions.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Most Frequent Feelings</h3>
              <div style={styles.emotions}>
                {insights.summary.topEmotions.map((emotion) => (
                  <span key={emotion.tag} style={styles.emotionBadge}>{emotion.tag} ({emotion.count})</span>
                ))}
              </div>
            </div>
          )}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Local Insights</h3>
            <div style={styles.insightsText}>{insights.insights}</div>
          </div>

          <div style={styles.footer}>{insights.summary.period}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "rgba(20,20,35,0.95)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 16,
    maxWidth: 800,
    width: "90%",
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    boxShadow: "0 18px 60px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  h2: { margin: 0, fontSize: 24, fontWeight: 700 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    fontSize: 24,
    cursor: "pointer",
    padding: 0,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  content: { display: "grid", gap: 24 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  statCard: {
    background: "rgba(192,132,252,0.1)",
    border: "1px solid rgba(192,132,252,0.3)",
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
  },
  statLabel: { fontSize: 12, opacity: 0.7, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: 700, color: "#c084fc" },
  alert: { background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.4)", padding: 12, borderRadius: 8, color: "#ffd93d", fontSize: 14 },
  section: { display: "grid", gap: 8 },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", opacity: 0.7 },
  emotions: { display: "flex", flexWrap: "wrap", gap: 8 },
  emotionBadge: { background: "rgba(107,199,127,0.2)", border: "1px solid rgba(107,199,127,0.4)", padding: "6px 10px", borderRadius: 6, fontSize: 13, color: "#6bcf7f" },
  insightsText: { lineHeight: 1.6, opacity: 0.9, fontSize: 14, whiteSpace: "pre-wrap" },
  footer: { fontSize: 12, opacity: 0.5, textAlign: "center" },
};
