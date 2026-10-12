import { useNavigate } from "react-router-dom";
import MyTripsScreen from "../../views/MyTripsScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function MyTripsPage() {
  const navigate = useNavigate();
  return <MyTripsScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/my-trips")} />;
}
