import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MoodCheckIn from "./pages/MoodCheckIn";
import Journal from "./pages/Journal";
import MoodHistoryChart from "./pages/MoodHistoryChart";
import { logoutUser, me } from "./api/authApi";

export default function App() {
  const [page, setPage] = useState("login");
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [authedPage, setAuthedPage] = useState("mood");
  const [moodPrefill, setMoodPrefill] = useState("");

  useEffect(() => {
    me()
      .then((data) => {
        setIsAuthed(true);
        setCurrentUser(data.user);
        setAuthedPage("mood");
      })
      .catch(() => {
        setIsAuthed(false);
        setCurrentUser(null);
      });
  }, []);

  useEffect(() => {
    const tabNames = {
      mood: "Mood Check-In",
      journal: "Journal",
      history: "Mood History",
    };
    if (isAuthed) {
      document.title = `${tabNames[authedPage] ?? "Home"} | MindSync`;
    } else {
      document.title = `${page === "register" ? "Register" : "Login"} | MindSync`;
    }
  }, [isAuthed, authedPage, page]);

  async function handleLogout() {
    await logoutUser();
    setIsAuthed(false);
    setCurrentUser(null);
    setPage("login");
    setAuthedPage("mood");
    setMoodPrefill("");
  }

  function handleAuthed(user) {
    setIsAuthed(true);
    setCurrentUser(user || null);
    setAuthedPage("mood");
  }

  // ✅ EXPORT FUNCTION
  async function handleExport(format = "csv") {
    try {
      const res = await fetch(`http://localhost:5000/api/export?format=${format}`, {
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

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Welcome to MindSync Wellness Portal</h1>
        <p style={styles.subtitle}>
          Track your emotions. Understand your mind. Improve your wellbeing.
        </p>

        <div style={styles.topBar}>
          {isAuthed ? (
            <>
              <div style={styles.userPill}>
                {currentUser?.fullName ? `👋 ${currentUser.fullName}` : "👋 Logged in"}
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

        {/* ✅ AUTHED NAV WITH EXPORT BUTTON */}
        {isAuthed ? (
          <div style={styles.authedNav}>
            <button
              onClick={() => setAuthedPage("mood")}
              style={authedPage === "mood" ? styles.authedBtnOn : styles.authedBtn}
            >
              Mood Check-In
            </button>

            <button
              onClick={() => setAuthedPage("journal")}
              style={authedPage === "journal" ? styles.authedBtnOn : styles.authedBtn}
            >
              Journal
            </button>
            <button
              onClick={() => setAuthedPage("history")}
              style={authedPage === "history" ? styles.authedBtnOn : styles.authedBtn}
            >
              Mood History
            </button>

            {/* EXPORT */}
            <button onClick={() => handleExport("csv")} style={styles.authedBtn}>
  Export CSV
</button>
<button onClick={() => handleExport("pdf")} style={styles.authedBtn}>
  Export PDF
</button>
          </div>
        ) : null}
      </header>

      {isAuthed ? (
        authedPage === "mood" ? (
          <MoodCheckIn initialNote={moodPrefill} />
        ) : authedPage === "history" ? (
          <MoodHistoryChart />
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
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1f2937, #0f172a, #1e3a8a)",
  },

  header: {
    textAlign: "center",
    paddingTop: 60,
    paddingBottom: 10,
  },

  title: {
    fontSize: "2.8rem",
    fontWeight: 700,
    background: "linear-gradient(90deg, #7dd3fc, #c084fc, #86efac)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 10,
    color: "#cbd5f5",
    fontSize: "1.1rem",
    opacity: 0.9,
  },

  topBar: {
    marginTop: 18,
    display: "flex",
    justifyContent: "center",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  nav: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
  },

  userPill: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    fontWeight: 600,
  },

  authedNav: {
    marginTop: 16,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },

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