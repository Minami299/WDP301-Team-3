import { useNavigate } from "react-router-dom";
import InventoryManagerScreen from "../../views/InventoryManagerScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function InventoryPage() {
  const navigate = useNavigate();
  return (
    <InventoryManagerScreen
      onNavigate={(screenId) =>
        navigate(SCREEN_PATHS[screenId] || "/vendor/inventory")
      }
    />
  );
}
