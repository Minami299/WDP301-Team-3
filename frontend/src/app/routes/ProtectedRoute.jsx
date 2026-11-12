import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { tokenStorage } from "../../services/storage/tokenStorage";

export default function ProtectedRoute() {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();

  if (loading || (tokenStorage.getToken() && !currentUser?.role)) {
    return <div className="min-h-screen bg-bg-default flex items-center justify-center text-sm text-text-secondary">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
