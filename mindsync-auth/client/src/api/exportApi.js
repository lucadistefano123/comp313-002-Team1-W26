const API_BASE = "http://localhost:5000/api"; // keep consistent with your app

export async function downloadExport({ format, startDate, endDate, token }) {
  const params = new URLSearchParams();
  params.set("format", format);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const res = await fetch(`${API_BASE}/export?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Handle “empty export validation” nicely
  if (!res.ok) {
    let msg = "Export failed.";
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const ext = format === "pdf" ? "pdf" : "csv";
  const filename = `mindsync-export-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}