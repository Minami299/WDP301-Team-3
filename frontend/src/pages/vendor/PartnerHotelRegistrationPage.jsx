import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
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
  IconCamera,
  IconShield,
  IconArrowRight
} from "../../components/Icons";

const STEPS = [
  { id: 1, name: "Vị trí", description: "Địa chỉ & Bản đồ" },
  { id: 2, name: "Tiện nghi", description: "Những điều khách yêu thích" },
  { id: 3, name: "Thiết lập phòng & giá của bạn", description: "Chi tiết phòng ngủ & giá" },
  { id: 4, name: "Giá", description: "Khuyến mại & Doanh thu" },
  { id: 5, name: "Ảnh", description: "Tải ảnh cơ sở" },
  { id: 6, name: "Chi tiết", description: "Mô tả & Quy định" },
  { id: 7, name: "Hồ sơ", description: "Thông tin liên hệ" },
  { id: 8, name: "Đăng", description: "Xem lại & Hoàn tất" },
];

const DEFAULT_BED_TYPES = [
  "Single Bed",
  "Semi Double-Bed",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Super King Bed",
  "Bunk Bed",
  "Sofa Bed",
  "Japanese Futon",
  "Male Capsule",
  "Female Capsule"
];

const DEFAULT_HOTEL_AMENITIES = [
  "Bể Bơi",
  "Bãi để xe",
  "Spa",
  "Xông khô",
  "Không hút thuốc",
  "Wi-Fi [miễn phí]",
  "Đưa đón sân bay",
  "Được phép đưa thú nuôi vào",
  "Phòng tập",
  "Khu vực hút thuốc",
  "Bàn tiếp tân [24 giờ]",
  "máy điều hòa",
  "Nhà hàng",
  "Câu lạc bộ đêm",
  "Tiện nghi cho khách khuyết tật"
];

