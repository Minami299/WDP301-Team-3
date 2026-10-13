import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { IconLogOut, IconUser } from "../../components/Icons";
import { homePathForRole } from "../../utils/homePath";
import { allowedPortalItems } from "../../utils/portalNav";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-8 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary-500 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

// Sidebar shell for staff accounts, served under /admin or /vendor depending on the role.
export default function PortalLayout({ base }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const ownBase = homePathForRole(currentUser?.role);
  if (ownBase === "/") return <Navigate to="/" replace />;
  if (ownBase !== base) {
    return <Navigate to={location.pathname.replace(base, ownBase)} replace />;
  }

  const items = allowedPortalItems(currentUser);

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-bg-default font-body">
      <aside className="w-60 bg-sidebar flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="font-heading font-700 text-white text-base">travelio</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {base === "/admin" ? "Administration" : "Partner portal"}
          </div>
        </div>
        <nav aria-label="Main" className="flex-1 px-3 py-4 space-y-1">
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path ? `${base}/${path}` : base} end={!path} className={linkClass}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <div className="px-3 pb-2">
            <div className="text-sm text-white truncate">{currentUser?.full_name}</div>
            <div className="text-xs text-slate-400 truncate">{currentUser?.email}</div>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-8 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <IconUser size={17} /> Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-8 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <IconLogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
