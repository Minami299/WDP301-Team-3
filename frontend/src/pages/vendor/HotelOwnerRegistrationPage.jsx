import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import ImageUpload from "../../components/ImageUpload";
import VendorAccountFields from "../../components/VendorAccountFields";
import { validateAccountInformation } from "../../utils/vendorRegistration";
import { PENDING_APPROVAL_PATH } from "../../services/storage/pendingRegistration";
import { vendorApi } from "../../services/api/vendorApi";
import {
  IconCheck,
  IconChevronRight,
  IconHotel,
  IconMapPin,
  IconSearch,
  IconX,
  IconPlus,
  IconWifi,
  IconCoffee,
  IconShield,
  IconArrowRight,
  IconAlertTriangle,
} from "../../components/Icons";

const STEPS = [
  { id: 1, name: "Account Information", description: "Tài khoản & Điều khoản" },
  { id: 2, name: "Vị trí", description: "Địa chỉ & Bản đồ" },
  { id: 3, name: "Tiện nghi", description: "Những điều khách yêu thích" },
  { id: 4, name: "Thiết lập phòng", description: "Cấu hình phòng & giá" },
  { id: 5, name: "Hình ảnh", description: "Tải ảnh phòng qua Cloudinary" },
  {
    id: 6,
    name: "Khuyến mại & Doanh thu",
    description: "Ưu đãi & Cách thức nhận tiền",
  },
  {
    id: 7,
    name: "Thông tin chi tiết cơ sở lưu trú",
    description: "Tên & Mô tả cơ sở",
  },
  { id: 8, name: "Hồ sơ", description: "Thông tin liên hệ & Chủ nhà" },
  { id: 9, name: "Đăng tải", description: "Điều khoản & Hoàn tất" },
];

const renderAmenityIcon = (iconUrl) => {
  if (!iconUrl) {
    return <IconShield size={24} className="text-slate-400" />;
  }
  if (typeof iconUrl === "string" && iconUrl.trim().startsWith("<svg")) {
    return (
      <div
        className="w-6 h-6 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6"
        dangerouslySetInnerHTML={{ __html: iconUrl }}
      />
    );
  }
  return <img src={iconUrl} alt="icon" className="w-6 h-6 object-contain" />;
};

export default function HotelOwnerRegistrationPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const currentUser = auth?.currentUser;

  const [hasExistingFacility, setHasExistingFacility] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (
      currentUser &&
      ["HOTEL_OWNER", "ACTIVITY_VENDOR", "ADMIN", "MANAGER"].includes(
        currentUser.role,
      )
    ) {
      vendorApi
        .getProfile()
        .then((res) => {
          if (isMounted && res.data?.facilities?.length > 0) {
            setHasExistingFacility(true);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Vị trí & Bản đồ tương tác 2 chiều
  const [address, setAddress] = useState(
    "252 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng",
  );
  const [coords, setCoords] = useState({ lat: 16.068, lng: 108.245 });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isMapClickRef = useRef(false);

  // Chiều 1: Khi bấm hoặc kéo ghim trên bản đồ -> Lấy tọa độ đổi sang địa chỉ văn bản
  const reverseGeocode = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      );
      const data = await res.json();
      if (data && data.display_name) {
        isMapClickRef.current = true;
        setAddress(data.display_name);
      }
    } catch {
      // Bỏ qua nếu lỗi mạng
    } finally {
      setIsGeocoding(false);
    }
  };

  // Khởi tạo bản đồ tương tác Leaflet khi ở Bước 1
  useEffect(() => {
    if (currentStep !== 2) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    let disposed = false;
    let resizeTimer;
    let loadingScript;
    const initMap = () => {
      if (disposed || !mapContainerRef.current || !window.L || mapInstanceRef.current)
        return;
      const L = window.L;
      const map = L.map(mapContainerRef.current).setView(
        [coords.lat, coords.lng],
        16,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], {
        draggable: true,
      }).addTo(map);

      // Khi bấm chuột vào một điểm trên bản đồ
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Khi kéo thả ghim trên bản đồ
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 150);
    };

    if (window.L) {
      initMap();
    } else {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const existingScript = document.getElementById("leaflet-js");
      if (existingScript) {
        loadingScript = existingScript;
        existingScript.addEventListener("load", initMap);
      } else {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        loadingScript = script;
        script.addEventListener("load", initMap);
        document.head.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      loadingScript?.removeEventListener("load", initMap);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [currentStep]);

  // Chiều 2: Khi nhập địa chỉ vào ô input -> Tự động tìm tọa độ và di chuyển bản đồ
  useEffect(() => {
    if (isMapClickRef.current) {
      isMapClickRef.current = false;
      return;
    }
    const query = address.trim();
    if (!query || query.length < 5) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=vi`,
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            setCoords({ lat, lng });
            if (mapInstanceRef.current && markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
              mapInstanceRef.current.setView([lat, lng], 16);
            }
          }
        }
      } catch {
        // Bỏ qua nếu không tìm thấy
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [address]);

  // Step 2: Tiện nghi (Tải động từ MongoDB Atlas)
  const [availableAmenities, setAvailableAmenities] = useState([]);
  const [amenities, setAmenities] = useState([
    "Bể Bơi",
    "Bãi để xe",
    "Wi-Fi [miễn phí]",
    "máy điều hòa",
  ]);

  // Step 3: Thiết lập các phòng (Mỗi phòng bao gồm tên, giường, giá và ảnh kèm theo)
  const [bedTypes, setBedTypes] = useState([]);
  const [rooms, setRooms] = useState([
    {
      id: 1,
      name: "Phòng Deluxe Giường Đôi",
      price: "200000",
      photos: [],
      beds: [{ id: 1, bedType: "Queen Bed", bedCount: 2 }],
    },
  ]);

  const updateRoom = (roomId, field, value) => {
    setRooms(
      rooms.map((r) => (r.id === roomId ? { ...r, [field]: value } : r)),
    );
  };

  const removeRoom = (roomId) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((r) => r.id !== roomId));
  };

  const [photoUploads, setPhotoUploads] = useState(0);

  const addNewRoom = () => {
    const newRoomId = Date.now();

    setRooms([
      ...rooms,
      {
        id: newRoomId,
        name: `Phòng Tiêu chuẩn ${rooms.length + 1}`,
        price: "200000",
        photos: [],
        beds: [
          {
            id: newRoomId + 1,
            bedType: "Single Bed",
            bedCount: 1,
          },
        ],
      },
    ]);
  };

  const updateRoomBed = (roomId, bedId, field, value) => {
    setRooms(
      rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              beds: r.beds.map((b) =>
                b.id === bedId ? { ...b, [field]: value } : b,
              ),
            }
          : r,
      ),
    );
  };

  const addBedToRoom = (roomId) => {
    setRooms(
      rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              beds: [
                ...r.beds,
                { id: Date.now(), bedType: "Single Bed", bedCount: 1 },
              ],
            }
          : r,
      ),
    );
  };

  const removeBedFromRoom = (roomId, bedId) => {
    setRooms(
      rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              beds: r.beds.filter((b) => b.id !== bedId),
            }
          : r,
      ),
    );
  };

  const [openBedDropdownKey, setOpenBedDropdownKey] = useState(null);
  const [hasCommonAreaBed, setHasCommonAreaBed] = useState(false);
  const [commonAreaBeds, setCommonAreaBeds] = useState([
    { id: 101, bedType: "Sofa Bed", bedCount: 1 },
  ]);
  const [bathrooms, setBathrooms] = useState(1);

  // useEffect tải danh mục loại giường và tiện ích từ DB khi tải trang
  useEffect(() => {
    let isMounted = true;

    // Tải danh mục loại giường chuẩn từ Database
    fetch("/api/categories/bed-types")
      .then((res) => {
        if (!res.ok) throw new Error("Network error fetching bed types");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setBedTypes(data);
        }
      })
      .catch(() => {
        // Fallback danh mục mặc định
      });

    // Tải danh mục tiện nghi cơ sở lưu trú từ Database
    const defaultFallbackAmenities = [
      { name: "Wi-Fi [miễn phí]", icon_url: "" },
      { name: "Bể Bơi", icon_url: "" },
      { name: "Bãi để xe", icon_url: "" },
      { name: "máy điều hòa", icon_url: "" },
      { name: "Lễ tân 24h", icon_url: "" },
      { name: "Nhà hàng", icon_url: "" },
      { name: "Phòng gym", icon_url: "" },
      { name: "Dịch vụ giặt ủi", icon_url: "" },
      { name: "Xe đưa đón sân bay", icon_url: "" },
      { name: "Bữa sáng miễn phí", icon_url: "" },
      { name: "Thang máy", icon_url: "" },
      { name: "Két sắt an toàn", icon_url: "" },
    ];

    fetch("/api/amenities?type=HOTEL_FACILITY")
      .then((res) => {
        if (!res.ok) throw new Error("Network error fetching amenities");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setAvailableAmenities(data);
          } else {
            setAvailableAmenities(defaultFallbackAmenities);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableAmenities(defaultFallbackAmenities);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const [serviceCapacity, setServiceCapacity] = useState(4); // Số khách tối đa cho phép
  const [priceManagementMethod, setPriceManagementMethod] = useState("manual"); // 'manual' | 'channel_manager'
  const [earliestCheckInType, setNearestCheckInType] = useState("immediate"); // 'immediate' | 'specific_date'
  const [earliestCheckInDate, setEarliestCheckInDate] = useState("");

  // Step 4: Giá, Khuyến mại & Doanh thu
  const [firstThreeBookingsPromo, setFirstThreeBookingsPromo] = useState(true);
  const [weeklyPromo, setWeeklyPromo] = useState(true);
  const [weeklyDiscount, setWeeklyDiscount] = useState("15");
  const [monthlyPromo, setMonthlyPromo] = useState(true);
  const [monthlyDiscount, setMonthlyDiscount] = useState("30");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [totalRooms, setTotalRooms] = useState("5");

  // Step 5: Thông tin chi tiết cơ sở lưu trú
  const [facilityName, setFacilityName] = useState(
    "Grand Tourane Hotel Danang",
  );
  const [description, setDescription] = useState(
    "Cho dù làm việc từ xa hay du lịch cùng gia đình, 1 Bed 1 Bath in Đà Nẵng là lựa chọn tuyệt vời để lưu trú tại Đà Nẵng. Từ chỗ nghỉ, quý khách có thể tận hưởng hết mọi điều sôi động tại thành phố sôi động này. Với vị trí thuận lợi, quý khách có thể dễ dàng đi đến mọi điểm du lịch không thể bỏ qua tại Đà Nẵng.",
  );
  const [facilitySize, setFacilitySize] = useState("");

  // Step 6: Hồ sơ đối tác
  const [hostType, setHostType] = useState("private"); // 'private' | 'professional'
  const existingAccount = currentUser?.role === "CUSTOMER";
  const [account, setAccount] = useState(() => ({ full_name: currentUser?.full_name || "", email: currentUser?.email || "", password: "", confirm_password: "", agree_terms: false }));
  const [accountErrors, setAccountErrors] = useState({});
  const nameParts = account.full_name.trim().split(/\s+/).filter(Boolean);
  const lastName = nameParts.length > 1 ? nameParts[0] : "";
  const firstName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "";
  const [nationality, setNationality] = useState("Việt Nam");
  const [birthDate, setBirthDate] = useState("1995-01-01");
  const [residenceCountry, setResidenceCountry] = useState("Việt Nam");
  const [province, setProvince] = useState("Đà Nẵng");
  const [cityResidence, setCityResidence] = useState("Đà Nẵng");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [countryCode, setCountryCode] = useState("+84");
  const [phone, setPhone] = useState(currentUser?.phone || "0912345678");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const toggleAmenity = (item) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((a) => a !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleNext = () => {
    if (loading || photoUploads > 0) return;
    setError("");
    if (currentStep === 1) {
      const invalid = validateAccountInformation(account, existingAccount);
      setAccountErrors(invalid);
      if (Object.keys(invalid).length) return;
    } else if (currentStep === 2) {
      if (!address.trim()) {
        setError("Vui lòng nhập địa chỉ của cơ sở lưu trú");
        return;
      }
    } else if (currentStep === 4) {
      if (!rooms || rooms.length === 0) {
        setError("Vui lòng thiết lập ít nhất 1 phòng");
        return;
      }
      const invalidRoom = rooms.find((r) => !r.price || Number(r.price) <= 0);
      if (invalidRoom) {
        setError(
          `Vui lòng nhập giá mỗi đêm hợp lệ cho "${invalidRoom.name || "phòng"}"`,
        );
        return;
      }
    } else if (currentStep === 5) {
      // BƯỚC 4: HÌNH ẢNH - Mỗi phòng bắt buộc phải có ít nhất 3 ảnh
      for (let i = 0; i < rooms.length; i++) {
        const r = rooms[i];
        const count = r.photos ? r.photos.length : 0;
        if (count < 3) {
          setError(
            `Vui lòng tải lên ít nhất 3 ảnh cho "${r.name || `Phòng ${i + 1}`}". Hiện tại phòng chỉ có ${count} ảnh.`,
          );
          return;
        }
      }
    } else if (currentStep === 7) {
      if (!facilityName.trim()) {
        setError("Vui lòng nhập tên cơ sở lưu trú / khách sạn");
        return;
      }
    } else if (currentStep === 8) {
      if (!phone.trim()) {
        setError("Vui lòng nhập số điện thoại liên hệ");
        return;
      }

    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    if (loading || photoUploads > 0) return;
    setError("");
    if (currentStep === 1) {
      navigate("/auth/register");
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = async () => {
    if (loading || photoUploads > 0) return;
    setError("");
    const invalid = validateAccountInformation(account, existingAccount);
    if (Object.keys(invalid).length) { setAccountErrors(invalid); setCurrentStep(1); return; }
    if (!agreeTerms) {
      setError(
        "Vui lòng đọc và chấp nhận các Điều khoản và Điều kiện để hoàn tất đăng tải cơ sở",
      );
      return;
    }
    setLoading(true);

    try {
      const finalAddress = address.trim();
      const addressParts = finalAddress
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const derivedCity =
        addressParts.length > 1
          ? addressParts[addressParts.length - 1]
          : finalAddress || "Việt Nam";
      const allPhotos = rooms.flatMap((r) => r.photos || []);

      const payload = {
        role_name: "HOTEL_OWNER",
        agree_terms: account.agree_terms,
        facility_name: facilityName.trim() || `Khách sạn tại ${derivedCity}`,
        facility_city: derivedCity,
        facility_address: finalAddress,
        facility_description:
          (description.trim() +
            (facilitySize ? ` (Diện tích: ${facilitySize} m²)` : "")) ||
          undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        facility_size: Number(facilitySize) || undefined,
        promotions: {
          first_three_bookings: firstThreeBookingsPromo,
          weekly_promo: weeklyPromo,
          weekly_discount: Number(weeklyDiscount) || 0,
          monthly_promo: monthlyPromo,
          monthly_discount: Number(monthlyDiscount) || 0,
        },
        payout_method: payoutMethod,
        check_in_policy: {
          price_management_method: priceManagementMethod,
          earliest_check_in_type: earliestCheckInType,
          earliest_check_in_date: earliestCheckInDate || null,
          total_rooms: Number(totalRooms) || 1,
        },
        host_type: hostType,
        nationality,
        birth_date: birthDate,
        residence_country: residenceCountry,
        province,
        city_residence: cityResidence,
        preferred_language: preferredLanguage,
        service_name: rooms[0]?.name || "Phòng Deluxe",
        service_price: Number(rooms[0]?.price) || 200000,
        service_capacity: Number(serviceCapacity) || 2,
        bathrooms: Number(bathrooms) || 1,
        rooms: rooms.map((r, i) => ({
          name: r.name || `Phòng ${i + 1}`,
          price: Number(r.price) || 0,
          photos: r.photos || [],
          beds: r.beds.map((bed) => ({
            bed_type: bed.bedType,
            count: Number(bed.bedCount) || 1,
          })),
        })),
        bedrooms: rooms.map((r, i) => ({
          bedroom_name: r.name || `Phòng ${i + 1}`,
          beds: r.beds.map((bed) => ({
            bed_type: bed.bedType,
            count: Number(bed.bedCount) || 1,
          })),
        })),
        photos: allPhotos,
        has_common_area_bed: Boolean(hasCommonAreaBed),
        common_area_beds: hasCommonAreaBed
          ? commonAreaBeds.map((bed) => ({
              bed_type: bed.bedType,
              count: Number(bed.bedCount) || 1,
            }))
          : [],
        amenities,
        phone: phone.trim(),
      };

      const result = currentUser
        ? await auth.becomePartner(payload)
        : await auth.register({
            ...payload,
            full_name: account.full_name.trim(),
            email: account.email.trim(),
            password: account.password,
            confirm_password: account.confirm_password,
          });
      if (result.status !== 'PENDING') throw new Error('Máy chủ chưa xác nhận trạng thái chờ xét duyệt.');
      navigate(PENDING_APPROVAL_PATH, { replace: true });
    } catch (err) {
      const fields = Object.fromEntries((err.errors || []).map(item => [item.field, item.message]));
      if (err.status === 409) fields.email = "Email này đã được đăng ký";
      if (["full_name", "email", "password", "confirm_password", "agree_terms"].some(key => fields[key])) { setAccountErrors(fields); setCurrentStep(1); }
      setError(
        err.message || "Đã xảy ra lỗi trong quá trình hoàn tất đăng ký.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (hasExistingFacility) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-body">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 max-w-lg w-full text-center shadow-lg space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <IconAlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-800">
            Tài khoản đã có cơ sở lưu trú
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Mỗi tài khoản đối tác hiện chỉ có thể đăng ký tối đa 1 cơ sở kinh doanh. Bạn có thể xem hồ sơ hoặc quản lý và cấu hình các loại phòng của cơ sở hiện tại.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate("/vendor/registration")}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Quản lý hồ sơ & phòng của tôi
            </button>
            <button
              onClick={() => navigate("/vendor")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              Về trang Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-body">
      {/* HEADER TOP NHƯ AGODA */}
      <header className="border-b border-border bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
              <IconHotel size={18} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-text-primary text-xl tracking-tight">
                travelio
              </span>
              <span className="text-xs bg-primary-50 text-primary-600 font-semibold px-2 py-0.5 rounded">
                Partner Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Lưu và thoát
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-border rounded text-xs text-text-primary">
              <span className="text-sm">🇻🇳</span>
              <span className="font-medium text-[11px]">VN</span>
            </div>
          </div>
        </div>
      </header>

      {/* BODY CHÍNH GỒM SIDEBAR BƯỚC + FORM BÊN PHẢI */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-12">
        {/* SIDEBAR BƯỚC BÊN TRÁI (BƯỚC 1 ĐẾN 8) */}
        <aside className="w-56 hidden md:block flex-shrink-0 pt-2">
          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
            {STEPS.map((s) => {
              const isActive = s.id === currentStep;
              const isCompleted = s.id < currentStep;
              return (
                <div
                  key={s.id}
                  onClick={() => !loading && photoUploads === 0 && s.id <= currentStep && setCurrentStep(s.id)}
                  className={`relative flex items-center gap-3 select-none cursor-pointer group`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 transition ${
                      isActive
                        ? "bg-primary-500 text-white ring-4 ring-primary-100"
                        : isCompleted
                          ? "bg-success-500 text-white"
                          : "bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400"
                    }`}
                  >
                    {isCompleted ? <IconCheck size={12} /> : s.id}
                  </div>
                  <div>
                    <span
                      className={`text-xs block font-semibold transition ${
                        isActive
                          ? "text-primary-600 font-bold"
                          : isCompleted
                            ? "text-text-primary"
                            : "text-slate-400"
                      }`}
                    >
                      {s.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                      {s.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* NỘI DUNG CỘT CHÍNH */}
        <main className="min-w-0 flex-1 max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-medium">
                Bước {currentStep}/{STEPS.length}
              </span>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-xs font-semibold text-primary-600 hover:underline"
              >
                Lưu và thoát
              </button>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-text-primary mt-1.5">
              {STEPS[currentStep - 1]?.name}
            </h1>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-danger-100 border border-danger-500/30 rounded-xl text-danger-500 text-xs" role="alert">
              {error}
            </div>
          )}



          <div role="progressbar" aria-label="Tiến trình đăng ký Hotel Owner" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={currentStep} className="mb-6 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${currentStep / STEPS.length * 100}%` }} /></div>
          {currentStep === 1 && <section className="space-y-5">
            <p className="text-sm text-slate-500">Nhập thông tin tài khoản trước khi thiết lập khách sạn. Tài khoản chỉ được tạo khi hoàn tất bước cuối và cần được Admin hoặc Manager xét duyệt.</p>
            <VendorAccountFields value={account} existingAccount={existingAccount} partnerLabel="Hotel Owner" errors={accountErrors} disabled={loading} onChange={(key, value) => { setAccount(previous => ({ ...previous, [key]: value })); setAccountErrors(previous => ({ ...previous, [key]: undefined })); }} />
          </section>}
          {/* BƯỚC 2: VỊ TRÍ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Địa chỉ của cơ sở lưu trú *
                </label>
                <div className="relative">
                  <IconMapPin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nhập địa chỉ đầy đủ (VD: 252 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng)..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5">
                  Nhập địa chỉ bên trên hoặc bấm trực tiếp vào một điểm trên bản
                  đồ (hoặc kéo thả ghim) để tự động đồng bộ địa chỉ.
                </p>
              </div>

              {/* BẢN ĐỒ TƯƠNG TÁC ĐỒNG BỘ 2 CHIỀU */}
              <div className="relative border border-border rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                <div
                  ref={mapContainerRef}
                  className="h-72 sm:h-96 w-full z-10 cursor-crosshair"
                />
                <div className="p-3 bg-white border-t border-border text-[11px] text-text-secondary flex items-center justify-between">
                  <span>
                    {isGeocoding
                      ? "Đang lấy địa chỉ từ vị trí bạn vừa chọn trên bản đồ..."
                      : `Địa điểm đang chọn (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}): `}
                    {!isGeocoding && (
                      <strong className="text-text-primary">{address}</strong>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: TIỆN NGHI (THEO ĐÚNG ẢNH MẪU AGODA) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-text-primary">
                  Những điều khách yêu thích
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Du khách ưu tiên các tiện nghi này khi đặt phòng lưu trú
                </p>
              </div>

              {/* Grid 4 cột các tiện nghi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {availableAmenities.map((item) => {
                  const amenityName =
                    typeof item === "string" ? item : item.name;
                  const iconUrl =
                    typeof item === "object" ? item.icon_url : null;
                  const isChecked = amenities.includes(amenityName);
                  return (
                    <div
                      key={amenityName}
                      onClick={() => toggleAmenity(amenityName)}
                      className={`h-28 rounded-2xl border cursor-pointer transition flex flex-col justify-between p-3.5 select-none ${
                        isChecked
                          ? "border-primary-500 bg-primary-50/50 shadow-sm ring-1 ring-primary-500/30 text-primary-950 font-semibold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-text-primary"
                      }`}
                    >
                      <div
                        className={
                          isChecked ? "text-primary-600" : "text-slate-600"
                        }
                      >
                        {renderAmenityIcon(iconUrl)}
                      </div>
                      <span className="text-xs font-medium leading-snug line-clamp-2">
                        {amenityName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hộp gợi ý màu xanh nhạt như ảnh mẫu */}
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-xs text-slate-700 leading-relaxed flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5">
                  i
                </div>
                <div>
                  Những cơ sở lưu trú có nhiều tiện nghi hơn thường nhận được
                  nhiều lượt xem hơn. Quý đối tác có thể thêm thông tin về cơ sở
                  vật chất vào trang thông tin của mình sau khi trang hoạt động.
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THIẾT LẬP PHÒNG & GIÁ CỦA BẠN (THEO ĐÚNG ẢNH MẪU AGODA) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              {/* Danh sách các phòng thiết lập */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                    Thiết lập thông tin các phòng
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Mỗi phòng có thể cấu hình loại giường, giá mỗi đêm và bộ ảnh
                    riêng biệt.
                  </p>
                </div>

                {rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="p-5 bg-[#f8f9fa] rounded-2xl border border-slate-200/80 space-y-4"
                  >
                    {/* Header phòng: Tiêu đề & Nút xóa phòng */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-base text-text-primary">
                          {room.name || `Phòng ${idx + 1}`}
                        </h4>
                      </div>
                      {rooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRoom(room.id)}
                          className="text-xs font-semibold text-danger-500 hover:underline flex items-center gap-1"
                        >
                          <IconX size={13} />
                          <span>Xóa phòng</span>
                        </button>
                      )}
                    </div>

                    {/* Tên phòng */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Tên phòng / Hạng phòng *
                      </label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) =>
                          updateRoom(room.id, "name", e.target.value)
                        }
                        placeholder="VD: Phòng Deluxe Giường Đôi"
                        className="w-full sm:w-80 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary-600"
                      />
                    </div>

                    {/* Thiết lập các loại giường trong phòng */}
                    <div className="pt-2 border-t border-slate-200/60 space-y-3">
                      <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider text-[11px]">
                        Loại giường trong phòng
                      </span>

                      <div className="space-y-3">
                        {room.beds.map((bed) => {
                          const dropdownKey = `room-${room.id}-bed-${bed.id}`;
                          const isDropdownOpen =
                            openBedDropdownKey === dropdownKey;
                          return (
                            <div
                              key={bed.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200"
                            >
                              {/* Custom Dropdown loại giường */}
                              <div className="w-full sm:w-64 relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenBedDropdownKey(
                                      isDropdownOpen ? null : dropdownKey,
                                    )
                                  }
                                  className={`w-full relative bg-white rounded-lg px-3 py-2 text-left flex items-center justify-between transition border ${
                                    isDropdownOpen
                                      ? "border-primary-600 ring-1 ring-primary-600/20"
                                      : "border-slate-300 hover:border-slate-400"
                                  }`}
                                >
                                  <span className="text-xs font-normal text-text-primary">
                                    {bed.bedType}
                                  </span>
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`transition-transform duration-150 ${
                                      isDropdownOpen
                                        ? "text-primary-600 rotate-180"
                                        : "text-primary-600"
                                    }`}
                                  >
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </button>

                                {isDropdownOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() =>
                                        setOpenBedDropdownKey(null)
                                      }
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.14)] border border-slate-100 z-30">
                                      <div className="relative max-h-60 overflow-y-auto py-1.5 z-10">
                                        {bedTypes.map((type) => {
                                          const isSelected =
                                            bed.bedType === type;
                                          return (
                                            <button
                                              key={type}
                                              type="button"
                                              onClick={() => {
                                                updateRoomBed(
                                                  room.id,
                                                  bed.id,
                                                  "bedType",
                                                  type,
                                                );
                                                setOpenBedDropdownKey(null);
                                              }}
                                              className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-slate-50 transition text-left"
                                            >
                                              <span
                                                className={`w-4 h-4 rounded-full flex-shrink-0 transition ${
                                                  isSelected
                                                    ? "border-[5px] border-primary-600 bg-white"
                                                    : "border-[1.5px] border-slate-300 bg-white"
                                                }`}
                                              />
                                              <span className="text-xs text-slate-800">
                                                {type}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Tăng giảm số lượng giường */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                <span className="text-xs text-text-secondary font-medium">
                                  Số lượng:
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCount = Math.max(
                                        1,
                                        bed.bedCount - 1,
                                      );
                                      updateRoomBed(
                                        room.id,
                                        bed.id,
                                        "bedCount",
                                        nextCount,
                                      );
                                    }}
                                    className="w-7 h-7 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                                  >
                                    <span className="text-sm font-bold leading-none">
                                      −
                                    </span>
                                  </button>
                                  <span className="text-sm font-semibold text-text-primary w-5 text-center">
                                    {bed.bedCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateRoomBed(
                                        room.id,
                                        bed.id,
                                        "bedCount",
                                        bed.bedCount + 1,
                                      );
                                    }}
                                    className="w-7 h-7 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                                  >
                                    <span className="text-sm font-bold leading-none">
                                      +
                                    </span>
                                  </button>

                                  {room.beds.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeBedFromRoom(room.id, bed.id)
                                      }
                                      className="ml-2 text-danger-500 hover:text-danger-700 text-xs"
                                      title="Xóa loại giường này"
                                    >
                                      <IconX size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => addBedToRoom(room.id)}
                        className="text-xs font-semibold text-primary-600 hover:underline inline-block mt-1"
                      >
                        + Thêm loại giường khác
                      </button>
                    </div>

                    {/* Phần Giá mỗi đêm của phòng */}
                    <div className="pt-3 border-t border-slate-200/60 space-y-2">
                      <label className="text-xs font-bold text-slate-600 block">
                        Giá mỗi đêm của phòng này *
                      </label>
                      <div className="bg-white border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition max-w-xs">
                        <input
                          type="number"
                          min="0"
                          value={room.price}
                          onChange={(e) =>
                            updateRoom(room.id, "price", e.target.value)
                          }
                          placeholder="200000"
                          className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3"
                        />
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap select-none">
                          VND / đêm
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Nút Thêm phòng mới */}
                <button
                  type="button"
                  onClick={addNewRoom}
                  className="flex items-center gap-2 px-5 py-2.5 border border-primary-500 bg-primary-50/50 rounded-full text-xs font-semibold text-primary-600 hover:bg-primary-100/60 transition shadow-sm"
                >
                  <span className="text-base font-bold leading-none">+</span>
                  <span>Thêm phòng mới</span>
                </button>
              </div>

              {/* Loại giường có trong không gian chung (Toggle switch) */}
              <div className="py-3 border-b border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">
                    Loại giường có trong khu không gian chung
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasCommonAreaBed(!hasCommonAreaBed)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                      hasCommonAreaBed ? "bg-primary-500" : "bg-slate-400"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                        hasCommonAreaBed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {hasCommonAreaBed && (
                  <div className="p-5 bg-[#f8f9fa] rounded-2xl">
                    <div className="space-y-4 pb-4 border-b border-slate-200/80">
                      {commonAreaBeds.map((bed) => {
                        const dropdownKey = `common-bed-${bed.id}`;
                        const isDropdownOpen =
                          openBedDropdownKey === dropdownKey;
                        return (
                          <div
                            key={bed.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="w-full sm:w-72 relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenBedDropdownKey(
                                    isDropdownOpen ? null : dropdownKey,
                                  )
                                }
                                className={`w-full relative bg-[#f8f9fa] rounded-lg px-3.5 py-3 text-left flex items-center justify-between transition border ${
                                  isDropdownOpen
                                    ? "border-primary-600 ring-1 ring-primary-600/20"
                                    : "border-slate-300 hover:border-slate-400"
                                }`}
                              >
                                <span
                                  className={`absolute -top-2 left-2.5 px-1 bg-[#f8f9fa] text-[11px] font-medium leading-none transition ${
                                    isDropdownOpen
                                      ? "text-primary-600"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Loại giường
                                </span>
                                <span className="text-xs sm:text-[13px] font-normal text-text-primary">
                                  {bed.bedType}
                                </span>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`transition-transform duration-150 ${
                                    isDropdownOpen
                                      ? "text-primary-600 rotate-180"
                                      : "text-primary-600"
                                  }`}
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </button>

                              {isDropdownOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setOpenBedDropdownKey(null)}
                                  />
                                  <div className="absolute left-0 top-full mt-2.5 w-60 bg-white rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.14)] border border-slate-100 z-30">
                                    <div className="absolute -top-1.5 left-5 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-100" />
                                    <div className="relative max-h-72 overflow-y-auto py-2 z-10">
                                      {bedTypes.map((type) => {
                                        const isSelected = bed.bedType === type;
                                        return (
                                          <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                              setCommonAreaBeds(
                                                commonAreaBeds.map((item) =>
                                                  item.id === bed.id
                                                    ? { ...item, bedType: type }
                                                    : item,
                                                ),
                                              );
                                              setOpenBedDropdownKey(null);
                                            }}
                                            className="w-full px-4 py-2.5 flex items-center gap-3.5 hover:bg-slate-50 transition text-left"
                                          >
                                            <span
                                              className={`w-5 h-5 rounded-full flex-shrink-0 transition ${
                                                isSelected
                                                  ? "border-[6px] border-primary-600 bg-white"
                                                  : "border-[1.5px] border-slate-300 bg-white"
                                              }`}
                                            />
                                            <span className="text-xs sm:text-[13px] text-slate-800">
                                              {type}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-secondary font-medium">
                                Số lượng giường
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextCount = Math.max(
                                      1,
                                      bed.bedCount - 1,
                                    );
                                    setCommonAreaBeds(
                                      commonAreaBeds.map((item) =>
                                        item.id === bed.id
                                          ? { ...item, bedCount: nextCount }
                                          : item,
                                      ),
                                    );
                                  }}
                                  className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                                >
                                  <span className="text-base font-bold leading-none">
                                    −
                                  </span>
                                </button>
                                <span className="text-base font-semibold text-text-primary w-5 text-center">
                                  {bed.bedCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCommonAreaBeds(
                                      commonAreaBeds.map((item) =>
                                        item.id === bed.id
                                          ? {
                                              ...item,
                                              bedCount: item.bedCount + 1,
                                            }
                                          : item,
                                      ),
                                    );
                                  }}
                                  className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                                >
                                  <span className="text-base font-bold leading-none">
                                    +
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCommonAreaBeds([
                            ...commonAreaBeds,
                            {
                              id: Date.now(),
                              bedType: "Sofa Bed",
                              bedCount: 1,
                            },
                          ]);
                        }}
                        className="text-xs font-semibold text-primary-600 hover:underline"
                      >
                        Thêm loại giường
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phòng tắm (Stepper) */}
              <div className="flex items-center justify-between py-3 border-b border-border/60">
                <span className="text-sm font-bold text-text-primary">
                  Phòng tắm
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBathrooms(Math.max(1, bathrooms - 1))}
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                  >
                    <span className="text-base font-bold leading-none">−</span>
                  </button>
                  <span className="text-base font-semibold text-text-primary w-5 text-center">
                    {bathrooms}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBathrooms(bathrooms + 1)}
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                  >
                    <span className="text-base font-bold leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Số khách tối đa cho phép (Stepper) */}
              <div className="flex items-center justify-between py-3 border-b border-border/60">
                <span className="text-sm font-bold text-text-primary">
                  Số khách tối đa cho phép
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setServiceCapacity(Math.max(1, serviceCapacity - 1))
                    }
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                  >
                    <span className="text-base font-bold leading-none">−</span>
                  </button>
                  <span className="text-base font-semibold text-text-primary w-5 text-center">
                    {serviceCapacity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServiceCapacity(serviceCapacity + 1)}
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-primary-600 hover:border-primary-500 transition"
                  >
                    <span className="text-base font-bold leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Hộp thông tin mở bán lịch 365 ngày */}
              <div className="p-4 bg-[#eef4ff] rounded-2xl text-xs text-[#0f489c] leading-relaxed flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0f489c] text-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5">
                  i
                </div>
                <div>
                  Chúng tôi sẽ thiết lập{" "}
                  <strong>
                    trạng thái mở bán cho cơ sở lưu trú của quý đối tác trên
                    Lịch trong 365 ngày tới và áp dụng mức giá tối thiểu mỗi đêm
                    của quý đối tác.
                  </strong>{" "}
                  Quý đối tác có thể cập nhật giá và tình trạng phòng trống cho
                  các ngày khác trong Partner Portal sau khi hoàn tất trang
                  thông tin cơ sở lưu trú của mình.
                </div>
              </div>

              {/* Cách quý đối tác quản lý giá và tình trạng phòng trống */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-base sm:text-lg text-text-primary">
                  Cách quý đối tác quản lý giá và tình trạng phòng trống
                </h4>

                {/* Thiết lập giá thủ công duy nhất */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex-shrink-0 border-[6px] border-primary-600 bg-white" />
                      <span className="font-semibold text-xs sm:text-[13px] text-primary-600">
                        Thiết lập giá theo cách thủ công
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 pl-8 leading-relaxed">
                      Tự quản lý giá và tình trạng phòng trống cho mọi ngày,
                      đồng thời thiết lập ngày nhận phòng đầu tiên của khách.
                    </p>
                  </div>

                  <div className="pl-8 space-y-4 pt-1">
                    {/* Khung Ngày nhận phòng sớm nhất */}
                    <div className="p-5 bg-[#f8f9fa] rounded-2xl space-y-3.5">
                      <label className="text-xs font-bold text-slate-600 block">
                        Ngày nhận phòng sớm nhất tại cơ sở lưu trú của quý đối
                        tác
                      </label>

                      <button
                        type="button"
                        onClick={() => setNearestCheckInType("immediate")}
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex-shrink-0 transition ${
                            earliestCheckInType === "immediate"
                              ? "border-[6px] border-primary-600 bg-white"
                              : "border-[1.5px] border-slate-300 bg-white"
                          }`}
                        />
                        <span
                          className={`text-xs sm:text-[13px] font-semibold transition ${
                            earliestCheckInType === "immediate"
                              ? "text-primary-600"
                              : "text-text-primary"
                          }`}
                        >
                          Ngay khi cơ sở lưu trú được kích hoạt
                        </span>
                      </button>

                      <div className="space-y-2.5">
                        <button
                          type="button"
                          onClick={() => setNearestCheckInType("specific_date")}
                          className="w-full flex items-center gap-3 text-left"
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex-shrink-0 transition ${
                              earliestCheckInType === "specific_date"
                                ? "border-[6px] border-primary-600 bg-white"
                                : "border-[1.5px] border-slate-300 bg-white"
                            }`}
                          />
                          <span
                            className={`text-xs sm:text-[13px] font-semibold transition ${
                              earliestCheckInType === "specific_date"
                                ? "text-primary-600"
                                : "text-text-primary"
                            }`}
                          >
                            Vào ngày cụ thể
                          </span>
                        </button>

                        {earliestCheckInType === "specific_date" && (
                          <div className="pl-8">
                            <input
                              type="date"
                              value={earliestCheckInDate}
                              onChange={(e) =>
                                setEarliestCheckInDate(e.target.value)
                              }
                              className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 4: HÌNH ẢNH (TẢI ẢNH LÊN CLOUDINARY, TỐI THIỂU 3 ẢNH/PHÒNG) */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-text-primary">
                  Hình ảnh phòng nghỉ
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Hình ảnh chất lượng cao giúp tăng tỉ lệ đặt phòng. Quý đối tác vui lòng tải lên ít nhất 3 ảnh cho mỗi phòng đã thiết lập. Ảnh sẽ được lưu trữ trực tiếp trên hệ thống đám mây Cloudinary.
                </p>
              </div>

              <div className="space-y-6">
                {rooms.map((room, rIdx) => {
                  const photoCount = room.photos?.length || 0;
                  const isSatisfied = photoCount >= 3;

                  return (
                    <div
                      key={room.id}
                      className="p-5 bg-[#f8f9fa] rounded-2xl border border-slate-200/80 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="font-bold text-sm text-text-primary">
                            {room.name || `Phòng ${rIdx + 1}`}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {Number(room.price || 0).toLocaleString("vi-VN")} đ / đêm
                          </span>
                        </div>

                        {/* Huy hiệu kiểm tra số lượng ảnh */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                              isSatisfied
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isSatisfied ? (
                              <>
                                <IconCheck size={12} className="text-emerald-600" />
                                <span>Đã đạt yêu cầu ({photoCount} ảnh)</span>
                              </>
                            ) : (
                              <span>Cần thêm {3 - photoCount} ảnh nữa (Hiện có: {photoCount}/3)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Lưới ảnh */}
                      <ImageUpload
                        label="Hình ảnh phòng"
                        value={room.photos || []}
                        onChange={photos => setRooms(previous => previous.map(item => item.id === room.id ? { ...item, photos } : item))}
                        maxImages={10}
                        disabled={loading || photoUploads > 0}
                        onBusyChange={busy => setPhotoUploads(count => count + (busy ? 1 : -1))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BƯỚC 5: KHUYẾN MẠI & DOANH THU */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                  Chương trình khuyến mại & Doanh thu
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy tạo một chương trình khuyến mại khởi động để bắt đầu nhận
                  đơn đặt phòng
                </p>
              </div>

              {/* Hộp gợi ý xanh với icon bóng đèn */}
              <div className="p-4 bg-[#edf4ff] rounded-2xl text-xs text-[#0f489c] leading-relaxed flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1a66d2] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                  </svg>
                </div>
                <div>
                  Các trang thông tin cơ sở lưu trú mới áp dụng chương trình
                  khuyến mại cho 3 đơn đặt phòng đầu tiên có khả năng nhận được
                  đơn đặt phòng trong 30 ngày đầu cao gấp 1,7 lần.
                </div>
              </div>

              {/* Card 1: 3 đơn đặt phòng đầu tiên */}
              <div className="p-5 bg-[#f8f9fa] rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-sm text-text-primary">
                    3 đơn đặt phòng đầu tiên
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Giảm 33% cho 3 đơn đặt phòng hoàn tất đầu tiên để thu hút
                    khách
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFirstThreeBookingsPromo(!firstThreeBookingsPromo)
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 ${
                    firstThreeBookingsPromo ? "bg-[#1a66d2]" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                      firstThreeBookingsPromo
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  >
                    {firstThreeBookingsPromo && (
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
              <div className="p-5 bg-[#f8f9fa] rounded-2xl space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-text-primary">
                      Chương trình khuyến mại hằng tuần
                    </h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Áp dụng cho kỳ lưu trú từ 7 đêm trở lên
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWeeklyPromo(!weeklyPromo)}
                    className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 ${
                      weeklyPromo ? "bg-[#1a66d2]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                        weeklyPromo ? "translate-x-6" : "translate-x-0"
                      }`}
                    >
                      {weeklyPromo && (
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

                <div className="relative bg-white border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition">
                  <span className="absolute -top-2 left-2.5 px-1 bg-white text-[11px] font-medium leading-none text-slate-500">
                    Chiết khấu
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weeklyDiscount}
                    onChange={(e) => setWeeklyDiscount(e.target.value)}
                    disabled={!weeklyPromo}
                    className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500 font-medium select-none">
                    %
                  </span>
                </div>
              </div>

              {/* Card 3: Chương trình khuyến mại hằng tháng */}
              <div className="p-5 bg-[#f8f9fa] rounded-2xl space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-text-primary">
                      Chương trình khuyến mại hằng tháng
                    </h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Áp dụng cho kỳ lưu trú từ 28 đêm trở lên
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMonthlyPromo(!monthlyPromo)}
                    className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 ${
                      monthlyPromo ? "bg-[#1a66d2]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                        monthlyPromo ? "translate-x-6" : "translate-x-0"
                      }`}
                    >
                      {monthlyPromo && (
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

                <div className="relative bg-white border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition">
                  <span className="absolute -top-2 left-2.5 px-1 bg-white text-[11px] font-medium leading-none text-slate-500">
                    Chiết khấu
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={monthlyDiscount}
                    onChange={(e) => setMonthlyDiscount(e.target.value)}
                    disabled={!monthlyPromo}
                    className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500 font-medium select-none">
                    %
                  </span>
                </div>
              </div>

              {/* Chú thích điều kiện khuyến mại */}
              <p className="text-xs text-slate-500 leading-relaxed">
                Mỗi đơn đặt phòng chỉ có thể áp dụng một khuyến mại. Quý đối tác
                có thể quản lý các khuyến mại của mình vào bất cứ lúc nào.{" "}
                <span className="text-primary-600 font-medium cursor-pointer hover:underline">
                  Learn more
                </span>
              </p>

              {/* PHẦN CÁCH THỨC NHẬN DOANH THU */}
              <div className="pt-4 space-y-3">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-text-primary">
                    Cách thức nhận doanh thu
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Có thể cần thông tin bổ sung. Quý đối tác có thể thêm tài
                    khoản mới sau khi hoàn tất đăng trang thông tin cơ sở lưu
                    trú.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 border-[6px] border-primary-600 bg-white" />
                    <span className="font-semibold text-xs sm:text-[13px] text-primary-600">
                      Chuyển khoản ngân hàng
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 pl-8 leading-relaxed">
                    Nhận thanh toán trực tiếp vào tài khoản ngân hàng của quý
                    đối tác cho một nhóm các đơn đặt phòng. Các đơn đặt phòng sẽ
                    đủ điều kiện thanh toán sau 30 ngày kể từ ngày khách trả
                    phòng.
                  </p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed pt-2">
                  Lưu ý: Đợt thanh toán đầu tiên của quý đối tác sẽ được thực
                  hiện sau 30 ngày, kể từ ngày khách trả phòng của đơn đặt phòng
                  đầu tiên. Các đợt thanh toán trong tương lai sẽ được tự động
                  thực hiện sau 24 giờ, kể từ ngày trả phòng của từng khách.
                </p>
              </div>
            </div>
          )}

          {/* BƯỚC 6: THÔNG TIN CHI TIẾT CƠ SỞ LƯU TRÚ (THEO MẪU AGODA) */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fade-in">
              {/* Tên cơ sở lưu trú */}
              <div>
                <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                  Tên cơ sở lưu trú
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đây là tên khách hàng sẽ thấy và sử dụng để xác định cơ sở lưu
                  trú của quý đối tác. Đừng lo lắng, chúng tôi sẽ tạo các ngôn
                  ngữ khác bằng mẫu dịch chuẩn
                </p>

                <div className="mt-3.5">
                  <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white transition">
                    <label className="text-[10px] font-medium text-slate-500 block">
                      Tên cơ sở lưu trú
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="VD: Grand Tourane Hotel Danang"
                      className="w-full text-xs sm:text-sm text-text-primary bg-transparent focus:outline-none mt-0.5"
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1 pl-1">
                    {facilityName.length}/50
                  </div>
                </div>
              </div>

              <hr className="border-slate-200/80" />

              {/* Mô tả cơ sở lưu trú */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                    Mô tả cơ sở lưu trú
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Nêu bật các đặc điểm độc đáo và quyền lợi khi lưu trú tại cơ
                    sở lưu trú của quý đối tác để thu hút khách.
                  </p>
                </div>

                {/* Hộp gợi ý xanh với icon ngôi sao lấp lánh (Agoda style) */}
                <div className="p-4 bg-[#edf4ff] rounded-2xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1a66d2] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#0f489c] leading-snug">
                      Nội dung được tạo tự động
                    </h5>
                    <p className="text-xs text-[#0f489c] mt-0.5 leading-relaxed">
                      Thông tin chi tiết do Agoda tạo để tăng sức hấp dẫn cho cơ
                      sở lưu trú của quý đối tác. Được điều chỉnh khi cần thiết.
                    </p>
                  </div>
                </div>

                {/* Textarea mô tả */}
                <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white transition">
                  <label className="text-[10px] font-medium text-slate-500 block">
                    Mô tả cơ sở lưu trú
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs sm:text-sm text-text-primary bg-transparent focus:outline-none mt-1 resize-none leading-relaxed"
                  />
                </div>

                {/* Kích cỡ cơ sở lưu trú (không bắt buộc) */}
                <div className="relative rounded-xl border border-slate-300 px-3.5 py-3 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white transition flex items-center justify-between">
                  <input
                    type="number"
                    min="0"
                    value={facilitySize}
                    onChange={(e) => setFacilitySize(e.target.value)}
                    placeholder="Kích cỡ cơ sở lưu trú (không bắt buộc)"
                    className="w-full text-xs sm:text-sm text-text-primary bg-transparent focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap pl-2 select-none">
                    mét vuông
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 7: HỒ SƠ ĐỐI TÁC (THEO MẪU AGODA) */}
          {currentStep === 8 && (
            <div className="space-y-6 animate-fade-in">
              {/* Loại hình chủ nhà */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                    Loại hình chủ nhà
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Để tuân thủ với các cam kết của cơ quan quản lý người tiêu
                    dùng, chúng tôi cần thu thập thông tin này từ các đối tác.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setHostType("private")}
                    className="w-full flex items-start gap-3 text-left group"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 transition ${
                        hostType === "private"
                          ? "border-[6px] border-primary-600 bg-white"
                          : "border-[1.5px] border-slate-300 bg-white"
                      }`}
                    />
                    <div>
                      <span
                        className={`text-xs sm:text-[13px] font-semibold transition ${
                          hostType === "private"
                            ? "text-primary-600 font-bold"
                            : "text-text-primary"
                        }`}
                      >
                        Chủ nhà tư nhân
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Cho thuê vì sở thích hoặc để kiếm thêm thu nhập, không
                        phải là công việc kinh doanh chính của quý đối tác.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHostType("professional")}
                    className="w-full flex items-start gap-3 text-left group"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 transition ${
                        hostType === "professional"
                          ? "border-[6px] border-primary-600 bg-white"
                          : "border-[1.5px] border-slate-300 bg-white"
                      }`}
                    />
                    <div>
                      <span
                        className={`text-xs sm:text-[13px] font-semibold transition ${
                          hostType === "professional"
                            ? "text-primary-600 font-bold"
                            : "text-text-primary"
                        }`}
                      >
                        Chủ nhà chuyên nghiệp
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Cho thuê là một hoạt động kinh doanh chính hoặc là một
                        nguồn thu nhập đáng kể.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <hr className="border-slate-200/80" />

              {/* Thông tin chi tiết tài khoản */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                    Thông tin chi tiết tài khoản
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Vui lòng cung cấp tên hợp pháp đầy đủ của quý đối tác tại
                    đây để lập hợp đồng với Agoda. Chúng tôi sẽ liên hệ nếu cần
                    thêm thông tin để đăng cơ sở lưu trú của quý đối tác.
                  </p>
                </div>

                {/* Khung Thông tin cá nhân & Thông tin cư trú */}
                <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-slate-200/80 space-y-4">
                  <h5 className="font-bold text-xs sm:text-sm text-text-primary">
                    Thông tin cá nhân
                  </h5>

                  {/* Tên & Họ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Tên
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        readOnly
                        placeholder="quan"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Họ
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        readOnly
                        placeholder="Trần"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quốc tịch */}
                  <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                    <label className="text-[10px] font-medium text-slate-500 block">
                      Quốc tịch
                    </label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full text-xs text-text-primary bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="Việt Nam">Việt Nam</option>
                      <option value="Hoa Kỳ">Hoa Kỳ (Mỹ)</option>
                      <option value="Hàn Quốc">Hàn Quốc</option>
                      <option value="Nhật Bản">Nhật Bản</option>
                      <option value="Khác">Quốc gia khác</option>
                    </select>
                  </div>

                  {/* Ngày sinh */}
                  <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                    <label className="text-[10px] font-medium text-slate-500 block">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full text-xs text-text-primary bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Tiêu đề Thông tin cư trú */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="font-bold text-xs sm:text-sm text-text-primary">
                      Thông tin cư trú
                    </span>
                    <span
                      className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help"
                      title="Thông tin địa chỉ thường trú hợp pháp"
                    >
                      i
                    </span>
                  </div>

                  {/* Quốc gia */}
                  <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                    <label className="text-[10px] font-medium text-slate-500 block">
                      Quốc gia
                    </label>
                    <select
                      value={residenceCountry}
                      onChange={(e) => setResidenceCountry(e.target.value)}
                      className="w-full text-xs text-text-primary bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="Việt Nam">Việt Nam</option>
                      <option value="Hoa Kỳ">Hoa Kỳ</option>
                      <option value="Hàn Quốc">Hàn Quốc</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  {/* Bang hoặc Tỉnh & Thành phố */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Bang hoặc Tỉnh
                      </label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Đà Nẵng"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Thành phố
                      </label>
                      <input
                        type="text"
                        value={cityResidence}
                        onChange={(e) => setCityResidence(e.target.value)}
                        placeholder="Đà Nẵng"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin liên lạc chi tiết */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                    Thông tin liên lạc chi tiết
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Agoda sẽ liên hệ với quý đối tác bằng ngôn ngữ yêu thích của
                    quý đối tác và cung cấp số điện thoại cho khách sau khi họ
                    đặt phòng.
                  </p>
                </div>

                <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-slate-200/80 space-y-4">
                  {/* Ngôn ngữ yêu thích */}
                  <div className="relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                    <label className="text-[10px] font-medium text-slate-500 block">
                      Ngôn ngữ yêu thích
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full text-xs text-text-primary bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="Tiếng Việt">Tiếng Việt</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  {/* Mã quốc gia & Số điện thoại */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Mã quốc gia
                      </label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none cursor-pointer"
                      >
                        <option value="+84">+84 (Việt Nam)</option>
                        <option value="+1">+1 (Mỹ)</option>
                        <option value="+82">+82 (Hàn Quốc)</option>
                        <option value="+81">+81 (Nhật Bản)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 relative rounded-xl border border-slate-300 px-3.5 pt-2.5 pb-2 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 bg-white">
                      <label className="text-[10px] font-medium text-slate-500 block">
                        Số điện thoại *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Hộp Email (Agoda style) */}
                  <div className="p-3.5 bg-[#f0f4f9] rounded-xl border border-slate-200">
                    <span className="text-[10px] font-medium text-slate-500 block">
                      Email
                    </span>
                    {currentUser ? (
                      <span className="text-xs font-semibold text-text-primary block mt-0.5">
                        {account.email}
                      </span>
                    ) : (
                      <input
                        type="email"
                        value={account.email}
                        readOnly
                        placeholder="trantrungquan2904@gmail.com"
                        className="w-full text-xs text-text-primary bg-transparent focus:outline-none mt-0.5"
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-500">Thông tin tài khoản đã được nhập ở bước Account Information. Quay lại bước 1 để chỉnh sửa.</p>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 8: ĐĂNG TẢI (THEO MẪU AGODA) */}
          {currentStep === 9 && (
            <div className="space-y-6 animate-fade-in">
              {/* Thẻ xem trước cơ sở lưu trú */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-slate-200/80 flex items-center gap-4">
                {rooms.flatMap((r) => r.photos || [])[0] ? (
                  <img
                    src={rooms.flatMap((r) => r.photos || [])[0]}
                    alt={facilityName}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-200/80 text-slate-400 flex items-center justify-center flex-shrink-0">
                    <IconHotel size={28} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-base text-text-primary leading-snug">
                    {facilityName || "Chưa đặt tên cơ sở"}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <IconMapPin
                      size={13}
                      className="text-slate-400 flex-shrink-0"
                    />
                    <span>
                      {address || `${cityResidence}, ${province}`}
                    </span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200/80" />

              {/* Chấp nhận các Điều khoản và Điều kiện */}
              <div className="space-y-4">
                <h4 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                  Chấp nhận các Điều khoản và Điều kiện
                </h4>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-text-primary leading-relaxed">
                    Tôi công nhận rằng mình đã đọc và đồng ý với{" "}
                    <span className="text-primary-600 font-medium cursor-pointer hover:underline">
                      Điều khoản và Điều kiện
                    </span>{" "}
                    và{" "}
                    <span className="text-primary-600 font-medium cursor-pointer hover:underline">
                      Chính sách Quyền riêng tư
                    </span>{" "}
                    của Agoda. Ngoài ra, tôi xác nhận tuân theo tất cả{" "}
                    <span className="text-primary-600 font-medium cursor-pointer hover:underline">
                      điều lệ và luật pháp địa phương
                    </span>{" "}
                    liên quan.
                  </span>
                </label>

                <div className="text-[11px] text-slate-500 leading-relaxed space-y-1.5 pt-2">
                  <p>
                    Xin lưu ý, theo Đạo luật Dịch vụ số (DSA), trang thông tin
                    cơ sở lưu trú của quý đối tác trên Agoda sẽ không được hiển
                    thị cho khách hàng ở EU/EEA cho đến khi
                  </p>
                  <p className="pl-3">
                    1. quý đối tác cung cấp thông tin theo yêu cầu của DSA và
                  </p>
                  <p className="pl-3">
                    2. thông tin đó được xác thực. Quý đối tác sẽ có thể cung cấp
                    thông tin này cho Agoda trong Trung tâm Tuân thủ YCS từ tháng
                    11 năm 2024.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NÚT ĐIỀU HƯỚNG BOTTOM NHƯ AGODA */}
          <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading || photoUploads > 0}
              className="px-6 py-2.5 border border-border rounded-full text-xs font-semibold text-text-secondary hover:bg-slate-50 transition"
            >
              Quay trở lại
            </button>

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading || photoUploads > 0}
                className="px-8 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-full shadow-sm transition"
              >
                {currentStep === 1 ? "Continue" : "Tiếp theo"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !agreeTerms}
                className="px-8 py-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-xs font-semibold rounded-full shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý đăng..." : "Đăng tải"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
