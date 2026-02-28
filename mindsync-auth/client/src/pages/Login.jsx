import { useState } from "react";
import { loginUser, logoutUser, registerUser } from "../api/authApi";

export default function Login({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    isAdmin: false,
    isClinician: false,
    clinicianLanding: false, // login-only: "I'm a clinician" shortcut
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => {
      const next = {
        ...f,
        [name]: type === "checkbox" ? checked : value,
      };

      // prevent conflicting role picks on register
      if (mode === "register") {
        if (name === "isClinician" && checked) next.isAdmin = false;
        if (name === "isAdmin" && checked) next.isClinician = false;
      }

      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      // ===============================
      // LOGIN
      // ===============================
      if (mode === "login") {
        const data = await loginUser({
          email: form.email,
          password: form.password,
        });

        setMsg(`✅ Logged in as ${data.user.fullName} (${data.user.role})`);

        // If they ticked clinician landing OR user role is clinician, go clinician tab
        const landing =
          data.user.role === "clinician" || form.clinicianLanding
            ? "clinician"
            : data.user.role === "admin"
            ? "admin"
            : "mood";

        // Pass landing to App (recommended)
        onAuthed?.(data.user, landing);
      }

      // ===============================
      // REGISTER
      // ===============================
      else {
        const role = form.isAdmin ? "admin" : form.isClinician ? "clinician" : "user";

        const data = await registerUser({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role,
        });

        setMsg(`✅ Registered as ${data.user.fullName} (${data.user.role})`);
        // optional: auto-login behavior depends on your backend; keeping your existing behavior
      }
    } catch (e2) {
      setErr(`❌ ${e2.message}`);
    }
  }

  async function doLogout() {
    setMsg("");
    setErr("");
    await logoutUser();
    setMsg("✅ Logged out");
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <h2 style={styles.title}>{mode === "login" ? "Login" : "Register"}</h2>

        <form onSubmit={onSubmit} style={styles.form}>
          {mode === "register" && (
            <input
              style={styles.input}
              name="fullName"
              placeholder="Full Name"
              value={form.fullName}
              onChange={update}
              required
            />
          )}

          <input
            style={styles.input}
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={update}
            required
          />

          <input
            style={styles.input}
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update}
            required
          />

        

          {/* REGISTER ONLY: role selection */}
          {mode === "register" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  name="isClinician"
                  checked={form.isClinician}
                  onChange={update}
                />
                {" "}Register as Clinician
              </label>

              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  name="isAdmin"
                  checked={form.isAdmin}
                  onChange={update}
                  disabled={form.isClinician}
                />
                {" "}Register as Admin
                {form.isClinician && (
                  <span style={styles.hint}> (disabled while Clinician is selected)</span>
                )}
              </label>
            </div>
          )}

          <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        </form>

        {/* SWITCH MODE */}
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ marginTop: 10 }}
        >
          {mode === "login" ? "Create account" : "Already have account? Login"}
        </button>

        <button onClick={doLogout} style={{ marginTop: 6 }}>
          Logout
        </button>

        {msg && <p style={styles.ok}>{msg}</p>}
        {err && <p style={styles.bad}>{err}</p>}
      </div>
    </div>
  );
}

const styles = {
  shell: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  title: { marginTop: 0, marginBottom: 12 },
  form: { display: "grid", gap: 12 },
  input: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
    fontSize: 14,
  },
  checkRow: { fontSize: 14, display: "flex", alignItems: "center", gap: 8 },
  hint: { fontSize: 12, opacity: 0.75 },
  ok: { marginTop: 12, opacity: 0.9 },
  bad: { marginTop: 12, opacity: 0.9 },
};