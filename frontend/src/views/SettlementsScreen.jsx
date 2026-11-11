import useAuth from "../hooks/useAuth";
import { Sidebar, PartnerUserBadge } from "../pages/vendor/HotelOwnerDashboardPage";
import SettlementsPanel from "../components/SettlementsPanel";

// Hotel owner shell: the shared panel next to the partner sidebar.
export default function Screen9({ onNavigate }) {
  const { currentUser } = useAuth();
  return (
    <div className="flex h-full bg-bg-default font-body overflow-hidden">
      <Sidebar activeScreen={9} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-heading font-700 text-text-primary text-lg">Quyết toán & Doanh thu</h1>
            <p className="text-xs text-text-primary-400">Báo cáo doanh thu, hoa hồng và yêu cầu rút tiền</p>
          </div>
          <PartnerUserBadge currentUser={currentUser} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <SettlementsPanel />
        </main>
      </div>
    </div>
  );
}
