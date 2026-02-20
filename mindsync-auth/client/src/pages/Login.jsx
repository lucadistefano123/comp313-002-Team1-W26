import { useState } from "react";
import { loginUser, logoutUser } from "../api/authApi";

export default function Login({ onAuthed }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      const data = await loginUser(form);
      setMsg(`✅ Logged in as ${data.user.fullName} (${data.user.role})`);
      onAuthed?.(data.user); // ✅ tell App we are logged in
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
        <h2 style={styles.title}>Login</h2>

        <form onSubmit={onSubmit} style={styles.form}>
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
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={update}
            required
          />

          {/* ✅ no inline button styling so it follows your wellness theme */}
          <button type="submit">Login</button>
          
        </form>

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
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)"
  },
  title: { marginTop: 0, marginBottom: 12 },
  form: { display: "grid", gap: 12 },
  input: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
    fontSize: 14
  },
  ok: { marginTop: 12, opacity: 0.9 },
  bad: { marginTop: 12, opacity: 0.9 }
};
