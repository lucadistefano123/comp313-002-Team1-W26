import { useEffect, useState } from "react";
import { getUsers, toggleUser, setUserRole, getAuditLogs } from "../api/adminApi";
import { getFlags, updateFlag } from "../api/flagsApi";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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

      {msg && <p style={{ opacity: 0.9 }}>✅ {msg}</p>}
      {err && <p style={{ opacity: 0.9 }}>❌ {err}</p>}

      {/* ===================== USERS ===================== */}
      <h2 style={{ marginTop: 24 }}>Users</h2>
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
            <div>{u.role}</div>
            <div>{u.isActive ? "ACTIVE" : "DISABLED"}</div>

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

      {/* ===================== FEATURE FLAGS ===================== */}
      <h2 style={{ marginTop: 30 }}>Feature Flags</h2>
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

      {/* ===================== AUDIT LOGS ===================== */}
      <h2 style={{ marginTop: 30 }}>Audit Logs</h2>
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

              {l.targetUserId?._id && (
                <button
                  onClick={() =>
                    downloadUserAudit(l.targetUserId._id, l.targetUserId.email || "user")
                  }
                >
                  Download Target Data
                </button>
              )}
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
  );
}