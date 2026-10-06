import { useNavigate } from "react-router-dom";
import Screen5 from "../../views/Screen5";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function MyTripsPage() {
  const navigate = useNavigate();
  return <Screen5 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/my-trips")} />;
}
