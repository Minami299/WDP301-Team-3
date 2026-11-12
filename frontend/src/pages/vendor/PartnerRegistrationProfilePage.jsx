import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { vendorApi } from "../../services/api/vendorApi";
import { partnerApplicationApi } from "../../services/api/partnerApplicationApi";
import { documentLabels } from "../../utils/partnerApplication";
import ImageUpload from "../../components/ImageUpload";
import { VendorSidebar, PartnerUserBadge } from "./HotelOwnerDashboardPage";
import {
  IconHotel,
  IconMapPin,
  IconUser,
  IconShield,
  IconCheck,
  IconPlus,
  IconMinus,
  IconPercent,
  IconDollar,
  IconArrowRight,
  IconEdit,
  IconTrash,
  IconX,
  IconAlertTriangle,
  IconEye,
  IconDownload
} from "../../components/Icons";

const FALLBACK_BED_TYPES = [
  "Single Bed",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Bunk Bed",
  "Sofa Bed",
  "Twin Bed",
  "Futon Bed",
  "Capsule Bed"
];

export default function PartnerRegistrationProfilePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Danh mục loại giường
  const [availableBedTypes, setAvailableBedTypes] = useState(FALLBACK_BED_TYPES);

  // State Modal Thêm / Chỉnh sửa phòng
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [currentFacilityId, setCurrentFacilityId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    name: "",
    base_price: "",
    capacity: 2,
    bathrooms: 1,
    total_rooms: 1,
    description: "",
    photos: [],
    beds: [{ bed_type: "Single Bed", count: 1 }]
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // State Modal Xác nhận Xóa phòng
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    room: null,
    facility: null,
    cannotDelete: false,
    loading: false,
    error: ""
  });

  // State Modal Xem Hồ sơ & Giấy tờ đăng ký gửi Manager
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationTab, setApplicationTab] = useState("documents"); // 'documents' | 'profile' | 'business'
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // State Chỉnh sửa chương trình khuyến mại (ảnh 1 & ảnh 2)
  const [isEditingPromotions, setIsEditingPromotions] = useState(false);
  const [promoFirstThree, setPromoFirstThree] = useState(true);
  const [promoWeekly, setPromoWeekly] = useState(true);
  const [promoWeeklyDiscount, setPromoWeeklyDiscount] = useState(15);
  const [promoMonthly, setPromoMonthly] = useState(true);
  const [promoMonthlyDiscount, setPromoMonthlyDiscount] = useState(30);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoError, setPromoError] = useState("");

  const handleStartEditPromotions = () => {
    const existing = data?.application?.business?.promotions || data?.facilities?.[0]?.promotions || {};
    setPromoFirstThree(existing.first_three_bookings !== false);
    setPromoWeekly(existing.weekly_promo !== false);
    setPromoWeeklyDiscount(existing.weekly_discount !== undefined ? existing.weekly_discount : 15);
    setPromoMonthly(existing.monthly_promo !== false);
    setPromoMonthlyDiscount(existing.monthly_discount !== undefined ? existing.monthly_discount : 30);
    setPromoError("");
    setIsEditingPromotions(true);
  };

  const handleSavePromotions = async () => {
    try {
      setPromoSaving(true);
      setPromoError("");
      const payload = {
        first_three_bookings: Boolean(promoFirstThree),
        weekly_promo: Boolean(promoWeekly),
        weekly_discount: Number(promoWeeklyDiscount) || 0,
        monthly_promo: Boolean(promoMonthly),
        monthly_discount: Number(promoMonthlyDiscount) || 0
      };

      const res = await vendorApi.updatePromotions(payload);
      const updatedPromos = res.data?.data || payload;

      setData((prev) => {
        if (!prev) return prev;
        const newFacilities = [...(prev.facilities || [])];
        if (newFacilities[0]) {
          newFacilities[0] = { ...newFacilities[0], promotions: updatedPromos };
        }
        return {
          ...prev,
          facilities: newFacilities,
          application: {
            ...prev.application,
            business: {
              ...(prev.application?.business || {}),
              promotions: updatedPromos
            }
          }
        };
      });

      setSuccessToast("Đã lưu cập nhật chương trình khuyến mại thành công");
      setIsEditingPromotions(false);
    } catch (err) {
      setPromoError(err?.response?.data?.message || err?.message || "Không thể cập nhật chương trình khuyến mại");
    } finally {
      setPromoSaving(false);
    }
  };

  // State Chỉnh sửa tên cơ sở lưu trú
  const [isEditingFacilityName, setIsEditingFacilityName] = useState(false);
  const [facilityNameInput, setFacilityNameInput] = useState("");
  const [facilityNameSaving, setFacilityNameSaving] = useState(false);
  const [facilityNameError, setFacilityNameError] = useState("");

  const handleStartEditFacilityName = () => {
    const currentName = data?.application?.business?.facility_name || data?.facilities?.[0]?.name || "";
    setFacilityNameInput(currentName);
    setFacilityNameError("");
    setIsEditingFacilityName(true);
  };

  const handleSaveFacilityName = async () => {
    if (!facilityNameInput.trim()) {
      setFacilityNameError("Vui lòng nhập tên cơ sở lưu trú.");
      return;
    }
    const targetFacilityId = data?.facilities?.[0]?._id || data?.application?.facility_id;
    if (!targetFacilityId) {
      setFacilityNameError("Không tìm thấy mã cơ sở để cập nhật.");
      return;
    }
    try {
      setFacilityNameSaving(true);
      setFacilityNameError("");
      await vendorApi.updateFacility(targetFacilityId, { name: facilityNameInput.trim() });
      setData((prev) => {
        if (!prev) return prev;
        const newFacilities = [...(prev.facilities || [])];
        if (newFacilities.length > 0) {
          newFacilities[0] = { ...newFacilities[0], name: facilityNameInput.trim() };
        }
        return {
          ...prev,
          facilities: newFacilities,
          application: {
            ...prev.application,
            business: {
              ...(prev.application?.business || {}),
              facility_name: facilityNameInput.trim()
            }
          }
        };
      });
      setSuccessToast("Cập nhật tên cơ sở lưu trú thành công");
      setIsEditingFacilityName(false);
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      setFacilityNameError(err?.response?.data?.message || err?.message || "Lỗi khi cập nhật tên cơ sở");
    } finally {
      setFacilityNameSaving(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      setDownloadingDocId(doc._id);
      if (doc._id && !String(doc._id).startsWith("doc_demo_")) {
        await partnerApplicationApi.download(doc);
      } else {
        const content = `TÀI LIỆU HỒ SƠ ĐỐI TÁC TRAVELIO\n====================================\nTên tài liệu: ${doc.name}\nLoại chứng từ: ${documentLabels[doc.kind] || doc.kind}\nDung lượng: ${Math.round(doc.size / 1024)} KB\nThời gian nộp: ${new Date(doc.uploaded_at).toLocaleString("vi-VN")}\nTrạng thái: Đã được Ban Quản Lý (Manager) xác minh và phê duyệt.`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name.endsWith(".pdf") ? doc.name.replace(".pdf", ".txt") : doc.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err.message || "Không thể tải tài liệu này.");
    } finally {
      setDownloadingDocId(null);
    }
  };

  const reloadProfile = async () => {
    try {
      const res = await vendorApi.getProfile();
      setData(res.data);
    } catch (err) {
      setError(err.message || "Không thể tải hồ sơ đăng ký");
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
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

    // Tải danh mục loại giường từ backend nếu có
    fetch("/api/categories/bed-types")
      .then((res) => (res.ok ? res.json() : []))
      .then((resData) => {
        if (isMounted && Array.isArray(resData) && resData.length > 0) {
          setAvailableBedTypes(resData);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const user = data?.user || currentUser;
  const profile = data?.profile || {};
  const facilities = data?.facilities || [];

  const formatPrice = (val) =>
    Number(val || 0).toLocaleString("vi-VN") + " VND";

  // Mở modal thêm phòng mới
  const handleOpenCreateRoom = (facilityId) => {
    setCurrentFacilityId(facilityId);
    setEditingRoomId(null);
    setRoomForm({
      name: "",
      base_price: "",
      capacity: 2,
      bathrooms: 1,
      total_rooms: 1,
      description: "",
      photos: [],
      beds: [{ bed_type: availableBedTypes[0] || "Single Bed", count: 1 }]
    });
    setFormError("");
    setIsRoomModalOpen(true);
  };

  // Mở modal chỉnh sửa phòng hiện có
  const handleEditRoom = (facilityId, room) => {
    setCurrentFacilityId(facilityId);
    setEditingRoomId(room._id);

    const flatBeds = [];
    if (Array.isArray(room.bedrooms)) {
      room.bedrooms.forEach((bGroup) => {
        if (Array.isArray(bGroup.beds)) {
          bGroup.beds.forEach((b) => {
            flatBeds.push({
              bed_type: b.bed_type || availableBedTypes[0] || "Single Bed",
              count: Number(b.count) || 1
            });
          });
        }
      });
    }

    setRoomForm({
      name: room.name || "",
      base_price: room.base_price !== undefined ? room.base_price : "",
      capacity: room.capacity || 2,
      bathrooms: room.bathrooms !== undefined ? room.bathrooms : 1,
      total_rooms: room.total_rooms !== undefined ? room.total_rooms : 1,
      description: room.description || "",
      photos: Array.isArray(room.photos) ? [...room.photos] : [],
      beds:
        flatBeds.length > 0
          ? flatBeds
          : [{ bed_type: availableBedTypes[0] || "Single Bed", count: 1 }]
    });
    setFormError("");
    setIsRoomModalOpen(true);
  };

  // Lưu thông tin phòng (Tạo mới hoặc Cập nhật)
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (formSaving || uploadingPhotos) return;
    if (!roomForm.name.trim()) {
      setFormError("Vui lòng nhập tên loại phòng");
      return;
    }
    if (roomForm.base_price === "" || Number(roomForm.base_price) < 0 || isNaN(Number(roomForm.base_price))) {
      setFormError("Vui lòng nhập giá phòng hợp lệ (>= 0)");
      return;
    }
    if (roomForm.total_rooms === "" || Number(roomForm.total_rooms) < 1 || isNaN(Number(roomForm.total_rooms))) {
      setFormError("Số lượng phòng mặc định tối thiểu phải là 1 phòng");
      return;
    }
    if (!roomForm.capacity || Number(roomForm.capacity) < 1 || isNaN(Number(roomForm.capacity))) {
      setFormError("Sức chứa phòng tối thiểu phải là 1 khách");
      return;
    }
    if (roomForm.bathrooms === "" || Number(roomForm.bathrooms) < 0 || isNaN(Number(roomForm.bathrooms))) {
      setFormError("Số lượng phòng tắm không được là số âm");
      return;
    }
    if (roomForm.beds.some((b) => !b.bed_type || Number(b.count) < 1 || isNaN(Number(b.count)))) {
      setFormError("Mỗi loại giường phải có số lượng tối thiểu là 1 chiếc");
      return;
    }

    setFormSaving(true);
    setFormError("");
    try {
      const payload = {
        name: roomForm.name.trim(),
        base_price: Number(roomForm.base_price),
        capacity: Number(roomForm.capacity) || 2,
        bathrooms: Number(roomForm.bathrooms) || 1,
        total_rooms: Math.max(1, Number(roomForm.total_rooms) || 1),
        description: roomForm.description ? roomForm.description.trim() : null,
        photos: roomForm.photos,
        bedrooms: [
          {
            bedroom_name: roomForm.name.trim(),
            beds: roomForm.beds.map((b) => ({
              bed_type: b.bed_type,
              count: Number(b.count) || 1
            }))
          }
        ]
      };

      if (editingRoomId) {
        await vendorApi.updateRoom(editingRoomId, payload);
        setSuccessToast("Cập nhật loại phòng thành công");
      } else {
        await vendorApi.createRoom(currentFacilityId, payload);
        setSuccessToast("Thêm loại phòng mới thành công");
      }

      await reloadProfile();
      setIsRoomModalOpen(false);
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.message || "Lưu loại phòng thất bại"
      );
    } finally {
      setFormSaving(false);
    }
  };

  // Xử lý thêm/bớt giường
  const handleAddBed = () => {
    setRoomForm((prev) => ({
      ...prev,
      beds: [
        ...prev.beds,
        { bed_type: availableBedTypes[0] || "Single Bed", count: 1 }
      ]
    }));
  };

  const handleUpdateBed = (index, field, value) => {
    setRoomForm((prev) => ({
      ...prev,
      beds: prev.beds.map((b, i) =>
        i === index ? { ...b, [field]: value } : b
      )
    }));
  };

  const handleRemoveBed = (index) => {
    if (roomForm.beds.length <= 1) return;
    setRoomForm((prev) => ({
      ...prev,
      beds: prev.beds.filter((_, i) => i !== index)
    }));
  };

  // Mở hộp thoại xác nhận xóa phòng
  const handleDeletePrompt = (facility, room) => {
    if (facility.rooms?.length <= 1) {
      setDeleteModal({
        isOpen: true,
        room,
        facility,
        cannotDelete: true,
        loading: false,
        error:
          "Không thể xóa loại phòng duy nhất của cơ sở lưu trú. Mỗi cơ sở bắt buộc phải có ít nhất 1 loại phòng."
      });
      return;
    }
    setDeleteModal({
      isOpen: true,
      room,
      facility,
      cannotDelete: false,
      loading: false,
      error: ""
    });
  };

  // Thực hiện xóa phòng
  const handleConfirmDelete = async () => {
    if (!deleteModal.room?._id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await vendorApi.deleteRoom(deleteModal.room._id);
      await reloadProfile();
      setDeleteModal({
        isOpen: false,
        room: null,
        facility: null,
        cannotDelete: false,
        loading: false,
        error: ""
      });
      setSuccessToast("Đã xóa loại phòng thành công");
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        error:
          err.response?.data?.message || err.message || "Xóa loại phòng thất bại"
      }));
    }
  };

  return (
    <div className="flex h-full bg-[#f8fafc] font-body overflow-hidden">
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
              Toàn bộ dữ liệu hồ sơ đối tác, cơ sở lưu trú và quản lý các loại phòng
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/vendor")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              Về Dashboard
            </button>

            {/* Quy tắc: Mỗi tài khoản chỉ đăng ký 1 cơ sở duy nhất */}
            {facilities.length === 0 ? (
              <button
                onClick={() => navigate("/partner/register/hotel")}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <IconPlus size={15} />
                Đăng ký cơ sở lưu trú
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 flex items-center gap-1.5">
                <IconCheck size={14} className="text-emerald-600" />
                Cơ sở đã kích hoạt (1/1)
              </div>
            )}
            <PartnerUserBadge currentUser={currentUser} />
          </div>
        </header>

        {/* Thông báo thành công */}
        {successToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-8 py-2.5 flex items-center justify-between shadow-sm animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <IconCheck size={15} />
              {successToast}
            </span>
            <button
              onClick={() => setSuccessToast("")}
              className="text-white/80 hover:text-white"
            >
              <IconX size={14} />
            </button>
          </div>
        )}

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
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsApplicationModalOpen(true)}
                      className="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold rounded-xl border border-primary-200/80 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <IconShield size={14} className="text-primary-600" />
                      Xem hồ sơ & giấy tờ đã nộp
                    </button>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200/60 flex items-center gap-1">
                      <IconCheck size={12} />
                      Đã xác thực
                    </span>
                  </div>
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

              {/* PHẦN 2: THÔNG TIN CƠ SỞ LƯU TRÚ & CRUD CÁC LOẠI PHÒNG */}
              {facilities.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <IconHotel size={32} />
                  </div>
                  <h3 className="font-heading font-extrabold text-base text-text-primary">
                    Chưa có cơ sở lưu trú nào được liên kết
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Mỗi tài khoản đối tác được đăng ký 1 cơ sở lưu trú. Bắt đầu thiết lập thông tin cơ sở và phòng của bạn ngay.
                  </p>
                  <button
                    onClick={() => navigate("/partner/register/hotel")}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition"
                  >
                    <IconPlus size={16} />
                    Đăng ký cơ sở lưu trú mới
                  </button>
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
                          <span className="text-slate-400 text-[10px] block">Thanh toán</span>
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
                            Mô tả cơ sở
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

                    {/* DANH SÁCH CÁC PHÒNG NGHỈ VÀ THAO TÁC CRUD */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wide">
                            Danh sách các loại phòng ({fac.rooms?.length || 0})
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Quản lý các hạng phòng, giá niêm yết và cấu hình giường ngủ
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenCreateRoom(fac._id)}
                          className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <IconPlus size={15} />
                          Thêm loại phòng mới
                        </button>
                      </div>

                      {(!fac.rooms || fac.rooms.length === 0) ? (
                        <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500 bg-slate-50/50">
                          Chưa có loại phòng nào được thiết lập. Hãy bấm nút "Thêm loại phòng mới" ở trên để bổ sung.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {fac.rooms.map((room, rIdx) => {
                            const roomPhotos = Array.isArray(room.photos) ? room.photos : [];
                            return (
                              <div
                                key={room._id || rIdx}
                                className="rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-primary-400 transition shadow-xs flex flex-col justify-between"
                              >
                                <div>
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
                                  <div className="p-4 space-y-3">
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
                                        <span className="bg-primary-50 text-primary-700 border border-primary-200/50 px-2 py-0.5 rounded-md font-semibold">
                                          {room.total_rooms || 1} phòng
                                        </span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                          {room.capacity || 2} khách
                                        </span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                          {room.bathrooms || 1} phòng tắm
                                        </span>
                                      </div>

                                      {/* Cấu hình giường ngủ */}
                                      {room.bedrooms && room.bedrooms.length > 0 && (
                                        <div className="mt-2.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                                            Giường ngủ:
                                          </span>
                                          {room.bedrooms.map((bedGroup, bIdx) => (
                                            <div key={bIdx} className="text-[11px] text-slate-700 flex flex-wrap gap-1.5">
                                              {bedGroup.beds?.map((b, i) => (
                                                <span key={i} className="inline-block bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-medium">
                                                  {b.count}x {b.bed_type}
                                                </span>
                                              ))}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Mô tả ngắn */}
                                      {room.description && (
                                        <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic">
                                          "{room.description}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Thanh nút thao tác Chỉnh sửa & Xóa */}
                                <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-end gap-2 bg-slate-50/40">
                                  <button
                                    onClick={() => handleEditRoom(fac._id, room)}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                                  >
                                    <IconEdit size={13} className="text-slate-600" />
                                    Chỉnh sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeletePrompt(fac, room)}
                                    title={
                                      fac.rooms?.length <= 1
                                        ? "Mỗi cơ sở phải có ít nhất 1 loại phòng, không thể xóa phòng duy nhất"
                                        : "Xóa loại phòng này"
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                      fac.rooms?.length <= 1
                                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60"
                                    }`}
                                  >
                                    <IconTrash
                                      size={13}
                                      className={
                                        fac.rooms?.length <= 1
                                          ? "text-slate-400"
                                          : "text-rose-600"
                                      }
                                    />
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODAL THÊM / CHỈNH SỬA LOẠI PHÒNG ================= */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="font-heading font-extrabold text-base text-text-primary">
                  {editingRoomId ? "Chỉnh sửa loại phòng" : "Thêm loại phòng mới"}
                </h3>
                <p className="text-xs text-slate-400">
                  Cập nhật các thông số chi tiết, cấu hình giường và hình ảnh phòng
                </p>
              </div>
              <button
                disabled={formSaving || uploadingPhotos}
                onClick={() => setIsRoomModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Modal Error */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <IconAlertTriangle size={15} />
                {formError}
              </div>
            )}

            {/* Modal Body Form */}
            <form id="room-form" onSubmit={handleSaveRoom} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Tên loại phòng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên loại phòng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng Deluxe Giường Đôi Ban Công Biển"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition"
                />
              </div>

              {/* Giá cơ bản & Số lượng phòng & Sức chứa & Phòng tắm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá niêm yết / đêm (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    placeholder="Ví dụ: 450000"
                    value={roomForm.base_price}
                    onChange={(e) => setRoomForm({ ...roomForm, base_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng phòng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    required
                    placeholder="Ví dụ: 10"
                    value={roomForm.total_rooms}
                    onChange={(e) => setRoomForm({ ...roomForm, total_rooms: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sức chứa (Khách)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số phòng tắm
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={roomForm.bathrooms}
                    onChange={(e) => setRoomForm({ ...roomForm, bathrooms: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Cấu hình giường ngủ */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Cấu hình giường ngủ ({roomForm.beds.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBed}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-primary-600 border border-primary-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <IconPlus size={12} />
                    Thêm giường
                  </button>
                </div>

                <div className="space-y-2">
                  {roomForm.beds.map((bed, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <select
                        value={bed.bed_type}
                        onChange={(e) => handleUpdateBed(bIdx, "bed_type", e.target.value)}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500"
                      >
                        {availableBedTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5 w-28">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={bed.count}
                          onChange={(e) => handleUpdateBed(bIdx, "count", Number(e.target.value) || 1)}
                          className="w-16 px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:border-primary-500"
                        />
                        <span className="text-xs text-slate-500 font-medium">chiếc</span>
                      </div>

                      {roomForm.beds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBed(bIdx)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Xóa loại giường này"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mô tả phòng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả đặc điểm loại phòng
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tầm nhìn (view biển/phố), trang thiết bị đặc biệt, ban công..."
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none transition leading-relaxed"
                />
              </div>

              {/* Quản lý hình ảnh phòng */}
              <ImageUpload
                label="Hình ảnh phòng"
                value={roomForm.photos}
                onChange={photos => setRoomForm(previous => ({ ...previous, photos }))}
                maxImages={10}
                disabled={formSaving}
                onBusyChange={setUploadingPhotos}
              />
            </form>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={formSaving || uploadingPhotos}
                onClick={() => setIsRoomModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="room-form"
                disabled={formSaving || uploadingPhotos}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {formSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : editingRoomId ? (
                  "Cập nhật loại phòng"
                ) : (
                  "Tạo loại phòng"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN XÓA LOẠI PHÒNG ================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                deleteModal.cannotDelete
                  ? "bg-amber-50 text-amber-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              <IconAlertTriangle size={28} />
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-base text-text-primary">
                {deleteModal.cannotDelete
                  ? "Không thể xóa loại phòng"
                  : "Xác nhận xóa loại phòng?"}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {deleteModal.cannotDelete ? (
                  deleteModal.error
                ) : (
                  <>
                    Bạn có chắc chắn muốn xóa vĩnh viễn loại phòng{" "}
                    <span className="font-bold text-text-primary">
                      "{deleteModal.room?.name}"
                    </span>
                    ? Dữ liệu này sẽ không thể khôi phục sau khi xóa.
                  </>
                )}
              </p>
            </div>

            {deleteModal.error && !deleteModal.cannotDelete && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {deleteModal.error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    room: null,
                    facility: null,
                    cannotDelete: false,
                    loading: false,
                    error: ""
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                {deleteModal.cannotDelete ? "Đã hiểu" : "Hủy"}
              </button>

              {!deleteModal.cannotDelete && (
                <button
                  type="button"
                  disabled={deleteModal.loading}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {deleteModal.loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    "Xác nhận xóa"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XEM HỒ SƠ & TÀI LIỆU ĐÃ NỘP GỬI MANAGER DUYỆT */}
      {isApplicationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-primary-950 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600/30 border border-primary-400/40 text-primary-300 flex items-center justify-center">
                  <IconShield size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-white">
                    Hồ sơ & Giấy tờ đăng ký đối tác gửi Manager
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Bản sao lưu các thông tin kê khai pháp lý và tài liệu đã được gửi đến Ban Quản Lý để xét duyệt.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplicationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Trạng thái duyệt banner */}
            <div className="px-6 py-3 bg-emerald-50/80 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-800">
                  Trạng thái: ĐÃ ĐƯỢC PHÊ DUYỆT VÀ CẤP QUYỀN HOẠT ĐỘNG
                </span>
              </div>
              <div className="text-slate-500 text-[11px] flex items-center gap-4">
                <span>
                  Ngày nộp:{" "}
                  <strong>
                    {data?.application?.submitted_at
                      ? new Date(data.application.submitted_at).toLocaleDateString("vi-VN")
                      : "Mới nộp gần đây"}
                  </strong>
                </span>
                <span>
                  Quyết định: <strong className="text-emerald-700">Chấp thuận kinh doanh</strong>
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setApplicationTab("documents")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
                  applicationTab === "documents"
                    ? "bg-white text-primary-700 border-primary-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 border-transparent"
                }`}
              >
                1. Ảnh giấy tờ & Tài liệu đã nộp ({data?.application?.documents?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setApplicationTab("profile")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
                  applicationTab === "profile"
                    ? "bg-white text-primary-700 border-primary-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 border-transparent"
                }`}
              >
                2. Thông tin pháp lý & Người đại diện
              </button>
              <button
                type="button"
                onClick={() => setApplicationTab("business")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
                  applicationTab === "business"
                    ? "bg-white text-primary-700 border-primary-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 border-transparent"
                }`}
              >
                3. Cơ sở & Khuyến mại đã gửi duyệt
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* TAB 1: TÀI LIỆU & ẢNH GIẤY TỜ */}
              {applicationTab === "documents" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <IconShield size={14} className="text-blue-600" />
                      Tài liệu và hình ảnh pháp lý lưu trữ riêng tư
                    </p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Toàn bộ chứng từ, giấy phép kinh doanh và giấy tờ đại diện đã được gửi đến Ban Quản Lý (Manager) để xác minh tính hợp lệ trước khi kích hoạt tài khoản đối tác.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(data?.application?.documents || []).map((doc) => {
                      const isImage = doc.mime?.startsWith("image/") || doc.name?.match(/\.(png|jpe?g|webp)$/i);
                      return (
                        <div
                          key={doc._id}
                          className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition space-y-3 flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary-600 flex-shrink-0 shadow-2xs">
                              {isImage ? <IconEye size={18} /> : <IconShield size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="px-2 py-0.5 bg-primary-100/70 text-primary-800 text-[10px] font-bold rounded-md inline-block mb-1">
                                {documentLabels[doc.kind] || doc.kind || "Chứng từ pháp lý"}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs truncate" title={doc.name}>
                                {doc.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {Math.round(doc.size / 1024)} KB · {new Date(doc.uploaded_at).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <IconCheck size={12} /> Đã kiểm tra
                            </span>
                            <div className="flex items-center gap-2">
                              {isImage && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                                >
                                  <IconEye size={12} /> Xem ảnh
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={downloadingDocId === doc._id}
                                onClick={() => handleDownloadDoc(doc)}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                              >
                                {downloadingDocId === doc._id ? (
                                  "Đang tải..."
                                ) : (
                                  <>
                                    <IconDownload size={12} /> Tải tài liệu
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: THÔNG TIN PHÁP LÝ & NGƯỜI ĐẠI DIỆN */}
              {applicationTab === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Tên pháp lý chủ thể
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.legal_name || data?.user?.full_name || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Tên thương mại
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.trading_name || data?.facilities?.[0]?.name || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Loại hình chủ thể
                      </span>
                      <span className="font-bold text-primary-600 text-xs mt-0.5 block">
                        {data?.application?.profile?.entity_type === "COMPANY"
                          ? "Doanh nghiệp / Công ty"
                          : data?.application?.profile?.entity_type === "HOUSEHOLD"
                          ? "Hộ kinh doanh cá thể"
                          : "Cá nhân / Tư nhân"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Mã số thuế (MST)
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block font-mono">
                        {data?.application?.profile?.tax_number || "0109887766"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Số đăng ký kinh doanh (ĐKKD)
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block font-mono">
                        {data?.application?.profile?.registration_number || "0402123456"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Người đại diện pháp luật
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.representative_name || data?.user?.full_name || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Chức vụ người đại diện
                      </span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.representative_title || "Chủ sở hữu / Người đại diện pháp luật"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Loại hình lưu trú
                      </span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.accommodation_type || "Khách sạn / Khu nghỉ dưỡng"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Quyền đối với cơ sở
                      </span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.authority || "Chủ sở hữu cơ sở"}
                      </span>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Địa chỉ trụ sở đăng ký kinh doanh
                      </span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.profile?.registered_address || data?.facilities?.[0]?.address || "Đà Nẵng, Việt Nam"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CƠ SỞ & KHUYẾN MẠI ĐÃ GỬI DUYỆT */}
              {applicationTab === "business" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">
                          Tên cơ sở lưu trú
                        </span>
                        {isEditingFacilityName ? (
                          <div className="mt-1.5 space-y-2">
                            <input
                              type="text"
                              maxLength={100}
                              value={facilityNameInput}
                              onChange={(e) => setFacilityNameInput(e.target.value)}
                              placeholder="Nhập tên cơ sở lưu trú..."
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-primary-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              autoFocus
                            />
                            {facilityNameError && (
                              <p className="text-[11px] text-rose-600 font-medium">{facilityNameError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveFacilityName}
                                disabled={facilityNameSaving || !facilityNameInput.trim()}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-bold rounded-md transition disabled:opacity-50 cursor-pointer"
                              >
                                {facilityNameSaving ? "Đang lưu..." : "Lưu"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingFacilityName(false)}
                                disabled={facilityNameSaving}
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold rounded-md transition cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                            {data?.application?.business?.facility_name || data?.facilities?.[0]?.name}
                          </span>
                        )}
                      </div>
                      {!isEditingFacilityName && (
                        <button
                          type="button"
                          onClick={handleStartEditFacilityName}
                          className="px-2 py-1 bg-white hover:bg-primary-50 text-primary-600 hover:text-primary-700 text-xs font-semibold rounded-lg border border-primary-200 transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Chỉnh sửa tên cơ sở lưu trú"
                        >
                          <IconEdit size={12} />
                          Đổi tên
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Số điện thoại lễ tân / tiếp nhận
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.business?.phone || data?.user?.phone}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Phương thức nhận tiền thanh toán
                      </span>
                      <span className="font-bold text-primary-700 text-xs mt-0.5 block">
                        {data?.application?.business?.payout_method === "paypal" ? "PayPal" : "Chuyển khoản Ngân hàng (Bank Transfer)"}
                      </span>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Địa chỉ cơ sở kinh doanh
                      </span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {data?.application?.business?.facility_address || data?.facilities?.[0]?.address},{" "}
                        {data?.application?.business?.facility_city || data?.facilities?.[0]?.city}
                      </span>
                    </div>
                  </div>

                  {/* Khối chương trình khuyến mại đã gửi duyệt (Hỗ trợ chỉnh sửa theo Ảnh 2) */}
                  <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <IconPercent size={14} className="text-primary-600" />
                        Chương trình khuyến mại & khởi động đăng ký khi gửi duyệt
                      </h4>
                      {!isEditingPromotions ? (
                        <button
                          type="button"
                          onClick={handleStartEditPromotions}
                          className="px-3 py-1.5 bg-white hover:bg-primary-50 text-primary-600 hover:text-primary-700 text-xs font-bold rounded-lg border border-primary-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <IconEdit size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingPromotions(false)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <IconX size={13} />
                          <span>Hủy</span>
                        </button>
                      )}
                    </div>

                    {promoError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                        {promoError}
                      </div>
                    )}

                    {!isEditingPromotions ? (
                      /* CHẾ ĐỘ HIỂN THỊ TÓM TẮT (ẢNH 1) */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                            3 đơn đặt phòng đầu tiên
                          </span>
                          <span className="font-bold text-emerald-600 text-xs mt-1 block">
                            {data?.application?.business?.promotions?.first_three_bookings !== false
                              ? "Giảm 33% cho 3 đơn đầu"
                              : "Không áp dụng"}
                          </span>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                            Khuyến mại hàng tuần
                          </span>
                          <span className="font-bold text-primary-600 text-xs mt-1 block">
                            {data?.application?.business?.promotions?.weekly_promo !== false
                              ? `Giảm ${data?.application?.business?.promotions?.weekly_discount || 15}% (từ 7 đêm)`
                              : "Không áp dụng"}
                          </span>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                            Khuyến mại hàng tháng
                          </span>
                          <span className="font-bold text-primary-600 text-xs mt-1 block">
                            {data?.application?.business?.promotions?.monthly_promo !== false
                              ? `Giảm ${data?.application?.business?.promotions?.monthly_discount || 30}% (từ 28 đêm)`
                              : "Không áp dụng"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* CHẾ ĐỘ CHỈNH SỬA (ẢNH 2) */
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        {/* Hint box bóng đèn */}
                        <div className="bg-[#e8f0fe] p-3.5 rounded-xl flex items-start gap-3 border border-blue-100">
                          <div className="w-5 h-5 bg-[#1a66d2] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18h6" />
                              <path d="M10 22h4" />
                              <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
                            </svg>
                          </div>
                          <div className="text-xs text-[#1a66d2] leading-relaxed">
                            Các trang thông tin cơ sở lưu trú mới áp dụng chương trình khuyến mại cho 3 đơn đặt phòng đầu tiên có khả năng nhận được đơn đặt phòng trong 30 ngày đầu cao gấp 1,7 lần.
                          </div>
                        </div>

                        {/* Card 1: 3 đơn đặt phòng đầu tiên */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 flex items-center justify-between gap-4 shadow-2xs">
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-text-primary">
                              3 đơn đặt phòng đầu tiên
                            </h5>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Giảm 33% cho 3 đơn đặt phòng hoàn tất đầu tiên để thu hút khách
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPromoFirstThree(!promoFirstThree)}
                            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 cursor-pointer ${
                              promoFirstThree ? "bg-[#1a66d2]" : "bg-slate-300"
                            }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                                promoFirstThree ? "translate-x-6" : "translate-x-0"
                              }`}
                            >
                              {promoFirstThree && (
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#1a66d2"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Card 2: Chương trình khuyến mại hằng tuần */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h5 className="font-bold text-xs sm:text-sm text-text-primary">
                                Chương trình khuyến mại hằng tuần
                              </h5>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Áp dụng cho kỳ lưu trú từ 7 đêm trở lên
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPromoWeekly(!promoWeekly)}
                              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 cursor-pointer ${
                                promoWeekly ? "bg-[#1a66d2]" : "bg-slate-300"
                              }`}
                            >
                              <div
                                className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                                  promoWeekly ? "translate-x-6" : "translate-x-0"
                                }`}
                              >
                                {promoWeekly && (
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#1a66d2"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          </div>

                          <div className="relative bg-white border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition max-w-xs">
                            <span className="absolute -top-2 left-2.5 px-1 bg-white text-[11px] font-medium leading-none text-slate-500">
                              Chiết khấu
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={promoWeeklyDiscount}
                              onChange={(e) => setPromoWeeklyDiscount(e.target.value)}
                              disabled={!promoWeekly}
                              className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3 disabled:opacity-50"
                            />
                            <span className="text-xs text-slate-500 font-medium select-none">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Card 3: Chương trình khuyến mại hằng tháng */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h5 className="font-bold text-xs sm:text-sm text-text-primary">
                                Chương trình khuyến mại hằng tháng
                              </h5>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Áp dụng cho kỳ lưu trú từ 28 đêm trở lên
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPromoMonthly(!promoMonthly)}
                              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 cursor-pointer ${
                                promoMonthly ? "bg-[#1a66d2]" : "bg-slate-300"
                              }`}
                            >
                              <div
                                className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                                  promoMonthly ? "translate-x-6" : "translate-x-0"
                                }`}
                              >
                                {promoMonthly && (
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#1a66d2"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          </div>

                          <div className="relative bg-white border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition max-w-xs">
                            <span className="absolute -top-2 left-2.5 px-1 bg-white text-[11px] font-medium leading-none text-slate-500">
                              Chiết khấu
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={promoMonthlyDiscount}
                              onChange={(e) => setPromoMonthlyDiscount(e.target.value)}
                              disabled={!promoMonthly}
                              className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3 disabled:opacity-50"
                            />
                            <span className="text-xs text-slate-500 font-medium select-none">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Nút thao tác Lưu / Hủy */}
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingPromotions(false)}
                            disabled={promoSaving}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer disabled:opacity-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSavePromotions}
                            disabled={promoSaving}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                          >
                            {promoSaving ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Đang lưu...</span>
                              </>
                            ) : (
                              <>
                                <IconCheck size={14} />
                                <span>Lưu thay đổi</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-slate-500">
                Hồ sơ đối tác đã được xác thực bảo mật và cấp quyền kinh doanh trên sàn Travelio.
              </span>
              <button
                type="button"
                onClick={() => setIsApplicationModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: XEM ẢNH TÀI LIỆU PHÓNG TO */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{previewDoc.name}</h4>
                <p className="text-xs text-slate-400">{documentLabels[previewDoc.kind] || previewDoc.kind}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <IconX size={16} />
              </button>
            </div>
            <div className="w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
              <div className="text-center p-6 space-y-2">
                <IconShield size={48} className="text-primary-600 mx-auto" />
                <p className="font-bold text-slate-700 text-xs">Bản xem trước tài liệu: {previewDoc.name}</p>
                <p className="text-[11px] text-slate-500">Tài liệu bảo mật cao đã được mã hóa trên hệ thống chứng thực.</p>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <IconDownload size={14} /> Tải file về máy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
