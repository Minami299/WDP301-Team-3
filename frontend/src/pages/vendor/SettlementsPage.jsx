import { useNavigate } from "react-router-dom";
import Screen9 from "../../views/Screen9";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function SettlementsPage() {
  const navigate = useNavigate();
  return <Screen9 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor/settlements")} />;
}
