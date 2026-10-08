import { useNavigate } from "react-router-dom";
import VendorDashboardScreen from "../../views/VendorDashboardScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  return <VendorDashboardScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor")} />;
}
