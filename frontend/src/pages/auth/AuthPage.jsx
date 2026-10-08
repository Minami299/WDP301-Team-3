import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import heroImg from "../../assets/hero.png";
import {
  IconArrowRight,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconHotel,
  IconLock,
  IconMail,
  IconMapPin,
  IconShield,
  IconStar,
  IconTicket,
  IconUser
} from "../../components/Icons";
import useAuth from "../../hooks/useAuth";

export default function AuthPage() {
  const { mode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const tab = mode === "register" ? "signup" : "login";
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const queryRole = searchParams.get("role");
  const [accountRole, setAccountRole] = useState(
    queryRole === "HOTEL_OWNER" || queryRole === "ACTIVITY_VENDOR" ? queryRole : "CUSTOMER"
  );


  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const switchTab = (nextTab) => {
    setError("");
    setSuccessMsg("");
    navigate(nextTab === "signup" ? "/auth/register" : "/auth/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (tab === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (!agreeTerms) {
        setError("Please agree to the Terms and Privacy Policy");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await login({ email, password });
        setSuccessMsg("Login success");
        navigate("/", { replace: true });
      } else {
        await register({ full_name: fullName, email, password, role_name: accountRole });
        setSuccessMsg("Account created");
        if (accountRole === "HOTEL_OWNER" || accountRole === "ACTIVITY_VENDOR") {
          navigate("/vendor", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-y-auto font-body">
      <div className="relative w-full lg:w-1/2 min-h-[460px] lg:min-h-screen p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <img src={heroImg} alt="Travelio background" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-slate-950/50" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <IconMapPin size={16} className="text-white" />
            </div>
            <span className="font-heading font-800 text-white text-lg tracking-tight">travelio</span>
          </div>
          <div className="bg-black/35 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-white">
            <div className="flex gap-1 text-warning-500 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => <IconStar key={i} size={12} filled />)}
            </div>
            <div className="font-bold text-xs">4.9 out of 5</div>
            <div className="text-[10px] text-white/70">Loved by 10,000+ travelers</div>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-12">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-white flex items-center justify-between gap-3 max-w-sm mb-6">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=120&h=120&fit=crop"
                alt="Singapore city escape"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <span className="text-[9px] font-bold tracking-wider uppercase text-white/80 block">Trending now</span>
                <div className="text-xs font-bold text-white leading-tight">Singapore city escape</div>
                <span className="text-[11px] text-white/70">Hotels + experiences from SGD 428</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white text-text-primary flex items-center justify-center shadow-md flex-shrink-0">
              <IconArrowRight size={14} />
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/70 block mb-2">
            Your next story starts here
          </span>
          <h1 className="font-heading font-extrabold text-white text-3xl lg:text-4xl leading-tight mb-2">
            Explore the world's hidden gems.
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-md leading-relaxed">
            One account for unforgettable stays, local experiences, and every ticket along the way.
          </p>
        </div>
      </div>

      <div className="relative w-full lg:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate("/")}
            className="text-xs font-semibold text-text-primary hover:text-primary-600 flex items-center gap-1 transition"
          >
            Continue as guest <IconArrowRight size={14} />
          </button>
        </div>

        <div className="max-w-md w-full mx-auto my-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "login" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "signup" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Sign up
            </button>
          </div>

          <div className="mb-6">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block mb-1">
              {tab === "login" ? "Welcome back" : "Start exploring"}
            </span>
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl text-text-primary mb-1">
              {tab === "login" ? "Welcome back, traveler!" : "Create your Travelio account"}
            </h2>
            <p className="text-text-secondary text-xs">
              {tab === "login"
                ? "Enter your details to access your bookings and saved trips."
                : "Save favorites, manage bookings, and keep every pass in one place."}
            </p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === "signup" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1.5 block">Loại tài khoản đăng ký</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountRole("CUSTOMER")}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        accountRole === "CUSTOMER"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-border hover:bg-slate-50 text-text-secondary"
                      }`}
                    >
                      <IconUser size={14} />
                      <span>Khách hàng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountRole("HOTEL_OWNER")}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        accountRole === "HOTEL_OWNER"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-border hover:bg-slate-50 text-text-secondary"
                      }`}
                    >
                      <IconHotel size={14} />
                      <span>Hotel Owner</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountRole("ACTIVITY_VENDOR")}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        accountRole === "ACTIVITY_VENDOR"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-border hover:bg-slate-50 text-text-secondary"
                      }`}
                    >
                      <IconTicket size={14} />
                      <span>Attraction Vendor</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1 block">Full name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>
              </>
            )}


            <div>
              <label className="text-xs font-semibold text-text-primary mb-1 block">Email address</label>
              <div className="relative">
                <IconMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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
              <label className="text-xs font-semibold text-text-primary mb-1 block">Password</label>
              <div className="relative">
                <IconLock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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
                <button type="button" className="font-semibold text-primary-600 hover:underline">
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                />
                <span>I agree to the <span className="text-primary-600 font-semibold underline">Terms</span> and <span className="text-primary-600 font-semibold underline">Privacy Policy</span>.</span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <span>{loading ? "Processing..." : tab === "login" ? "Log in" : "Create free account"}</span>
              {!loading && <IconArrowRight size={14} />}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-text-secondary">
            {tab === "login" ? (
              <span>Don't have an account? <button type="button" onClick={() => switchTab("signup")} className="text-primary-600 font-bold hover:underline">Sign up for free</button></span>
            ) : (
              <span>Already have an account? <button type="button" onClick={() => switchTab("login")} className="text-primary-600 font-bold hover:underline">Log in</button></span>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-secondary mt-7">
            <IconShield size={13} className="text-text-secondary" />
            <span>Secure access protected by encrypted authentication</span>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px] text-text-secondary hover:bg-slate-50 cursor-pointer">?</div>
        </div>
      </div>
    </div>
  );
}