const VIETNAM_LOCATIONS = {
  "Đà Nẵng": {
    "Quận Sơn Trà": [
      "Phường Phước Mỹ",
      "Phường An Hải Bắc",
      "Phường An Hải Đông",
      "Phường An Hải Tây",
      "Phường Mân Thái",
      "Phường Nại Hiên Đông",
      "Phường Thọ Quang"
    ],
    "Quận Hải Châu": [
      "Phường Hải Châu 1",
      "Phường Hải Châu 2",
      "Phường Thạch Thang",
      "Phường Thanh Bình",
      "Phường Thuận Phước",
      "Phường Hòa Cường Bắc",
      "Phường Hòa Cường Nam",
      "Phường Nam Dương",
      "Phường Phước Ninh",
      "Phường Bình Hiên",
      "Phường Bình Thuận"
    ],
    "Quận Ngũ Hành Sơn": [
      "Phường Mỹ An",
      "Phường Khuê Mỹ",
      "Phường Hòa Hải",
      "Phường Hòa Quý"
    ],
    "Quận Thanh Khê": [
      "Phường Vĩnh Trung",
      "Phường Tân Chính",
      "Phường Thạc Gián",
      "Phường Chính Gián",
      "Phường Tam Thuận",
      "Phường Xuân Hà",
      "Phường An Khê",
      "Phường Thanh Khê Đông",
      "Phường Thanh Khê Tây"
    ],
    "Quận Cẩm Lệ": [
      "Phường Khuê Trung",
      "Phường Hòa Thọ Đông",
      "Phường Hòa Thọ Tây",
      "Phường Hòa An",
      "Phường Hòa Phát",
      "Phường Hòa Xuân"
    ],
    "Quận Liên Chiểu": [
      "Phường Hòa Minh",
      "Phường Hòa Khánh Nam",
      "Phường Hòa Khánh Bắc",
      "Phường Hòa Hiệp Nam",
      "Phường Hòa Hiệp Bắc"
    ],
    "Huyện Hòa Vang": [
      "Xã Hòa Châu",
      "Xã Hòa Tiến",
      "Xã Hòa Phước",
      "Xã Hòa Phong",
      "Xã Hòa Khương",
      "Xã Hòa Nhơn",
      "Xã Hòa Bắc"
    ]
  },
  "Hà Nội": {
    "Quận Hoàn Kiếm": [
      "Phường Hàng Trống",
      "Phường Hàng Gai",
      "Phường Hàng Buồm",
      "Phường Hàng Bạc",
      "Phường Tràng Tiền",
      "Phường Lý Thái Tổ",
      "Phường Cửa Đông",
      "Phường Cửa Nam"
    ],
    "Quận Ba Đình": [
      "Phường Điện Biên",
      "Phường Đội Cấn",
      "Phường Giảng Võ",
      "Phường Kim Mã",
      "Phường Liễu Giai",
      "Phường Ngọc Hà",
      "Phường Trúc Bạch"
    ],
    "Quận Tây Hồ": [
      "Phường Quảng An",
      "Phường Nhật Tân",
      "Phường Tứ Liên",
      "Phường Xuân La",
      "Phường Yên Phụ",
      "Phường Thụy Khuê",
      "Phường Bưởi"
    ],
    "Quận Đống Đa": [
      "Phường Quốc Tử Giám",
      "Phường Văn Miếu",
      "Phường Ô Chợ Dừa",
      "Phường Láng Hạ",
      "Phường Cát Linh"
    ],
    "Quận Cầu Giấy": [
      "Phường Dịch Vọng",
      "Phường Dịch Vọng Hậu",
      "Phường Yên Hòa",
      "Phường Trung Hòa",
      "Phường Nghĩa Tân",
      "Phường Mai Dịch"
    ],
    "Quận Hai Bà Trưng": [
      "Phường Bách Khoa",
      "Phường Lê Đại Hành",
      "Phường Minh Khai",
      "Phường Thanh Nhàn"
    ],
    "Quận Nam Từ Liêm": [
      "Phường Mỹ Đình 1",
      "Phường Mỹ Đình 2",
      "Phường Mễ Trì",
      "Phường Trung Văn"
    ]
  },
  "TP. Hồ Chí Minh": {
    "Quận 1": [
      "Phường Bến Nghé",
      "Phường Bến Thành",
      "Phường Đa Kao",
      "Phường Tân Định",
      "Phường Phạm Ngũ Lão",
      "Phường Nguyễn Thái Bình",
      "Phường Cầu Ông Lãnh"
    ],
    "Quận 3": [
      "Phường Võ Thị Sáu",
      "Phường 1",
      "Phường 2",
      "Phường 3",
      "Phường 4",
      "Phường 5"
    ],
    "Thành phố Thủ Đức": [
      "Phường Thảo Điền",
      "Phường An Phú",
      "Phường Hiệp Phú",
      "Phường Linh Chiểu",
      "Phường Linh Trung"
    ],
    "Quận 7": [
      "Phường Tân Phong",
      "Phường Tân Phú",
      "Phường Phú Mỹ",
      "Phường Tân Hưng"
    ],
    "Quận Bình Thạnh": [
      "Phường 1",
      "Phường 2",
      "Phường 19",
      "Phường 22",
      "Phường 25"
    ],
    "Quận Phú Nhuận": [
      "Phường 1",
      "Phường 2",
      "Phường 7",
      "Phường 9"
    ]
  },
  "Khánh Hòa": {
    "Thành phố Nha Trang": [
      "Phường Lộc Thọ",
      "Phường Tân Lập",
      "Phường Vĩnh Nguyên",
      "Phường Vĩnh Hải",
      "Phường Vĩnh Hòa",
      "Phường Phước Hải"
    ],
    "Thành phố Cam Ranh": [
      "Phường Cam Nghĩa",
      "Phường Cam Phúc Bắc",
      "Xã Cam Hải Đông"
    ]
  },
  "Kiên Giang": {
    "Thành phố Phú Quốc": [
      "Phường Dương Đông",
      "Phường An Thới",
      "Xã Cửa Dương",
      "Xã Cửa Cạn",
      "Xã Gành Dầu",
      "Xã Dương Tơ",
      "Xã Hàm Ninh"
    ],
    "Thành phố Rạch Giá": [
      "Phường Vĩnh Thanh Vân",
      "Phường Vĩnh Bảo",
      "Phường An Hòa"
    ]
  },
  "Lâm Đồng": {
    "Thành phố Đà Lạt": [
      "Phường 1",
      "Phường 2",
      "Phường 3",
      "Phường 8",
      "Phường 9",
      "Phường 10",
      "Xã Tà Nung"
    ],
    "Thành phố Bảo Lộc": [
      "Phường 1",
      "Phường 2",
      "Phường B'Lao",
      "Xã Đam B'ri"
    ]
  },
  "Quảng Nam": {
    "Thành phố Hội An": [
      "Phường Minh An",
      "Phường Cẩm Phô",
      "Phường Sơn Phong",
      "Phường Cẩm An",
      "Phường Cửa Đại",
      "Xã Cẩm Thanh"
    ],
    "Thành phố Tam Kỳ": [
      "Phường An Mỹ",
      "Phường Tân Thạnh",
      "Phường Phước Hòa"
    ]
  },
  "Quảng Ninh": {
    "Thành phố Hạ Long": [
      "Phường Bãi Cháy",
      "Phường Hòn Gai",
      "Phường Tuần Châu",
      "Phường Hồng Gai"
    ],
    "Thành phố Cẩm Phả": [
      "Phường Cẩm Trung",
      "Phường Cẩm Thành"
    ]
  },
  "Bà Rịa - Vũng Tàu": {
    "Thành phố Vũng Tàu": [
      "Phường 1",
      "Phường 2",
      "Phường Thắng Tam",
      "Phường 8",
      "Phường Nguyễn An Ninh"
    ],
    "Thị xã Phú Mỹ": [
      "Phường Phú Mỹ",
      "Phường Tân Phước"
    ]
  },
  "Thừa Thiên Huế": {
    "Thành phố Huế": [
      "Phường Phú Hội",
      "Phường Phú Nhuận",
      "Phường Vĩnh Ninh",
      "Phường Thuận Lộc"
    ]
  },
  "Bình Thuận": {
    "Thành phố Phan Thiết": [
      "Phường Mũi Né",
      "Phường Hàm Tiến",
      "Phường Phú Hài",
      "Phường Đức Thắng"
    ]
  },
  "Ninh Bình": {
    "Thành phố Ninh Bình": [
      "Phường Ninh Khánh",
      "Phường Nam Thành"
    ],
    "Huyện Hoa Lư": [
      "Xã Ninh Hải",
      "Xã Ninh Xuân"
    ]
  },
  "Lào Cai": {
    "Thị xã Sa Pa": [
      "Phường Sa Pa",
      "Phường Hàm Rồng",
      "Phường Phan Si Păng",
      "Xã Tả Van"
    ]
  },
  "Cần Thơ": {
    "Quận Ninh Kiều": [
      "Phường Tân An",
      "Phường An Lạc",
      "Phường Cái Khế",
      "Phường Xuân Khánh"
    ]
  },
  "Hải Phòng": {
    "Quận Hồng Bàng": [
      "Phường Minh Khai",
      "Phường Hoàng Văn Thụ"
    ],
    "Huyện Cát Hải": [
      "Thị trấn Cát Bà",
      "Xã Trân Châu"
    ]
  }
};

