import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { vendorApi } from "../../services/api/vendorApi";
import { VendorSidebar } from "./HotelOwnerDashboardPage";
import {
  IconHotel,
  IconMapPin,
  IconUser,
  IconShield,
  IconCheck,
  IconPlus,
  IconPercent,
  IconDollar,
  IconArrowRight
} from "../../components/Icons";

export default function PartnerRegistrationProfilePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    vendorApi
      .getProfile()
      .then((res) => {
        if (isMounted) setData(res.data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Không thể tải hồ sơ đăng ký");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const user = data?.user || currentUser;
  const profile = data?.profile || {};
  const facilities = data?.facilities || [];

  const formatPrice = (val) =>
    Number(val || 0).toLocaleString("vi-VN") + " VND";

  return (
    <div className="flex h-screen bg-[#f8fafc] font-body overflow-hidden">
      {/* Sidebar chung của Vendor */}
      <VendorSidebar
        activeScreen={10}
        onNavigate={(path) => navigate(path)}
        onProfile={() => navigate("/profile")}
        onLogout={() => {
          logout?.();
          navigate("/auth/login");
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between flex-shrink-0 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-xl text-text-primary tracking-tight">
                Hồ sơ cơ sở & Cấu hình phòng
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                Partner Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ dữ liệu hồ sơ đối tác, cơ sở lưu trú và các loại phòng đã thiết lập
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/vendor")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              Về Dashboard
            </button>
            <button
              onClick={() => navigate("/partner/register/hotel")}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <IconPlus size={15} />
              Đăng ký thêm cơ sở mới
            </button>
          </div>
        </header>

        {/* Nội dung chính */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {loading && (
            <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Đang tải dữ liệu hồ sơ đăng ký...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* PHẦN 1: THÔNG TIN CHỦ CƠ SỞ (USER & USERPROFILE) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                      <IconUser size={20} />
                    </div>
                    <div>
                      <h2 className="font-heading font-extrabold text-base text-text-primary">
                        Hồ sơ chủ tài khoản đối tác
                      </h2>
                      <span className="text-xs text-slate-400">
                        Thông tin định danh pháp lý và liên lạc
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200/60 flex items-center gap-1">
                    <IconCheck size={12} />
                    Đã xác thực
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/90">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Họ và tên
                    </span>
                    <span className="font-extrabold text-text-primary text-sm mt-1 block">
                      {user?.full_name || "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/90">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Email liên hệ
                    </span>
                    <span className="font-semibold text-text-primary mt-1 block truncate">
                      {user?.email || "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/90">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Số điện thoại
                    </span>
                    <span className="font-semibold text-text-primary mt-1 block">
                      {user?.phone || "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/90">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Loại đối tác
                    </span>
                    <span className="font-bold text-primary-600 mt-1 block">
                      {profile.host_type === "professional"
                        ? "Doanh nghiệp / Chuyên nghiệp"
                        : "Cá nhân / Tư nhân"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                      Quốc tịch
                    </span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {profile.nationality || "Việt Nam"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                      Ngày sinh
                    </span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {profile.birth_date
                        ? new Date(profile.birth_date).toLocaleDateString("vi-VN")
                        : "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                      Nơi cư trú
                    </span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {[profile.city_residence, profile.province, profile.residence_country]
                        .filter(Boolean)
                        .join(", ") || "Việt Nam"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                      Ngôn ngữ giao tiếp
                    </span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {profile.preferred_language || "Tiếng Việt"}
                    </span>
                  </div>
                </div>
              </div>

              {/* PHẦN 2: DANH SÁCH CƠ SỞ LƯU TRÚ & PHÒNG */}
              {facilities.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    Chưa có cơ sở lưu trú nào được đăng ký.
                  </p>
                </div>
              ) : (
                facilities.map((fac, fIdx) => (
                  <div
                    key={fac._id || fIdx}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
                  >
                    {/* Header thông tin cơ sở */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          <IconHotel size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-extrabold text-lg text-text-primary">
                              {fac.name}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-100 text-success-700">
                              {fac.status || "ACTIVE"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <IconMapPin size={14} className="text-primary-500" />
                            {fac.address}, {fac.city}
                          </p>
                          {fac.latitude && fac.longitude && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Tọa độ GPS: {fac.latitude.toFixed(5)}, {fac.longitude.toFixed(5)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {fac.size && (
                          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-slate-400 text-[10px] block">Diện tích</span>
                            <span className="font-semibold text-text-primary">{fac.size} m²</span>
                          </div>
                        )}
                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-slate-400 text-[10px] block">Phương thức thanh toán</span>
                          <span className="font-semibold text-primary-600 uppercase">
                            {fac.payout_method || "bank_transfer"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mô tả & Tiện ích */}
                    <div className="space-y-3">
                      {fac.description && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Mô tả chỗ nghỉ
                          </span>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            {fac.description}
                          </p>
                        </div>
                      )}

                      {fac.amenities && fac.amenities.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Tiện nghi đã chọn ({fac.amenities.length})
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {fac.amenities.map((am, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-xl border border-primary-200/50 flex items-center gap-1.5"
                              >
                                <IconCheck size={13} />
                                {am}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DANH SÁCH CÁC PHÒNG NGHỈ THUỘC CƠ SỞ */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wide">
                          Danh sách phòng đã đăng ký ({fac.rooms?.length || 0})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fac.rooms?.map((room, rIdx) => {
                          const roomPhotos = Array.isArray(room.photos) ? room.photos : [];
                          return (
                            <div
                              key={room._id || rIdx}
                              className="rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-primary-400 transition shadow-xs flex flex-col"
                            >
                              {/* Ảnh đại diện phòng */}
                              <div className="relative h-44 bg-slate-100">
                                {roomPhotos[0] ? (
                                  <img
                                    src={roomPhotos[0]}
                                    alt={room.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                    Không có ảnh
                                  </div>
                                )}
                                <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  {roomPhotos.length} ảnh
                                </span>
                              </div>

                              {/* Thư viện ảnh nhỏ (Thumbnail previews) */}
                              {roomPhotos.length > 1 && (
                                <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 border-b border-slate-100">
                                  {roomPhotos.slice(0, 4).map((pUrl, pIdx) => (
                                    <img
                                      key={pIdx}
                                      src={pUrl}
                                      alt={`room-sub-${pIdx}`}
                                      className="h-10 w-full object-cover rounded-md border border-slate-200"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Chi tiết phòng */}
                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-bold text-sm text-text-primary leading-snug">
                                      {room.name}
                                    </h5>
                                    <span className="text-primary-600 font-extrabold text-sm whitespace-nowrap">
                                      {formatPrice(room.base_price)}
                                      <span className="text-[10px] text-slate-400 font-normal"> /đêm</span>
                                    </span>
                                  </div>

                                  {/* Thông số phòng */}
                                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mt-2">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                      {room.capacity || 2} khách
                                    </span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                                      {room.bathrooms || 1} phòng tắm
                                    </span>
                                  </div>

                                  {/* Cấu hình giường ngủ */}
                                  {room.bedrooms && room.bedrooms.length > 0 && (
                                    <div className="mt-2.5 text-xs text-slate-600">
                                      <span className="text-[10px] text-slate-400 font-semibold block">
                                        Giường ngủ:
                                      </span>
                                      {room.bedrooms.map((bedGroup, bIdx) => (
                                        <div key={bIdx} className="text-[11px] text-slate-700">
                                          {bedGroup.beds?.map((b, i) => (
                                            <span key={i} className="inline-block mr-2">
                                              • {b.count}x {b.bed_type}
                                            </span>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

