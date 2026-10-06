import { IconMapPin } from "./Icons";

export default function Header({ onSignIn, onRegister, currentUser, onSignOut }) {
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
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-border px-3 py-1.5 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-primary-500 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-text-primary leading-none">{currentUser.full_name}</div>
                  <div className="text-[10px] text-text-secondary leading-none mt-0.5">{currentUser.role || 'CUSTOMER'}</div>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-text-secondary hover:text-danger-500 font-medium px-3 py-1.5 border border-border hover:border-danger-500 rounded-lg text-xs transition"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <button
                className="text-text-primary-600 hover:text-text-primary font-medium px-3 py-2"
                onClick={onSignIn}
              >
                Sign in
              </button>
              <button
                className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 rounded-lg transition"
                onClick={onRegister}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

