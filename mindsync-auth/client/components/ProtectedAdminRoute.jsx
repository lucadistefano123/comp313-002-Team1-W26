import { Navigate } from "react-router-dom";

export default function ProtectedAdminRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}