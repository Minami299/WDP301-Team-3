import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
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
  IconUser,
} from "../../components/Icons";
import useAuth from "../../hooks/useAuth";
import { homePathForRole } from "../../utils/homePath";
import { authApi } from "../../services/api/authApi";
import { facilityApi } from "../../services/api/facilityApi";
import { PENDING_APPROVAL_PATH, pendingRegistration } from '../../services/storage/pendingRegistration';

export default function AuthPage() {
  const { mode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.returnUrl || (location.state?.from?.pathname === '/checkout' ? '/checkout' : null);
  const { login, register, isAuthenticated, currentUser } = useAuth();
  const isLogin = !mode || mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot-password";
  const isResetOtp = mode === "verify-reset-otp";
  const isEmailOtp = mode === 'verify-email';
  const isOtpStep = isEmailOtp || isResetOtp;
  const isResetPassword = mode === "reset-password";
  const tab = isRegister ? "signup" : "login";
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState(
    () =>
      sessionStorage.getItem(
        `travelio_reset_token:${searchParams.get("email") || ""}`,
      ) || "",
  );
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(() =>
    searchParams.get('verified')
      ? 'Email đã được xác thực thành công. Bạn có thể đăng nhập ngay.'
      : searchParams.get("reset")
      ? "Mật khẩu đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới."
      : "",
  );
  const [resendCooldown, setResendCooldown] = useState(location.state?.resendAfterSeconds || 0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const queryRole = searchParams.get("role");
  const [accountRole, setAccountRole] = useState(
    queryRole === "HOTEL_OWNER" || queryRole === "ACTIVITY_VENDOR" ? queryRole : "CUSTOMER"
  );

  const [trending, setTrending] = useState({
    name: "Sun World Ba Na Hills Đà Nẵng",
    subtitle: "Vé tham quan & trải nghiệm từ 850.000 ₫",
    image_url:
      "https://images.unsplash.com/photo-1528127269322-539801943592?w=120&h=120&fit=crop",
    facility_id: null,
  });

  useEffect(() => {
    facilityApi
      .getTrendingTop()
      .then((res) => {
        if (res?.data) {
          setTrending(res.data);
        }
      })
      .catch(() => {});
  }, []);


  useEffect(() => {
    if (isAuthenticated) {
      navigate(isLogin && returnUrl && currentUser?.role === 'CUSTOMER' ? returnUrl : homePathForRole(currentUser?.role), { replace: true });
    } else if (isRegister && accountRole === "HOTEL_OWNER") {
      navigate("/partner/register/hotel", { replace: true });
    } else if (isRegister && accountRole === "ACTIVITY_VENDOR") {
      navigate("/partner/register/attraction", { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, isRegister, accountRole, isLogin, returnUrl]);

  const switchTab = (nextTab) => {
    setError("");
    setSuccessMsg("");
    navigate(nextTab === "signup" ? "/auth/register" : "/auth/login", {
      replace: true,
      state: location.state,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccessMsg("");

    if (isRegister && accountRole === 'ACTIVITY_VENDOR') {
      navigate('/partner/register/attraction');
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setError("Vui lòng nhập họ và tên của bạn");
        return;
      }
      if (!agreeTerms) {
        setError("Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật");
        return;
      }
      if (password.length < 8) {
        setError("Mật khẩu phải có ít nhất 8 ký tự");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp");
        return;
      }
    }

    if (isOtpStep && !/^\d{6}$/.test(otp)) {
      setError("Vui lòng nhập mã xác thực gồm 6 chữ số");
      return;
    }

    if (isResetPassword) {
      if (password.length < 8) {
        setError("Mật khẩu phải có ít nhất 8 ký tự");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const user = await login({ email, password });
        navigate(returnUrl && user?.role === 'CUSTOMER' ? returnUrl : homePathForRole(user?.role), { replace: true });
      } else if (isRegister) {
        const user = await register({
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
          role_name: accountRole,
        });
        if (user.verificationRequired) {
          setEmail(user.email); setOtp(''); setPassword(''); setConfirmPassword('');
          setResendCooldown(user.resendAfterSeconds || 60);
          setSuccessMsg('Mã xác thực đã được gửi. Vui lòng xác thực email để hoàn tất đăng ký.');
          navigate(`/auth/verify-email?email=${encodeURIComponent(user.email)}`, { replace: true, state: { resendAfterSeconds: user.resendAfterSeconds || 60, returnUrl } });
        } else {
          navigate(user?.status === 'PENDING' ? PENDING_APPROVAL_PATH : (returnUrl && user?.role === 'CUSTOMER' ? returnUrl : homePathForRole(user?.role)), { replace: true });
        }
      } else if (isEmailOtp) {
        await authApi.verifyEmail({ email, otp });
        setOtp(''); setPassword(''); setConfirmPassword('');
        setSuccessMsg('Email đã được xác thực thành công. Bạn có thể đăng nhập ngay.');
        navigate(`/auth/login?verified=1&email=${encodeURIComponent(email)}`, { replace: true });
      } else if (isForgot) {
        const response = await authApi.forgotPassword({ email });
        setOtp(''); setResendCooldown(response.data?.resendAfterSeconds || 60);
        navigate(`/auth/verify-reset-otp?email=${encodeURIComponent(email)}`, {
          replace: true,
          state: { resendAfterSeconds: response.data?.resendAfterSeconds || 60 },
        });
      } else if (isResetOtp) {
        const response = await authApi.verifyResetOtp({ email, otp });
        const token = response.data.resetToken;
        sessionStorage.setItem(`travelio_reset_token:${email}`, token);
        setResetToken(token);
        navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`, {
          replace: true,
        });
      } else if (isResetPassword) {
        await authApi.resetPassword({
          email,
          resetToken,
          new_password: password,
        });
        sessionStorage.removeItem(`travelio_reset_token:${email}`);
        setSuccessMsg("Mật khẩu đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới.");
        navigate("/auth/login?reset=1", { replace: true });
      }
    } catch (err) {
      if (isLogin && ['PENDING_APPROVAL', 'REGISTRATION_REJECTED'].includes(err.code) && err.registration) {
        try {
          pendingRegistration.save(err.registration);
          navigate(PENDING_APPROVAL_PATH, { replace: true });
          return;
        } catch { /* fall through to the plain error message */ }
      }
      setError(err.message);
      if (err.retryAfterSeconds) setResendCooldown(err.retryAfterSeconds);
      if ((isLogin || isRegister) && ['EMAIL_NOT_VERIFIED', 'EMAIL_DELIVERY_FAILED'].includes(err.code)) {
        setPassword(''); setConfirmPassword(''); setOtp(''); setResendCooldown(0);
        navigate(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };
  const resendOtp = async () => {
    if (loading || resendCooldown > 0) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const response = await (isEmailOtp ? authApi.resendVerification({ email }) : authApi.forgotPassword({ email }));
      setOtp(''); setResendCooldown(response.data?.resendAfterSeconds || 60);
      if (isResetOtp) {
        sessionStorage.removeItem(`travelio_reset_token:${email}`); setResetToken('');
      }
      setSuccessMsg(response.message || 'Mã xác thực mới đã được gửi đến email của bạn.');
    } catch (err) {
      setError(err.message);
      if (err.retryAfterSeconds) setResendCooldown(err.retryAfterSeconds);
    } finally { setLoading(false); }
  };
  const pageTitle = isLogin
    ? "Chào mừng bạn quay lại!"
    : isRegister
      ? "Tạo tài khoản Travelio"
      : isForgot
          ? "Đặt lại mật khẩu"
          : isEmailOtp
            ? "Xác thực email của bạn"
          : isResetOtp
            ? "Nhập mã khôi phục"
            : "Thiết lập mật khẩu mới";
  const pageDescription = isLogin
    ? "Nhập thông tin tài khoản để quản lý đơn đặt phòng và chuyến đi của bạn."
    : isRegister
      ? "Lưu điểm yêu thích, quản lý đơn đặt và lưu giữ vé tham quan tại một nơi."
      : isForgot
          ? "Nhập địa chỉ email của bạn để nhận mã đặt lại mật khẩu nếu tài khoản tồn tại."
          : isEmailOtp
            ? `Nhập mã gồm 6 chữ số đã gửi tới ${email} để hoàn tất đăng ký. Mã có hiệu lực trong 5 phút.`
          : isResetOtp
            ? `Nhập mã gồm 6 chữ số đã gửi tới ${email}. Mã có hiệu lực trong 5 phút.`
            : "Chọn mật khẩu mới có ít nhất 8 ký tự.";

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-y-auto font-body">
      <div className="relative w-full lg:w-1/2 min-h-[460px] lg:min-h-screen p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <img
          src={heroImg}
          alt="Travelio background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-slate-950/50" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <IconMapPin size={16} className="text-white" />
            </div>
            <span className="font-heading font-800 text-white text-lg tracking-tight">
              travelio
            </span>
          </div>
          <div className="bg-black/35 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-white">
            <div className="flex gap-1 text-warning-500 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <IconStar key={i} size={12} filled />
              ))}
            </div>
            <div className="font-bold text-xs">4.9 / 5 sao</div>
            <div className="text-[10px] text-white/70">
              Hơn 10.000+ du khách tin dùng
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-12">
          <div
            onClick={() => {
              if (trending?.facility_id) {
                navigate(`/facilities/${trending.facility_id}`);
              } else {
                navigate("/search");
              }
            }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-white flex items-center justify-between gap-3 max-w-sm mb-6 cursor-pointer hover:bg-white/30 transition duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={trending.image_url}
                alt={trending.name}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1528127269322-539801943592?w=120&h=120&fit=crop";
                }}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[9px] font-bold tracking-wider uppercase text-white/80 block">
                  Xu hướng hiện tại
                </span>
                <div className="text-xs font-bold text-white leading-tight truncate">
                  {trending.name}
                </div>
                <span className="text-[11px] text-white/70 block truncate">
                  {trending.subtitle}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white text-text-primary flex items-center justify-center shadow-md flex-shrink-0">
              <IconArrowRight size={14} />
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/70 block mb-2">
            Hành trình tiếp theo bắt đầu từ đây
          </span>
          <h1 className="font-heading font-extrabold text-white text-3xl lg:text-4xl leading-tight mb-2">
            Khám phá những điểm đến tuyệt vời.
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-md leading-relaxed">
            Một tài khoản cho mọi kỳ nghỉ dưỡng khó quên, trải nghiệm địa phương
            và mọi tấm vé trên suốt hành trình của bạn.
          </p>
        </div>
      </div>

      <div className="relative w-full lg:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate("/")}
            className="text-xs font-semibold text-text-primary hover:text-primary-600 flex items-center gap-1 transition"
          >
            Tiếp tục với tư cách khách <IconArrowRight size={14} />
          </button>
        </div>

        <div className="max-w-md w-full mx-auto my-auto">
          {(isLogin || isRegister) && (
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6">
              <button
                type="button"
                onClick={() => switchTab("login")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "login" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "signup" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
              >
                Đăng ký
              </button>
            </div>
          )}

          <div className="mb-6">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block mb-1">
              {isLogin
                ? "Chào mừng quay lại"
                : isRegister
                  ? "Bắt đầu khám phá"
                  : "Bảo mật tài khoản"}
            </span>
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl text-text-primary mb-1">
              {pageTitle}
            </h2>
            <p className="text-text-secondary text-xs">{pageDescription}</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-danger-100 border border-danger-500/30 rounded-xl text-danger-500 text-xs">
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
            {isRegister && (
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
                      onClick={() => navigate("/partner/register/hotel")}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        accountRole === "HOTEL_OWNER"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-border hover:bg-slate-50 text-text-secondary"
                      }`}
                    >
                      <IconHotel size={14} />
                      <span>Chủ khách sạn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/partner/register/attraction', { state: { account: { full_name: fullName, email } } })}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        accountRole === "ACTIVITY_VENDOR"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-border hover:bg-slate-50 text-text-secondary"
                      }`}
                    >
                      <IconTicket size={14} />
                      <span>Nhà cung cấp vé</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1 block">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>
              </>
            )}

            {!isResetPassword && (
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1 block">
                  Địa chỉ email
                </label>
                <div className="relative">
                  <IconMail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={isOtpStep && Boolean(searchParams.get('email'))}
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>
              </div>
            )}

            {(isLogin || isRegister || isResetPassword) && (
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1 block">
                  Mật khẩu
                </label>
                <div className="relative">
                  <IconLock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isRegister || isResetPassword
                        ? "Tối thiểu 8 ký tự"
                        : "Nhập mật khẩu của bạn"
                    }
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
                  >
                    {showPassword ? (
                      <IconEyeOff size={15} />
                    ) : (
                      <IconEye size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {(isRegister || isResetPassword) && (
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1 block">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                />
              </div>
            )}

            {isOtpStep && (
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1 block">
                  Mã xác thực 6 số
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-center text-xl tracking-[0.3em] text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary-500 transition"
                />
              </div>
            )}

            {isLogin ? (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  className="font-semibold text-primary-600 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
            ) : isRegister ? (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                />
                <span>
                  Tôi đồng ý với{" "}
                  <span className="text-primary-600 font-semibold underline">
                    Điều khoản sử dụng
                  </span>{" "}
                  và{" "}
                  <span className="text-primary-600 font-semibold underline">
                    Chính sách bảo mật
                  </span>
                  .
                </span>
              </label>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <span>
                {loading
                  ? "Đang xử lý..."
                  : isLogin
                    ? "Đăng nhập"
                    : isRegister
                      ? "Tạo tài khoản"
                      : isForgot
                          ? "Gửi mã khôi phục"
                          : isOtpStep
                            ? "Xác thực mã"
                            : "Cập nhật mật khẩu"}
              </span>
              {!loading && <IconArrowRight size={14} />}
            </button>
          </form>

          {(isLogin || isRegister) && (
            <div className="mt-5 text-center text-xs text-text-secondary">
              {isLogin ? (
                <span>
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("signup")}
                    className="text-primary-600 font-bold hover:underline"
                  >
                    Đăng ký miễn phí
                  </button>
                </span>
              ) : (
                <span>
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="text-primary-600 font-bold hover:underline"
                  >
                    Đăng nhập
                  </button>
                </span>
              )}
            </div>
          )}

          {isOtpStep && (
            <div className="mt-5 flex justify-center gap-4 text-xs">
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading || resendCooldown > 0 || !email}
                className="text-primary-600 font-semibold hover:underline disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : 'Gửi lại mã'}
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-text-secondary hover:text-text-primary"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}

          {(isForgot || isResetPassword) && (
            <div className="mt-5 text-center text-xs">
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-primary-600 font-semibold hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-secondary mt-7">
            <IconShield size={13} className="text-text-secondary" />
            <span>Truy cập an toàn được bảo vệ bởi xác thực mã hóa</span>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px] text-text-secondary hover:bg-slate-50 cursor-pointer">
            ?
          </div>
        </div>
      </div>
    </div>
  );
}
