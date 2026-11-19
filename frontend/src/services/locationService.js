/**
 * Location Service for Vietnam Destinations Autocomplete
 * Supports 34 post-merger provinces & cities, top travel destinations,
 * and live API calls to Vietnam administrative v2 APIs + local backend.
 */

import facilityApi from "./api/facilityApi";

// Comprehensive Vietnam Destinations Dataset
const VIETNAM_LOCATIONS = [
  // Top Popular Tourism Cities & Hotspots (Thành phố du lịch nổi tiếng)
  { name: "Đà Lạt", province: "Lâm Đồng", fullTitle: "Đà Lạt, Lâm Đồng", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Đà Nẵng", province: "Đà Nẵng", fullTitle: "Đà Nẵng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phú Quốc", province: "An Giang", fullTitle: "Phú Quốc, An Giang", type: "CITY", sub: "Đặc khu", isPopular: true },
  { name: "Nha Trang", province: "Khánh Hòa", fullTitle: "Nha Trang, Khánh Hòa", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hà Nội", province: "Hà Nội", fullTitle: "Hà Nội, Việt Nam", type: "CITY", sub: "Thủ đô", isPopular: true },
  { name: "TP. Hồ Chí Minh", province: "TP. Hồ Chí Minh", fullTitle: "TP. Hồ Chí Minh, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hạ Long", province: "Quảng Ninh", fullTitle: "Hạ Long, Quảng Ninh", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hội An", province: "Đà Nẵng", fullTitle: "Hội An, Đà Nẵng", type: "CITY", sub: "Di sản phố cổ", isPopular: true },
  { name: "Vũng Tàu", province: "TP. Hồ Chí Minh", fullTitle: "Vũng Tàu, TP. Hồ Chí Minh", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Sa Pa", province: "Lào Cai", fullTitle: "Sa Pa, Lào Cai", type: "CITY", sub: "Khu du lịch", isPopular: true },
  { name: "Quy Nhơn", province: "Gia Lai", fullTitle: "Quy Nhơn, Gia Lai", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Phan Thiết", province: "Lâm Đồng", fullTitle: "Phan Thiết, Lâm Đồng", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Huế", province: "Huế", fullTitle: "Huế, Việt Nam", type: "CITY", sub: "Thành phố trực thuộc TW", isPopular: true },
  { name: "Ninh Bình", province: "Ninh Bình", fullTitle: "Ninh Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Côn Đảo", province: "TP. Hồ Chí Minh", fullTitle: "Côn Đảo, TP. Hồ Chí Minh", type: "CITY", sub: "Đặc khu", isPopular: true },
  { name: "Mộc Châu", province: "Sơn La", fullTitle: "Mộc Châu, Sơn La", type: "CITY", sub: "Khu du lịch", isPopular: false },

  // 34 Merged Provinces & Cities of Vietnam
  { name: "An Giang", fullTitle: "An Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bắc Ninh", fullTitle: "Bắc Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cà Mau", fullTitle: "Cà Mau, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cần Thơ", fullTitle: "Cần Thơ, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Cao Bằng", fullTitle: "Cao Bằng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đắk Lắk", fullTitle: "Đắk Lắk, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Điện Biên", fullTitle: "Điện Biên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Nai", fullTitle: "Đồng Nai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Tháp", fullTitle: "Đồng Tháp, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Gia Lai", fullTitle: "Gia Lai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Tĩnh", fullTitle: "Hà Tĩnh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Phòng", fullTitle: "Hải Phòng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hưng Yên", fullTitle: "Hưng Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Khánh Hòa", fullTitle: "Khánh Hòa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lai Châu", fullTitle: "Lai Châu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lâm Đồng", fullTitle: "Lâm Đồng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lạng Sơn", fullTitle: "Lạng Sơn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lào Cai", fullTitle: "Lào Cai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Nghệ An", fullTitle: "Nghệ An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Phú Thọ", fullTitle: "Phú Thọ, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ngãi", fullTitle: "Quảng Ngãi, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ninh", fullTitle: "Quảng Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Trị", fullTitle: "Quảng Trị, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sơn La", fullTitle: "Sơn La, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tây Ninh", fullTitle: "Tây Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Nguyên", fullTitle: "Thái Nguyên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thanh Hóa", fullTitle: "Thanh Hóa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tuyên Quang", fullTitle: "Tuyên Quang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Long", fullTitle: "Vĩnh Long, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
];

/**
 * Helper to normalize string for comparison (removes accents, converts 'đ' -> 'd')
 */
export const normalizeText = (str = "") => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
};

const RECENT_KEY = "travelio_recent_searches";

export const locationService = {
  /**
   * Get recent searches from localStorage
   */
  getRecentSearches() {
    try {
      const data = localStorage.getItem(RECENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save a selected destination to recent searches
   */
  saveRecentSearch(item) {
    if (!item || !item.name) return;
    try {
      let recents = this.getRecentSearches();
      // Remove duplicate if already present
      recents = recents.filter(
        (r) => normalizeText(r.name) !== normalizeText(item.name)
      );
      // Prepend to top
      recents.unshift({
        id: `recent-${item.name}-${Date.now()}`,
        name: item.name,
        fullTitle: item.fullTitle || item.name,
        sub: item.sub || "Tìm kiếm gần đây",
        type: "RECENT",
        isPopular: false,
      });
      // Keep max 5 recent items
      recents = recents.slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    } catch (err) {
      console.warn("Lỗi khi lưu lịch sử tìm kiếm:", err);
    }
  },

  /**
   * Search locations & facilities (Provinces API + Local Curated Data + Hotels/Attractions DB)
   */
  async searchLocations(keyword = "", activeTab = "stays") {
    const normKw = normalizeText(keyword);

    // If empty query, return empty list (user must type to search)
    if (!normKw) {
      return [];
    }

    // 1. Local curated filter
    let results = VIETNAM_LOCATIONS.filter((loc) => {
      const nName = normalizeText(loc.name);
      const nTitle = normalizeText(loc.fullTitle);
      return nName.includes(normKw) || nTitle.includes(normKw);
    });

    // 2. Query Public Vietnam Provinces Open API v2 (merged 34 provinces)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const apiRes = await fetch(
        `https://provinces.open-api.vn/api/v2/p/?search=${encodeURIComponent(keyword)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (apiRes.ok) {
        const provinces = await apiRes.json();
        if (Array.isArray(provinces)) {
          provinces.forEach((p) => {
            const cleanName = normalizeMergedProvince(p.name);
            const exists = results.some(
              (r) => normalizeText(r.name) === normalizeText(cleanName)
            );
            if (!exists) {
              results.push({
                name: cleanName,
                fullTitle: `${cleanName}, Việt Nam`,
                type: "PROVINCE",
                sub: p.division_type === "thành phố trung ương" ? "Thành phố" : "Tỉnh thành",
                isPopular: false,
              });
            }
          });
        }
      }
    } catch {
      // Quiet failover to curated dataset
    }

    // 3. Search matching hotels / attractions from database
    let facilityResults = [];
    try {
      const targetType =
        activeTab === "stays"
          ? "HOTEL"
          : activeTab === "attractions"
          ? "ATTRACTION"
          : undefined;

      const facRes = await facilityApi.getFacilities({
        keyword: keyword.trim(),
        type: targetType,
        limit: 4,
      });

      if (facRes && facRes.data && Array.isArray(facRes.data)) {
        facilityResults = facRes.data.map((f) => ({
          id: `fac-${f._id}`,
          facilityId: f._id,
          name: f.name,
          fullTitle: `${f.name}, ${f.city || ""}`,
          type: f.type, // 'HOTEL' or 'ATTRACTION'
          sub: f.type === "HOTEL" ? `Khách sạn • ${f.city}` : `Khu vui chơi • ${f.city}`,
          isFacility: true,
          isPopular: false,
        }));
      }
    } catch (facErr) {
      // Quiet failover if backend down
    }

    // 4. Sort results: popular first, prefix matching first
    results.sort((a, b) => {
      const aNorm = normalizeText(a.name);
      const bNorm = normalizeText(b.name);
      const aStarts = aNorm.startsWith(normKw) ? 1 : 0;
      const bStarts = bNorm.startsWith(normKw) ? 1 : 0;

      if (aStarts !== bStarts) return bStarts - aStarts;
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });

    // Merge: facilities first if keyword matches hotel name closely, or combined
    return [...facilityResults, ...results].slice(0, 10);
  },
};

const MERGED_PROVINCE_MAP = {
  "Hà Giang": "Tuyên Quang",
  "Tuyên Quang": "Tuyên Quang",
  "Yên Bái": "Lào Cai",
  "Lào Cai": "Lào Cai",
  "Bắc Kạn": "Thái Nguyên",
  "Thái Nguyên": "Thái Nguyên",
  "Vĩnh Phúc": "Phú Thọ",
  "Hòa Bình": "Phú Thọ",
  "Phú Thọ": "Phú Thọ",
  "Bắc Giang": "Bắc Ninh",
  "Bắc Ninh": "Bắc Ninh",
  "Thái Bình": "Hưng Yên",
  "Hưng Yên": "Hưng Yên",
  "Hải Dương": "Hải Phòng",
  "Hải Phòng": "Hải Phòng",
  "Hà Nam": "Ninh Bình",
  "Nam Định": "Ninh Bình",
  "Ninh Bình": "Ninh Bình",
  "Quảng Bình": "Quảng Trị",
  "Quảng Trị": "Quảng Trị",
  "Thừa Thiên Huế": "Huế",
  "Huế": "Huế",
  "Quảng Nam": "Đà Nẵng",
  "Đà Nẵng": "Đà Nẵng",
  "Kon Tum": "Quảng Ngãi",
  "Quảng Ngãi": "Quảng Ngãi",
  "Bình Định": "Gia Lai",
  "Gia Lai": "Gia Lai",
  "Ninh Thuận": "Khánh Hòa",
  "Khánh Hòa": "Khánh Hòa",
  "Đắk Nông": "Lâm Đồng",
  "Bình Thuận": "Lâm Đồng",
  "Lâm Đồng": "Lâm Đồng",
  "Phú Yên": "Đắk Lắk",
  "Đắk Lắk": "Đắk Lắk",
  "Bình Dương": "TP. Hồ Chí Minh",
  "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh",
  "Hồ Chí Minh": "TP. Hồ Chí Minh",
  "TP. Hồ Chí Minh": "TP. Hồ Chí Minh",
  "Bình Phước": "Đồng Nai",
  "Đồng Nai": "Đồng Nai",
  "Long An": "Tây Ninh",
  "Tây Ninh": "Tây Ninh",
  "Sóc Trăng": "Cần Thơ",
  "Hậu Giang": "Cần Thơ",
  "Cần Thơ": "Cần Thơ",
  "Bến Tre": "Vĩnh Long",
  "Trà Vinh": "Vĩnh Long",
  "Vĩnh Long": "Vĩnh Long",
  "Tiền Giang": "Đồng Tháp",
  "Đồng Tháp": "Đồng Tháp",
  "Bạc Liêu": "Cà Mau",
  "Cà Mau": "Cà Mau",
  "Kiên Giang": "An Giang",
  "An Giang": "An Giang",
};

const normalizeMergedProvince = (raw = "") => {
  const stripped = String(raw || "")
    .replace(/^(Thành phố|Tỉnh)\s+/i, "")
    .replace(/^Hồ Chí Minh$/i, "TP. Hồ Chí Minh")
    .replace(/^Thừa Thiên Huế$/i, "Huế")
    .trim();
  return MERGED_PROVINCE_MAP[stripped] || stripped;
};
