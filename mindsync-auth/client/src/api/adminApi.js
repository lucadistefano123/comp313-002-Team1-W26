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

export function getMoodTrends(start, end) {
  return fetch(`${API_BASE}/admin/mood-trends?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    credentials: "include",
  }).then(handle);
}

export function getSystemMetrics(start, end) {
  return fetch(`${API_BASE}/admin/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    credentials: "include",
  }).then(handle);
}

export function getReportSummary(start, end) {
  return fetch(`${API_BASE}/admin/reports/summary?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    credentials: "include",
  }).then(handle);
}

export function getReportPdf(start, end) {
  return fetch(`${API_BASE}/admin/reports/pdf?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "PDF report failed");
    }
    return res.blob();
  });
}

export function listReportSchedules() {
  return fetch(`${API_BASE}/admin/reports/schedules`, { credentials: "include" }).then(handle);
}

export function createReportSchedule({ frequency, startDate, endDate }) {
  return fetch(`${API_BASE}/admin/reports/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ frequency, startDate, endDate }),
  }).then(handle);
}

export function deleteReportSchedule(id) {
  return fetch(`${API_BASE}/admin/reports/schedules/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then(handle);
}

export function getScheduleReportPdf(id) {
  return fetch(`${API_BASE}/admin/reports/schedules/${id}/pdf`, {
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Schedule PDF report failed");
    }
    return res.blob();
  });
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