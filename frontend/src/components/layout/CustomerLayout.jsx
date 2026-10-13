import { Link, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { homePathForRole } from "../../utils/homePath";

const navClass = "text-sm font-medium text-slate-300 hover:text-white";

export default function CustomerLayout() {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const portalPath = homePathForRole(currentUser?.role);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-default font-body">
      <header className="bg-sidebar flex-shrink-0">
        <nav aria-label="Main" className="px-4 sm:px-8 h-12 flex items-center gap-6">
          <Link to="/" className="font-heading font-700 text-white text-base mr-2">travelio</Link>
          <Link to="/search" className={navClass}>Search</Link>
          {isAuthenticated && <Link to="/my-trips" className={navClass}>My trips</Link>}
          <div className="ml-auto flex items-center gap-5">
            {isAuthenticated ? (
              <>
                {portalPath !== "/" && <Link to={portalPath} className={navClass}>Workspace</Link>}
                <Link to="/profile" className={navClass}>{currentUser?.full_name || "Profile"}</Link>
                <button onClick={handleLogout} className={navClass}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className={navClass}>Sign in</Link>
                <Link to="/auth/register" className="text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 px-3 py-1.5 rounded-8">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
