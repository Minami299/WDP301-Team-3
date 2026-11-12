import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { homePathForRole } from "../../utils/homePath";
import { tokenStorage } from "../../services/storage/tokenStorage";

const ROLE_HIERARCHY = {
  ADMIN: ["ADMIN"],
  MANAGER: ["MANAGER"],
  HOTEL_OWNER: ["HOTEL_OWNER", "CUSTOMER"],
  ACTIVITY_VENDOR: ["ACTIVITY_VENDOR", "CUSTOMER"],
  CUSTOMER: ["CUSTOMER"]
};

// `exact` skips the hierarchy: only the listed roles pass (used for /admin and /vendor).
export default function RoleRoute({ allowedRoles, exact = false }) {
  const { currentUser, isAuthenticated, loading } = useAuth();

  if (loading || (tokenStorage.getToken() && !currentUser?.role)) {
    return <div className="min-h-screen bg-bg-default flex items-center justify-center text-sm text-text-secondary">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const role = currentUser?.role;
  if (!role) {
    return <div className="min-h-screen bg-bg-default flex items-center justify-center text-sm text-text-secondary">Loading...</div>;
  }

  const inheritedRoles = exact ? [role] : (ROLE_HIERARCHY[role] || [role]);
  const hasPermission = allowedRoles.some((allowedRole) => inheritedRoles.includes(allowedRole));

  if (!hasPermission) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return <Outlet />;
}
