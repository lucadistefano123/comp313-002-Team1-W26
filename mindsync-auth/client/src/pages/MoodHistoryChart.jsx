import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getMoodHistory } from "../api/moodApi";

/**
 * Formats an ISO date string (YYYY-MM-DD) to a short label like "Feb 20".
 */
function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={tipStyles.box} role="tooltip" aria-live="polite">
      <p style={tipStyles.label}>{fmtDate(label)}</p>
      {val !== null && val !== undefined ? (
        <p style={tipStyles.value}>Avg mood: <b>{val}</b>/10</p>
      ) : (
        <p style={tipStyles.muted}>No entry</p>
      )}
    </div>
  );
};

export default function MoodHistoryChart() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState([]);

  useEffect(() => {
    getMoodHistory(days)
      .then((res) => setData(res.history || []))
      .catch(() => setData([]));
  }, [days]);

  const hasData = data.some((d) => d.avg !== null);

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <h2 style={styles.h2}>Mood History</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="history-range" style={styles.filterLabel}>Time range</label>
            <select
              id="history-range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={styles.select}
              aria-label="Select time range"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>

        {!hasData ? (
          <div
            style={styles.empty}
            role="status"
            aria-label="No mood data available for the selected period"
          >
            No data available
          </div>
        ) : (
          <div
            role="img"
            aria-label={`Line chart of average daily mood ratings over the last ${days} days`}
            style={{ width: "100%", height: 300 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  aria-label="Mood rating from 0 to 10"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={5} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#c084fc"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#c084fc", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#e879f9" }}
                  connectNulls={false}
                  name="Avg mood"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
