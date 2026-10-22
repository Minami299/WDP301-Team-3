import { useNavigate } from "react-router-dom";
import SettlementsScreen from "../../views/SettlementsScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function SettlementsPage({ embedded = false }) {
  const navigate = useNavigate();
  return (
    <SettlementsScreen
      embedded={embedded}
      onNavigate={(target) =>
        navigate(typeof target === "string" ? target : (SCREEN_PATHS[target] || "/vendor"))
      }
    />
  );
}

