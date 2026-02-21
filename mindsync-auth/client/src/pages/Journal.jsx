import { useMemo, useState } from "react";

const MAX_JOURNAL = 1000;

export default function Journal({ onSendToMood }) {
  const [text, setText] = useState("");

  const remaining = useMemo(() => MAX_JOURNAL - text.length, [text.length]);

  function handleChange(e) {
    const value = e.target.value;
    setText(value.length > MAX_JOURNAL ? value.slice(0, MAX_JOURNAL) : value);
  }

  function sendToMood() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendToMood(trimmed);
    setText("");
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <h2 style={styles.h2}>Journal</h2>
        <p style={styles.p}>
          Write what’s on your mind. You can send it to today’s mood note.
        </p>

        <div style={styles.field}>
          <div style={styles.row}>
            <h3 style={styles.sectionHead}>
              Your Entry
              <span style={styles.sectionSub}>(max {MAX_JOURNAL} chars)</span>
            </h3>
            <div style={styles.counter}>{remaining} left</div>
          </div>

          <textarea
            value={text}
            onChange={handleChange}
            maxLength={MAX_JOURNAL}
            placeholder="Write your thoughts here…"
            style={styles.textarea}
          />
        </div>

        <div style={styles.actions}>
          <button onClick={sendToMood} disabled={!text.trim()}>
            Send to Mood Check-In
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: { display: "flex", justifyContent: "center", marginTop: 30 },
  card: {
    width: "min(720px, 92vw)",
    padding: 22,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    color: "rgba(255,255,255,0.92)",
  },
  h2: { margin: 0, fontSize: "1.8rem" },
  p: { marginTop: 8, opacity: 0.85 },
  field: { marginTop: 14 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { fontWeight: 600, opacity: 0.9 },
  sectionHead: { margin: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 },
  sectionSub: { fontSize: 12, fontWeight: 400, opacity: 0.55 },
  counter: { fontSize: 12, opacity: 0.75 },
  textarea: {
    marginTop: 10,
    width: "100%",
    minHeight: 160,
    resize: "vertical",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
  },
  actions: { marginTop: 14, display: "flex", justifyContent: "flex-end" },
};
