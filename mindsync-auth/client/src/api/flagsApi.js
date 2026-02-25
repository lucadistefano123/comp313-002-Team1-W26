const API_BASE = "/api";

export async function getFlags() {
  const res = await fetch(`${API_BASE}/flags`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Failed to load flags");
  return data;
}

export async function updateFlag(key, enabled) {
  const res = await fetch(`${API_BASE}/flags/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Failed to update flag");
  return data;
}