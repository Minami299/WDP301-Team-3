import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  IconArrowRight,
  IconCheck,
  IconHotel,
  IconLock,
  IconMail,
  IconTicket,
  IconX
} from "./Icons";

export default function PartnerRegistrationModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const currentUser = auth?.currentUser;

  const [partnerStep, setPartnerStep] = useState(1); // 1: Chọn role, 2: Nhập thông tin dịch vụ
  const [partnerRole, setPartnerRole] = useState("HOTEL_OWNER"); // 'HOTEL_OWNER' | 'ACTIVITY_VENDOR'

  // Thông tin cơ sở & dịch vụ
  const [facilityName, setFacilityName] = useState("");
  const [facilityCity, setFacilityCity] = useState("Đà Nẵng");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityDesc, setFacilityDesc] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCapacity, setServiceCapacity] = useState("2");
  const [phone, setPhone] = useState("");

  // Thông tin tài khoản nếu chưa đăng nhập
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setError("");
    setSuccessMsg("");
    setPartnerStep(1);
    onClose();
  };

  const handleGoToServiceForm = () => {
    setError("");
    if (partnerRole === "HOTEL_OWNER") {
      if (!serviceCapacity) setServiceCapacity("2");
    } else {
      if (!serviceCapacity) setServiceCapacity("10");
    }
    setPartnerStep(2);
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // KIỂM TRA BẮT BUỘC THÔNG TIN CƠ SỞ & DỊCH VỤ
    if (!facilityName.trim()) {
      setError(`Vui lòng nhập tên ${partnerRole === "HOTEL_OWNER" ? "khách sạn / cơ sở lưu trú" : "đơn vị / điểm tham quan"}`);
      return;
    }
    if (!facilityCity.trim()) {
      setError("Vui lòng chọn hoặc nhập Tỉnh / Thành phố");
      return;
    }
    if (!facilityAddress.trim()) {
      setError("Vui lòng nhập địa chỉ cụ thể của cơ sở kinh doanh");
      return;
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại hotline / liên hệ");
      return;
    }
    if (!serviceName.trim()) {
      setError(`Vui lòng nhập tên ${partnerRole === "HOTEL_OWNER" ? "hạng phòng đầu tiên" : "vé / tour dịch vụ đầu tiên"}`);
      return;
    }
    if (!servicePrice || Number(servicePrice) <= 0) {
      setError("Vui lòng nhập giá dịch vụ hợp lệ lớn hơn 0");
      return;
    }

    // Nếu chưa đăng nhập: Kiểm tra thông tin tài khoản
    if (!currentUser) {
      if (!fullName.trim() || !email.trim() || !password) {
        setError("Vui lòng điền đầy đủ họ tên, email và mật khẩu tài khoản");
        return;
      }
      if (password.length < 8) {
        setError("Mật khẩu phải có độ dài tối thiểu 8 ký tự");
        return;
      }
      if (!agreeTerms) {
        setError("Vui lòng đồng ý với Điều khoản và Quy chế đối tác");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        role_name: partnerRole,
        facility_name: facilityName.trim(),
        facility_city: facilityCity.trim(),
        facility_address: facilityAddress.trim(),
        facility_description: facilityDesc.trim() || undefined,
        service_name: serviceName.trim(),
        service_price: Number(servicePrice),
        service_capacity: Number(serviceCapacity) || (partnerRole === "HOTEL_OWNER" ? 2 : 1),
        phone: phone.trim()
      };

      if (currentUser) {
        // Nâng cấp tài khoản hiện tại kèm thông tin dịch vụ
        if (auth?.becomePartner) {
          await auth.becomePartner(payload);
        }
      } else {
        // Đăng ký tài khoản đối tác mới kèm thông tin dịch vụ
        if (auth?.register) {
          await auth.register({
            ...payload,
            full_name: fullName.trim(),
            email: email.trim(),
            password
          });
        }
      }

      setSuccessMsg("Đăng ký thông tin dịch vụ đối tác thành công! Đang chuyển đến Kênh quản trị đối tác...");
      setTimeout(() => {
        handleClose();
        navigate("/vendor");
      }, 1000);
    } catch (err) {
      setError(err.message || "Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-border relative max-h-[90vh] flex flex-col">
        {/* Nút đóng */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-slate-100 transition z-10"
        >
          <IconX size={18} />
        </button>

        {/* Header modal */}
        <div className="mb-4 pr-8 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">
              TRAVELIO PARTNER NETWORK
            </span>
            <span className="text-[10px] bg-slate-100 text-text-secondary px-2 py-0.5 rounded-full font-semibold">
              Bước {partnerStep}/2
            </span>
          </div>
          <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-text-primary">
            {partnerStep === 1 ? "Trở thành đối tác cùng Travelio" : "Đăng ký thông tin dịch vụ đối tác"}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {partnerStep === 1
              ? "Chọn mô hình kinh doanh phù hợp để tiếp cận hàng triệu du khách."
              : "Điền đầy đủ thông tin cơ sở và dịch vụ để hoàn tất đăng ký đối tác."}
          </p>
        </div>

        {/* Thông báo lỗi / thành công */}
        {error && (
          <div className="mb-3 p-3 bg-danger-100 border border-danger-500/30 rounded-xl text-danger-500 text-xs flex-shrink-0">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-3 bg-success-100 border border-success-500/30 rounded-xl text-success-700 text-xs flex items-center gap-2 flex-shrink-0">
            <IconCheck size={14} />
            {successMsg}
          </div>
        )}

        {/* Nội dung các bước cuộn được */}
        <div className="overflow-y-auto pr-1 flex-1">
          {partnerStep === 1 ? (
            /* BƯỚC 1: CHỌN MÔ HÌNH ĐỐI TÁC */
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Hotel Owner */}
                <div
                  onClick={() => setPartnerRole("HOTEL_OWNER")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    partnerRole === "HOTEL_OWNER"
                      ? "border-primary-500 bg-primary-50/40 shadow-sm ring-1 ring-primary-500/30"
                      : "border-border hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      partnerRole === "HOTEL_OWNER" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"
                    }`}>
                      <IconHotel size={20} />
                    </div>
                    <h4 className="font-bold text-sm text-text-primary mb-1">Hotel Owner</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Chủ khách sạn, resort, villa, homestay quản lý bảng giá, hạng phòng và nhận đặt phòng trực tuyến.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-600">
                    <span>Cơ sở lưu trú</span>
                    <IconArrowRight size={13} />
                  </div>
                </div>

                {/* Option 2: Attraction Vendor */}
                <div
                  onClick={() => setPartnerRole("ACTIVITY_VENDOR")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    partnerRole === "ACTIVITY_VENDOR"
                      ? "border-primary-500 bg-primary-50/40 shadow-sm ring-1 ring-primary-500/30"
                      : "border-border hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      partnerRole === "ACTIVITY_VENDOR" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"
                    }`}>
                      <IconTicket size={20} />
                    </div>
                    <h4 className="font-bold text-sm text-text-primary mb-1">Attraction Vendor</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Nhà cung cấp vé tham quan, tour du lịch, hoạt động trải nghiệm & quét mã QR vào cổng.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-600">
                    <span>Tour & Điểm đến</span>
                    <IconArrowRight size={13} />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-border rounded-xl text-xs text-text-secondary leading-relaxed">
                Đăng ký làm đối tác để nhận báo cáo doanh thu, quản lý đặt chỗ theo thời gian thực và kết nối khách hàng toàn cầu.
              </div>

              <button
                type="button"
                onClick={handleGoToServiceForm}
                className="w-full mt-2 py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
              >
                <span>Tiếp tục: Nhập thông tin dịch vụ</span>
                <IconArrowRight size={14} />
              </button>
            </div>
          ) : (
            /* BƯỚC 2: FORM ĐIỀN THÔNG TIN CƠ SỞ & DỊCH VỤ */
            <form onSubmit={handlePartnerSubmit} className="space-y-4 pt-1">
              {/* Badge vai trò đã chọn */}
              <div className="flex items-center justify-between p-2.5 bg-primary-50 border border-primary-200 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  {partnerRole === "HOTEL_OWNER" ? <IconHotel size={16} className="text-primary-600" /> : <IconTicket size={16} className="text-primary-600" />}
                  <span className="font-semibold text-primary-900">
                    Vai trò đăng ký: {partnerRole === "HOTEL_OWNER" ? "Chủ khách sạn (Hotel Owner)" : "Nhà cung cấp (Attraction Vendor)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPartnerStep(1)}
                  className="text-primary-600 hover:underline font-bold text-[11px]"
                >
                  Đổi loại hình
                </button>
              </div>

              {/* KHỐI 1: THÔNG TIN CƠ SỞ KINH DOANH */}
              <div className="border border-border rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <span>1. Thông tin cơ sở kinh doanh</span>
                  <span className="text-danger-500">*</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-primary mb-1 block">
                    {partnerRole === "HOTEL_OWNER" ? "Tên khách sạn / Cơ sở lưu trú" : "Tên đơn vị / Điểm tham quan"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder={partnerRole === "HOTEL_OWNER" ? "VD: Khách sạn Sunrise Beach Resort" : "VD: Sun World Ba Na Hills / Da Nang Tour"}
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">Tỉnh / Thành phố *</label>
                    <select
                      value={facilityCity}
                      onChange={(e) => setFacilityCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary-500 transition"
                    >
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Nha Trang">Nha Trang</option>
                      <option value="Phú Quốc">Phú Quốc</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Lạt">Đà Lạt</option>
                      <option value="Hạ Long">Hạ Long</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">Số điện thoại liên hệ *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-primary mb-1 block">Địa chỉ cụ thể *</label>
                  <input
                    type="text"
                    required
                    value={facilityAddress}
                    onChange={(e) => setFacilityAddress(e.target.value)}
                    placeholder="VD: 123 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà"
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>
              </div>

              {/* KHỐI 2: THÔNG TIN DỊCH VỤ BAN ĐẦU */}
              <div className="border border-border rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <span>2. Thông tin dịch vụ đầu tiên cung cấp</span>
                  <span className="text-danger-500">*</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-primary mb-1 block">
                    {partnerRole === "HOTEL_OWNER" ? "Tên hạng phòng đầu tiên *" : "Tên vé / Tour dịch vụ đầu tiên *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder={partnerRole === "HOTEL_OWNER" ? "VD: Phòng Deluxe King Hướng Biển" : "VD: Vé cáp treo khứ hồi & Buffet trưa"}
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">
                      {partnerRole === "HOTEL_OWNER" ? "Giá phòng 1 đêm (VNĐ) *" : "Giá vé / Tour 1 người (VNĐ) *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="VD: 1200000"
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">
                      {partnerRole === "HOTEL_OWNER" ? "Số khách tối đa / phòng" : "Số lượng khách tối đa"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={serviceCapacity}
                      onChange={(e) => setServiceCapacity(e.target.value)}
                      placeholder="VD: 2"
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-primary mb-1 block">Mô tả tóm tắt dịch vụ</label>
                  <textarea
                    rows="2"
                    value={facilityDesc}
                    onChange={(e) => setFacilityDesc(e.target.value)}
                    placeholder="Mô tả các tiện nghi, điểm nổi bật của dịch vụ..."
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition resize-none"
                  />
                </div>
              </div>

              {/* KHỐI 3: THÔNG TIN TÀI KHOẢN */}
              {currentUser ? (
                <div className="p-3 bg-slate-50 border border-border rounded-xl">
                  <span className="text-[11px] text-text-secondary block mb-0.5">Tài khoản đối tác liên kết:</span>
                  <div className="font-semibold text-xs text-text-primary">{currentUser.full_name} ({currentUser.email})</div>
                </div>
              ) : (
                <div className="border border-border rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                  <div className="text-xs font-bold text-text-primary uppercase tracking-wide">
                    3. Thông tin tài khoản đăng nhập *
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">Họ và tên người đại diện *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-primary mb-1 block">Email đăng nhập *</label>
                      <div className="relative">
                        <IconMail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="partner@example.com"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-primary mb-1 block">Mật khẩu (tối thiểu 8 ký tự) *</label>
                      <div className="relative">
                        <IconLock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-text-secondary">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-0"
                      />
                      <span>
                        Tôi cam kết thông tin dịch vụ chính xác và đồng ý với{" "}
                        <span className="text-primary-600 font-semibold underline">Quy chế đối tác</span>.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* HÀNG NÚT BẤM */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPartnerStep(1)}
                  className="px-4 py-2.5 border border-border rounded-xl text-xs font-semibold text-text-secondary hover:bg-slate-50 transition"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                  {loading ? "Đang xử lý đăng ký..." : "Xác nhận & Hoàn tất đăng ký dịch vụ"}
                  <IconArrowRight size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

