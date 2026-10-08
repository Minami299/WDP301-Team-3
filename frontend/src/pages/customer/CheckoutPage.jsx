import { useNavigate } from "react-router-dom";
import CheckoutScreen from "../../views/CheckoutScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function CheckoutPage() {
  const navigate = useNavigate();
  return <CheckoutScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/checkout")} />;
}
