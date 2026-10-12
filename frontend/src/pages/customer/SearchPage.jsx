import { useNavigate } from "react-router-dom";
import Screen2 from "../../views/Screen2";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function SearchPage() {
  const navigate = useNavigate();
  return <Screen2 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/search")} />;
}
