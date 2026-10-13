import { useNavigate } from "react-router-dom";
import SearchResultsScreen from "../../views/SearchResultsScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function SearchPage() {
  const navigate = useNavigate();
  return <SearchResultsScreen onNavigate={(screenId) => navigate(SCREEN_PATHS[screenId] || "/search")} />;
}
