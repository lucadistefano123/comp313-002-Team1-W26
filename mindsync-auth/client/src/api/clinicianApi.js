const API_BASE = "/api/clinician";

async function asJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}


export async function getAllUsers() {
  const res = await fetch(`${API_BASE}/users/all`, {
    credentials: "include",
  });
  return asJson(res);
}


export async function getMyPatients() {
  const res = await fetch(`${API_BASE}/patients`, {
    credentials: "include",
  });
  return asJson(res);
}


export async function assignMeToPatient(patientId) {
  const res = await fetch(`${API_BASE}/users/${patientId}/assign-me`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return asJson(res);
}


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

export async function exportPatient(patientId, format = "pdf") {
  const params = new URLSearchParams();
  params.set("format", format);

  const res = await fetch(`${API_BASE}/${patientId}/export?${params.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    let msg = "Export failed";
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const ext = format === "csv" ? "csv" : "pdf";
  const filename = `patient-export-${patientId}-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function dropPatient(patientId) {
  const res = await fetch(`/api/clinician/patients/${patientId}/drop-me`, {
    method: "DELETE",
    credentials: "include",
  });

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