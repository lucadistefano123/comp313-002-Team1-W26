const API_BASE = "/api";

export async function getMoodInsights(days = 7) {
  const res = await fetch(`${API_BASE}/moods/insights?days=${days}`, {
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to load insights");
  return data;
}
