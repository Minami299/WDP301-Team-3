import { useState } from "react";

import Screen1 from "./views/Screen1";
import Screen2 from "./views/Screen2";
import Screen3 from "./views/Screen3";
import Screen4 from "./views/Screen4";
import Screen5 from "./views/Screen5";
import Screen6 from "./views/Screen6";
import Screen7 from "./views/Screen7";
import Screen8 from "./views/Screen8";
import Screen9 from "./views/Screen9";
import heroImg from "./assets/hero.png";
import {
  IconMapPin,
  IconStar,
  IconArrowRight,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconShield,
  IconCheck
} from "./components/Icons";

const SCREENS = [
  { id: 1, label: "Homepage", short: "1", group: "traveler", desc: "Hero & Booking Widget" },
  { id: 2, label: "Search Results", short: "2", group: "traveler", desc: "Listings & Filters" },
  { id: 3, label: "Product Detail", short: "3", group: "traveler", desc: "Booking Flow" },
  { id: 4, label: "Checkout", short: "4", group: "traveler", desc: "Payment & QR Pass" },
  { id: 5, label: "My Trips", short: "5", group: "traveler", desc: "Itinerary & Tickets" },
  { id: 6, label: "Vendor Dashboard", short: "6", group: "partner", desc: "Overview & KPIs" },
  { id: 7, label: "Inventory Manager", short: "7", group: "partner", desc: "Rates & Stop-Sell" },
  { id: 8, label: "QR Terminal", short: "8", group: "partner", desc: "Gate Redemption" },
  { id: 9, label: "Settlements", short: "9", group: "partner", desc: "Payouts & Finance" }
];

