import { useEffect, useMemo, useState } from "react";
import {
  getAllUsers,
  getMyPatients,
  assignMeToPatient,
  getPatientMoods,
  getPatientNotes,
  addPatientNote,
    dropPatient,
  exportPatient,
} from "../api/clinicianApi";

import "./ClinicianDashboard.css";

export default function ClinicianDashboard() {
  const [allUsers, setAllUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [moods, setMoods] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const selectedPatient = useMemo(
    () => patients.find((p) => p._id === selectedId),
    [patients, selectedId]
  );

  const assignedSet = useMemo(
    () => new Set(patients.map((p) => String(p._id))),
    [patients]
  );

  async function loadAllUsers() {
    const r = await getAllUsers();
    setAllUsers(r.users || []);
  }

  async function loadPatients() {
    const r = await getMyPatients();
    setPatients(r.users || []);
  }

  async function loadPatientData(id) {
    const [m, n] = await Promise.all([
      getPatientMoods(id),
      getPatientNotes(id),
    ]);
    setMoods(m.moods || []);
    setNotes(n.notes || []);
  }

  async function onDropPatient(id) {
  try {
    await dropPatient(id);
    setMsg("Patient dropped.");
    setErr("");
    setSelectedId("");
    setMoods([]);
    setNotes([]);
    await loadPatients();
    await loadAllUsers(); // optional refresh
  } catch (e) {
    setErr(e.message);
  }
}

  useEffect(() => {
    Promise.all([loadAllUsers(), loadPatients()]).catch((e) =>
      setErr(e.message)
    );
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadPatientData(selectedId).catch((e) => setErr(e.message));
  }, [selectedId]);

  async function onAddPatient(id) {
    try {
      await assignMeToPatient(id);
      setMsg("Patient added.");
      await loadPatients();
      setSelectedId(id);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onAddNote() {
    try {
      await addPatientNote(selectedId, noteText);
      setNoteText("");
      await loadPatientData(selectedId);
      setMsg("Note added.");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onExport() {
    try {
      const data = await exportPatient(selectedId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPatient?.fullName}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Export downloaded.");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="clinician-page">

      {/* SIDEBAR */}
      <div className="clinician-sidebar">

        <h2>Clinician</h2>

        {err && <div className="status-error">{err}</div>}
        {msg && <div className="status-msg">{msg}</div>}

        <div className="section-title">All Users (add as patient)</div>

        <div className="sidebar-scroll">
          <div className="list">
            {allUsers.map((u) => {
              const added = assignedSet.has(String(u._id));
              const selected = selectedId === u._id;

              return (
                <div key={u._id} className="user-row">
                  <button
                    className={`user-card ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedId(u._id)}
                  >
                    <div className="user-name">{u.fullName}</div>
                    <div className="user-email">{u.email}</div>
                  </button>

                  <button
                    className="action-btn"
                    disabled={added}
                    onClick={() => onAddPatient(u._id)}
                  >
                    {added ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-title">Patients</div>

        <div className="list">
          {patients.length === 0 && (
            <div style={{ opacity: 0.7 }}>No patients assigned yet.</div>
          )}

        {patients.map((p) => (
  <div key={p._id} className="user-row">
    <button
      className={`user-card ${selectedId === p._id ? "selected" : ""}`}
      onClick={() => setSelectedId(p._id)}
    >
      <div className="user-name">{p.fullName}</div>
      <div className="user-email">{p.email}</div>
    </button>

    <button
      className="action-btn"
      onClick={() => onDropPatient(p._id)}
    >
      Drop
    </button>
  </div>
))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="clinician-main">

        <h2>
          {selectedPatient ? selectedPatient.fullName : "Select a patient"}
        </h2>

        {selectedPatient && (
          <button className="action-btn" onClick={onExport}>
            Download Export
          </button>
        )}

        <div className="panel-grid">

          <div>
            <h3>Mood Entries</h3>
            <div className="panel panel-scroll">
              {moods.length === 0 && <div>No mood entries.</div>}
              {moods.map((m) => (
                <div key={m._id} className="entry">
                  <b>{m.mood}</b> ({m.score})
                  {m.note && <div>{m.note}</div>}
                  <small>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Clinician Notes</h3>

            <div className="input-row">
              <input
                className="text-input"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write note..."
                disabled={!selectedId}
              />
              <button
                className="action-btn"
                onClick={onAddNote}
                disabled={!noteText.trim()}
              >
                Add
              </button>
            </div>

            <div className="panel panel-scroll">
              {notes.length === 0 && <div>No notes yet.</div>}
              {notes.map((n) => (
                <div key={n._id} className="entry">
                  {n.note}
                  <small>
                    {n.clinicianId?.fullName} —{" "}
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}