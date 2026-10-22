import { useNavigate } from "react-router-dom";
import QrTerminalScreen from "../../views/QrTerminalScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function QrTerminalPage({ embedded = false }) {
  const navigate = useNavigate();
  return (
    <QrTerminalScreen
      embedded={embedded}
      onNavigate={(target) =>
        navigate(typeof target === "string" ? target : (SCREEN_PATHS[target] || "/vendor"))
      }
    />
  );
}

