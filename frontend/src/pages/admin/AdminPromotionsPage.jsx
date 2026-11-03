import { useEffect, useState } from "react";
import { adminApi } from "../../services/api/adminApi";
import {
  IconCheck,
  IconEdit,
  IconSearch,
  IconTrash,
  IconX,
} from "../../components/Icons";

const formatVND = (price) => {
  if (price === undefined || price === null || isNaN(price)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const formatDateOnly = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatValidityPeriod = (from, to) => {
  const fromStr = formatDateOnly(from);
  const toStr = formatDateOnly(to);
  if (!fromStr && !toStr) return "Vô thời hạn";
  if (fromStr && !toStr) return `Từ ${fromStr}`;
  if (!fromStr && toStr) return `Đến ${toStr}`;
  return `${fromStr} – ${toStr}`;
};

const isExpiredDate = (to) => {
  if (!to) return false;
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
};

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const calculateSmartDiscount = (service, percent) => {
  const p = Number(percent);
  if (!p || p <= 0 || p > 100) return null;

  if (service === "ATTRACTION") {
    // Vé tham quan / vui chơi (Giá vé TB: 80k - 200k/vé)
    if (p <= 10) return { maxDiscount: 30000, minOrder: 100000 };
    if (p <= 15) return { maxDiscount: 50000, minOrder: 100000 };
    if (p <= 20) return { maxDiscount: 60000, minOrder: 150000 };
    if (p <= 30) return { maxDiscount: 80000, minOrder: 200000 };
    return { maxDiscount: 100000, minOrder: 200000 };
  }

  if (service === "HOTEL") {
    // Khách sạn / lưu trú (Giá phòng TB: 500k - 1.5tr/đêm)
    if (p <= 10) return { maxDiscount: 100000, minOrder: 500000 };
    if (p <= 15) return { maxDiscount: 150000, minOrder: 500000 };
    if (p <= 20) return { maxDiscount: 250000, minOrder: 800000 };
    if (p <= 30) return { maxDiscount: 350000, minOrder: 1000000 };
    return { maxDiscount: 500000, minOrder: 1000000 };
  }

  // TOÀN SÀN (Cân đối cả Vé tham quan và Khách sạn)
  if (p <= 10) return { maxDiscount: 50000, minOrder: 200000 };
  if (p <= 15) return { maxDiscount: 100000, minOrder: 300000 };
  if (p <= 20) return { maxDiscount: 150000, minOrder: 400000 };
  if (p <= 30) return { maxDiscount: 200000, minOrder: 500000 };
  return { maxDiscount: 250000, minOrder: 500000 };
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState({
    active_count: 0,
    expired_count: 0,
    total_used_count: 0,
    total_discount_spent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Create Voucher
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: "",
    code: "",
    description: "",
    applicable_service: "ALL", // "ALL" | "HOTEL" | "ATTRACTION"
    target_audience: "ALL", // "ALL" | "NEW_USER" | "LOYALTY_POINT"
    points_required: "",
    discount_type: "PERCENTAGE", // "PERCENTAGE" | "FIXED"
    discount_value: "",
    max_discount: "",
    min_order_amount: "",
    valid_from: getTodayStr(),
    valid_to: "",
    is_unlimited_time: false,
    usage_limit: "500",
    usage_limit_per_user: "1",
  });
  const [createError, setCreateError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [autoCalculate, setAutoCalculate] = useState(true);

  const resetCreateForm = () => {
    setNewPromo({
      title: "",
      code: "",
      description: "",
      applicable_service: "ALL",
      target_audience: "ALL",
      points_required: "",
      discount_type: "PERCENTAGE",
      discount_value: "",
      max_discount: "",
      min_order_amount: "",
      valid_from: getTodayStr(),
      valid_to: "",
      is_unlimited_time: false,
      usage_limit: "500",
      usage_limit_per_user: "1",
    });
    setAutoCalculate(true);
    setCreateError("");
    setCreateFieldErrors({});
  };

  // Modal Edit Voucher
  const [editingPromo, setEditingPromo] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    applicable_service: "ALL",
    target_audience: "ALL",
    points_required: "",
    usage_limit: "",
    usage_limit_per_user: "",
    valid_from: "",
    valid_to: "",
    is_unlimited_time: false,
    min_order_amount: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState({});

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await adminApi.listPromotions(params);
      const data = res.data?.data || res.data || {};
      const items = data.items || [];
      setPromotions(items);

      if (data.stats) {
        setStats(data.stats);
      } else {
        const active = items.filter((p) => p.status === "ACTIVE" && !isExpiredDate(p.valid_to)).length;
        const expired = items.filter((p) => p.status === "EXPIRED" || p.status === "DISABLED" || isExpiredDate(p.valid_to)).length;
        const used = items.reduce((acc, p) => acc + (p.used_count || 0), 0);
        setStats((prev) => ({
          ...prev,
          active_count: active,
          expired_count: expired,
          total_used_count: used,
        }));
      }
    } catch (err) {
      console.error("Failed to load promotions", err);
      setErrorMsg(err.response?.data?.message || "Không thể tải danh sách mã giảm giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [statusFilter, search]);

  const handleToggleStatus = async (promo) => {
    if (isExpiredDate(promo.valid_to)) {
      alert(`Mã voucher [${promo.code}] đã hết hạn hiệu lực, không thể kích hoạt lại. Vui lòng chỉnh sửa ngày hết hạn trước.`);
      return;
    }

    try {
      const nextStatus = promo.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      await adminApi.updatePromotion(promo._id, { status: nextStatus });
      setSuccessMsg(
        nextStatus === "ACTIVE"
          ? `Đã kích hoạt voucher [${promo.code}] thành công.`
          : `Đã tạm ngưng voucher [${promo.code}].`
      );
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchPromotions();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Lỗi cập nhật voucher");
    }
  };

  const handleDelete = async (promo) => {
    if (promo.used_count > 0) {
      alert("Voucher này đã phát sinh giao dịch, bạn chỉ có thể chuyển sang trạng thái Tạm ngưng");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã voucher "${promo.code}" không?`)) {
      return;
    }
    try {
      await adminApi.deletePromotion(promo._id);
      setSuccessMsg(`Đã xóa thành công mã voucher [${promo.code}]!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchPromotions();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Lỗi xóa voucher");
    }
  };

  const generateRandomCode = (service = newPromo.applicable_service, audience = newPromo.target_audience) => {
    let prefix = "TVL";
    if (audience === "NEW_USER") prefix = "WELCOME";
    else if (audience === "LOYALTY_POINT") prefix = "POINT";
    else if (service === "HOTEL") prefix = "HOTEL";
    else if (service === "ATTRACTION") prefix = "TICKET";
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${rand}`;
  };

  const handleCopyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setEditError("");
    setEditFieldErrors({});
    const isUnlimited = !promo.valid_to;
    setEditForm({
      title: promo.title || "",
      description: promo.description || "",
      applicable_service: promo.applicable_service || (promo.voucher_type === "HOTEL" ? "HOTEL" : promo.voucher_type === "ATTRACTION" ? "ATTRACTION" : "ALL"),
      target_audience: promo.target_audience || (promo.voucher_type === "NEW_USER" ? "NEW_USER" : promo.voucher_type === "LOYALTY_POINT" ? "LOYALTY_POINT" : "ALL"),
      points_required: (promo.points_required || promo.points_cost) ? String(promo.points_required || promo.points_cost) : "",
      usage_limit: promo.usage_limit ? String(promo.usage_limit) : "500",
      usage_limit_per_user: promo.usage_limit_per_user ? String(promo.usage_limit_per_user) : "1",
      valid_from: promo.valid_from ? new Date(promo.valid_from).toISOString().slice(0, 10) : "",
      valid_to: promo.valid_to ? new Date(promo.valid_to).toISOString().slice(0, 10) : "",
      is_unlimited_time: isUnlimited,
      min_order_amount: promo.min_order_amount ? String(promo.min_order_amount) : "",
      status: promo.status || "ACTIVE",
    });
  };

  const validateEditForm = () => {
    const errs = {};
    const cleanTitle = (editForm.title || "").trim();
    if (!cleanTitle) {
      errs.title = "Vui lòng nhập tên voucher.";
    } else if (cleanTitle.length > 100) {
      errs.title = "Tên voucher tối đa 100 ký tự.";
    }

    if (editForm.target_audience === "LOYALTY_POINT") {
      const pts = Number(editForm.points_required);
      if (!Number.isInteger(pts) || pts < 1) {
        errs.points_required = "Số điểm cần đổi phải là số nguyên ≥ 1.";
      }
    }

    const newUsageLimit = Number(editForm.usage_limit);
    if (!Number.isInteger(newUsageLimit) || newUsageLimit < 1) {
      errs.usage_limit = "Tổng lượt sử dụng phải là số nguyên ≥ 1.";
    } else if (editingPromo && newUsageLimit < (editingPromo.used_count || 0)) {
      errs.usage_limit = `Không được nhỏ hơn số lượt đã dùng (${editingPromo.used_count} lượt).`;
    }

    const newPerUser = Number(editForm.usage_limit_per_user);
    if (!Number.isInteger(newPerUser) || newPerUser < 1) {
      errs.usage_limit_per_user = "Lượt dùng mỗi khách phải là số nguyên ≥ 1.";
    } else if (newUsageLimit && newPerUser > newUsageLimit) {
      errs.usage_limit_per_user = "Không được vượt quá Tổng lượt dùng.";
    }

    if (!editForm.is_unlimited_time && editForm.valid_to && editingPromo?.valid_from) {
      const fromStr = new Date(editingPromo.valid_from).toISOString().slice(0, 10);
      if (editForm.valid_to < fromStr) {
        errs.valid_to = `Phải từ ngày bắt đầu (${formatDateOnly(editingPromo.valid_from)}) trở đi.`;
      }
    }

    const editMinOrder = editForm.min_order_amount ? Number(editForm.min_order_amount) : 0;
    if (editingPromo?.discount_type === "FIXED" && editMinOrder <= editingPromo.discount_value) {
      errs.min_order_amount = `Đơn tối thiểu phải lớn hơn số tiền giảm (${formatVND(editingPromo.discount_value)}).`;
    }

    return errs;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPromo) return;
    setEditError("");

    const fieldErrors = validateEditForm();
    if (Object.keys(fieldErrors).length > 0) {
      setEditFieldErrors(fieldErrors);
      setEditError("Vui lòng kiểm tra và sửa các trường thông tin bên dưới.");
      return;
    }
    setEditFieldErrors({});

    const newUsageLimit = Number(editForm.usage_limit);
    const newPerUser = Number(editForm.usage_limit_per_user);
    const editMinOrder = editForm.min_order_amount ? Number(editForm.min_order_amount) : 0;

    try {
      setSavingEdit(true);
      await adminApi.updatePromotion(editingPromo._id, {
        title: (editForm.title || "").trim(),
        description: (editForm.description || "").trim(),
        applicable_service: editForm.applicable_service,
        target_audience: editForm.target_audience,
        points_required: editForm.target_audience === "LOYALTY_POINT" ? Math.max(0, Number(editForm.points_required) || 0) : 0,
        usage_limit: newUsageLimit,
        usage_limit_per_user: editForm.target_audience === "NEW_USER" ? 1 : newPerUser,
        valid_to: editForm.is_unlimited_time ? null : (editForm.valid_to || null),
        min_order_amount: editMinOrder,
        status: editForm.status,
      });
      setSuccessMsg(`Đã cập nhật thông tin voucher [${editingPromo.code}] thành công!`);
      setTimeout(() => setSuccessMsg(""), 3500);
      setEditingPromo(null);
      setEditFieldErrors({});
      fetchPromotions();
    } catch (err) {
      setEditError(err.response?.data?.message || "Lỗi cập nhật voucher");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApplicableServiceChange = (service) => {
    setNewPromo((prev) => {
      const next = { ...prev, applicable_service: service };
      if (autoCalculate && prev.discount_type === "PERCENTAGE" && prev.discount_value) {
        const sugg = calculateSmartDiscount(service, prev.discount_value);
        if (sugg) {
          next.max_discount = String(sugg.maxDiscount);
          next.min_order_amount = String(sugg.minOrder);
        }
      }
      return next;
    });
  };

  const handleToggleAutoCalculate = (checked) => {
    setAutoCalculate(checked);
    if (checked && newPromo.discount_type === "PERCENTAGE" && newPromo.discount_value) {
      const sugg = calculateSmartDiscount(newPromo.applicable_service, newPromo.discount_value);
      if (sugg) {
        setNewPromo((prev) => ({
          ...prev,
          max_discount: String(sugg.maxDiscount),
          min_order_amount: String(sugg.minOrder),
        }));
      }
    }
  };

  const handleDiscountTypeChange = (type) => {
    if (type === "PERCENTAGE") {
      setNewPromo((prev) => {
        const next = { ...prev, discount_type: "PERCENTAGE" };
        if (autoCalculate && prev.discount_value) {
          const sugg = calculateSmartDiscount(prev.applicable_service, prev.discount_value);
          if (sugg) {
            next.max_discount = String(sugg.maxDiscount);
            next.min_order_amount = String(sugg.minOrder);
          }
        }
        return next;
      });
      return;
    }
    // FIXED: Disable ô giảm tối đa & reset giá trị
    setNewPromo((prev) => ({
      ...prev,
      discount_type: "FIXED",
      max_discount: "",
    }));
  };

  const handleDiscountValueChange = (val) => {
    setNewPromo((prev) => {
      const next = { ...prev, discount_value: val };
      if (autoCalculate) {
        if (prev.discount_type === "PERCENTAGE") {
          const sugg = calculateSmartDiscount(prev.applicable_service, val);
          if (sugg) {
            next.max_discount = String(sugg.maxDiscount);
            next.min_order_amount = String(sugg.minOrder);
          }
        } else if (prev.discount_type === "FIXED") {
          const num = Number(val);
          if (num && num >= 10000) {
            // Tự động gợi ý giá trị đơn tối thiểu gấp 2 lần để tránh lỗ vốn
            next.min_order_amount = String(num * 2);
          }
        }
      }
      return next;
    });
  };

  const validateCreateForm = () => {
    const errs = {};
    const cleanTitle = (newPromo.title || "").trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      errs.title = "Tên voucher phải từ 5 đến 100 ký tự.";
    } else if (cleanTitle.length > 100) {
      errs.title = "Tên voucher tối đa 100 ký tự.";
    }

    const cleanCode = (newPromo.code || "").trim().toUpperCase();
    if (!cleanCode) {
      errs.code = "Vui lòng nhập mã voucher.";
    } else if (!/^[A-Z0-9_-]{4,20}$/.test(cleanCode)) {
      errs.code = "Mã từ 4–20 ký tự (chữ in hoa, số và dấu gạch nối _ -).";
    } else if (promotions.some((p) => p.code === cleanCode)) {
      errs.code = `Mã [${cleanCode}] đã tồn tại trong hệ thống.`;
    }

    if (newPromo.target_audience === "LOYALTY_POINT") {
      const pts = Number(newPromo.points_required);
      if (!Number.isInteger(pts) || pts < 1) {
        errs.points_required = "Số điểm cần đổi phải là số nguyên ≥ 1.";
      }
    }

    const discountVal = Number(newPromo.discount_value);
    const minOrderVal = Number(newPromo.min_order_amount) || 0;

    if (minOrderVal < 0 || !Number.isInteger(minOrderVal)) {
      errs.min_order_amount = "Đơn tối thiểu phải là số nguyên ≥ 0.";
    }

    if (!newPromo.discount_value || isNaN(discountVal)) {
      errs.discount_value = "Vui lòng nhập mức giảm.";
    } else if (newPromo.discount_type === "PERCENTAGE") {
      if (!Number.isInteger(discountVal) || discountVal < 1 || discountVal > 70) {
        errs.discount_value = "Mức giảm phải là số nguyên từ 1% đến 70%.";
      }
      if (newPromo.max_discount && (isNaN(Number(newPromo.max_discount)) || Number(newPromo.max_discount) <= 0)) {
        errs.max_discount = "Giảm tối đa phải là số dương hoặc để trống (Không trần).";
      }
    } else {
      if (!Number.isInteger(discountVal) || discountVal < 10000 || discountVal % 1000 !== 0) {
        errs.discount_value = "Số tiền giảm tối thiểu 10.000 ₫ (bội số 1.000 ₫).";
      }
      if (minOrderVal < discountVal) {
        errs.min_order_amount = `Đơn tối thiểu phải lớn hơn hoặc bằng mức giảm (${formatVND(discountVal)}).`;
      }
    }

    const todayStr = getTodayStr();
    if (newPromo.valid_from && newPromo.valid_from < todayStr) {
      errs.valid_from = "Ngày bắt đầu không được trong quá khứ.";
    }
    if (!newPromo.is_unlimited_time && newPromo.valid_to && newPromo.valid_from && newPromo.valid_to < newPromo.valid_from) {
      errs.valid_to = "Ngày hết hạn phải từ ngày bắt đầu trở đi.";
    }

    const totalLimit = Number(newPromo.usage_limit);
    if (!Number.isInteger(totalLimit) || totalLimit < 1) {
      errs.usage_limit = "Tổng lượt dùng phải là số nguyên ≥ 1.";
    }

    const perUserLimit = Number(newPromo.usage_limit_per_user);
    if (!Number.isInteger(perUserLimit) || perUserLimit < 1) {
      errs.usage_limit_per_user = "Lượt dùng mỗi khách phải là số nguyên ≥ 1.";
    } else if (totalLimit && perUserLimit > totalLimit) {
      errs.usage_limit_per_user = "Không được vượt quá Tổng lượt dùng.";
    }

    return errs;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");

    const fieldErrors = validateCreateForm();
    if (Object.keys(fieldErrors).length > 0) {
      setCreateFieldErrors(fieldErrors);
      setCreateError("Vui lòng kiểm tra và sửa các trường thông tin bên dưới.");
      return;
    }
    setCreateFieldErrors({});

    const cleanTitle = (newPromo.title || "").trim();
    const cleanCode = (newPromo.code || "").trim().toUpperCase();
    const discountVal = Number(newPromo.discount_value);
    const minOrderVal = Number(newPromo.min_order_amount) || 0;
    const totalLimit = Number(newPromo.usage_limit);
    const perUserLimit = Number(newPromo.usage_limit_per_user);

    try {
      setCreating(true);
      await adminApi.createPromotion({
        title: cleanTitle,
        code: cleanCode,
        description: (newPromo.description || "").trim(),
        applicable_service: newPromo.applicable_service,
        target_audience: newPromo.target_audience,
        points_required: newPromo.target_audience === "LOYALTY_POINT" ? Number(newPromo.points_required) : 0,
        discount_type: newPromo.discount_type,
        discount_value: discountVal,
        max_discount: newPromo.discount_type === "PERCENTAGE" && newPromo.max_discount ? Number(newPromo.max_discount) : null,
        min_order_amount: minOrderVal,
        valid_from: newPromo.valid_from || null,
        valid_to: newPromo.is_unlimited_time ? null : (newPromo.valid_to || null),
        usage_limit: totalLimit,
        usage_limit_per_user: newPromo.target_audience === "NEW_USER" ? 1 : perUserLimit,
      });
      setShowCreateModal(false);
      resetCreateForm();
      setSuccessMsg(`Đã khởi tạo thành công voucher [${cleanCode}]!`);
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchPromotions();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Lỗi khi tạo mã giảm giá");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 font-body text-slate-800">
      {/* Header ngang hàng gọn gàng */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Quản lý Mã giảm giá
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập khuyến mại, phạm vi áp dụng, đối tượng và chính sách voucher
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
        >
          <span>+ Tạo Voucher</span>
        </button>
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
          <span>{errorMsg}</span>
        </div>
      )}

      {/* HÀNG 1: 4 Thẻ thống kê tài chính thực tế */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Đang hoạt động */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Đang hoạt động
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.active_count}
          </div>
        </div>

        {/* Hết hạn / Tạm ngưng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Hết hạn / Tạm ngưng
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">
            {stats.expired_count}
          </div>
        </div>

        {/* Tổng lượt đã dùng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
            Tổng lượt đã dùng
          </div>
          <div className="text-2xl font-black text-primary-700 mt-1">
            {stats.total_used_count.toLocaleString("vi-VN")}
          </div>
        </div>

        {/* Tổng ngân sách đã chi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">
            Tổng ngân sách đã chi
          </div>
          <div className="text-2xl font-black text-violet-700 mt-1 truncate">
            {formatVND(stats.total_discount_spent)}
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc nhanh */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Lọc dịch vụ */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Tất cả dịch vụ</option>
            <option value="ALL">Toàn sàn</option>
            <option value="HOTEL">Khách sạn</option>
            <option value="ATTRACTION">Vé vui chơi</option>
          </select>

          {/* Lọc đối tượng */}
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Tất cả đối tượng</option>
            <option value="NEW_USER">Khách mới</option>
            <option value="LOYALTY_POINT">Đổi điểm thưởng</option>
          </select>

          {/* Lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DISABLED">Tạm ngưng</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
        </div>
      </div>

      {/* HÀNG 2: BẢNG DỮ LIỆU SẠCH (Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-medium text-xs">
            Đang tải danh sách voucher...
          </div>
        ) : (
          (() => {
            const displayList = promotions.filter((promo) => {
              const svc = promo.applicable_service || (promo.voucher_type === "HOTEL" ? "HOTEL" : promo.voucher_type === "ATTRACTION" ? "ATTRACTION" : "ALL");
              const aud = promo.target_audience || (promo.voucher_type === "NEW_USER" ? "NEW_USER" : promo.voucher_type === "LOYALTY_POINT" ? "LOYALTY_POINT" : "ALL");

              if (serviceFilter && svc !== serviceFilter) return false;
              if (audienceFilter && aud !== audienceFilter) return false;

              if (search.trim()) {
                const q = search.trim().toLowerCase();
                const mCode = promo.code?.toLowerCase().includes(q);
                const mTitle = promo.title?.toLowerCase().includes(q);
                if (!mCode && !mTitle) return false;
              }
              return true;
            });

            if (displayList.length === 0) {
              return (
                <div className="py-12 text-center text-slate-400 font-medium text-xs">
                  Không tìm thấy mã giảm giá nào phù hợp với bộ lọc.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Voucher</th>
                      <th className="py-3 px-3.5">Loại</th>
                      <th className="py-3 px-3.5">Mức giảm</th>
                      <th className="py-3 px-3.5">Tối đa</th>
                      <th className="py-3 px-3.5">Đơn tối thiểu</th>
                      <th className="py-3 px-3.5">Hạn dùng</th>
                      <th className="py-3 px-3 text-center">Lượt dùng</th>
                      <th className="py-3 px-3 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayList.map((promo) => {
                      const expired = promo.status === "EXPIRED" || isExpiredDate(promo.valid_to);
                      const isPaused = promo.status === "DISABLED";
                      const isActive = !expired && !isPaused;

                      const isHotel = promo.applicable_service === "HOTEL" || (!promo.applicable_service && promo.voucher_type === "HOTEL");
                      const isAttraction = promo.applicable_service === "ATTRACTION" || (!promo.applicable_service && promo.voucher_type === "ATTRACTION");

                      const isNewUser = promo.target_audience === "NEW_USER" || (!promo.target_audience && promo.voucher_type === "NEW_USER");
                      const isLoyalty = promo.target_audience === "LOYALTY_POINT" || (!promo.target_audience && promo.voucher_type === "LOYALTY_POINT");
                      const pointsVal = promo.points_required || promo.points_cost || 0;

                      return (
                        <tr key={promo._id} className="hover:bg-slate-50/60 transition">
                          {/* Cột VOUCHER: Dòng 1 Mã Code in đậm + [Copy], Dòng 2: Tên voucher nhỏ xám */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5 max-w-[240px]">
                              {/* Dòng 1: Mã Code + [Copy] */}
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                                  {promo.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(promo.code)}
                                  title="Sao chép mã"
                                  className="text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                                >
                                  {copiedCode === promo.code ? "Đã chép" : "Copy"}
                                </button>
                              </div>

                              {/* Dòng 2: Tên hiển thị voucher */}
                              <div
                                className="text-[11px] text-slate-500 font-medium truncate"
                                title={promo.title || promo.code}
                              >
                                {promo.title || "Ưu đãi toàn sàn"}
                              </div>
                            </div>
                          </td>

                          {/* Cột LOẠI (Badge): Tách 2 tag màu khác nhau (Xanh da trời: Dịch vụ, Cam/Xám: Điều kiện phụ) */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1 flex-wrap">
                              {/* Tag xanh da trời: Dịch vụ */}
                              {isHotel ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  Khách sạn
                                </span>
                              ) : isAttraction ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                  Vé vui chơi
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Toàn sàn
                                </span>
                              )}

                              {/* Tag màu cam / xám nếu có điều kiện phụ */}
                              {isNewUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Khách mới
                                </span>
                              )}

                              {isLoyalty && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                  Đổi điểm{pointsVal > 0 ? ` (${pointsVal}đ)` : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Mức giảm */}
                          <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                            {promo.discount_type === "PERCENTAGE" ? (
                              <span className="text-emerald-700 font-extrabold">
                                Giảm {promo.discount_value}%
                              </span>
                            ) : (
                              <span className="text-blue-700 font-extrabold">
                                Giảm {formatVND(promo.discount_value)}
                              </span>
                            )}
                          </td>

                          {/* Giảm tối đa: FIXED hiển thị dấu gạch ngang '—' */}
                          <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                            {promo.discount_type === "FIXED" ? (
                              <span className="text-slate-300 font-bold">—</span>
                            ) : promo.max_discount ? (
                              formatVND(promo.max_discount)
                            ) : (
                              "Không giới hạn"
                            )}
                          </td>

                          {/* Đơn tối thiểu: <= 0 hiển thị dấu '—' */}
                          <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">
                            {promo.min_order_amount > 0 ? (
                              <span className="font-bold text-slate-800">{formatVND(promo.min_order_amount)}</span>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>

                          {/* Thời gian hiệu lực: gọn gàng */}
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {formatValidityPeriod(promo.valid_from, promo.valid_to)}
                          </td>

                          {/* Lượt dùng */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-900">{promo.used_count || 0}</span>
                            <span className="text-slate-400"> / {promo.usage_limit || "∞"}</span>
                          </td>

                          {/* Cột TRẠNG THÁI: Hết hạn tắt switch disabled xám + badge Hết hạn, Đang chạy Switch bật xanh */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {expired ? (
                              <div className="inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed">
                                <div className="w-8 h-4 bg-slate-200 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3"></div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  Hết hạn
                                </span>
                              </div>
                            ) : (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => handleToggleStatus(promo)}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                                <span className={`text-[11px] font-bold ${isActive ? "text-emerald-700" : "text-slate-400"}`}>
                                  {isActive ? "Đang chạy" : "Tạm ngưng"}
                                </span>
                              </label>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(promo)}
                                title="Chỉnh sửa voucher"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 text-slate-600 hover:text-primary-700 transition cursor-pointer"
                              >
                                <IconEdit size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(promo)}
                                title="Xóa voucher"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </div>

      {/* MODAL TẠO VOUCHER MỚI (Layout chuẩn Wireframe 4 Section) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Tạo mã giảm giá mới
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <IconX size={15} />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-5 text-xs">
              {/* SECTION 1: THÔNG TIN CƠ BẢN */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Thông tin cơ bản
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tên voucher */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Tên voucher *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Chào bạn mới hè 2026"
                      value={newPromo.title}
                      onChange={(e) => {
                        setNewPromo({ ...newPromo, title: e.target.value });
                        if (createFieldErrors.title) setCreateFieldErrors((prev) => ({ ...prev, title: "" }));
                      }}
                      maxLength={100}
                      className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border ${
                        createFieldErrors.title ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                      } outline-none bg-white`}
                    />
                    {createFieldErrors.title && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{createFieldErrors.title}</p>
                    )}
                  </div>

                  {/* Mã voucher */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-xs">
                        Mã voucher *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const generated = generateRandomCode();
                          setNewPromo({ ...newPromo, code: generated });
                          if (createFieldErrors.code) setCreateFieldErrors((prev) => ({ ...prev, code: "" }));
                        }}
                        className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 hover:underline cursor-pointer"
                      >
                        Tạo ngẫu nhiên
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="VD: WELCOME2026"
                      value={newPromo.code}
                      onChange={(e) => {
                        setNewPromo({ ...newPromo, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") });
                        if (createFieldErrors.code) setCreateFieldErrors((prev) => ({ ...prev, code: "" }));
                      }}
                      maxLength={20}
                      className={`w-full h-10 px-3 text-xs font-mono font-bold rounded-xl border ${
                        createFieldErrors.code ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                      } outline-none uppercase bg-white`}
                    />
                    {createFieldErrors.code && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{createFieldErrors.code}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: PHẠM VI & ĐỐI TƯỢNG */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Phạm vi & Đối tượng
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Cột 1: Dịch vụ áp dụng */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-700 text-xs mb-2">
                      Dịch vụ áp dụng *
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: "ALL", label: "Toàn sàn" },
                        { value: "HOTEL", label: "Khách sạn" },
                        { value: "ATTRACTION", label: "Vé tham quan / Vui chơi" },
                      ].map((item) => (
                        <label key={item.value} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="create_applicable_service"
                            value={item.value}
                            checked={newPromo.applicable_service === item.value}
                            onChange={() => handleApplicableServiceChange(item.value)}
                            className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Cột 2: Đối tượng áp dụng */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-2">
                        Đối tượng áp dụng *
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: "ALL", label: "Tất cả khách hàng" },
                          { value: "NEW_USER", label: "Khách hàng mới (đơn đầu)" },
                          { value: "LOYALTY_POINT", label: "Hội viên đổi điểm thưởng" },
                        ].map((item) => (
                          <label key={item.value} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="create_target_audience"
                              value={item.value}
                              checked={newPromo.target_audience === item.value}
                              onChange={() => {
                                setNewPromo((prev) => ({
                                  ...prev,
                                  target_audience: item.value,
                                  usage_limit_per_user: item.value === "NEW_USER" ? "1" : prev.usage_limit_per_user,
                                  points_required: item.value === "LOYALTY_POINT" ? (prev.points_required || "500") : "",
                                }));
                                if (createFieldErrors.points_required) setCreateFieldErrors((prev) => ({ ...prev, points_required: "" }));
                              }}
                              className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Input nhỏ Số điểm cần đổi khi chọn Hội viên đổi điểm thưởng */}
                    {newPromo.target_audience === "LOYALTY_POINT" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 animate-in fade-in-50 duration-200">
                        <label className="block font-bold text-slate-700 text-[11px] mb-1">
                          Số điểm cần đổi *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="VD: 500"
                            value={newPromo.points_required}
                            onChange={(e) => {
                              setNewPromo({ ...newPromo, points_required: e.target.value });
                              if (createFieldErrors.points_required) setCreateFieldErrors((prev) => ({ ...prev, points_required: "" }));
                            }}
                            className={`w-full h-8 px-2.5 pr-12 text-xs font-bold rounded-lg border ${
                              createFieldErrors.points_required ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                            } bg-white outline-none`}
                          />
                          <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 font-bold pointer-events-none text-[11px]">
                            Điểm
                          </span>
                        </div>
                        {createFieldErrors.points_required && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{createFieldErrors.points_required}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: THIẾT LẬP GIẢM GIÁ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Thiết lập giảm giá
                  </div>
                  {newPromo.discount_type === "PERCENTAGE" && (
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoCalculate}
                        onChange={(e) => handleToggleAutoCalculate(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                      />
                      <span>Tự tính theo ngành</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Hàng 1 - Cột 1: Hình thức giảm */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Hình thức giảm *
                    </label>
                    <select
                      value={newPromo.discount_type}
                      onChange={(e) => handleDiscountTypeChange(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer focus:border-primary-500"
                    >
                      <option value="PERCENTAGE">Theo phần trăm (%)</option>
                      <option value="FIXED">Theo số tiền cố định (VNĐ)</option>
                    </select>
                  </div>

                  {/* Hàng 1 - Cột 2: Mức giảm */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Mức giảm *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={newPromo.discount_type === "PERCENTAGE" ? "1" : "1000"}
                        placeholder={newPromo.discount_type === "PERCENTAGE" ? "15" : "50.000"}
                        value={newPromo.discount_value}
                        onChange={(e) => {
                          handleDiscountValueChange(e.target.value);
                          if (createFieldErrors.discount_value) setCreateFieldErrors((prev) => ({ ...prev, discount_value: "" }));
                        }}
                        className={`w-full h-10 px-3 pr-8 text-xs font-bold rounded-xl border ${
                          createFieldErrors.discount_value ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                        } outline-none bg-white`}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 font-bold pointer-events-none text-xs">
                        {newPromo.discount_type === "PERCENTAGE" ? "%" : "₫"}
                      </span>
                    </div>
                    {createFieldErrors.discount_value && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{createFieldErrors.discount_value}</p>
                    )}

                    {/* Gợi ý mức giảm */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">Gợi ý:</span>
                      {(newPromo.discount_type === "PERCENTAGE" ? [10, 15, 20, 30] : [20000, 50000, 100000, 200000]).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            handleDiscountValueChange(String(val));
                            if (createFieldErrors.discount_value) setCreateFieldErrors((prev) => ({ ...prev, discount_value: "" }));
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            String(newPromo.discount_value) === String(val)
                              ? "bg-primary-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {newPromo.discount_type === "PERCENTAGE" ? `${val}%` : `${val / 1000}K`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hàng 2 - Cột 1: Giảm tối đa (VNĐ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-xs">
                        Giảm tối đa (VNĐ)
                      </label>
                      {newPromo.discount_type === "PERCENTAGE" && (
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!newPromo.max_discount}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewPromo({ ...newPromo, max_discount: checked ? "" : "100000" });
                              if (createFieldErrors.max_discount) setCreateFieldErrors((prev) => ({ ...prev, max_discount: "" }));
                            }}
                            className="w-3.5 h-3.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                          />
                          <span>Không giới hạn mức trần</span>
                        </label>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={newPromo.discount_type === "FIXED" || !newPromo.max_discount ? "text" : "number"}
                        step="1000"
                        min="10000"
                        disabled={newPromo.discount_type === "FIXED" || !newPromo.max_discount}
                        placeholder={
                          newPromo.discount_type === "FIXED"
                            ? "Không áp dụng"
                            : !newPromo.max_discount
                            ? "Không giới hạn mức trần"
                            : "100.000"
                        }
                        value={
                          newPromo.discount_type === "FIXED"
                            ? "Không áp dụng"
                            : !newPromo.max_discount
                            ? "Không giới hạn mức trần"
                            : newPromo.max_discount
                        }
                        onChange={(e) => {
                          setNewPromo({ ...newPromo, max_discount: e.target.value });
                          if (createFieldErrors.max_discount) setCreateFieldErrors((prev) => ({ ...prev, max_discount: "" }));
                        }}
                        className={`w-full h-10 px-3 pr-8 text-xs font-bold rounded-xl border ${
                          newPromo.discount_type === "FIXED" || !newPromo.max_discount
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : createFieldErrors.max_discount
                            ? "border-rose-400 focus:border-rose-500 bg-white"
                            : "border-slate-300 focus:border-primary-500 bg-white"
                        } outline-none`}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 font-bold pointer-events-none text-xs">
                        ₫
                      </span>
                    </div>
                    {createFieldErrors.max_discount && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{createFieldErrors.max_discount}</p>
                    )}

                    {newPromo.discount_type === "PERCENTAGE" && Boolean(newPromo.max_discount) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium">Gợi ý trần:</span>
                        {[50000, 100000, 150000, 200000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setNewPromo({ ...newPromo, max_discount: String(amt) });
                              if (createFieldErrors.max_discount) setCreateFieldErrors((prev) => ({ ...prev, max_discount: "" }));
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                              newPromo.max_discount === String(amt)
                                ? "bg-primary-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {amt / 1000}K
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hàng 2 - Cột 2: Giá trị đơn tối thiểu (VNĐ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-xs">
                        Giá trị đơn tối thiểu (VNĐ) {newPromo.discount_type === "FIXED" && "*"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[0, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setNewPromo({ ...newPromo, min_order_amount: amt === 0 ? "0" : String(amt) });
                              if (createFieldErrors.min_order_amount) setCreateFieldErrors((prev) => ({ ...prev, min_order_amount: "" }));
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                              newPromo.min_order_amount === String(amt)
                                ? "bg-primary-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {amt === 0 ? "0đ" : `${amt / 1000}K`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="1000"
                        placeholder="0"
                        value={newPromo.min_order_amount}
                        onChange={(e) => {
                          setNewPromo({ ...newPromo, min_order_amount: e.target.value });
                          if (createFieldErrors.min_order_amount) setCreateFieldErrors((prev) => ({ ...prev, min_order_amount: "" }));
                        }}
                        className={`w-full h-10 px-3 pr-8 text-xs font-bold rounded-xl border ${
                          createFieldErrors.min_order_amount ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                        } outline-none bg-white`}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 font-bold pointer-events-none text-xs">
                        ₫
                      </span>
                    </div>
                    {createFieldErrors.min_order_amount && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{createFieldErrors.min_order_amount}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: THỜI GIAN & GIỚI HẠN SỬ DỤNG */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Thời gian & Giới hạn sử dụng
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Cột 1: Thời gian hiệu lực (Date Range Picker + Checkbox Không thời hạn) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-xs">
                        Thời gian hiệu lực *
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPromo.is_unlimited_time}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewPromo({
                              ...newPromo,
                              is_unlimited_time: checked,
                              valid_to: checked ? "" : newPromo.valid_to,
                            });
                            if (createFieldErrors.valid_to) setCreateFieldErrors((prev) => ({ ...prev, valid_to: "" }));
                          }}
                          className="w-3.5 h-3.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                        />
                        <span>Không thời hạn</span>
                      </label>
                    </div>
                    {/* Date Range Picker Container */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Từ ngày</div>
                        <input
                          type="date"
                          min={getTodayStr()}
                          value={newPromo.valid_from}
                          onChange={(e) => {
                            setNewPromo({ ...newPromo, valid_from: e.target.value });
                            if (createFieldErrors.valid_from) setCreateFieldErrors((prev) => ({ ...prev, valid_from: "" }));
                          }}
                          className={`w-full h-10 px-2.5 text-xs font-medium rounded-xl border ${
                            createFieldErrors.valid_from ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                          } outline-none bg-white`}
                        />
                        {createFieldErrors.valid_from && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{createFieldErrors.valid_from}</p>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Đến ngày</div>
                        <input
                          type="date"
                          disabled={newPromo.is_unlimited_time}
                          min={newPromo.valid_from || getTodayStr()}
                          value={newPromo.valid_to}
                          onChange={(e) => {
                            setNewPromo({ ...newPromo, valid_to: e.target.value });
                            if (createFieldErrors.valid_to) setCreateFieldErrors((prev) => ({ ...prev, valid_to: "" }));
                          }}
                          className={`w-full h-10 px-2.5 text-xs font-medium rounded-xl border ${
                            newPromo.is_unlimited_time
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : createFieldErrors.valid_to
                              ? "border-rose-400 focus:border-rose-500 bg-white"
                              : "border-slate-300 focus:border-primary-500 bg-white"
                          } outline-none`}
                        />
                        {createFieldErrors.valid_to && !newPromo.is_unlimited_time && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{createFieldErrors.valid_to}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Giới hạn số lượt */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Giới hạn số lượt *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Tổng lượt</div>
                        <input
                          type="number"
                          min="1"
                          placeholder="500"
                          value={newPromo.usage_limit}
                          onChange={(e) => {
                            setNewPromo({ ...newPromo, usage_limit: e.target.value });
                            if (createFieldErrors.usage_limit) setCreateFieldErrors((prev) => ({ ...prev, usage_limit: "" }));
                          }}
                          className={`w-full h-10 px-2.5 text-xs font-bold rounded-xl border ${
                            createFieldErrors.usage_limit ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                          } outline-none bg-white`}
                        />
                        {createFieldErrors.usage_limit && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{createFieldErrors.usage_limit}</p>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Lượt / mỗi khách</div>
                        <input
                          type="number"
                          min="1"
                          disabled={newPromo.target_audience === "NEW_USER"}
                          placeholder="1"
                          value={newPromo.target_audience === "NEW_USER" ? "1" : newPromo.usage_limit_per_user}
                          onChange={(e) => {
                            setNewPromo({ ...newPromo, usage_limit_per_user: e.target.value });
                            if (createFieldErrors.usage_limit_per_user) setCreateFieldErrors((prev) => ({ ...prev, usage_limit_per_user: "" }));
                          }}
                          className={`w-full h-10 px-2.5 text-xs font-bold rounded-xl border ${
                            createFieldErrors.usage_limit_per_user ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                          } outline-none ${
                            newPromo.target_audience === "NEW_USER" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                          }`}
                        />
                        {createFieldErrors.usage_limit_per_user && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">{createFieldErrors.usage_limit_per_user}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? "Đang tạo..." : "Tạo voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA VOUCHER */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Chỉnh sửa voucher: <span className="font-mono text-primary-700">{editingPromo.code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <IconX size={15} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Tên voucher */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Tên voucher *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => {
                    setEditForm({ ...editForm, title: e.target.value });
                    if (editFieldErrors.title) setEditFieldErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  placeholder="VD: Ưu đãi hè 2026"
                  maxLength={100}
                  className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border ${
                    editFieldErrors.title ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                  } outline-none bg-white`}
                />
                {editFieldErrors.title && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.title}</p>
                )}
              </div>

              {/* Dịch vụ & Đối tượng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Dịch vụ áp dụng
                  </label>
                  <select
                    value={editForm.applicable_service}
                    onChange={(e) => setEditForm({ ...editForm, applicable_service: e.target.value })}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="ALL">Toàn sàn</option>
                    <option value="HOTEL">Khách sạn</option>
                    <option value="ATTRACTION">Vé tham quan / Vui chơi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Đối tượng áp dụng
                  </label>
                  <select
                    value={editForm.target_audience}
                    onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả khách hàng</option>
                    <option value="NEW_USER">Khách hàng mới (đơn đầu)</option>
                    <option value="LOYALTY_POINT">Hội viên đổi điểm thưởng</option>
                  </select>
                </div>
              </div>

              {editForm.target_audience === "LOYALTY_POINT" && (
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Số điểm cần đổi *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="VD: 500"
                    value={editForm.points_required}
                    onChange={(e) => {
                      setEditForm({ ...editForm, points_required: e.target.value });
                      if (editFieldErrors.points_required) setEditFieldErrors((prev) => ({ ...prev, points_required: "" }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-bold rounded-xl border ${
                      editFieldErrors.points_required ? "border-rose-400 focus:border-rose-500" : "border-slate-300 bg-white"
                    } outline-none`}
                  />
                  {editFieldErrors.points_required && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.points_required}</p>
                  )}
                </div>
              )}

              {/* Thời gian hiệu lực */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Thời gian hiệu lực
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.is_unlimited_time}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditForm({
                          ...editForm,
                          is_unlimited_time: checked,
                          valid_to: checked ? "" : editForm.valid_to,
                        });
                        if (editFieldErrors.valid_to) setEditFieldErrors((prev) => ({ ...prev, valid_to: "" }));
                      }}
                      className="w-3.5 h-3.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                    />
                    <span>Không thời hạn</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">Từ ngày</div>
                    <input
                      type="date"
                      disabled
                      value={editForm.valid_from}
                      className="w-full h-10 px-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">Đến ngày</div>
                    <input
                      type="date"
                      disabled={editForm.is_unlimited_time}
                      value={editForm.valid_to}
                      onChange={(e) => {
                        setEditForm({ ...editForm, valid_to: e.target.value });
                        if (editFieldErrors.valid_to) setEditFieldErrors((prev) => ({ ...prev, valid_to: "" }));
                      }}
                      className={`w-full h-10 px-2.5 text-xs font-medium rounded-xl border ${
                        editForm.is_unlimited_time
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : editFieldErrors.valid_to
                          ? "border-rose-400 focus:border-rose-500 bg-white"
                          : "border-slate-300 focus:border-primary-500 bg-white"
                      } outline-none`}
                    />
                    {editFieldErrors.valid_to && !editForm.is_unlimited_time && (
                      <p className="text-[10px] text-rose-600 mt-1 font-medium">{editFieldErrors.valid_to}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Giới hạn lượt dùng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Tổng lượt dùng *
                  </label>
                  <input
                    type="number"
                    min={editingPromo.used_count || 1}
                    value={editForm.usage_limit}
                    onChange={(e) => {
                      setEditForm({ ...editForm, usage_limit: e.target.value });
                      if (editFieldErrors.usage_limit) setEditFieldErrors((prev) => ({ ...prev, usage_limit: "" }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-bold rounded-xl border ${
                      editFieldErrors.usage_limit ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                    } outline-none`}
                  />
                  {editFieldErrors.usage_limit ? (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.usage_limit}</p>
                  ) : (
                    <div className="text-[10px] text-slate-400 mt-1">Đã dùng: {editingPromo.used_count} lượt</div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Lượt / mỗi khách *
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={editForm.target_audience === "NEW_USER"}
                    value={editForm.target_audience === "NEW_USER" ? "1" : editForm.usage_limit_per_user}
                    onChange={(e) => {
                      setEditForm({ ...editForm, usage_limit_per_user: e.target.value });
                      if (editFieldErrors.usage_limit_per_user) setEditFieldErrors((prev) => ({ ...prev, usage_limit_per_user: "" }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-bold rounded-xl border ${
                      editFieldErrors.usage_limit_per_user ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                    } outline-none ${
                      editForm.target_audience === "NEW_USER" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                    }`}
                  />
                  {editFieldErrors.usage_limit_per_user && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.usage_limit_per_user}</p>
                  )}
                </div>
              </div>

              {/* Đơn tối thiểu */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Đơn tối thiểu (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  placeholder="0"
                  value={editForm.min_order_amount}
                  onChange={(e) => {
                    setEditForm({ ...editForm, min_order_amount: e.target.value });
                    if (editFieldErrors.min_order_amount) setEditFieldErrors((prev) => ({ ...prev, min_order_amount: "" }));
                  }}
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border ${
                    editFieldErrors.min_order_amount ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-primary-500"
                  } outline-none`}
                />
                {editFieldErrors.min_order_amount && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.min_order_amount}</p>
                )}
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Trạng thái
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="DISABLED">Tạm ngưng</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
