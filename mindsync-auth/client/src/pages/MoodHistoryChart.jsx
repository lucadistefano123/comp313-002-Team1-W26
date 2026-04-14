import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { getMoodHistoryRange } from "../api/moodApi";

// No shared tooltip needed; chart tooltip below shows day and comparison details.


export default function MoodHistoryChart({ onExport }) {
  const today = new Date();
  const todayStr = dateToInputString(today);
  const defaultPrimaryStart = dateToInputString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
  const defaultCompareEnd = dateToInputString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
  const defaultCompareStart = dateToInputString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13));

  const [days, setDays] = useState(7);
  const [primaryStart, setPrimaryStart] = useState(defaultPrimaryStart);
  const [primaryEnd, setPrimaryEnd] = useState(todayStr);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareStart, setCompareStart] = useState(defaultCompareStart);
  const [compareEnd, setCompareEnd] = useState(defaultCompareEnd);

  const [activePrimaryStart, setActivePrimaryStart] = useState(defaultPrimaryStart);
  const [activePrimaryEnd, setActivePrimaryEnd] = useState(todayStr);
  const [activeCompareStart, setActiveCompareStart] = useState(defaultCompareStart);
  const [activeCompareEnd, setActiveCompareEnd] = useState(defaultCompareEnd);

  const [primaryData, setPrimaryData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareWarning, setCompareWarning] = useState("");

  function dateToInputString(date) {
    return date.toISOString().slice(0, 10);
  }

  function setPresetDays(newDays) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (newDays - 1));

    const compEnd = new Date(start);
    compEnd.setDate(start.getDate() - 1);
    const compStart = new Date(compEnd);
    compStart.setDate(compEnd.getDate() - (newDays - 1));

    setDays(newDays);
    setPrimaryStart(dateToInputString(start));
    setPrimaryEnd(dateToInputString(end));
    setCompareStart(dateToInputString(compStart));
    setCompareEnd(dateToInputString(compEnd));
    setCompareEnabled(true);
    applyRanges(dateToInputString(start), dateToInputString(end), true, dateToInputString(compStart), dateToInputString(compEnd));
  }

  function validateDateRange(start, end) {
    if (!start || !end) return "Both start and end dates are required.";
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "Dates must be valid calendar dates.";
    }
    if (endDate < startDate) {
      return "End date must be the same or after start date.";
    }
    const todayDate = new Date();
    const todayDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    if (startDate > todayDay || endDate > todayDay) {
      return "Selected date range cannot include future dates.";
    }
    const diffDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 365) {
      return "Date range must be at most 365 days.";
    }
    return null;
  }

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    setCompareWarning("");
    try {
      const p = await getMoodHistoryRange(activePrimaryStart, activePrimaryEnd);
      const primaryHistory = p.history || [];
      setPrimaryData(primaryHistory);

      if (compareEnabled) {
        const c = await getMoodHistoryRange(activeCompareStart, activeCompareEnd);
        const compareHistory = c.history || [];
        setCompareData(compareHistory);

        const primaryHasData = primaryHistory.some((d) => d.avg !== null);
        const compareHasData = compareHistory.some((d) => d.avg !== null);
        if (primaryHasData !== compareHasData) {
          setCompareWarning("Partial comparison: one selected range has no mood data.");
        }
      } else {
        setCompareData([]);
      }
    } catch (e) {
      setError(e?.message || "Failed to load mood history.");
      setPrimaryData([]);
      setCompareData([]);
    } finally {
      setLoading(false);
    }
  }, [activePrimaryStart, activePrimaryEnd, activeCompareStart, activeCompareEnd, compareEnabled]);

  function applyRanges(primStart, primEnd, compareOn = compareEnabled, compStart = compareStart, compEnd = compareEnd) {
    setCompareWarning("");
    const primaryError = validateDateRange(primStart, primEnd);
    if (primaryError) {
      setError(primaryError);
      return;
    }

    if (compareOn) {
      const compareError = validateDateRange(compStart, compEnd);
      if (compareError) {
        setError(compareError);
        return;
      }

      if (primStart === compStart && primEnd === compEnd) {
        setError("Primary and comparison ranges are identical. Please choose a different comparison range.");
        return;
      }
    }

    setError("");
    setActivePrimaryStart(primStart);
    setActivePrimaryEnd(primEnd);

    if (compareOn) {
      setActiveCompareStart(compStart);
      setActiveCompareEnd(compEnd);
    } else {
      setActiveCompareStart("");
      setActiveCompareEnd("");
      setCompareData([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const chartData = useMemo(() => {
    const maxSize = Math.max(primaryData.length, compareData.length);
    return Array.from({ length: maxSize }, (_, i) => {
      const pd = primaryData[i] || { avg: null, date: null };
      const cd = compareData[i] || { avg: null, date: null };
      return {
        day: i + 1,
        primaryAvg: pd.avg,
        compareAvg: cd.avg,
        primaryDate: pd.date,
        compareDate: cd.date,
      };
    });
  }, [primaryData, compareData]);

  const primaryStats = useMemo(() => {
    const values = primaryData.filter((d) => d.avg !== null).map((d) => d.avg);
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [primaryData]);

  const compareStats = useMemo(() => {
    if (!compareEnabled) return null;
    const values = compareData.filter((d) => d.avg !== null).map((d) => d.avg);
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [compareData, compareEnabled]);

  const trendText = useMemo(() => {
    if (primaryStats === null || compareStats === null) return null;
    const diff = Math.round((primaryStats - compareStats) * 10) / 10;
    if (diff > 0) return `📈 Improvement of ${diff} points over comparison period.`;
    if (diff < 0) return `📉 Decline of ${Math.abs(diff)} points versus comparison period.`;
    return "➖ Stable mood compared to comparison period.";
  }, [primaryStats, compareStats]);

  const hasData = primaryData.some((d) => d.avg !== null) || compareData.some((d) => d.avg !== null);

  const tooltipTitle = (label) => `Day ${label}`;

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div style={tipStyles.box} role="tooltip" aria-live="polite">
        <p style={tipStyles.label}>{tooltipTitle(label)}</p>
        {compareEnabled && point.compareAvg !== null ? (
          <p style={tipStyles.value}>Compare ({point.compareDate || "N/A"}): <b>{point.compareAvg}</b>/10</p>
        ) : null}
        {point.primaryAvg !== null ? (
          <p style={tipStyles.value}>Primary ({point.primaryDate || "N/A"}): <b>{point.primaryAvg}</b>/10</p>
        ) : (
          <p style={tipStyles.muted}>No mood entry for this slot</p>
        )}
      </div>
    );
  };

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <h2 style={styles.h2}>Mood History Comparison</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="history-range" style={styles.filterLabel}>Preset range</label>
            <select
              id="history-range"
              value={days}
              onChange={(e) => setPresetDays(Number(e.target.value))}
              style={styles.select}
              aria-label="Select quick date range"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        <div style={styles.rangeRow}>
          <div style={styles.rangeGroup}>
            <label style={styles.filterLabel}>Primary range</label>
            <input
              type="date"
              value={primaryStart}
              onChange={(e) => setPrimaryStart(e.target.value)}
              style={styles.dateInput}
            />
            <span>→</span>
            <input
              type="date"
              value={primaryEnd}
              onChange={(e) => setPrimaryEnd(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.rangeGroup}>
            <label style={styles.filterLabel}>
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(e) => setCompareEnabled(e.target.checked)}
              />
              Compare range
            </label>
            <input
              type="date"
              value={compareStart}
              disabled={!compareEnabled}
              onChange={(e) => setCompareStart(e.target.value)}
              style={styles.dateInput}
            />
            <span>→</span>
            <input
              type="date"
              value={compareEnd}
              disabled={!compareEnabled}
              onChange={(e) => setCompareEnd(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <button
            onClick={() => applyRanges(primaryStart, primaryEnd, compareEnabled, compareStart, compareEnd)}
            style={styles.applyBtn}
          >
            Apply dates
          </button>
        </div>

        {error ? <p style={styles.error}>{error}</p> : null}
        {compareWarning ? <p style={styles.warning}>{compareWarning}</p> : null}

        {loading ? (
          <p role="status" style={styles.loading}>Loading mood data...</p>
        ) : !hasData ? (
          <div style={styles.empty} role="status" aria-label="No mood data available for the selected periods">
            No data available
          </div>
        ) : (
          <>
            <p style={styles.summary}>{trendText || "Comparing mood trends."}</p>
            <div role="img" aria-label="Mood comparison line chart" style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v) => `Day ${v}`}
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    aria-label="Mood rating from 0 to 10"
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <ReferenceLine y={5} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="primaryAvg"
                    stroke="#c084fc"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#c084fc", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#e879f9" }}
                    connectNulls={false}
                    name="Primary period"
                  />
                  {compareEnabled && (
                    <Line
                      type="monotone"
                      dataKey="compareAvg"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#7dd3fc" }}
                      connectNulls={false}
                      name="Comparison period"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {onExport && (
          <>
            <div style={styles.divider} />
            <div style={styles.exportSection}>
              <div>
                <h3 style={styles.exportHeading}>Export Your Data</h3>
                <p style={styles.exportDesc}>
                  Download your mood history to share with a clinician or keep for your own records.
                  Includes ratings, tags, and journal notes.
                </p>
              </div>
              <div style={styles.exportRow}>
                <button onClick={() => onExport("csv")}>Export CSV</button>
                <button onClick={() => onExport("pdf")}>Export PDF</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  shell: { display: "flex", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: 20,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 },
  h2: { margin: 0, fontSize: 26 },
  filterLabel: { fontSize: 13, opacity: 0.7, whiteSpace: "nowrap" },
  select: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
  },
  rangeRow: {
    display: "grid",
    gap: 12,
    marginBottom: 14,
    padding: "12px 0",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  rangeGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    rowGap: 6,
  },
  dateInput: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
    fontSize: 14,
  },
  applyBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(148,163,184,0.25)",
    color: "#f8fafc",
    cursor: "pointer",
  },
  summary: { margin: "10px 0 8px", color: "#e5e7eb", fontSize: 14, opacity: 0.95 },
  error: { color: "#fca5a5", fontSize: 13, marginBottom: 8 },
  warning: { color: "#fcd34d", fontSize: 13, marginBottom: 8 },
  loading: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 8 },
  empty: {
    height: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,0.14)",
  },
  divider: { height: 1, background: "rgba(255,255,255,0.10)", margin: "20px 0 0" },
  exportSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    paddingTop: 16,
  },
  exportHeading: { margin: 0, fontSize: 16, fontWeight: 700 },
  exportDesc: { margin: "6px 0 0", fontSize: 13, opacity: 0.65, maxWidth: 380 },
  exportRow: {
    display: "flex",
    gap: 10,
    flexShrink: 0,
  },
};

const tipStyles = {
  box: {
    background: "rgba(15,23,42,0.92)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
  },
  label: { margin: 0, opacity: 0.6, marginBottom: 4 },
  value: { margin: 0 },
  muted: { margin: 0, opacity: 0.5 },
};
