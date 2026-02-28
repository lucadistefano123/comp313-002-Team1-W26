const API_BASE = "/api";

async function handle(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export function getUsers() {
  return fetch(`${API_BASE}/admin/users`, { credentials: "include" }).then(handle);
}

export function toggleUser(id) {
  return fetch(`${API_BASE}/admin/users/${id}/toggle`, {
    method: "PATCH",
    credentials: "include",
  }).then(handle);
}

export function setUserRole(id, role) {
  return fetch(`${API_BASE}/admin/users/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  }).then(handle);
}

export function getAuditLogs() {
  return fetch(`${API_BASE}/admin/logs`, { credentials: "include" }).then(handle);
}

// client/src/api/adminApi.js
export function assignClinician(patientId, clinicianId) {
  return fetch(`/api/admin/users/${patientId}/assign-clinician`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ clinicianId }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Assign failed");
    return data;
  });
}

export function unassignClinician(patientId, clinicianId) {
  return fetch(`/api/admin/users/${patientId}/unassign-clinician`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ clinicianId }),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Unassign failed");
    return data;
  });
}