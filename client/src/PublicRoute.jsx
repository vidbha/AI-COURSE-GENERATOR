// src/components/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function PublicRoute({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
}