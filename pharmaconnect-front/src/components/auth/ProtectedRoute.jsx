import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const DEFAULT_ROLE_ROUTES = {
  admin: "/admin/dashboard",
  pharmacist: "/pharmacy/dashboard",
  doctor: "/docteur",
  secretaire: "/secretaire/rendezvous",
  supplier: "/supplier",
  pation: "/patient",
};

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-700 border-t-transparent mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Verification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = String(user.role || "").toLowerCase();
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());
    if (!normalizedAllowedRoles.includes(userRole)) {
      return <Navigate to={DEFAULT_ROLE_ROUTES[userRole] || "/login"} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
