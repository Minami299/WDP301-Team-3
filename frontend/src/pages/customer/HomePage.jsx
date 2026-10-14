import { useNavigate } from "react-router-dom";
import HomeScreen from "../../views/HomeScreen";
import useAuth from "../../hooks/useAuth";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const onNavigate = (screenId, params) => {
    if (screenId === 2) {
      if (params) {
        const filteredEntries = Object.entries(params).filter(([_, v]) => Boolean(v));
        const query = new URLSearchParams(filteredEntries).toString();
        navigate(query ? `/search?${query}` : "/search");
      } else {
        navigate("/search");
      }
    } else if (screenId === 3 && params?.id) {
      navigate(`/facilities/${params.id}`);
    } else {
      navigate(SCREEN_PATHS[screenId] || "/");
    }
  };

  return (
    <HomeScreen
      onNavigate={onNavigate}
      onSignIn={() => navigate("/auth/login")}
      onRegister={() => navigate("/auth/register")}
      onProfile={() => navigate("/profile")}
      currentUser={currentUser}
      onSignOut={logout}
    />
  );
}