const AMENITY_ICONS = {
  "Bể Bơi": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18c1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0 1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0" />
      <path d="M2 14c1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0 1.5 1.5 3.5 1.5 5 0 1.5-1.5 3.5-1.5 5 0" />
      <path d="M6 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="m14 10-4-2-2 3" />
    </svg>
  ),
  "Bãi để xe": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h3a2 2 0 0 1 0 4H4V4Z" />
      <path d="M4 8v12" />
      <rect width="14" height="8" x="7" y="12" rx="2" />
      <circle cx="10" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
    </svg>
  ),
  "Spa": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 3-4 6-4 6s-4-3-4-6a4 4 0 0 1 4-4Z" />
      <path d="M9 13a4.5 4.5 0 0 0-7 3.5A4.5 4.5 0 0 0 6.5 21c3.5 0 5.5-3 5.5-3" />
      <path d="M15 13a4.5 4.5 0 0 1 7 3.5 4.5 4.5 0 0 1-4.5 4.5c-3.5 0-5.5-3-5.5-3" />
    </svg>
  ),
  "Xông khô": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v8a3 3 0 0 0 3 3Z" />
      <path d="M16 6c1 1 1 2 0 3s-1 2 0 3" />
      <path d="M19 5c1 1 1 2 0 3s-1 2 0 3" />
    </svg>
  ),
  "Không hút thuốc": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18 8h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7" />
      <path d="M3 14h7V9H5a2 2 0 0 0-2 2v3Z" />
    </svg>
  ),
  "Wi-Fi [miễn phí]": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  ),
  "Đưa đón sân bay": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8h5l2 4v5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-5l2-4h5" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
      <path d="M10 2 8 6h5l2-4h-5Z" />
    </svg>
  ),
  "Được phép đưa thú nuôi vào": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="4" cy="8" r="2" />
      <path d="M9 10a5 5 0 0 1 7 0c2 2 2 5-1 7l-2.5 3-2.5-3c-3-2-3-5-1-7Z" />
    </svg>
  ),
  "Phòng tập": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 16-2.5-2.5-3.5 3.5 2.5 2.5a2 2 0 0 0 2.8 0l.7-.7a2 2 0 0 0 0-2.8Z" />
      <path d="m3 8 2.5 2.5 3.5-3.5L6.5 4.5a2 2 0 0 0-2.8 0l-.7.7a2 2 0 0 0 0 2.8Z" />
    </svg>
  ),
  "Khu vực hút thuốc": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 12h4" />
      <path d="M18 16h4" />
      <path d="M2 16h12a2 2 0 0 0 2-2v-4H2v6Z" />
    </svg>
  ),
  "Bàn tiếp tân [24 giờ]": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M3 21h18" />
    </svg>
  ),
  "máy điều hòa": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="m4.93 4.93 14.14 14.14" />
      <path d="M2 12h20" />
      <path d="m19.07 4.93-14.14 14.14" />
    </svg>
  ),
  "Nhà hàng": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2v20" />
      <path d="M6 2v7a3 3 0 0 0 6 0V2" />
      <path d="M9 12v10" />
    </svg>
  ),
  "Câu lạc bộ đêm": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  "Tiện nghi cho khách khuyết tật": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 8v5l3 2v4" />
      <path d="M8 17a5 5 0 1 0 5-5" />
    </svg>
  )
};

