import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { bookingApi } from "../../services/api/bookingApi";
import {
  IconStar,
  IconTicket,
  IconCheck,
  IconClock,
  IconChevronRight,
  IconArrowRight,
  IconAlertTriangle,
  IconHotel,
} from "../../components/Icons";

const money = (val) => Number(val || 0).toLocaleString("vi-VN") + " ₫";

export default function LoyaltyRewardsPage() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuth();

  const [loyaltyData, setLoyaltyData] = useState({
    redeemable: [],
    newUserPromos: [],
    platformPromos: [],
    myPromos: [],
    savedIds: [],
    history: [],
    points: currentUser?.total_loyalty_points || 0,
    pointValue: 1000,
    isNewUser: true,
    loading: true,
  });

  const [platformCategoryFilter, setPlatformCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "new_user" | "platform" | "redeem" | "wallet" | "history"
  const [copiedCode, setCopiedCode] = useState("");
  const [savingVoucherId, setSavingVoucherId] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const currentUserId = currentUser?.id || currentUser?._id;

  const showResult = (msg) => {
    setError("");
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  const loadLoyaltyData = useCallback(async () => {
    setLoyaltyData((prev) => ({ ...prev, loading: true }));
    try {
      const [redeemRes, promoRes, historyRes] = await Promise.all([
        bookingApi
          .redeemablePromotions()
          .catch(() => ({ data: { vouchers: [], loyalty_points: 0, point_value: 1000 } })),
        bookingApi.promotions().catch(() => ({ data: { promotions: [] } })),
        bookingApi
          .pointHistory()
          .catch(() => ({ data: { transactions: [], total_loyalty_points: 0, point_value: 1000 } })),
      ]);

      const promoData = promoRes.data || {};
      const allPromos = promoData.promotions || [];
      const savedIds = promoData.saved_promotion_ids || [];

      // 1. New user promotions: target_audience === 'NEW_USER'
      const newUserPromos =
        promoData.new_user_promotions ||
        allPromos.filter(
          (p) => (p.target_audience === "NEW_USER" || p.voucher_type === "NEW_USER") && !p.user_id
        );

      // 2. Platform public promotions: target_audience === 'ALL'
      const platformPromos =
        promoData.platform_promotions ||
        allPromos.filter((p) => p.target_audience === "ALL" && !p.user_id);

      // 3. My Promos (Wallet): redeemed vouchers (with user_id) OR saved public vouchers
      const myPromos =
        promoData.my_promotions ||
        allPromos.filter(
          (p) =>
            (p.user_id && String(p.user_id) === String(currentUserId)) ||
            savedIds.includes(String(p._id))
        );

      const latestPoints =
        historyRes.data?.total_loyalty_points ?? promoData.loyalty_points ?? 0;
      if (updateCurrentUser && currentUser?.total_loyalty_points !== latestPoints) {
        updateCurrentUser({ total_loyalty_points: latestPoints });
      }

      setLoyaltyData({
        redeemable: redeemRes.data?.vouchers || [],
        newUserPromos,
        platformPromos,
        myPromos,
        savedIds,
        history: historyRes.data?.transactions || [],
        points: latestPoints,
        pointValue: historyRes.data?.point_value || promoData.point_value || 1000,
        isNewUser: promoData.is_new_user ?? true,
        loading: false,
      });
    } catch {
      setLoyaltyData((prev) => ({ ...prev, loading: false }));
    }
  }, [currentUserId, currentUser?.total_loyalty_points, updateCurrentUser]);

  useEffect(() => {
    loadLoyaltyData();
  }, [loadLoyaltyData]);

  const handleSaveVoucher = async (promo) => {
    setSavingVoucherId(promo._id);
    setError("");
    setNotice("");
    try {
      const isSaved = loyaltyData.savedIds.includes(String(promo._id));
      if (isSaved) {
        await bookingApi.unsavePromotion({ promotion_id: promo._id });
        showResult(`Đã bỏ lưu mã [${promo.code}] khỏi ví voucher.`);
      } else {
        await bookingApi.savePromotion({ promotion_id: promo._id });
        showResult(`Đã lưu mã [${promo.code}] vào ví voucher của bạn thành công!`);
      }
      await loadLoyaltyData();
    } catch (err) {
      setError(err.message || "Không thể thực hiện thao tác");
    } finally {
      setSavingVoucherId(null);
    }
  };

  const handleRedeemVoucher = async (voucher) => {
    if (
      !window.confirm(
        `Xác nhận dùng ${voucher.points_cost} điểm để đổi voucher "${voucher.title || voucher.code}"?`
      )
    ) {
      return;
    }
    setRedeemingId(voucher._id);
    setError("");
    setNotice("");
    try {
      const res = await bookingApi.redeemPromotion({ promotion_id: voucher._id });
      showResult(res.data?.message || `Đổi thành công voucher ${res.data?.voucher?.code || ""}`);
      if (res.data?.remaining_points !== undefined && updateCurrentUser) {
        updateCurrentUser({ total_loyalty_points: res.data.remaining_points });
      }
      await loadLoyaltyData();
    } catch (err) {
      setError(err.message || "Đổi voucher thất bại");
    } finally {
      setRedeemingId(null);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const filteredPlatformPromos = useMemo(() => {
    return loyaltyData.platformPromos.filter((p) => {
      if (platformCategoryFilter === "ALL") return true;
      return p.applicable_service === platformCategoryFilter || p.applicable_service === "ALL";
    });
  }, [loyaltyData.platformPromos, platformCategoryFilter]);

  const cardClass = "bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6";

  return (
    <div className="min-h-full bg-slate-50/70 pb-16 font-body">
      {/* ──────── TOP BANNER HERO (EXCLUSIVE TRAVELIO REWARDS THEME) ──────── */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide uppercase">
                <IconStar size={14} filled={true} className="text-amber-400" />
                <span>Travelio Rewards &amp; Vouchers</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold tracking-tight text-white">
                Điểm Thưởng &amp; Kho Voucher
              </h1>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                Tích lũy điểm thưởng thành viên qua mỗi chuyến đi, thu thập mã ưu đãi du lịch toàn sàn và đổi lấy các voucher giảm giá độc quyền.
              </p>
            </div>

            {/* Quick Points Summary Card */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/15 p-5 min-w-[280px] shadow-xl">
              <div className="text-xs text-slate-300 font-medium flex items-center justify-between">
                <span>Số dư điểm hiện tại</span>
                <span className="text-[11px] text-amber-300 font-semibold">1 điểm = 1.000 ₫</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-heading">
                  {loyaltyData.points.toLocaleString("vi-VN")}
                </span>
                <span className="text-sm font-bold text-amber-200">điểm</span>
              </div>
              <div className="mt-1 text-xs text-slate-300">
                Tương đương:{" "}
                <strong className="text-white font-bold">
                  {money(loyaltyData.points * loyaltyData.pointValue)}
                </strong>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("redeem");
                    document.getElementById("section-redeem")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <span>Đổi voucher ngay</span>
                  <IconArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("history");
                    document.getElementById("section-history")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-slate-300 hover:text-white font-medium cursor-pointer transition"
                >
                  Lịch sử điểm
                </button>
              </div>
            </div>
          </div>

          {/* Quick Section Filter Navigation Pills */}
          <div className="mt-7 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-white/10">
            {[
              { id: "all", label: "Tất cả ưu đãi" },
              { id: "new_user", label: `Ưu đãi người mới (${loyaltyData.newUserPromos.length})` },
              { id: "platform", label: `Voucher toàn sàn (${loyaltyData.platformPromos.length})` },
              { id: "redeem", label: `Đổi bằng điểm (${loyaltyData.redeemable.length})` },
              { id: "wallet", label: `Ví của bạn (${loyaltyData.myPromos.length})` },
              { id: "history", label: "Lịch sử tích điểm" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== "all") {
                    document.getElementById(`section-${tab.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ──────── MAIN CONTENT CONTAINER ──────── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-7">
        {/* Toast / Notice Notifications */}
        {notice && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <span className="flex items-center gap-2">
              <IconCheck size={18} className="text-emerald-600" />
              <span>{notice}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <span className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-rose-600" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ──────── 1. THẺ GIỚI THIỆU CHÍNH SÁCH ĐIỂM THƯỞNG ──────── */}
        <section className={`${cardClass} bg-gradient-to-br from-amber-50/50 via-white to-primary-50/30 border-amber-200/80`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-amber-500 text-white p-3 shadow-xs">
                <IconStar size={24} filled={true} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Chính sách tích điểm &amp; Quy đổi thành viên
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Mỗi khi hoàn thành đơn đặt phòng hoặc vé tham quan, bạn sẽ được tích lũy <strong>2%</strong> giá trị đơn hàng vào tài khoản điểm thưởng.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Tỷ lệ đổi: 1 điểm = 1.000 ₫
                  </span>
                  <span>•</span>
                  <span>Trừ tiền trực tiếp khi thanh toán hoặc đổi voucher giảm sâu bên dưới</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right sm:border-l sm:border-slate-200/80 sm:pl-5">
              <span className="text-[11px] text-slate-500 block">Số dư khả dụng</span>
              <span className="text-2xl font-black text-amber-600 font-heading">
                {loyaltyData.points.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-semibold text-slate-400 block">điểm</span>
            </div>
          </div>
        </section>

        {/* ──────── 2. ƯU ĐÃI CHÀO MỪNG KHÁCH HÀNG MỚI (NEW_USER) ──────── */}
        {(activeTab === "all" || activeTab === "new_user") && (
          <section id="section-new_user" className={cardClass}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-amber-100 text-amber-700 p-2.5">
                <IconStar size={20} filled={true} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Ưu đãi Chào mừng Khách hàng mới
                  </h3>
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    Đơn đầu tiên
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã ưu đãi độc quyền dành riêng cho khách hàng mới chưa từng có đơn hoàn tất trên Travelio
                </p>
              </div>
            </div>

            {loyaltyData.loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải mã ưu đãi...</div>
            ) : loyaltyData.newUserPromos.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Hiện chưa có mã ưu đãi dành riêng cho khách hàng mới.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {loyaltyData.newUserPromos.map((p) => {
                  const isSaved = loyaltyData.savedIds.includes(String(p._id));
                  const isCopied = copiedCode === p.code;
                  const isSaving = savingVoucherId === p._id;

                  return (
                    <div
                      key={p._id || p.code}
                      className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-500 text-white shadow-2xs">
                            {p.discount_type === "PERCENTAGE"
                              ? `GIẢM ${p.discount_value}%`
                              : `GIẢM ${money(p.discount_value)}`}
                          </span>
                          <span className="font-mono font-bold text-amber-900 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            {p.code}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{p.title || p.code}</h4>
                        {p.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>
                        )}
                        <div className="mt-2.5 space-y-0.5 text-xs text-slate-500">
                          {p.min_order_amount > 0 && (
                            <div>
                              Đơn tối thiểu: <strong className="text-slate-800">{money(p.min_order_amount)}</strong>
                            </div>
                          )}
                          {p.max_discount && p.discount_type === "PERCENTAGE" && (
                            <div>
                              Giảm tối đa: <strong className="text-slate-800">{money(p.max_discount)}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          {p.valid_to ? `HSD: ${new Date(p.valid_to).toLocaleDateString("vi-VN")}` : "Vô thời hạn"}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCode(p.code)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition cursor-pointer"
                          >
                            {isCopied ? "✓ Đã chép" : "Sao chép"}
                          </button>

                          {!loyaltyData.isNewUser ? (
                            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1.5 rounded-lg font-medium">
                              Chỉ cho đơn đầu
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveVoucher(p)}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 shadow-xs ${
                                isSaved
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                                  : "bg-primary-600 text-white hover:bg-primary-700"
                              }`}
                            >
                              {isSaved ? "✓ Đã lưu vào ví" : "Lưu vào ví"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ──────── 3. KHO MÃ GIẢM GIÁ DU LỊCH TOÀN SÀN (ALL) ──────── */}
        {(activeTab === "all" || activeTab === "platform") && (
          <section id="section-platform" className={cardClass}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary-100 text-primary-700 p-2.5">
                  <IconTicket size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Kho Mã giảm giá du lịch toàn sàn
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thu thập mã ưu đãi áp dụng toàn hệ thống hoặc theo từng dịch vụ Khách sạn &amp; Vé tham quan
                  </p>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPlatformCategoryFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    platformCategoryFilter === "ALL"
                      ? "bg-white text-primary-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({loyaltyData.platformPromos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformCategoryFilter("HOTEL")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    platformCategoryFilter === "HOTEL"
                      ? "bg-white text-primary-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🏨 Khách sạn
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformCategoryFilter("ATTRACTION")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    platformCategoryFilter === "ATTRACTION"
                      ? "bg-white text-primary-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎟️ Vé tham quan
                </button>
              </div>
            </div>

            {loyaltyData.loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải mã giảm giá...</div>
            ) : filteredPlatformPromos.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Hiện chưa có mã giảm giá công khai nào phù hợp.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredPlatformPromos.map((p) => {
                  const isSaved = loyaltyData.savedIds.includes(String(p._id));
                  const isCopied = copiedCode === p.code;
                  const isSaving = savingVoucherId === p._id;
                  const serviceLabel =
                    p.applicable_service === "HOTEL"
                      ? "🏨 Khách sạn"
                      : p.applicable_service === "ATTRACTION"
                      ? "🎟️ Vé vui chơi"
                      : "🌐 Toàn sàn";

                  return (
                    <div
                      key={p._id || p.code}
                      className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-primary-300 hover:shadow-md transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                            {p.discount_type === "PERCENTAGE"
                              ? `GIẢM ${p.discount_value}%`
                              : `GIẢM ${money(p.discount_value)}`}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {serviceLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-sm text-slate-900">{p.title || p.code}</h4>
                          <span className="font-mono font-bold text-primary-700 text-xs bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                            {p.code}
                          </span>
                        </div>

                        {p.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                        )}

                        <div className="mt-2.5 space-y-0.5 text-xs text-slate-500">
                          {p.min_order_amount > 0 && (
                            <div>
                              Đơn tối thiểu: <strong className="text-slate-800">{money(p.min_order_amount)}</strong>
                            </div>
                          )}
                          {p.max_discount && p.discount_type === "PERCENTAGE" && (
                            <div>
                              Giảm tối đa: <strong className="text-slate-800">{money(p.max_discount)}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          {p.valid_to ? `HSD: ${new Date(p.valid_to).toLocaleDateString("vi-VN")}` : "Không giới hạn HSD"}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCode(p.code)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition cursor-pointer"
                          >
                            {isCopied ? "✓ Đã chép" : "Sao chép"}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveVoucher(p)}
                            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 shadow-xs ${
                              isSaved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                                : "bg-primary-600 text-white hover:bg-primary-700"
                            }`}
                          >
                            {isSaved ? "✓ Đã lưu vào ví" : "Lưu vào ví"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ──────── 4. KHO VOUCHER ĐỔI BẰNG ĐIỂM THƯỞNG (LOYALTY_POINT) ──────── */}
        {(activeTab === "all" || activeTab === "redeem") && (
          <section id="section-redeem" className={cardClass}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2.5">
                <IconTicket size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Kho Voucher đổi bằng điểm thưởng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dùng điểm tích lũy của bạn để đổi các mã giảm giá hấp dẫn vào ví cá nhân
                </p>
              </div>
            </div>

            {loyaltyData.loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải danh sách voucher...</div>
            ) : loyaltyData.redeemable.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Hiện chưa có gói voucher nào mở đổi bằng điểm.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {loyaltyData.redeemable.map((voucher) => {
                  const pointsCost = voucher.points_cost || voucher.points_required || 0;
                  const canAfford = loyaltyData.points >= pointsCost;
                  const isRedeeming = redeemingId === voucher._id;

                  return (
                    <div
                      key={voucher._id}
                      className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
                            {voucher.discount_type === "PERCENTAGE"
                              ? `GIẢM ${voucher.discount_value}%`
                              : `GIẢM ${money(voucher.discount_value)}`}
                          </span>
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <IconStar size={13} filled={true} /> {pointsCost} điểm
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {voucher.title || voucher.code}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {voucher.description || `Đổi bằng ${pointsCost} điểm thành viên`}
                        </p>
                        {voucher.max_discount && voucher.discount_type === "PERCENTAGE" && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Giảm tối đa: {money(voucher.max_discount)}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {voucher.valid_to
                            ? `HSD: ${new Date(voucher.valid_to).toLocaleDateString("vi-VN")}`
                            : "Không giới hạn HSD"}
                        </span>
                        <button
                          type="button"
                          disabled={!canAfford || isRedeeming}
                          onClick={() => handleRedeemVoucher(voucher)}
                          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition shadow-xs ${
                            canAfford
                              ? "bg-primary-600 text-white hover:bg-primary-700 cursor-pointer"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isRedeeming
                            ? "Đang đổi..."
                            : canAfford
                            ? `Đổi ngay (${pointsCost}đ)`
                            : "Chưa đủ điểm"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ──────── 5. MÃ GIẢM GIÁ CỦA BẠN (VÍ VOUCHER CÁ NHÂN) ──────── */}
        {(activeTab === "all" || activeTab === "wallet") && (
          <section id="section-wallet" className={cardClass}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-emerald-100 text-emerald-700 p-2.5">
                <IconTicket size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Mã giảm giá của bạn (Ví voucher cá nhân)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các voucher bạn đã lưu và các mã đổi bằng điểm sẵn sàng áp dụng khi thanh toán
                </p>
              </div>
            </div>

            {loyaltyData.myPromos.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Bạn chưa có mã giảm giá nào trong ví. Hãy lưu mã từ các kho ưu đãi phía trên hoặc dùng điểm đổi để nhận voucher riêng!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {loyaltyData.myPromos.map((p) => {
                  const isCopied = copiedCode === p.code;
                  const isRedeemed = Boolean(p.user_id || (p.points_cost && p.points_cost > 0));

                  return (
                    <div
                      key={p._id || p.code}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-emerald-900 text-sm bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                          {p.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isRedeemed
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isRedeemed ? "Voucher đổi điểm" : "Voucher đã lưu"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <div className="font-bold text-sm text-slate-900">
                          {p.title ||
                            (p.discount_type === "PERCENTAGE"
                              ? `Giảm ${p.discount_value}%`
                              : `Giảm ${money(p.discount_value)}`)}
                        </div>
                        {p.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                        )}
                        <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                          {p.min_order_amount > 0 && (
                            <div>
                              Đơn tối thiểu: <strong className="text-slate-800">{money(p.min_order_amount)}</strong>
                            </div>
                          )}
                          {p.max_discount && p.discount_type === "PERCENTAGE" && (
                            <div>
                              Giảm tối đa: <strong className="text-slate-800">{money(p.max_discount)}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-emerald-100 pt-3">
                        <span>
                          {p.valid_to ? `HSD: ${new Date(p.valid_to).toLocaleDateString("vi-VN")}` : "Vô thời hạn"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCode(p.code)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-bold cursor-pointer"
                          >
                            {isCopied ? "✓ Đã sao chép" : "Sao chép mã"}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate("/search")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                          >
                            Dùng ngay &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ──────── 6. LỊCH SỬ TÍCH LŨY & TIÊU ĐIỂM ──────── */}
        {(activeTab === "all" || activeTab === "history") && (
          <section id="section-history" className={cardClass}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-amber-100 text-amber-700 p-2.5">
                <IconStar size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Lịch sử điểm thưởng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhật ký các lần tích lũy và sử dụng điểm của tài khoản
                </p>
              </div>
            </div>

            {loyaltyData.history.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có giao dịch điểm thưởng nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="pb-2.5 font-semibold">Thời gian</th>
                      <th className="pb-2.5 font-semibold">Nội dung</th>
                      <th className="pb-2.5 font-semibold text-right">Biến động điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loyaltyData.history.map((tx) => (
                      <tr key={tx._id} className="text-slate-700 hover:bg-slate-50/50">
                        <td className="py-3 text-slate-400 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 pr-2 font-medium">{tx.reason || "Giao dịch điểm thưởng"}</td>
                        <td className="py-3 text-right font-bold whitespace-nowrap">
                          <span className={tx.points > 0 ? "text-emerald-600" : "text-amber-600"}>
                            {tx.points > 0 ? `+${tx.points}` : tx.points} điểm
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

