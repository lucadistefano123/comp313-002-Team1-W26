import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MoodCheckIn from "./pages/MoodCheckIn";
import Journal from "./pages/Journal";
import MoodHistoryChart from "./pages/MoodHistoryChart";
import { logoutUser, me } from "./api/authApi";
import AdminDashboard from "./pages/AdminDashboard";
import { getFlags } from "./api/flagsApi";

export default function App() {
  const [page, setPage] = useState("login");
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authedPage, setAuthedPage] = useState("mood");
  const [moodPrefill, setMoodPrefill] = useState("");

  const [flags, setFlags] = useState({}); // key -> boolean
  const isAdmin = currentUser?.role === "admin";

  async function loadFlags() {
    const arr = await getFlags();
    const map = {};
    for (const f of arr) map[f.key] = f.enabled;
    setFlags(map);
  }

  useEffect(() => {
    me()
      .then(async (data) => {
        setIsAuthed(true);
        setCurrentUser(data.user);
        await loadFlags().catch(() => setFlags({}));
        setAuthedPage(data.user.role === "admin" ? "admin" : "mood");
      })
      .catch(() => {
        setIsAuthed(false);
        setCurrentUser(null);
        setFlags({});
      });
  }, []);

  async function handleLogout() {
    await logoutUser();
    setIsAuthed(false);
    setCurrentUser(null);
    setFlags({});
    setPage("login");
    setAuthedPage("mood");
    setMoodPrefill("");
  }

  async function handleAuthed(user) {
    setIsAuthed(true);
    setCurrentUser(user || null);
    await loadFlags().catch(() => setFlags({}));
    if (user?.role === "admin") setAuthedPage("admin");
    else setAuthedPage("mood");
  }

  async function handleExport(format = "csv") {
    // ✅ feature flag enforcement (front-end)
    if (flags.exportEnabled === false) {
      alert("Export is currently disabled by policy.");
      return;
    }

    try {
      const res = await fetch(`/api/export?format=${format}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        let msg = "Export failed.";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {}
        alert(msg);
        return;
      }

      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "csv";
      const filename = `mindsync-export-${new Date().toISOString().slice(0, 10)}.${ext}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed.");
    }
  }

  // ✅ keep user from landing on disabled tabs
  useEffect(() => {
    if (!isAuthed || isAdmin) return;

    if (authedPage === "mood" && flags.moodCheckInEnabled === false) setAuthedPage("journal");
    if (authedPage === "journal" && flags.journalEnabled === false) setAuthedPage("history");
    if (authedPage === "history" && flags.moodHistoryEnabled === false) setAuthedPage("mood");
  }, [isAuthed, isAdmin, authedPage, flags]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Welcome to MindSync Wellness Portal</h1>
        <p style={styles.subtitle}>Track your emotions. Understand your mind. Improve your wellbeing.</p>

        <div style={styles.topBar}>
          {isAuthed ? (
            <>
              <div style={styles.userPill}>
                {currentUser?.fullName ? `👋 ${currentUser.fullName}` : "👋 Logged in"}
                {currentUser?.role ? ` — ${currentUser.role}` : ""}
              </div>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <div style={styles.nav}>
              <button onClick={() => setPage("login")}>Login</button>
              <button onClick={() => setPage("register")}>Register</button>
            </div>
          )}
        </div>

        {/* ✅ NAV */}
        {isAuthed ? (
          <div style={styles.authedNav}>
            {isAdmin ? (
              <button
                onClick={() => setAuthedPage("admin")}
                style={authedPage === "admin" ? styles.authedBtnOn : styles.authedBtn}
              >
                Admin
              </button>
            ) : (
              <>
                {flags.moodCheckInEnabled !== false && (
                  <button
                    onClick={() => setAuthedPage("mood")}
                    style={authedPage === "mood" ? styles.authedBtnOn : styles.authedBtn}
                  >
                    Mood Check-In
                  </button>
                )}

                {flags.journalEnabled !== false && (
                  <button
                    onClick={() => setAuthedPage("journal")}
                    style={authedPage === "journal" ? styles.authedBtnOn : styles.authedBtn}
                  >
                    Journal
                  </button>
                )}

                {flags.moodHistoryEnabled !== false && (
                  <button
                    onClick={() => setAuthedPage("history")}
                    style={authedPage === "history" ? styles.authedBtnOn : styles.authedBtn}
                  >
                    Mood History
                  </button>
                )}
              </>
            )}
          </div>
        ) : null}
      </header>

      {/* ✅ PAGE RENDER */}
      {isAuthed ? (
        isAdmin ? (
          <AdminDashboard />
        ) : authedPage === "mood" ? (
          <MoodCheckIn initialNote={moodPrefill} />
        ) : authedPage === "history" ? (
          <MoodHistoryChart onExport={handleExport} />
        ) : (
          <Journal
            onSendToMood={(text) => {
              setMoodPrefill(text);
              setAuthedPage("mood");
            }}
          />
        )
      ) : page === "login" ? (
        <Login onAuthed={handleAuthed} />
      ) : (
        <Register onAuthed={handleAuthed} />
      )}
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "linear-gradient(135deg, #1f2937, #0f172a, #1e3a8a)" },
  header: { textAlign: "center", paddingTop: 60, paddingBottom: 10 },
  title: {
    fontSize: "2.8rem",
    fontWeight: 700,
    background: "linear-gradient(90deg, #7dd3fc, #c084fc, #86efac)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
    letterSpacing: 1,
  },
  subtitle: { marginTop: 10, color: "#cbd5f5", fontSize: "1.1rem", opacity: 0.9 },
  topBar: { marginTop: 18, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", flexWrap: "wrap" },
  nav: { display: "flex", justifyContent: "center", gap: 12 },
  userPill: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    fontWeight: 600,
  },
  authedNav: { marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  authedBtn: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.10)",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
  },
  authedBtnOn: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(192,132,252,0.55)",
    background: "rgba(192,132,252,0.20)",
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(192,132,252,0.15)",
  },
};