const getAmenityIcon = (name) => {
  return (
    AMENITY_ICONS[name] || (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  );
};

export default function PartnerHotelRegistrationPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const currentUser = auth?.currentUser;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1: Vị trí
  const [locationSearch, setLocationSearch] = useState("");
  const [streetAddress, setStreetAddress] = useState("252 Võ Nguyên Giáp");
  const [buildingInfo, setBuildingInfo] = useState("");
  const [cityProvince, setCityProvince] = useState("Đà Nẵng");
  const [district, setDistrict] = useState("Quận Sơn Trà");
  const [ward, setWard] = useState("Phường Phước Mỹ");

  const handleCityChange = (newCity) => {
    setCityProvince(newCity);
    setLocationSearch("");
    const availableDistricts = Object.keys(VIETNAM_LOCATIONS[newCity] || {});
    const defaultDistrict = availableDistricts[0] || "";
    setDistrict(defaultDistrict);
    const availableWards = (VIETNAM_LOCATIONS[newCity] && VIETNAM_LOCATIONS[newCity][defaultDistrict]) || [];
    setWard(availableWards[0] || "");
  };

  const handleDistrictChange = (newDistrict) => {
    setDistrict(newDistrict);
    setLocationSearch("");
    const availableWards = (VIETNAM_LOCATIONS[cityProvince] && VIETNAM_LOCATIONS[cityProvince][newDistrict]) || [];
    setWard(availableWards[0] || "");
  };

  const handleWardChange = (newWard) => {
    setWard(newWard);
    setLocationSearch("");
  };

  // Xây dựng địa chỉ đầy đủ từ các trường chi tiết hoặc ô tìm kiếm
  const composedAddress = [
    streetAddress.trim(),
    buildingInfo.trim(),
    ward.trim(),
    district.trim(),
    cityProvince.trim()
  ]
    .filter(Boolean)
    .join(", ");

  const fullAddressQuery =
    locationSearch.trim() || composedAddress || "Đà Nẵng, Việt Nam";
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddressQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // Step 2: Tiện nghi (Tải động từ MongoDB Atlas)
  const [availableAmenities, setAvailableAmenities] = useState(DEFAULT_HOTEL_AMENITIES);
  const [amenities, setAmenities] = useState([
    "Bể Bơi",
    "Bãi để xe",
    "Wi-Fi [miễn phí]",
    "máy điều hòa"
  ]);

  // Step 3: Thiết lập phòng & giá của bạn (Loại giường tải động từ MongoDB Atlas)
  const [bedTypes, setBedTypes] = useState(DEFAULT_BED_TYPES);
  const [roomName, setRoomName] = useState("Phòng Deluxe Giường Đôi");
  const [bedrooms, setBedrooms] = useState([
    {
      id: 1,
      beds: [{ id: 1, bedType: "Queen Bed", bedCount: 2 }]
    }
  ]);
  const [openBedDropdownKey, setOpenBedDropdownKey] = useState(null);
  const [hasCommonAreaBed, setHasCommonAreaBed] = useState(false);
  const [commonAreaBeds, setCommonAreaBeds] = useState([
    { id: 101, bedType: "Sofa Bed", bedCount: 1 }
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
    fetch("/api/amenities?type=HOTEL_FACILITY")
      .then((res) => {
        if (!res.ok) throw new Error("Network error fetching amenities");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const names = data.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean);
          if (names.length > 0) {
            setAvailableAmenities(names);
          }
        }
      })
      .catch(() => {
        // Fallback danh mục mặc định
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
  const [servicePrice, setServicePrice] = useState("200000");
  const [totalRooms, setTotalRooms] = useState("5");

  // Step 5: Ảnh
  const [photos, setPhotos] = useState([
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"
  ]);

  // Step 6: Chi tiết & Mô tả
  const [facilityName, setFacilityName] = useState("Grand Tourane Hotel Danang");
  const [description, setDescription] = useState(
    "Khách sạn view biển cao cấp với đầy đủ tiện nghi hiện đại, phục vụ bữa sáng buffet miễn phí."
  );

  // Step 7: Hồ sơ đối tác
  const [phone, setPhone] = useState(currentUser?.phone || "0912345678");
  const [fullName, setFullName] = useState(currentUser?.full_name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");

  const toggleAmenity = (item) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((a) => a !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleNext = () => {
    setError("");
    if (currentStep === 1) {
      if (!streetAddress.trim()) {
        setError("Vui lòng nhập số nhà, tên đường của cơ sở lưu trú");
        return;
      }
      if (!cityProvince.trim()) {
        setError("Vui lòng nhập Tỉnh / Thành phố");
        return;
      }
    } else if (currentStep === 7) {
      if (!phone.trim()) {
        setError("Vui lòng nhập số điện thoại liên hệ");
        return;
      }
      if (!currentUser) {
        if (!fullName.trim() || !email.trim() || !password) {
          setError("Vui lòng điền đầy đủ họ tên, email và mật khẩu tài khoản");
          return;
        }
        if (password.length < 8) {
          setError("Mật khẩu tài khoản phải tối thiểu 8 ký tự");
          return;
        }
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 8));
  };

  const handleBack = () => {
    setError("");
    if (currentStep === 1) {
      navigate("/");
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const derivedCity = cityProvince.trim() || "Việt Nam";
      const finalAddress = composedAddress || locationSearch.trim();

      const payload = {
        role_name: "HOTEL_OWNER",
        facility_name: facilityName.trim() || `Khách sạn tại ${derivedCity}`,
        facility_city: derivedCity,
        facility_address: finalAddress,
        facility_description: description.trim() || undefined,
        service_name: roomName.trim(),
        service_price: Number(servicePrice),
        service_capacity: Number(serviceCapacity) || 2,
        bathrooms: Number(bathrooms) || 1,
        bedrooms: bedrooms.map((b, i) => ({
          bedroom_name: `Phòng ngủ ${i + 1}`,
          beds: b.beds.map((bed) => ({
            bed_type: bed.bedType,
            count: Number(bed.bedCount) || 1
          }))
        })),
        has_common_area_bed: Boolean(hasCommonAreaBed),
        common_area_beds: hasCommonAreaBed
          ? commonAreaBeds.map((bed) => ({
              bed_type: bed.bedType,
              count: Number(bed.bedCount) || 1
            }))
          : [],
        amenities,
        phone: phone.trim()
      };

      if (currentUser) {
        if (auth?.becomePartner) {
          await auth.becomePartner(payload);
        }
      } else {
        if (auth?.register) {
          await auth.register({
            ...payload,
            full_name: fullName.trim(),
            email: email.trim(),
            password
          });
        }
      }

      setSuccessMsg("Đăng ký cơ sở lưu trú thành công! Đang chuyển đến Kênh quản trị đối tác...");
      setTimeout(() => {
        navigate("/vendor");
      }, 1500);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi trong quá trình hoàn tất đăng ký.");
    } finally {
      setLoading(false);
    }
  };

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
              <span className="font-heading font-extrabold text-text-primary text-xl tracking-tight">travelio</span>
              <span className="text-xs bg-primary-50 text-primary-600 font-semibold px-2 py-0.5 rounded">Partner Hub</span>
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
                  onClick={() => s.id <= currentStep && setCurrentStep(s.id)}
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
        <main className="flex-1 max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-medium">
                Bước {currentStep}/8
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
            <div className="mb-5 p-3.5 bg-danger-100 border border-danger-500/30 rounded-xl text-danger-500 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-success-100 border border-success-500/30 rounded-xl text-success-700 text-xs flex items-center gap-2 font-medium">
              <IconCheck size={16} />
              {successMsg}
            </div>
          )}

          {/* BƯỚC 1: VỊ TRÍ (NHƯ ẢNH MẪU AGODA) */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Tìm vị trí của cơ sở lưu trú
                </label>
                <div className="relative">
                  <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Tìm theo địa chỉ, tên đường hoặc địa danh..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-full text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-500 shadow-sm"
                  />
                </div>
              </div>

              {/* CÁC TRƯỜNG ĐỊA CHỈ CHI TIẾT: ĐƯỜNG, PHƯỜNG/XÃ, QUẬN/HUYỆN, TỈNH/THÀNH PHỐ, QUỐC GIA */}
              <div className="p-5 bg-slate-50/70 border border-border rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                      Số nhà, tên đường *
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => {
                        setStreetAddress(e.target.value);
                        setLocationSearch("");
                      }}
                      placeholder="VD: 252 Võ Nguyên Giáp"
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                      Tòa nhà / Tầng / Căn hộ (Không bắt buộc)
                    </label>
                    <input
                      type="text"
                      value={buildingInfo}
                      onChange={(e) => {
                        setBuildingInfo(e.target.value);
                        setLocationSearch("");
                      }}
                      placeholder="VD: Khu B, Tầng 5"
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                      Tỉnh / Thành phố *
                    </label>
                    <select
                      value={cityProvince}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500 cursor-pointer shadow-sm"
                    >
                      {Object.keys(VIETNAM_LOCATIONS).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                      Quận / Huyện *
                    </label>
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500 cursor-pointer shadow-sm"
                    >
                      {(Object.keys(VIETNAM_LOCATIONS[cityProvince] || {})).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                      Phường / Xã *
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => handleWardChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500 cursor-pointer shadow-sm"
                    >
                      {((VIETNAM_LOCATIONS[cityProvince] && VIETNAM_LOCATIONS[cityProvince][district]) || []).map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-text-secondary flex items-center justify-between">
                  <span>
                    Địa chỉ đầy đủ trên bản đồ: <strong className="text-text-primary">{fullAddressQuery}</strong>
                  </span>
                </div>
              </div>

              {/* BẢN ĐỒ TỰ ĐỘNG DI CHUYỂN THEO ĐỊA CHỈ TÌM KIẾM HOẶC PING */}
              <div className="relative border border-border rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                <div className="h-72 sm:h-96 w-full bg-[#E5E3DF] relative flex items-center justify-center">
                  <iframe
                    title="google-map"
                    key={mapEmbedUrl}
                    src={mapEmbedUrl}
                    className="w-full h-full border-0 pointer-events-auto"
                    loading="lazy"
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-10">
                    <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white animate-bounce">
                      <IconMapPin size={18} />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-white border-t border-border text-[11px] text-text-secondary flex items-center justify-between">
                  <span>Đây có phải là vị trí chính xác của cơ sở lưu trú không? Chỉnh sửa các trường địa chỉ hoặc ô tìm kiếm phía trên để định vị lại trên bản đồ.</span>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: TIỆN NGHI (THEO ĐÚNG ẢNH MẪU AGODA) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-text-primary">Những điều khách yêu thích</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Du khách ưu tiên các tiện nghi này khi đặt phòng lưu trú
                </p>
              </div>

              {/* Grid 4 cột các tiện nghi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {availableAmenities.map((amenityName) => {
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
                      <div className={isChecked ? "text-primary-600" : "text-slate-600"}>
                        {getAmenityIcon(amenityName)}
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
                  Những cơ sở lưu trú có nhiều tiện nghi hơn thường nhận được nhiều lượt xem hơn. Quý đối tác có thể thêm thông tin về cơ sở vật chất vào trang thông tin của mình sau khi trang hoạt động.
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THIẾT LẬP PHÒNG & GIÁ CỦA BẠN (THEO ĐÚNG ẢNH MẪU AGODA) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              {/* Khối Phòng ngủ 1, 2... */}
              <div className="space-y-5">
                {bedrooms.map((bedroom, idx) => (
                  <div key={bedroom.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-text-primary">
                        Phòng ngủ {idx + 1}
                      </h4>
                      {bedrooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setBedrooms(bedrooms.filter((b) => b.id !== bedroom.id))
                          }
                          className="text-xs font-semibold text-danger-500 hover:underline"
                        >
                          Xóa phòng ngủ
                        </button>
                      )}
                    </div>

                    <div className="p-5 bg-[#f8f9fa] rounded-2xl">
                      <div className="space-y-4 pb-4 border-b border-slate-200/80">
                        {bedroom.beds.map((bed) => {
                          const dropdownKey = `bedroom-${bedroom.id}-bed-${bed.id}`;
                          const isDropdownOpen = openBedDropdownKey === dropdownKey;
                          return (
                            <div
                              key={bed.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              {/* Custom Dropdown loại giường */}
                              <div className="w-full sm:w-72 relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenBedDropdownKey(
                                      isDropdownOpen ? null : dropdownKey
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

                                {/* Menu xổ xuống với Radio Button và thanh cuộn */}
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
                                                setBedrooms(
                                                  bedrooms.map((b) =>
                                                    b.id === bedroom.id
                                                      ? {
                                                          ...b,
                                                          beds: b.beds.map((item) =>
                                                            item.id === bed.id
                                                              ? { ...item, bedType: type }
                                                              : item
                                                          )
                                                        }
                                                      : b
                                                  )
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

                              {/* Tăng giảm số lượng giường */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-text-secondary font-medium">
                                  Số lượng giường
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCount = Math.max(1, bed.bedCount - 1);
                                      setBedrooms(
                                        bedrooms.map((b) =>
                                          b.id === bedroom.id
                                            ? {
                                                ...b,
                                                beds: b.beds.map((item) =>
                                                  item.id === bed.id
                                                    ? { ...item, bedCount: nextCount }
                                                    : item
                                                )
                                              }
                                            : b
                                        )
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
                                      setBedrooms(
                                        bedrooms.map((b) =>
                                          b.id === bedroom.id
                                            ? {
                                                ...b,
                                                beds: b.beds.map((item) =>
                                                  item.id === bed.id
                                                    ? {
                                                        ...item,
                                                        bedCount: item.bedCount + 1
                                                      }
                                                    : item
                                                )
                                              }
                                            : b
                                        )
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

                      {/* Nút Thêm loại giường bên dưới đường kẻ ngang */}
                      <div className="pt-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBedrooms(
                              bedrooms.map((b) =>
                                b.id === bedroom.id
                                  ? {
                                      ...b,
                                      beds: [
                                        ...b.beds,
                                        {
                                          id: Date.now(),
                                          bedType: "Single Bed",
                                          bedCount: 1
                                        }
                                      ]
                                    }
                                  : b
                              )
                            );
                          }}
                          className="text-xs font-semibold text-primary-600 hover:underline"
                        >
                          Thêm loại giường
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Nút thêm phòng ngủ */}
                <button
                  type="button"
                  onClick={() => {
                    const newBedroomId = Date.now();
                    setBedrooms([
                      ...bedrooms,
                      {
                        id: newBedroomId,
                        beds: [
                          {
                            id: newBedroomId + 1,
                            bedType: "Single Bed",
                            bedCount: 1
                          }
                        ]
                      }
                    ]);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-full text-xs font-semibold text-primary-600 hover:bg-slate-50 transition"
                >
                  <span className="text-base font-bold leading-none">+</span>
                  <span>Thêm phòng ngủ</span>
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
                        const isDropdownOpen = openBedDropdownKey === dropdownKey;
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
                                    isDropdownOpen ? null : dropdownKey
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
                                                    : item
                                                )
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
                                    const nextCount = Math.max(1, bed.bedCount - 1);
                                    setCommonAreaBeds(
                                      commonAreaBeds.map((item) =>
                                        item.id === bed.id
                                          ? { ...item, bedCount: nextCount }
                                          : item
                                      )
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
                                          ? { ...item, bedCount: item.bedCount + 1 }
                                          : item
                                      )
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
                              bedCount: 1
                            }
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
                <span className="text-sm font-bold text-text-primary">Phòng tắm</span>
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
                    onClick={() => setServiceCapacity(Math.max(1, serviceCapacity - 1))}
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
                  Chúng tôi sẽ thiết lập <strong>trạng thái mở bán cho cơ sở lưu trú của quý đối tác trên Lịch trong 365 ngày tới và áp dụng mức giá tối thiểu mỗi đêm của quý đối tác.</strong> Quý đối tác có thể cập nhật giá và tình trạng phòng trống cho các ngày khác trong Partner Portal sau khi hoàn tất trang thông tin cơ sở lưu trú của mình.
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
                      Tự quản lý giá và tình trạng phòng trống cho mọi ngày, đồng thời thiết lập ngày nhận phòng đầu tiên của khách.
                    </p>
                  </div>

                  <div className="pl-8 space-y-4 pt-1">
                    {/* Khung Giá mỗi đêm */}
                    <div className="p-5 bg-[#f8f9fa] rounded-2xl space-y-2.5">
                      <label className="text-xs font-bold text-slate-600 block">
                        Giá mỗi đêm
                      </label>
                      <div className="bg-[#f8f9fa] border border-slate-300 focus-within:border-primary-600 rounded-lg px-3.5 py-2.5 flex items-center justify-between transition">
                        <input
                          type="number"
                          min="0"
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          placeholder="200000"
                          className="w-full bg-transparent text-xs sm:text-[13px] text-text-primary focus:outline-none pr-3"
                        />
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap select-none">
                          VND / đêm
                        </span>
                      </div>
                    </div>

                    {/* Khung Ngày nhận phòng sớm nhất */}
                    <div className="p-5 bg-[#f8f9fa] rounded-2xl space-y-3.5">
                      <label className="text-xs font-bold text-slate-600 block">
                        Ngày nhận phòng sớm nhất tại cơ sở lưu trú của quý đối tác
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

          {/* BƯỚC 4: GIÁ (KHUYẾN MẠI & DOANH THU) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-text-primary leading-snug">
                  Hãy tạo một chương trình khuyến mại khởi động để bắt đầu nhận đơn đặt phòng
                </h3>
              </div>

              {/* Hộp gợi ý xanh với icon bóng đèn */}
              <div className="p-4 bg-[#edf4ff] rounded-2xl text-xs text-[#0f489c] leading-relaxed flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1a66d2] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                  </svg>
                </div>
                <div>
                  Các trang thông tin cơ sở lưu trú mới áp dụng chương trình khuyến mại cho 3 đơn đặt phòng đầu tiên có khả năng nhận được đơn đặt phòng trong 30 ngày đầu cao gấp 1,7 lần.
                </div>
              </div>

              {/* Card 1: 3 đơn đặt phòng đầu tiên */}
              <div className="p-5 bg-[#f8f9fa] rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-text-primary">
                    3 đơn đặt phòng đầu tiên
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Giảm 33% cho 3 đơn đặt phòng hoàn tất đầu tiên để thu hút khách
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFirstThreeBookingsPromo(!firstThreeBookingsPromo)}
                  className={`w-12 h-6 flex items-center rounded-full p-0.5 transition duration-200 ease-in-out flex-shrink-0 ${
                    firstThreeBookingsPromo ? "bg-[#1a66d2]" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow flex items-center justify-center transform transition duration-200 ease-in-out ${
                      firstThreeBookingsPromo ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {firstThreeBookingsPromo && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a66d2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <h4 className="font-bold text-sm text-text-primary">
                      Chương trình khuyến mại hằng tuần
                    </h4>
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
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a66d2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <h4 className="font-bold text-sm text-text-primary">
                      Chương trình khuyến mại hằng tháng
                    </h4>
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
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a66d2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
                Mỗi đơn đặt phòng chỉ có thể áp dụng một khuyến mại. Quý đối tác có thể quản lý các khuyến mại của mình vào bất cứ lúc nào.{" "}
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
                    Có thể cần thông tin bổ sung. Quý đối tác có thể thêm tài khoản mới sau khi hoàn tất đăng trang thông tin cơ sở lưu trú.
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
                    Nhận thanh toán trực tiếp vào tài khoản ngân hàng của quý đối tác cho một nhóm các đơn đặt phòng. Các đơn đặt phòng sẽ đủ điều kiện thanh toán sau 30 ngày kể từ ngày khách trả phòng.
                  </p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed pt-2">
                  Lưu ý: Đợt thanh toán đầu tiên của quý đối tác sẽ được thực hiện sau 30 ngày, kể từ ngày khách trả phòng của đơn đặt phòng đầu tiên. Các đợt thanh toán trong tương lai sẽ được tự động thực hiện sau 24 giờ, kể từ ngày trả phòng của từng khách.
                </p>
              </div>
            </div>
          )}

          {/* BƯỚC 5: ẢNH */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-text-secondary">
                Ảnh chất lượng cao giúp tăng tỉ lệ khách đặt phòng lên tới 40%.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((src, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border group">
                    <img src={src} alt="Room" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                ))}
                <div className="aspect-video rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/20 transition">
                  <IconCamera size={20} className="text-slate-400 mb-1" />
                  <span className="text-[11px] font-semibold text-primary-600">Thêm ảnh</span>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 6: CHI TIẾT */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Tên cơ sở lưu trú / Khách sạn *
                </label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="VD: Grand Tourane Hotel Danang"
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Tên hạng phòng thiết lập *
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="VD: Phòng Deluxe Giường Đôi"
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Mô tả cơ sở lưu trú và điểm nổi bật
                </label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Giới thiệu vị trí, view biển, các tiện nghi cao cấp..."
                  className="w-full p-3.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* BƯỚC 7: HỒ SƠ ĐỐI TÁC */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Số điện thoại Hotline / Quản lý *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary-500"
                />
              </div>

              {!currentUser && (
                <div className="border border-border rounded-2xl p-4 space-y-3 bg-slate-50/50 mt-4">
                  <div className="text-xs font-bold text-text-primary uppercase tracking-wide">
                    Tạo tài khoản đối tác Travelio *
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-primary mb-1 block">Họ và tên *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-primary mb-1 block">Email đăng nhập *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hotel@example.com"
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-text-primary mb-1 block">Mật khẩu *</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 8: ĐĂNG & HOÀN TẤT */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-2">
                <h4 className="font-bold text-sm text-text-primary">Tóm tắt thông tin cơ sở</h4>
                <div className="text-xs text-text-secondary space-y-1">
                  <div><strong>Tên khách sạn:</strong> {facilityName}</div>
                  <div><strong>Vị trí cơ sở:</strong> {fullAddressQuery}</div>
                  <div><strong>Hạng phòng đầu tiên:</strong> {roomName}</div>
                  <div><strong>Giá công bố:</strong> {Number(servicePrice).toLocaleString("vi-VN")} đ/đêm</div>
                  <div><strong>Hotline:</strong> {phone}</div>
                </div>
              </div>

              <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-900">
                Sau khi đăng, hệ thống sẽ mở ngay trang Quản trị Đối tác (Vendor Dashboard) để bạn bắt đầu quản lý đơn phòng!
              </div>
            </div>
          )}

          {/* NÚT ĐIỀU HƯỚNG BOTTOM NHƯ AGODA */}
          <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 border border-border rounded-full text-xs font-semibold text-text-secondary hover:bg-slate-50 transition"
            >
              Quay trở lại
            </button>

            {currentStep < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-full shadow-sm transition"
              >
                Tiếp theo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-xs font-semibold rounded-full shadow-sm transition disabled:opacity-50"
              >
                {loading ? "Đang xử lý đăng..." : "Hoàn tất & Đăng ngay"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

