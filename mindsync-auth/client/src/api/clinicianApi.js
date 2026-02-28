const API_BASE = "/api/clinician";

// helper
async function asJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

// ==============================
// ✅ NEW: get all users (role=user)
// GET /api/clinician/users/all
// ==============================
export async function getAllUsers() {
  const res = await fetch(`${API_BASE}/users/all`, {
    credentials: "include",
  });
  return asJson(res);
}

// ==============================
// ✅ existing: get my assigned patients
// GET /api/clinician/patients
// ==============================
export async function getMyPatients() {
  const res = await fetch(`${API_BASE}/patients`, {
    credentials: "include",
  });
  return asJson(res);
}

// ==============================
// ✅ NEW: clinician self-assign patient
// POST /api/clinician/users/:patientId/assign-me
// ==============================
export async function assignMeToPatient(patientId) {
  const res = await fetch(`${API_BASE}/users/${patientId}/assign-me`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return asJson(res);
}

// ==============================
// Patient data
// ==============================
export async function getPatientMoods(patientId) {
  const res = await fetch(`${API_BASE}/${patientId}/moods`, {
    credentials: "include",
  });
  return asJson(res);
}

export async function getPatientNotes(patientId) {
  const res = await fetch(`${API_BASE}/${patientId}/notes`, {
    credentials: "include",
  });
  return asJson(res);
}

export async function addPatientNote(patientId, note) {
  const res = await fetch(`${API_BASE}/${patientId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ note }),
  });
  return asJson(res);
}

export async function exportPatient(patientId) {
  const res = await fetch(`${API_BASE}/${patientId}/export`, {
    credentials: "include",
  });
  return asJson(res);
}

export async function dropPatient(patientId) {
  const res = await fetch(`/api/clinician/patients/${patientId}/drop-me`, {
    method: "DELETE",
    credentials: "include",
  });

  // if server returns HTML, show the text so you can see what you hit
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Drop failed (non-JSON response). URL mismatch or server route not found.`);
  }

  if (!res.ok) throw new Error(data?.message || "Drop failed");
  return data;
}