import { useNavigate } from "react-router-dom";
import Screen1 from "../../views/Screen1";
import useAuth from "../../hooks/useAuth";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const onNavigate = (screenId) => navigate(SCREEN_PATHS[screenId] || "/");

  return (
    <Screen1
      onNavigate={onNavigate}
      onSignIn={() => navigate("/auth/login")}
      onRegister={() => navigate("/auth/register")}
      currentUser={currentUser}
      onSignOut={logout}
    />
  );
}
