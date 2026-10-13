import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
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

// Sends the user to the first page their role may open, or explains there is none.
function FirstAllowed() {
  const { currentUser } = useAuth();
  const [first] = allowedPortalItems(currentUser);
  return first ? <Navigate to={first.to} replace /> : <NoAccess />;
}

export function PermissionRoute({ permission }) {
  const { currentUser } = useAuth();
  return hasPermission(currentUser, permission) ? <Outlet /> : <FirstAllowed />;
}

// Landing page of /admin: the admin home, or the first allowed page.
export function PortalIndex({ children }) {
  const { currentUser } = useAuth();
  return hasPermission(currentUser, "users.view") ? children : <FirstAllowed />;
}
