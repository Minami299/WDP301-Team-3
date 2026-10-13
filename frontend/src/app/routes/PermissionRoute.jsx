import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { homePathForRole } from "../../utils/homePath";
import { allowedPortalItems } from "../../utils/portalNav";
import { hasPermission } from "../../utils/permissions";

function NoAccess() {
  return (
    <div className="px-8 py-10 max-w-xl">
      <h1 className="font-heading font-700 text-xl text-text-primary">No tools assigned yet</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Your role does not have access to any workspace pages. Ask an administrator to grant permissions to your role.
      </p>
    </div>
  );
}

export function PermissionRoute({ permission }) {
  const { currentUser } = useAuth();
  if (hasPermission(currentUser, permission)) return <Outlet />;
  const base = homePathForRole(currentUser?.role);
  const [first] = allowedPortalItems(currentUser);
  if (!first) return <NoAccess />;
  return <Navigate to={first.path ? `${base}/${first.path}` : base} replace />;
}

// Landing page of /admin and /vendor: first page the role may open.
export function PortalIndex({ children }) {
  const { currentUser } = useAuth();
  const base = homePathForRole(currentUser?.role);
  if (hasPermission(currentUser, "users.view")) return children;
  const [first] = allowedPortalItems(currentUser);
  if (!first) return <NoAccess />;
  return <Navigate to={`${base}/${first.path}`} replace />;
}
