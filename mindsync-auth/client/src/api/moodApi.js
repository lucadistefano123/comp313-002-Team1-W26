const API_BASE = "/api";

export async function createMoodEntry({ rating, tags, note }) {
  const res = await fetch(`${API_BASE}/moods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rating, tags, note }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to save mood entry");
  return data;
}

export async function getMoodEntries(days = 7) {
  const res = await fetch(`${API_BASE}/moods?days=${days}`, {
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to load mood entries");
  return data;
}
