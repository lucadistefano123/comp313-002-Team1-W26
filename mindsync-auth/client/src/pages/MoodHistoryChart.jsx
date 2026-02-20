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

export default function MoodHistoryChart({ data = [], days }) {
  const hasData = data.some((d) => d.avg !== null);

  if (!hasData) {
    return (
      <div
        style={styles.empty}
        role="status"
        aria-label="No mood data available for the selected period"
      >
        No data available
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Line chart of average daily mood ratings over the last ${days} days`}
      style={{ width: "100%", height: 260 }}
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
  );
}

const styles = {
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
