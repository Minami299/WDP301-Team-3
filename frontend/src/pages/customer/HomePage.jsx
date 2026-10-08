import { useNavigate } from "react-router-dom";
import HomeScreen from "../../views/HomeScreen";
import useAuth from "../../hooks/useAuth";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const onNavigate = (screenId) => navigate(SCREEN_PATHS[screenId] || "/");

  return (
    <HomeScreen
      onNavigate={onNavigate}
      onSignIn={() => navigate("/auth/login")}
      onRegister={() => navigate("/auth/register")}
      currentUser={currentUser}
      onSignOut={logout}
    />
  );
}
