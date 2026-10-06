import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { getScreenByPath, SCREENS } from "../../utils/screenNavigation";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const current = getScreenByPath(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-sidebar font-body">
      <div className="bg-sidebar border-b border-border flex-shrink-0 z-40">
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 pr-3 border-r border-border flex-shrink-0">
            <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="text-white font-heading font-700 text-sm">travelio</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Traveler</span>
            {SCREENS.filter((screen) => screen.group === "traveler").map((screen) => (
              <NavLink
                key={screen.id}
                to={screen.path}
                className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive || current.id === screen.id ? "bg-primary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${current.id === screen.id ? "bg-white/20" : "bg-sidebar-700"}`}>
                  {screen.short}
                </span>
                {screen.label}
              </NavLink>
            ))}
          </div>

          <div className="w-px h-5 bg-sidebar-700 flex-shrink-0 mx-1" />

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Partner</span>
            {SCREENS.filter((screen) => screen.group === "partner").map((screen) => (
              <NavLink
                key={screen.id}
                to={screen.path}
                className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive || current.id === screen.id ? "bg-secondary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${current.id === screen.id ? "bg-white/20" : "bg-sidebar-700"}`}>
                  {screen.short}
                </span>
                {screen.label}
              </NavLink>
            ))}
          </div>

          <div className="ml-auto flex-shrink-0 flex items-center gap-3 pl-3 border-l border-border">
            <span className="hidden md:inline text-text-primary-400 text-[10px]">{current?.desc}</span>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-semibold">{currentUser.full_name}</span>
                <span className="text-[10px] bg-primary-500/30 text-primary-300 font-bold px-2 py-0.5 rounded-full uppercase">
                  {currentUser.role || "CUSTOMER"}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[11px] text-text-primary-400 hover:text-danger-500 underline ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/auth/login")}
                  className="text-xs text-text-primary-400 hover:text-white font-medium px-2 py-1"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate("/auth/register")}
                  className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