function AuthScreen({ initialTab = "login", onClose, onAuthSuccess }) {
  const [tab, setTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (tab === "signup") {
      if (!fullName.trim()) {
        setError("Vui lòng nhập họ và tên của bạn");
        return;
      }
      if (!agreeTerms) {
        setError("Vui lòng đồng ý với Điều khoản và Chính sách bảo mật");
        return;
      }
      if (password.length < 8) {
        setError("Mật khẩu phải có độ dài tối thiểu 8 ký tự");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = tab === "login"
        ? { email, password }
        : { full_name: fullName, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Đã xảy ra lỗi, vui lòng thử lại");
      }

      // Lưu trữ phiên đăng nhập
      if (data.token) {
        localStorage.setItem("travelio_token", data.token);
      }
      if (data.user) {
        localStorage.setItem("travelio_user", JSON.stringify(data.user));
      }

      setSuccessMsg(tab === "login" ? "Đăng nhập thành công!" : "Tạo tài khoản thành công!");
      setTimeout(() => {
        onAuthSuccess(data.user);
      }, 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col lg:flex-row overflow-y-auto">
      {/* CỘT TRÁI: BANNER HERO & THÔNG ĐIỆP */}
      <div className="relative w-full lg:w-1/2 min-h-[460px] lg:min-h-screen p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        {/* Ảnh nền */}
        <img
          src={heroImg}
          alt="Travelio Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-slate-950/50" />

        {/* Header trên ảnh */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <IconMapPin size={16} className="text-white" />
            </div>
            <span className="font-heading font-800 text-white text-lg tracking-tight">travelio</span>
          </div>

          <div className="bg-black/35 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-white">
            <div className="flex gap-1 text-warning-500 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <IconStar key={i} size={12} filled={true} />
              ))}
            </div>
            <div className="font-bold text-xs">4.9 out of 5</div>
            <div className="text-[10px] text-white/70">Loved by 10,000+ travelers</div>
          </div>
        </div>

        {/* Nội dung dưới ảnh */}
        <div className="relative z-10 mt-auto pt-12">
          {/* Trending Card */}
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-white flex items-center justify-between gap-3 max-w-sm mb-6">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=120&h=120&fit=crop"
                alt="Singapore city escape"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <span className="text-[9px] font-bold tracking-wider uppercase text-white/80 block">TRENDING NOW</span>
                <div className="text-xs font-bold text-white leading-tight">Singapore city escape</div>
                <span className="text-[11px] text-white/70">Hotels + experiences from SGD 428</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white text-text-primary flex items-center justify-center shadow-md flex-shrink-0">
              <IconArrowRight size={14} />
            </div>
          </div>

          <span className="text-[10px] font-bold tracking-widest uppercase text-white/70 block mb-2">
            YOUR NEXT STORY STARTS HERE
          </span>
          <h1 className="font-heading font-extrabold text-white text-3xl lg:text-4xl leading-tight mb-2">
            Explore the world's hidden gems.
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-md leading-relaxed">
            One account for unforgettable stays, local experiences, and every ticket along the way.
          </p>
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
      <div className="relative w-full lg:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Nút Continue as guest */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-text-primary hover:text-primary-600 flex items-center gap-1 transition"
          >
            Continue as guest <IconArrowRight size={14} />
          </button>
        </div>

        {/* Khối Form trung tâm */}
        <div className="max-w-md w-full mx-auto my-auto">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "login" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "signup" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Tiêu đề */}
          {tab === "login" ? (
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block mb-1">
                WELCOME BACK
              </span>
              <h2 className="font-heading font-extrabold text-2xl lg:text-3xl text-text-primary mb-1">
                Welcome back, traveler!
              </h2>
              <p className="text-text-secondary text-xs">
                Enter your details to access your bookings and saved trips.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block mb-1">
                START EXPLORING
              </span>
              <h2 className="font-heading font-extrabold text-2xl lg:text-3xl text-text-primary mb-1">
                Create your Travelio account
              </h2>
              <p className="text-text-secondary text-xs">
                Save favorites, manage bookings, and keep every pass in one place.
              </p>
            </div>
          )}

          {/* Đăng nhập mạng xã hội */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 px-3 border border-border rounded-xl text-xs font-semibold text-text-primary hover:bg-slate-50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 px-3 border border-border rounded-xl text-xs font-semibold text-text-primary hover:bg-slate-50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.65-.79 1.1-1.9 1.1-3.02 0-.15-.02-.31-.05-.46-.99.04-2.17.66-2.88 1.48-.56.64-1.05 1.76-1.05 2.87 0 .17.03.34.05.41 1.08.08 2.18-.49 2.83-1.28z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-white px-3 text-text-secondary uppercase tracking-wider">or continue with email</span>
            </div>
          </div>

          {/* Thông báo lỗi / thành công */}
          {error && (
            <div className="mb-4 p-3 bg-danger-100 border border-danger-500/30 rounded-xl text-danger-500 text-xs">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-success-100 border border-success-500/30 rounded-xl text-success-700 text-xs flex items-center gap-2">
              <IconCheck size={14} />
              {successMsg}
            </div>
          )}

          {/* Form trường dữ liệu */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === "signup" && (
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1 block">
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary font-semibold text-xs">
                    Aa
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-text-primary mb-1 block">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                  <IconMail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary mb-1 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                  <IconLock size={15} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "Create at least 8 characters" : "Enter your password"}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {/* Checkbox dòng dưới */}
            {tab === "login" ? (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                  />
                  <span>
                    I agree to the <span className="text-primary-600 font-semibold underline">Terms</span> and <span className="text-primary-600 font-semibold underline">Privacy Policy</span>.
                  </span>
                </label>
              </div>
            )}

            {/* Nút bấm Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : tab === "login" ? (
                <>
                  <span>Log in</span>
                  <IconArrowRight size={14} />
                </>
              ) : (
                <>
                  <span>Create free account</span>
                  <IconArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Chuyển đổi giữa 2 tab */}
          <div className="mt-5 text-center text-xs text-text-secondary">
            {tab === "login" ? (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setTab("signup"); setError(""); setSuccessMsg(""); }}
                  className="text-primary-600 font-bold hover:underline"
                >
                  Sign up for free
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
                  className="text-primary-600 font-bold hover:underline"
                >
                  Log in
                </button>
              </span>
            )}
          </div>

          {/* Dòng bảo mật */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-secondary mt-7">
            <IconShield size={13} className="text-text-secondary" />
            <span>Secure access protected by encrypted authentication</span>
          </div>
        </div>

        {/* Nút Help dưới góc */}
        <div className="flex justify-end mt-4">
          <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px] text-text-secondary hover:bg-slate-50 cursor-pointer">
            ?
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("travelio_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleOpenAuth = (tabName = "login") => {
    setAuthTab(tabName);
    setAuthOpen(true);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setAuthOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem("travelio_token");
    localStorage.removeItem("travelio_user");
    setCurrentUser(null);
  };

  const current = SCREENS.find((s) => s.id === active) || SCREENS[0];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-sidebar font-body">
      {/* Auth Screen Modal / Overlay */}
      {authOpen && (
        <AuthScreen
          initialTab={authTab}
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Navigation Bar */}
      <div className="bg-sidebar border-b border-border flex-shrink-0 z-40">
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Brand */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-border flex-shrink-0">
            <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="text-white font-heading font-700 text-sm">travelio</span>
          </div>

          {/* Group labels + screen tabs */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Traveler</span>
            {SCREENS.filter((s) => s.group === "traveler").map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active === s.id ? "bg-primary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${active === s.id ? "bg-white/20" : "bg-sidebar-700"}`}>{s.short}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-sidebar-700 flex-shrink-0 mx-1" />

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-primary-400 uppercase tracking-widest px-1">Partner</span>
            {SCREENS.filter((s) => s.group === "partner").map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active === s.id ? "bg-secondary-500 text-white" : "text-text-primary-400 hover:text-white hover:bg-sidebar-800"
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${active === s.id ? "bg-white/20" : "bg-sidebar-700"}`}>{s.short}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex-shrink-0 flex items-center gap-3 pl-3 border-l border-border">
            <span className="hidden md:inline text-text-primary-400 text-[10px]">{current?.desc}</span>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-semibold">{currentUser.full_name}</span>
                <span className="text-[10px] bg-primary-500/30 text-primary-300 font-bold px-2 py-0.5 rounded-full uppercase">
                  {currentUser.role || 'CUSTOMER'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-[11px] text-text-primary-400 hover:text-danger-500 underline ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAuth("login")}
                  className="text-xs text-text-primary-400 hover:text-white font-medium px-2 py-1"
                >
                  Log in
                </button>
                <button
                  onClick={() => handleOpenAuth("signup")}
                  className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screen Content */}
      <div className="flex-1 overflow-hidden">
        {active === 1 && (
          <div className="h-full overflow-y-auto">
            <Screen1
              onNavigate={setActive}
              onSignIn={() => handleOpenAuth("login")}
              onRegister={() => handleOpenAuth("signup")}
              currentUser={currentUser}
              onSignOut={handleSignOut}
            />
          </div>
        )}
        {active === 2 && <div className="h-full overflow-y-auto"><Screen2 onNavigate={setActive} /></div>}
        {active === 3 && <div className="h-full overflow-y-auto"><Screen3 onNavigate={setActive} /></div>}
        {active === 4 && <div className="h-full overflow-y-auto"><Screen4 onNavigate={setActive} /></div>}
        {active === 5 && <div className="h-full overflow-y-auto"><Screen5 onNavigate={setActive} /></div>}
        {active === 6 && <Screen6 onNavigate={setActive} />}
        {active === 7 && <Screen7 onNavigate={setActive} />}
        {active === 8 && <Screen8 onNavigate={setActive} />}
        {active === 9 && <Screen9 onNavigate={setActive} />}
      </div>
    </div>
  );
}

