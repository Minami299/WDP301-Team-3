import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { vendorApi } from "../../services/api/vendorApi";
import { facilityImageApi } from "../../services/api/facilityImageApi";
import { VendorSidebar } from "./HotelOwnerDashboardPage";
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
  IconCamera,
  IconAlertTriangle
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
    description: "",
    photos: [],
    beds: [{ bed_type: "Single Bed", count: 1 }]
  });
  const [photoUrlInput, setPhotoUrlInput] = useState("");
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
      description: "",
      photos: [],
      beds: [{ bed_type: availableBedTypes[0] || "Single Bed", count: 1 }]
    });
    setPhotoUrlInput("");
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
      description: room.description || "",
      photos: Array.isArray(room.photos) ? [...room.photos] : [],
      beds:
        flatBeds.length > 0
          ? flatBeds
          : [{ bed_type: availableBedTypes[0] || "Single Bed", count: 1 }]
    });
    setPhotoUrlInput("");
    setFormError("");
    setIsRoomModalOpen(true);
  };

  // Lưu thông tin phòng (Tạo mới hoặc Cập nhật)
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.name.trim()) {
      setFormError("Vui lòng nhập tên loại phòng");
      return;
    }
    if (roomForm.base_price === "" || Number(roomForm.base_price) < 0) {
      setFormError("Vui lòng nhập giá phòng hợp lệ (>= 0)");
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

  // Tải ảnh lên qua Cloudinary
  const handleUploadPhotos = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    setFormError("");
    try {
      const res = await facilityImageApi.uploadRoomImages(files);
      const urls = Array.isArray(res) ? res : res.data || [];
      if (!urls || urls.length === 0) {
        throw new Error("Không nhận được liên kết ảnh từ máy chủ");
      }
      setRoomForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...urls]
      }));
    } catch (err) {
      setFormError(err.message || "Tải ảnh lên thất bại");
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Thêm ảnh qua URL nhập tay
  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    setRoomForm((prev) => ({
      ...prev,
      photos: [...prev.photos, photoUrlInput.trim()]
    }));
    setPhotoUrlInput("");
  };

  // Xóa ảnh khỏi danh sách tạm
  const handleRemovePhoto = (index) => {
    setRoomForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, idx) => idx !== index)
    }));
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
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                                  >
                                    <IconTrash size={13} className="text-rose-600" />
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

              {/* Giá cơ bản & Sức chứa & Phòng tắm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Hình ảnh phòng ({roomForm.photos.length})
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                    <IconCamera size={15} />
                    {uploadingPhotos ? "Đang tải ảnh..." : "Tải ảnh từ thiết bị"}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={uploadingPhotos}
                      onChange={(e) => handleUploadPhotos(e.target.files)}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="url"
                      placeholder="Hoặc dán URL ảnh trực tiếp..."
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoUrl}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Danh sách ảnh đã chọn */}
                {roomForm.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
                    {roomForm.photos.map((pUrl, pIdx) => (
                      <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 h-16 bg-slate-100">
                        <img src={pUrl} alt={`preview-${pIdx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                        {pIdx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-primary-600/90 text-white text-[8px] font-bold text-center py-0.5">
                            Ảnh chính
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
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
    </div>
  );
}
