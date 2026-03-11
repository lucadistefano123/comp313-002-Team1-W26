import { useState } from "react";
import { loginUser } from "../api/authApi";

export default function Login({ onAuthed, onGoToRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      const data = await loginUser({ email: form.email, password: form.password });
      setMsg(`✅ Logged in as ${data.user.fullName} (${data.user.role})`);

      const landing =
        data.user.role === "clinician"
          ? "clinician"
          : data.user.role === "admin"
          ? "admin"
          : "mood";

      onAuthed?.(data.user, landing);
    } catch (e2) {
      setErr(`❌ ${e2.message}`);
    }
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
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update}
            required
          />

          <button type="submit">Login</button>
        </form>

        <button
          onClick={onGoToRegister}
          style={{ marginTop: 10, width: "100%" }}
        >
          Create Account
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