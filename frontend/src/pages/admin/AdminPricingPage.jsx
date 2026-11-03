import { useEffect, useState } from "react";
import { adminApi } from "../../services/api/adminApi";
import {
  IconCheck,
  IconEdit,
  IconPercent,
  IconSearch,
  IconX,
} from "../../components/Icons";

const formatVND = (price) => {
  if (price === undefined || price === null || isNaN(price)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Commission default & loyalty state
  const [commissionRate, setCommissionRate] = useState("10.0");
  const [pointValue, setPointValue] = useState("1000");
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState("2.0");

  // Facility custom commission list
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [searchFacility, setSearchFacility] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit facility modal
  const [editingFacility, setEditingFacility] = useState(null);
  const [customRateInput, setCustomRateInput] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await adminApi.getConfigs();
      const list = res.data?.data || res.data || [];

      list.forEach((c) => {
        if (c.config_key === "COMMISSION_RATE_DEFAULT") setCommissionRate(c.config_value);
        if (c.config_key === "LOYALTY_POINT_VALUE") setPointValue(c.config_value);
        if (c.config_key === "LOYALTY_EARN_PERCENTAGE") setLoyaltyEarnRate(c.config_value);
      });
    } catch (err) {
      console.error("Failed to load configs", err);
      setErrorMsg(err.response?.data?.message || "Không thể tải cấu hình hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const PAGE_SIZE = 8;

  const fetchFacilities = async (targetPage = page) => {
    try {
      setLoadingFacilities(true);
      const res = await adminApi.getFacilitiesCommission({
        search: searchFacility,
        type: typeFilter,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const data = res.data?.data || res.data || {};
      setFacilities(data.items || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
      setPage(targetPage);
    } catch (err) {
      console.error("Failed to load facilities commission", err);
    } finally {
      setLoadingFacilities(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchFacilities(1);
  }, [searchFacility, typeFilter]);

  const handleSaveCommissionRate = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const valStr = String(commissionRate).trim();
    if (!valStr) {
      setErrorMsg("Tỷ lệ hoa hồng không được để trống.");
      return;
    }
    const num = Number(valStr);
    if (isNaN(num) || num < 0 || num > 50) {
      setErrorMsg("Tỷ lệ hoa hồng phải là số trong khoảng từ 0.0% đến 50.0%.");
      return;
    }
    if (!/^\d+(\.\d{1})?$/.test(valStr)) {
      setErrorMsg("Tỷ lệ hoa hồng chỉ cho phép tối đa 1 chữ số sau dấu phẩy (ví dụ: 10.5%).");
      return;
    }

    try {
      setSavingKey("COMMISSION_RATE_DEFAULT");
      await adminApi.updateConfig("COMMISSION_RATE_DEFAULT", {
        config_value: valStr,
        description: "Tỷ lệ hoa hồng mặc định toàn sàn (áp dụng cho các đơn hàng phát sinh mới)",
      });
      setSuccessMsg(`Đã cập nhật mức hoa hồng mặc định thành công: ${valStr}%`);
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchConfigs();
      fetchFacilities(page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Lỗi cập nhật cấu hình hoa hồng");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveLoyaltyPolicy = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const pvStr = String(pointValue).trim();
    if (!pvStr) {
      setErrorMsg("Giá trị quy đổi điểm thưởng không được để trống.");
      return;
    }
    const pvNum = Number(pvStr);
    if (!Number.isInteger(pvNum) || pvNum <= 0) {
      setErrorMsg("Giá trị quy đổi điểm thưởng (1 điểm = X VNĐ) phải là số nguyên dương.");
      return;
    }
    if (pvNum % 100 !== 0) {
      setErrorMsg("Giá trị quy đổi điểm thưởng phải là bội số của 100 hoặc 1.000 VNĐ.");
      return;
    }

    const earnStr = String(loyaltyEarnRate).trim();
    if (!earnStr) {
      setErrorMsg("Tỷ lệ tích điểm thưởng không được để trống.");
      return;
    }
    const earnNum = Number(earnStr);
    if (isNaN(earnNum) || earnNum < 0.1 || earnNum > 10.0) {
      setErrorMsg("Tỷ lệ tích điểm thưởng phải là số từ 0.1% đến 10.0%.");
      return;
    }
    const currentComm = Number(commissionRate) || 10;
    if (earnNum > currentComm) {
      setErrorMsg(`Tỷ lệ tích điểm (${earnNum}%) không được vượt quá mức hoa hồng sàn (${currentComm}%).`);
      return;
    }

    try {
      setSavingKey("LOYALTY_POLICY");
      await Promise.all([
        adminApi.updateConfig("LOYALTY_POINT_VALUE", {
          config_value: pvStr,
          description: "Giá trị tiền tệ quy đổi của mỗi điểm thưởng (VNĐ)",
        }),
        adminApi.updateConfig("LOYALTY_EARN_PERCENTAGE", {
          config_value: earnStr,
          description: "Tỷ lệ tích điểm thưởng cho khách hàng (% trên giá trị đơn)",
        }),
      ]);
      setSuccessMsg(`Đã cập nhật chính sách điểm thưởng: 1 điểm = ${pvNum.toLocaleString("vi-VN")} ₫, Tích ${earnNum}%`);
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchConfigs();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Lỗi cập nhật chính sách điểm thưởng");
    } finally {
      setSavingKey(null);
    }
  };

  const handleOpenEditModal = (fac) => {
    setErrorMsg("");
    setModalError("");
    setEditingFacility(fac);
    setCustomRateInput(fac.has_override ? String(fac.commission_rate) : "");
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!editingFacility) return;

    setModalError("");
    setErrorMsg("");

    const valStr = String(customRateInput).trim();
    let rateNumber = 0;

    if (valStr !== "" && valStr !== "0") {
      rateNumber = Number(valStr);
      if (isNaN(rateNumber) || rateNumber < 1 || rateNumber > 50) {
        setModalError("Tỷ lệ hoa hồng riêng phải nằm trong khoảng từ 1% đến 50% (hoặc nhập 0 để quay về mức mặc định).");
        return;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(valStr)) {
        setModalError("Tỷ lệ hoa hồng chỉ cho phép tối đa 2 chữ số sau dấu phẩy (ví dụ: 8.5%).");
        return;
      }
    }

    try {
      setSavingOverride(true);
      await adminApi.updateFacilityCommission(editingFacility.id, rateNumber);
      setSuccessMsg(
        rateNumber > 0
          ? `Đã thiết lập hoa hồng riêng ${rateNumber}% cho "${editingFacility.name}".`
          : `Đã đưa cơ sở "${editingFacility.name}" về mức hoa hồng mặc định.`
      );
      setTimeout(() => setSuccessMsg(""), 3500);
      setEditingFacility(null);
      fetchFacilities(page);
    } catch (err) {
      setModalError(err.response?.data?.message || "Lỗi lưu hoa hồng riêng cho đối tác");
    } finally {
      setSavingOverride(false);
    }
  };

  const defaultRateNum = parseFloat(commissionRate) || 10;

  // Real calculation in Modal for 30-day forecast
  let modalCalcText = null;
  if (editingFacility) {
    const rev30d = editingFacility.revenue_30d || 0;
    const currentApplied = editingFacility.applied_commission_rate || defaultRateNum;
    const inputVal = String(customRateInput).trim();
    const targetRate = inputVal !== "" && inputVal !== "0" && !isNaN(Number(inputVal))
      ? Number(inputVal)
      : defaultRateNum;

    if (rev30d > 0) {
      const newCommissionRev = Math.round((rev30d * targetRate) / 100);
      const currentCommissionRev = Math.round((rev30d * currentApplied) / 100);
      const diff = newCommissionRev - currentCommissionRev;
      const diffSign = diff > 0 ? "+" : "";

      modalCalcText = (
        <div className="p-3 bg-primary-50/70 border border-primary-200/60 rounded-xl text-xs text-primary-900 space-y-1">
          <div className="font-semibold text-primary-800">Dự phóng tài chính:</div>
          <div>
            Dựa trên doanh thu 30 ngày qua (<strong>{formatVND(rev30d)}</strong>), mức hoa hồng mới ({targetRate}%) sẽ mang về cho sàn <strong>{formatVND(newCommissionRev)}</strong>{" "}
            {diff !== 0 && (
              <span className={diff > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                ({diffSign}{formatVND(diff)})
              </span>
            )}.
          </div>
        </div>
      );
    } else {
      modalCalcText = (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
          Chưa có doanh thu phát sinh trong 30 ngày qua (0 ₫). Mức hoa hồng mới sẽ tự động áp dụng cho các đơn hàng tiếp theo.
        </div>
      );
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6 font-body text-slate-800">
      {/* Header gọn gàng */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
          <IconPercent size={24} className="text-primary-600" />
          <span>Chính sách Hoa hồng & Điểm thưởng</span>
        </h1>
      </div>

      {/* Thông báo Alert */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <IconCheck size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <span className="text-rose-500 font-bold shrink-0">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* HÀNG 1: 2 Card ngang 50/50 nhỏ gọn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Hoa hồng mặc định toàn sàn */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-heading font-bold text-base text-slate-900">
              Hoa hồng mặc định toàn sàn
            </h2>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Mức hoa hồng mặc định (%)
              </label>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    placeholder="0.0 - 50.0%"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full h-10 px-3 pr-8 text-sm font-bold rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm font-bold pointer-events-none">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  disabled={savingKey === "COMMISSION_RATE_DEFAULT"}
                  onClick={handleSaveCommissionRate}
                  className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {savingKey === "COMMISSION_RATE_DEFAULT" ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Chỉ áp dụng cho các đơn hàng phát sinh từ sau thời điểm lưu (không sửa ngược các đơn quá khứ).
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Quy đổi điểm thưởng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-heading font-bold text-base text-slate-900">
              Chính sách điểm thưởng (Loyalty Points)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Giá trị quy đổi (1 điểm = ? VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={pointValue}
                    onChange={(e) => setPointValue(e.target.value)}
                    className="w-full h-10 px-3 pr-10 text-sm font-bold rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 text-xs font-bold pointer-events-none">
                    VNĐ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tỷ lệ tích điểm (% đơn hàng)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={loyaltyEarnRate}
                    onChange={(e) => setLoyaltyEarnRate(e.target.value)}
                    className="w-full h-10 px-3 pr-8 text-sm font-bold rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            {Number(loyaltyEarnRate) > 5.0 && (
              <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                Cảnh báo: Tỷ lệ tích điểm &gt; 5.0% có thể ảnh hưởng đến biên lợi nhuận của sàn.
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              Công thức: Điểm tích lũy = Math.floor((Tổng thanh toán &times; Tỷ lệ %) / Giá trị 1 điểm).
            </p>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="button"
              disabled={savingKey === "LOYALTY_POLICY"}
              onClick={handleSaveLoyaltyPolicy}
              className="h-9 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {savingKey === "LOYALTY_POLICY" ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>

      {/* HÀNG 2: BẢNG ĐỐI TÁC HOẠT ĐỘNG (Toàn chiều rộng) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Toolbar lọc dữ liệu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="font-heading font-bold text-base text-slate-900">
            Danh sách đối tác & Cơ sở đang hoạt động
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-64">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFacility}
                onChange={(e) => setSearchFacility(e.target.value)}
                placeholder="Tìm theo tên cơ sở, địa chỉ..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-primary-500 outline-none cursor-pointer"
            >
              <option value="">Tất cả loại hình</option>
              <option value="HOTEL">Khách sạn lưu trú</option>
              <option value="ATTRACTION">Khu vui chơi / Vé</option>
            </select>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3.5">Đối tác / Cơ sở</th>
                <th className="py-3 px-3.5">Loại hình</th>
                <th className="py-3 px-3.5">Doanh thu tháng (GMV)</th>
                <th className="py-3 px-3.5">Mức hoa hồng (%)</th>
                <th className="py-3 px-3.5">Hoa hồng tạm tính</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingFacilities ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                    Đang tải danh sách cơ sở đối tác...
                  </td>
                </tr>
              ) : facilities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                    Không tìm thấy cơ sở nào phù hợp.
                  </td>
                </tr>
              ) : (
                facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    {/* Đối tác / Cơ sở */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Đang hoạt động" />
                        <span className="font-bold text-slate-900 truncate max-w-xs">{f.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 ml-4 truncate max-w-xs">
                        {f.city} {f.vendor?.full_name ? `• ${f.vendor.full_name}` : ""}
                      </div>
                    </td>

                    {/* Loại hình */}
                    <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                      {f.type === "HOTEL" ? "Khách sạn" : "Khu vui chơi"}
                    </td>

                    {/* Doanh thu tháng này (GMV) */}
                    <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                      {formatVND(f.monthly_gmv)}
                    </td>

                    {/* Mức hoa hồng (%) */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900">
                          {f.applied_commission_rate}%
                        </span>
                        {f.has_override ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Riêng
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                            Mặc định
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Hoa hồng sàn thực thu (VNĐ) */}
                    <td className="py-3 px-3.5 font-bold text-emerald-700 whitespace-nowrap">
                      +{formatVND(f.estimated_commission)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(f)}
                        title="Chỉnh sửa mức hoa hồng"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 text-slate-600 hover:text-primary-700 transition cursor-pointer"
                      >
                        <IconEdit size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Hiển thị <strong className="text-slate-800">{(page - 1) * PAGE_SIZE + 1}</strong> -{" "}
              <strong className="text-slate-800">{Math.min(page * PAGE_SIZE, totalCount)}</strong> trên{" "}
              <strong className="text-slate-800">{totalCount}</strong> cơ sở
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => fetchFacilities(page - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 transition cursor-pointer"
              >
                ‹ Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => fetchFacilities(p)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs transition cursor-pointer ${
                    p === page
                      ? "bg-primary-600 text-white shadow-xs"
                      : "border border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => fetchFacilities(page + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 transition cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CẤU HÌNH HOA HỒNG RIÊNG VỚI TÍNH TOÁN DỰ PHÓNG THỰC TẾ */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Thiết lập mức hoa hồng riêng
              </h3>
              <button
                type="button"
                onClick={() => setEditingFacility(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <IconX size={15} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                ⚠️ {modalError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <div className="text-xs text-slate-400">Cơ sở áp dụng:</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{editingFacility.name}</div>
                <div className="text-xs text-slate-500">{editingFacility.city} • Chủ sở hữu: {editingFacility.vendor?.full_name || "Chưa gán"}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mức hoa hồng thỏa thuận riêng (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="50"
                    placeholder={`Để trống hoặc nhập 0 để áp dụng mức mặc định (${defaultRateNum}%)`}
                    value={customRateInput}
                    onChange={(e) => setCustomRateInput(e.target.value)}
                    className="w-full h-10 px-3 pr-8 text-sm font-bold rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Tính toán dự phóng tự động dựa trên doanh thu thực tế */}
              {modalCalcText}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingFacility(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingOverride}
                onClick={handleSaveOverride}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingOverride ? "Đang lưu..." : "Xác nhận áp dụng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
