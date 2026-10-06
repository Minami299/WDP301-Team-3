import { useNavigate } from "react-router-dom";
import Screen6 from "../../views/Screen6";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  return <Screen6 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor")} />;
}
