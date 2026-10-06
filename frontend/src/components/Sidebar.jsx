import { 
  IconMapPin, 
  IconHome, 
  IconGrid, 
  IconQR, 
  IconDollar, 
  IconSettings, 
  IconLogOut 
} from "./Icons";

export default function Sidebar({ activeScreen, onNavigate }) {
  const MENU_ITEMS = [
    { id: 6, label: "Dashboard", icon: <IconHome size={18} /> },
    { id: 7, label: "Inventory", icon: <IconGrid size={18} /> },
    { id: 8, label: "QR Terminal", icon: <IconQR size={18} /> },
    { id: 9, label: "Settlements", icon: <IconDollar size={18} /> },
  ];

  return (
    <aside className="w-[224px] bg-sidebar flex-shrink-0 flex flex-col h-full overflow-hidden text-text-primary-400">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
          <IconMapPin size={16} className="text-white" />
        </div>
        <span className="font-heading font-800 text-white text-lg tracking-tight">travelio <span className="text-primary-500 text-xs align-top">PRO</span></span>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <div className="text-xs font-semibold text-sidebar-400 uppercase tracking-widest px-3 mb-2">Partner Portal</div>
        {MENU_ITEMS.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive 
                  ? "bg-slate-800 text-white" 
                  : "text-text-primary-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r" />
              )}
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-primary-400 hover:text-white hover:bg-slate-800/50">
          <IconSettings size={18} />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-primary-400 hover:text-danger-400 hover:bg-slate-800/50">
          <IconLogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
