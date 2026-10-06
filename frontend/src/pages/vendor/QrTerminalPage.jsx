import { useNavigate } from "react-router-dom";
import Screen8 from "../../views/Screen8";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function QrTerminalPage() {
  const navigate = useNavigate();
  return <Screen8 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor/qr")} />;
}
