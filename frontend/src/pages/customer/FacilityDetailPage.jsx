import { useNavigate } from "react-router-dom";
import FacilityDetailScreen from "../../views/FacilityDetailScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function FacilityDetailPage() {
  const navigate = useNavigate();
  return <FacilityDetailScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/facilities/demo")} />;
}
