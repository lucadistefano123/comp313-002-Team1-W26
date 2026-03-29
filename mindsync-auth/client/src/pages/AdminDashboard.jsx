import { useEffect, useState } from "react";
import {
  getUsers,
  toggleUser,
  setUserRole,
  getAuditLogs,
  getMoodTrends,
  getSystemMetrics,
  getReportPdf,
  listReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
} from "../api/adminApi";
import { getFlags, updateFlag } from "../api/flagsApi";
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

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("analytics");

  const today = new Date();
  const dateToInput = (date) => date.toISOString().slice(0, 10);
  const [trendStart, setTrendStart] = useState(dateToInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)));
  const [trendEnd, setTrendEnd] = useState(dateToInput(today));
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState("");
  const [systemMetrics, setSystemMetrics] = useState({
    range: { start: "", end: "" },
    totals: { loginFrequency: 0, featureUsage: 0, errorCount: 0 },
    daily: { loginFrequency: [], featureUsage: [], errorCount: [] },
    featureUsageByKey: [],
    errorCountByCategory: [],
  });

  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleStart, setScheduleStart] = useState(dateToInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)));
  const [scheduleEnd, setScheduleEnd] = useState(dateToInput(today));
  const [schedules, setSchedules] = useState([]);
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [scheduleErr, setScheduleErr] = useState("");


  async function refresh() {
    setErr("");
    setMsg("");
    const u = await getUsers();
    setUsers(u.users || []);
    const l = await getAuditLogs();
    setLogs(l.logs || []);
    const f = await getFlags();
    setFeatureFlags(f || []);
    await loadMoodTrends(trendStart, trendEnd);
    await loadSystemMetrics(trendStart, trendEnd);
    await loadSchedules();
  }

  async function loadMoodTrends(start, end) {
    setTrendError("");
    setTrendLoading(true);
    try {
      const data = await getMoodTrends(start, end);
      setTrendData(data.history || []);
    } catch (e) {
      setTrendError(e?.message || "Failed to load mood trends");
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  }

  async function loadSystemMetrics(start, end) {
    setMetricsError("");
    setMetricsLoading(true);
    try {
      const data = await getSystemMetrics(start, end);
      setSystemMetrics({
        range: data.range || { start, end },
        totals: data.totals || { loginFrequency: 0, featureUsage: 0, errorCount: 0 },
        daily: data.daily || { loginFrequency: [], featureUsage: [], errorCount: [] },
        featureUsageByKey: data.featureUsageByKey || [],
        errorCountByCategory: data.errorCountByCategory || [],
      });
    } catch (e) {
      setMetricsError(e?.message || "Failed to load system metrics");
      setSystemMetrics({
        range: { start, end },
        totals: { loginFrequency: 0, featureUsage: 0, errorCount: 0 },
        daily: { loginFrequency: [], featureUsage: [], errorCount: [] },
        featureUsageByKey: [],
        errorCountByCategory: [],
      });
    } finally {
      setMetricsLoading(false);
    }
  }

  async function applyAnalyticsRange(start, end) {
    await Promise.all([loadMoodTrends(start, end), loadSystemMetrics(start, end)]);
  }

  async function loadSchedules() {
    try {
      setScheduleErr("");
      const data = await listReportSchedules();
      setSchedules(data.schedules || []);
    } catch (e) {
      setScheduleErr(e?.message || "Failed to load schedules");
      setSchedules([]);
    }
  }

  function setTrendPreset(days) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    const startStr = dateToInput(startDate);
    const endStr = dateToInput(endDate);
    setTrendStart(startStr);
    setTrendEnd(endStr);
    applyAnalyticsRange(startStr, endStr);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
  }, []);

  async function onToggle(id) {
    setErr("");
    setMsg("");
    try {
      const r = await toggleUser(id);
      setMsg(r.message);
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onRole(id, role) {
    setErr("");
    setMsg("");
    try {
      const r = await setUserRole(id, role);
      setMsg(r.message);
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function downloadUserAudit(userId, email = "user") {
    try {
      const res = await fetch(`/api/admin/users/${userId}/audit-export`, {
        credentials: "include",
      });
      if (!res.ok) {
        let m = "Download failed.";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch {}
        throw new Error(m);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${email}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onToggleFlag(key, enabled) {
    setErr("");
    setMsg("");
    try {
      await updateFlag(key, !enabled);
      setMsg(`Flag "${key}" updated.`);
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function createSchedule() {
    setScheduleErr("");
    setScheduleMsg("");
    try {
      const data = await createReportSchedule({
        frequency: scheduleFrequency,
        startDate: scheduleStart,
        endDate: scheduleEnd,
      });
      setScheduleMsg("Schedule created.");
      setSchedules((prev) => [data.schedule, ...prev]);
    } catch (e) {
      setScheduleErr(e.message);
    }
  }

  async function removeSchedule(id) {
    setScheduleErr("");
    setScheduleMsg("");
    try {
      await deleteReportSchedule(id);
      setScheduleMsg("Schedule deleted.");
      setSchedules((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      setScheduleErr(e.message);
    }
  }

  async function exportPdf() {
    try {
      const blob = await getReportPdf(trendStart, trendEnd);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-report-${trendStart}-${trendEnd}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setTrendError(e.message);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Admin Dashboard</h1>

      {msg && <p style={{ color: "#3ddc97" }}>✅ {msg}</p>}
      {err && <p style={{ color: "#ff4d4f" }}>❌ {err}</p>}

      {/* ===================== TABS ===================== */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("analytics")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "analytics" ? styles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "reports" ? styles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "users" ? styles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "flags" ? styles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          Feature Flags
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "logs" ? styles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          Audit Logs
        </button>
      </div>

      {/* ===================== ANALYTICS TAB ===================== */}
      {activeTab === "analytics" && (
        <div style={styles.tabContent}>
          <h2>Organization Mood Trends</h2>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Range</label>
            <select value={trendStart === null ? "" : 7} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }} readOnly>
              <option>Custom</option>
            </select>
            <button onClick={() => setTrendPreset(7)} style={{ padding: "8px 10px", borderRadius: 12 }}>Last 7 days</button>
            <button onClick={() => setTrendPreset(30)} style={{ padding: "8px 10px", borderRadius: 12 }}>Last 30 days</button>
            <button onClick={() => setTrendPreset(90)} style={{ padding: "8px 10px", borderRadius: 12 }}>Last 90 days</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              data-testid="admin-trend-start"
              type="date"
              value={trendStart}
              onChange={(e) => setTrendStart(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }}
            />
            <span style={{ color: "rgba(255,255,255,0.7)"}}>→</span>
            <input
              data-testid="admin-trend-end"
              type="date"
              value={trendEnd}
              onChange={(e) => setTrendEnd(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }}
            />
            <button onClick={() => applyAnalyticsRange(trendStart, trendEnd)} style={{ padding: "8px 12px", borderRadius: 12, backgroundColor: "#4f46e5", border: "none", color: "white" }}>
              Apply
            </button>
          </div>

          {trendError && <p style={{ color: "#fca5a5" }}>{trendError}</p>}
          {trendLoading ? (
            <p>Loading trend data…</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={5} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="avg" stroke="#c084fc" strokeWidth={2} dot={false} name="Org average" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 style={{ marginTop: 20 }}>System Usage Metrics</h3>
          {metricsError && <p style={{ color: "#fca5a5" }}>{metricsError}</p>}
          {metricsLoading ? (
            <p>Loading metrics…</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>Login Frequency</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{systemMetrics.totals.loginFrequency || 0}</div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>Feature Usage</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{systemMetrics.totals.featureUsage || 0}</div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>System Errors</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{systemMetrics.totals.errorCount || 0}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginBottom: 16 }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <h3 style={{ marginTop: 0 }}>Feature Usage By Key</h3>
                  {systemMetrics.featureUsageByKey.length === 0 ? (
                    <p style={{ margin: 0, opacity: 0.72 }}>No feature usage in this range (0).</p>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {systemMetrics.featureUsageByKey.map((item) => (
                        <div key={item.featureKey} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>{item.featureKey}</span>
                          <b>{item.count}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <h3 style={{ marginTop: 0 }}>Error Count By Category</h3>
                  {systemMetrics.errorCountByCategory.length === 0 ? (
                    <p style={{ margin: 0, opacity: 0.72 }}>No system errors in this range (0).</p>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {systemMetrics.errorCountByCategory.map((item) => (
                        <div key={item.category} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>{item.category}</span>
                          <b>{item.count}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== REPORTS TAB ===================== */}
      {activeTab === "reports" && (
        <div style={styles.tabContent}>
          <h2>Scheduled Summary Reports</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <select
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <input
              type="date"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }}
            />
            <span>→</span>
            <input
              type="date"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", color: "inherit" }}
            />

            <button
              onClick={createSchedule}
              style={{ padding: "8px 12px", borderRadius: 12, backgroundColor: "#4f46e5", border: "none", color: "white" }}
            >
              Schedule Report
            </button>

            <button
              onClick={exportPdf}
              style={{ padding: "8px 12px", borderRadius: 12, backgroundColor: "#0ea5e9", border: "none", color: "white" }}
            >
              Generate PDF Now
            </button>
          </div>

          {scheduleMsg && <p style={{ color: "#a3e635" }}>{scheduleMsg}</p>}
          {scheduleErr && <p style={{ color: "#fca5a5" }}>{scheduleErr}</p>}

          <div style={{ display: "grid", gap: 8, marginBottom: 15 }}>
            {schedules.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No schedulers created yet.</p>
            ) : (
              schedules.map((s) => (
                <div key={s._id} style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.04)" }}>
                  <div><strong>{s.frequency}</strong> schedule ({new Date(s.startDate).toISOString().slice(0, 10)} → {new Date(s.endDate).toISOString().slice(0, 10)})</div>
                  <div style={{ fontSize: 13, opacity: 0.72 }}>
                    Active: {s.active ? "Yes" : "No"} | Last run: {s.lastRun ? new Date(s.lastRun).toLocaleString() : "Never"}
                  </div>
                  <button onClick={() => removeSchedule(s._id)} style={{ marginTop: 6 }}>Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== USERS TAB ===================== */}
      {activeTab === "users" && (
        <div style={styles.tabContent}>
          <h2>Users</h2>
          <div style={styles.sectionCard}>
            <div style={styles.scrollList}>
              <div style={{ display: "grid", gap: 10 }}>
              {users.map((u) => (
                <div
                  key={u._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 1fr 1fr 2.8fr",
                    gap: 10,
                    alignItems: "center",
                    padding: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.18)",
                  }}
                >
                  <div>
                    <b>{u.fullName}</b>
                  </div>
                  <div>{u.email}</div>
                  <div>
                    <span
                      style={{
                        ...styles.badge,
                        ...(u.role === "admin" ? styles.badgeAdmin : styles.badgeUser),
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        ...styles.badge,
                        ...(u.isActive ? styles.badgeActive : styles.badgeDisabled),
                      }}
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => onToggle(u._id)}>{u.isActive ? "Disable" : "Enable"}</button>

                    <button onClick={() => onRole(u._id, u.role === "admin" ? "user" : "admin")}>
                      Make {u.role === "admin" ? "User" : "Admin"}
                    </button>

                    <button onClick={() => downloadUserAudit(u._id, u.email)}>Download Data</button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== FEATURE FLAGS TAB ===================== */}
      {activeTab === "flags" && (
        <div style={styles.tabContent}>
          <h2>Feature Flags</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {featureFlags.map((f) => (
              <div
                key={f.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <div>
                  <b>{f.key}</b>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{f.description}</div>
                </div>

                <button onClick={() => onToggleFlag(f.key, f.enabled)}>
                  {f.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== AUDIT LOGS TAB ===================== */}
      {activeTab === "logs" && (
        <div style={styles.tabContent}>
          <h2>Audit Logs</h2>
          <div style={styles.sectionCard}>
            <div style={styles.scrollList}>
              <div style={{ display: "grid", gap: 8 }}>
              {logs.map((l) => (
                <div
                  key={l._id}
                  style={{
                    padding: 10,
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.12)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <b>{l.action}</b> — {new Date(l.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ opacity: 0.9, fontSize: 14 }}>
                    Admin: {l.adminId?.fullName || "?"} ({l.adminId?.email || "?"})
                    {l.targetUserId ? (
                      <>
                        {" "}
                        | Target: {l.targetUserId?.fullName || "?"} ({l.targetUserId?.email || "?"})
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tabsContainer: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
    borderBottom: "1px solid rgba(255,255,255,0.14)",
  },
  tabButton: {
    padding: "10px 16px",
    border: "none",
    borderBottom: "3px solid transparent",
    background: "transparent",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  tabButtonActive: {
    borderBottomColor: "#c084fc",
    color: "#c084fc",
  },
  tabButtonInactive: {
    color: "rgba(255,255,255,0.6)",
  },
  tabContent: {
    marginTop: 20,
  },
  sectionCard: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(0,0,0,0.2)",
    backdropFilter: "blur(10px)",
  },
  scrollList: {
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: 4,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    border: "1px solid transparent",
    textTransform: "capitalize",
  },
  badgeAdmin: {
    color: "#f5d0fe",
    background: "rgba(168,85,247,0.18)",
    borderColor: "rgba(168,85,247,0.45)",
  },
  badgeUser: {
    color: "#bfdbfe",
    background: "rgba(59,130,246,0.16)",
    borderColor: "rgba(59,130,246,0.4)",
  },
  badgeActive: {
    color: "#bbf7d0",
    background: "rgba(34,197,94,0.16)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  badgeDisabled: {
    color: "#fecaca",
    background: "rgba(239,68,68,0.16)",
    borderColor: "rgba(239,68,68,0.4)",
  },
};