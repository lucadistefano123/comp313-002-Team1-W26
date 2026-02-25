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