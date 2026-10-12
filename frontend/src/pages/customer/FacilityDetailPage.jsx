import { useNavigate } from "react-router-dom";
import Screen3 from "../../views/Screen3";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function FacilityDetailPage() {
  const navigate = useNavigate();
  return <Screen3 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/facilities/demo")} />;
}
