import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ROLE_HIERARCHY = {
  ADMIN: ["ADMIN", "MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR", "CUSTOMER"],
  MANAGER: ["MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR", "CUSTOMER"],
  HOTEL_OWNER: ["HOTEL_OWNER", "CUSTOMER"],
  ACTIVITY_VENDOR: ["ACTIVITY_VENDOR", "CUSTOMER"],
  CUSTOMER: ["CUSTOMER"]
};

export default function RoleRoute({ allowedRoles }) {
  const { currentUser, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-bg-default flex items-center justify-center text-sm text-text-secondary">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const role = currentUser?.role || "CUSTOMER";
  const inheritedRoles = ROLE_HIERARCHY[role] || [role];
  const hasPermission = allowedRoles.some((allowedRole) => inheritedRoles.includes(allowedRole));

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
