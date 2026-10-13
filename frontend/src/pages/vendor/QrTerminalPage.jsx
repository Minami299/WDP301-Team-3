import { useNavigate } from "react-router-dom";
import QrTerminalScreen from "../../views/QrTerminalScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function QrTerminalPage() {
  const navigate = useNavigate();
  return <QrTerminalScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/vendor/qr")} />;
}
