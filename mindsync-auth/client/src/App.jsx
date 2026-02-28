import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MoodCheckIn from "./pages/MoodCheckIn";
import Journal from "./pages/Journal";
import MoodHistoryChart from "./pages/MoodHistoryChart";
import { logoutUser, me } from "./api/authApi";
import AdminDashboard from "./pages/AdminDashboard";
import { getFlags } from "./api/flagsApi";
import ClinicianDashboard from "./pages/ClinicianDashboard";

export default function App() {
  const [page, setPage] = useState("login");
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authedPage, setAuthedPage] = useState("mood");
  const [moodPrefill, setMoodPrefill] = useState("");
  const [flags, setFlags] = useState({});

  const isAdmin = currentUser?.role === "admin";
  const isClinician = currentUser?.role === "clinician";

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

        if (data.user.role === "admin") setAuthedPage("admin");
        else if (data.user.role === "clinician") setAuthedPage("clinician");
        else setAuthedPage("mood");
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
    else if (user?.role === "clinician") setAuthedPage("clinician");
    else setAuthedPage("mood");
  }

  async function handleExport(format = "csv") {
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
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Export failed.");
        return;
      }

      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "csv";
      const filename = `mindsync-export-${new Date()
        .toISOString()
        .slice(0, 10)}.${ext}`;

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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1f2937, #0f172a, #1e3a8a)" }}>
      <header style={{ textAlign: "center", paddingTop: 60, paddingBottom: 10 }}>
        <h1 style={{
          fontSize: "2.8rem",
          fontWeight: 700,
          background: "linear-gradient(90deg, #7dd3fc, #c084fc, #86efac)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
        }}>
          Welcome to MindSync Wellness Portal
        </h1>

        <div style={{ marginTop: 18 }}>
          {isAuthed ? (
            <>
              <div style={{ marginBottom: 10 }}>
                👋 {currentUser?.fullName} — {currentUser?.role}
              </div>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => setPage("login")}>Login</button>
              <button onClick={() => setPage("register")} style={{ marginLeft: 10 }}>
                Register
              </button>
            </>
          )}
        </div>

        {isAuthed && (
          <div style={{ marginTop: 16 }}>
            {isAdmin && (
              <button onClick={() => setAuthedPage("admin")}>Admin</button>
            )}

            {isClinician && (
              <button onClick={() => setAuthedPage("clinician")} style={{ marginLeft: 10 }}>
                Clinician
              </button>
            )}

            {!isAdmin && !isClinician && (
              <>
                <button onClick={() => setAuthedPage("mood")} style={{ marginLeft: 10 }}>
                  Mood Check-In
                </button>
                <button onClick={() => setAuthedPage("journal")} style={{ marginLeft: 10 }}>
                  Journal
                </button>
                <button onClick={() => setAuthedPage("history")} style={{ marginLeft: 10 }}>
                  Mood History
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {isAuthed ? (
        isAdmin && authedPage === "admin" ? (
          <AdminDashboard />
        ) : isClinician && authedPage === "clinician" ? (
          <ClinicianDashboard />
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