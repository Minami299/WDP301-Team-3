import { useNavigate } from "react-router-dom";
import SettlementsScreen from "../../views/SettlementsScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function SettlementsPage() {
  const navigate = useNavigate();
  return <SettlementsScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor/settlements")} />;
}
