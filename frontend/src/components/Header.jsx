import { IconMapPin } from "./Icons";

export default function Header({ onSignIn }) {
  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <IconMapPin size={16} className="text-white" />
            </div>
            <span className="font-heading font-800 text-text-primary text-lg tracking-tight">travelio</span>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-text-primary-600">
            <a href="#" className="hover:text-primary-500">Stays</a>
            <a href="#" className="hover:text-primary-500">Attractions</a>
            <a href="#" className="hover:text-primary-500">Bundles</a>
            <a href="#" className="hover:text-primary-500">Flights</a>
            <a href="#" className="hover:text-primary-500">Transfers</a>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="text-text-primary-600 hover:text-text-primary font-medium px-3 py-2">List your property</button>
          <button className="text-text-primary-600 hover:text-text-primary font-medium px-3 py-2" onClick={onSignIn}>Sign in</button>
          <button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 rounded-lg">
            Register
          </button>
        </div>
      </div>
    </nav>
  );
}
