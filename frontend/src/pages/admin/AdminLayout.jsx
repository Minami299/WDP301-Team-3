import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  IconHome,
  IconLogOut,
  IconShield,
  IconUser,
  IconUsers,
} from "../../components/Icons";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-8 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary-500 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export default function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === "ADMIN";

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-bg-default font-body">
      <aside className="w-60 bg-sidebar flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="font-heading font-700 text-white text-base">travelio</div>
          <div className="text-xs text-slate-400 mt-0.5">Administration</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/admin" end className={linkClass}>
            <IconHome size={17} /> Home
          </NavLink>
          <NavLink to="/admin/users" className={linkClass}>
            <IconUsers size={17} /> Users
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/roles" className={linkClass}>
              <IconShield size={17} /> Roles and access
            </NavLink>
          )}
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
