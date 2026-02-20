import { useEffect, useMemo, useState } from "react";
import { createMoodEntry, getMoodEntries } from "../api/moodApi";

const TAGS = [
  "stressed", "anxious", "calm", "happy", "sad", "tired",
  "motivated", "angry", "overwhelmed", "focused", "lonely", "confident"
];

export default function MoodCheckIn({ initialNote = "" }) {
  const [rating, setRating] = useState(7);
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [days, setDays] = useState(7);
  const [entries, setEntries] = useState([]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(tag) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function refresh() {
    const data = await getMoodEntries(days);
    setEntries(data.entries || []);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, [days]);

  useEffect(() => {
    if (initialNote && initialNote.trim()) {
      setNote(initialNote.slice(0, 280));
    }
  }, [initialNote]);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      await createMoodEntry({ rating: Number(rating), tags: selected, note });
      setMsg("✅ Mood saved!");
      setNote("");
      setSelected([]);
      await refresh();
    } catch (e2) {
      setErr(`❌ ${e2.message}`);
    }
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <h2 style={styles.h2}>Mood Check-In</h2>
        <p style={styles.p}>Rate how you feel today and select any tags that match.</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div style={styles.row}>
            <label style={styles.label}>Mood rating: <b>{rating}</b>/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <div style={styles.label}>Emotion tags</div>
            <div style={styles.tagWrap}>
              {TAGS.map((t) => {
                const on = selectedSet.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    style={{
                      ...styles.tag,
                      ...(on ? styles.tagOn : null)
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={styles.label}>Optional note (max 280)</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              placeholder="Anything you want to remember about today?"
              style={styles.textarea}
            />
          </div>

          <button type="submit">Save Mood</button>

          {msg && <div style={styles.ok}>{msg}</div>}
          {err && <div style={styles.bad}>{err}</div>}
        </form>

        <div style={styles.divider} />

        <div style={styles.historyTop}>
          <h3 style={styles.h3}>Recent entries</h3>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={styles.select}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        {entries.length === 0 ? (
          <p style={styles.p}>No entries yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {entries.map((en) => (
              <div key={en._id} style={styles.entry}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div><b>{en.rating}/10</b></div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    {new Date(en.createdAt).toLocaleString()}
                  </div>
                </div>
                {en.tags?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {en.tags.map((t) => (
                      <span key={t} style={styles.tagChip}>{t}</span>
                    ))}
                  </div>
                ) : null}
                {en.note ? <div style={{ marginTop: 8, opacity: 0.9 }}>{en.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: 20,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  h2: { margin: 0, fontSize: 26 },
  h3: { margin: 0, fontSize: 18 },
  p: { opacity: 0.85, marginTop: 8 },
  row: { display: "grid", gap: 8 },
  label: { fontSize: 13, opacity: 0.85 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 13,
  },
  tagOn: {
    borderColor: "rgba(192,132,252,0.55)",
    background: "rgba(192,132,252,0.20)",
    boxShadow: "0 10px 30px rgba(192,132,252,0.15)",
  },
  textarea: {
    width: "100%",
    minHeight: 90,
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
    resize: "vertical",
  },
  ok: { marginTop: 6, opacity: 0.9 },
  bad: { marginTop: 6, opacity: 0.9 },
  divider: { height: 1, background: "rgba(255,255,255,0.10)", margin: "18px 0" },
  historyTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  select: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
  },
  entry: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
  },
  tagChip: {
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
  }
};
