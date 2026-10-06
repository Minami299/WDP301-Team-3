import { useNavigate } from "react-router-dom";
import Screen7 from "../../views/Screen7";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function InventoryPage() {
  const navigate = useNavigate();
  return (
    <Screen7
      onNavigate={(screenId) =>
        navigate(SCREEN_PATHS[screenId] || "/vendor/inventory")
      }
    />
  );
}
