import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { IconLogOut, IconUser } from "../../components/Icons";
import { allowedPortalItems } from "../../utils/portalNav";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-8 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary-500 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

// Sidebar shell for /admin; the links shown depend on the role permissions.
export default function PortalLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const items = allowedPortalItems(currentUser);

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="flex h-screen flex-col md:flex-row bg-bg-default font-body">
      <aside className="w-full md:w-60 bg-sidebar flex flex-col flex-shrink-0">
        <div className="px-5 py-3 md:py-5 border-b border-slate-800">
          <div className="font-heading font-700 text-white text-base">travelio</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Administration
          </div>
        </div>
        <nav aria-label="Main" className="flex overflow-x-auto gap-1 md:block md:flex-1 px-3 py-2 md:py-4 md:space-y-1 [&>a]:shrink-0 [&>a]:whitespace-nowrap">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex md:block px-3 py-1 md:py-4 border-t border-slate-800 md:space-y-1">
          <div className="hidden md:block px-3 pb-2">
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
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
