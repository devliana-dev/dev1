import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-screen">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role && !(role === "admin" && user.role === "owner")) {
    const target = (user.role === "admin" || user.role === "owner") ? "/admin" : user.role === "company" ? "/company/dashboard" : "/candidate/dashboard";
    return <Navigate to={target} replace />;
  }
  return children;
}
