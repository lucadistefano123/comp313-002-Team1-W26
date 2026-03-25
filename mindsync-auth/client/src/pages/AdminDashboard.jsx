import { useEffect, useState } from "react";
import { getUsers, toggleUser, setUserRole, getAuditLogs } from "../api/adminApi";
import { getFlags, updateFlag } from "../api/flagsApi";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  async function refresh() {
    setErr("");
    setMsg("");
    const u = await getUsers();
    setUsers(u.users || []);
    const l = await getAuditLogs();
    setLogs(l.logs || []);
    const f = await getFlags();
    setFeatureFlags(f || []);
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

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Admin Dashboard</h1>

      {msg && <p style={{ color: "#3ddc97" }}>✅ {msg}</p>}
      {err && <p style={{ color: "#ff4d4f" }}>❌ {err}</p>}

      {/* ===================== TABS ===================== */}
      <div style={styles.tabsContainer}>
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