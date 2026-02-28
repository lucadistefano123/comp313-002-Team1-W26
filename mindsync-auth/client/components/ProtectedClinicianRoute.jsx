// client/components/ProtectedClinicianRoute.jsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { me } from "../src/api/authApi";

export default function ProtectedClinicianRoute({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    me()
      .then((data) => {
        const role = data?.user?.role;
        setState({ loading: false, ok: role === "clinician" || role === "admin" });
      })
      .catch(() => setState({ loading: false, ok: false }));
  }, []);

  if (state.loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!state.ok) return <Navigate to="/login" replace />;
  return children;
}