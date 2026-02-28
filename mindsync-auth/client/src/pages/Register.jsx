import { useState } from "react";
import { registerUser } from "../api/authApi";

export default function Register({ onAuthed }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user", // user | clinician | admin
  });

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
      const data = await registerUser(form);
      setMsg(`✅ Registered as ${data.user.fullName} (${data.user.role})`);
      onAuthed?.(data.user, data.user.role === "clinician" ? "clinician" : data.user.role === "admin" ? "admin" : "mood");
    } catch (e2) {
      setErr(`❌ ${e2.message}`);
    }
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create account</h2>

        <form onSubmit={onSubmit} style={styles.form}>
          <input
            style={styles.input}
            name="fullName"
            placeholder="Full name"
            value={form.fullName}
            onChange={update}
            required
          />

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
            placeholder="Password (min 8 chars)"
            type="password"
            value={form.password}
            onChange={update}
            minLength={8}
            required
          />

          {/* ✅ ROLE SELECT */}
          <div style={styles.roleBox}>
            <div style={styles.roleTitle}>Account type</div>

            <label style={styles.roleRow}>
              <input
                type="radio"
                name="role"
                value="user"
                checked={form.role === "user"}
                onChange={update}
              />
              User (track your moods)
            </label>

            <label style={styles.roleRow}>
              <input
                type="radio"
                name="role"
                value="clinician"
                checked={form.role === "clinician"}
                onChange={update}
              />
              Clinician (view assigned patients + notes)
            </label>

            <label style={styles.roleRow}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={form.role === "admin"}
                onChange={update}
              />
              Admin (manage users + feature flags)
            </label>
          </div>

          <button type="submit">Register</button>
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
  roleBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.10)",
    display: "grid",
    gap: 8,
  },
  roleTitle: { fontWeight: 700, fontSize: 14, opacity: 0.9 },
  roleRow: { display: "flex", gap: 10, alignItems: "center", fontSize: 14 },
  ok: { marginTop: 12, opacity: 0.9 },
  bad: { marginTop: 12, opacity: 0.9 },
};