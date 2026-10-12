import { useNavigate } from "react-router-dom";
import Screen4 from "../../views/Screen4";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function CheckoutPage() {
  const navigate = useNavigate();
  return <Screen4 onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/checkout")} />;
}
