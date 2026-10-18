/**
 * Location Service for Vietnam Destinations Autocomplete
 * Supports full 63 provinces & cities, top travel destinations, districts,
 * and live API calls to public Vietnam provinces API + local backend.
 */

import facilityApi from "./api/facilityApi";

// Comprehensive Vietnam Destinations Dataset
export const VIETNAM_LOCATIONS = [
  // Top Popular Tourism Cities & Hotspots (Thành phố du lịch nổi tiếng)
  { name: "Đà Lạt", province: "Lâm Đồng", fullTitle: "Đà Lạt, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Đà Nẵng", province: "Đà Nẵng", fullTitle: "Đà Nẵng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phú Quốc", province: "Kiên Giang", fullTitle: "Phú Quốc, Kiên Giang", type: "CITY", sub: "Thành phố đảo", isPopular: true },
  { name: "Nha Trang", province: "Khánh Hòa", fullTitle: "Nha Trang, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hà Nội", province: "Hà Nội", fullTitle: "Hà Nội, Việt Nam", type: "CITY", sub: "Thủ đô", isPopular: true },
  { name: "Hồ Chí Minh", province: "Hồ Chí Minh", fullTitle: "Hồ Chí Minh, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hạ Long", province: "Quảng Ninh", fullTitle: "Hạ Long, Quảng Ninh", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hội An", province: "Quảng Nam", fullTitle: "Hội An, Quảng Nam", type: "CITY", sub: "Thành phố cổ", isPopular: true },
  { name: "Vũng Tàu", province: "Bà Rịa - Vũng Tàu", fullTitle: "Vũng Tàu, Việt Nam", type: "CITY", sub: "Thành phố biển", isPopular: true },
  { name: "Sa Pa", province: "Lào Cai", fullTitle: "Sa Pa, Lào Cai", type: "CITY", sub: "Thị xã du lịch", isPopular: true },
  { name: "Quy Nhơn", province: "Bình Định", fullTitle: "Quy Nhơn, Bình Định", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Phan Thiết", province: "Bình Thuận", fullTitle: "Phan Thiết, Bình Thuận", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Huế", province: "Thừa Thiên Huế", fullTitle: "Huế, Thừa Thiên Huế", type: "CITY", sub: "Cố đô", isPopular: true },
  { name: "Ninh Bình", province: "Ninh Bình", fullTitle: "Ninh Bình, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Côn Đảo", province: "Bà Rịa - Vũng Tàu", fullTitle: "Côn Đảo, Bà Rịa - Vũng Tàu", type: "CITY", sub: "Huyện đảo", isPopular: true },
  { name: "Mộc Châu", province: "Sơn La", fullTitle: "Mộc Châu, Sơn La", type: "CITY", sub: "Khu du lịch", isPopular: false },

  // Key Districts / Areas (Khu vực phổ biến - Agoda style)
  { name: "Quận 1", province: "Hồ Chí Minh", fullTitle: "Quận 1, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 2", province: "Hồ Chí Minh", fullTitle: "Quận 2, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 3", province: "Hồ Chí Minh", fullTitle: "Quận 3, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Quận 7", province: "Hồ Chí Minh", fullTitle: "Quận 7, Hồ Chí Minh", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Hoàn Kiếm", province: "Hà Nội", fullTitle: "Hoàn Kiếm, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Tây Hồ", province: "Hà Nội", fullTitle: "Tây Hồ, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Ba Đình", province: "Hà Nội", fullTitle: "Ba Đình, Hà Nội", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Sơn Trà", province: "Đà Nẵng", fullTitle: "Sơn Trà, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },
  { name: "Ngũ Hành Sơn", province: "Đà Nẵng", fullTitle: "Ngũ Hành Sơn, Đà Nẵng", type: "DISTRICT", sub: "Khu vực", isPopular: false },

  // 63 Provinces of Vietnam
  { name: "An Giang", fullTitle: "An Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bà Rịa - Vũng Tàu", fullTitle: "Bà Rịa - Vũng Tàu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Bắc Giang", fullTitle: "Bắc Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bắc Kạn", fullTitle: "Bắc Kạn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bạc Liêu", fullTitle: "Bạc Liêu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bắc Ninh", fullTitle: "Bắc Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bến Tre", fullTitle: "Bến Tre, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Định", fullTitle: "Bình Định, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Dương", fullTitle: "Bình Dương, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Phước", fullTitle: "Bình Phước, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Bình Thuận", fullTitle: "Bình Thuận, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cà Mau", fullTitle: "Cà Mau, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Cần Thơ", fullTitle: "Cần Thơ, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Cao Bằng", fullTitle: "Cao Bằng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đắk Lắk", fullTitle: "Đắk Lắk, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đắk Nông", fullTitle: "Đắk Nông, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Điện Biên", fullTitle: "Điện Biên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Nai", fullTitle: "Đồng Nai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Đồng Tháp", fullTitle: "Đồng Tháp, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Gia Lai", fullTitle: "Gia Lai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Giang", fullTitle: "Hà Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Hà Nam", fullTitle: "Hà Nam, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hà Tĩnh", fullTitle: "Hà Tĩnh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Dương", fullTitle: "Hải Dương, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hải Phòng", fullTitle: "Hải Phòng, Việt Nam", type: "CITY", sub: "Thành phố", isPopular: true },
  { name: "Hậu Giang", fullTitle: "Hậu Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hòa Bình", fullTitle: "Hòa Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Hưng Yên", fullTitle: "Hưng Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Khánh Hòa", fullTitle: "Khánh Hòa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Kiên Giang", fullTitle: "Kiên Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Kon Tum", fullTitle: "Kon Tum, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lai Châu", fullTitle: "Lai Châu, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lâm Đồng", fullTitle: "Lâm Đồng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Lạng Sơn", fullTitle: "Lạng Sơn, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Lào Cai", fullTitle: "Lào Cai, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Long An", fullTitle: "Long An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Nam Định", fullTitle: "Nam Định, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Nghệ An", fullTitle: "Nghệ An, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Ninh Thuận", fullTitle: "Ninh Thuận, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Phú Thọ", fullTitle: "Phú Thọ, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Phú Yên", fullTitle: "Phú Yên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Bình", fullTitle: "Quảng Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Nam", fullTitle: "Quảng Nam, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Ngãi", fullTitle: "Quảng Ngãi, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Quảng Ninh", fullTitle: "Quảng Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Quảng Trị", fullTitle: "Quảng Trị, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sóc Trăng", fullTitle: "Sóc Trăng, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Sơn La", fullTitle: "Sơn La, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tây Ninh", fullTitle: "Tây Ninh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Bình", fullTitle: "Thái Bình, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thái Nguyên", fullTitle: "Thái Nguyên, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thanh Hóa", fullTitle: "Thanh Hóa, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Thừa Thiên Huế", fullTitle: "Thừa Thiên Huế, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: true },
  { name: "Tiền Giang", fullTitle: "Tiền Giang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Trà Vinh", fullTitle: "Trà Vinh, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Tuyên Quang", fullTitle: "Tuyên Quang, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Long", fullTitle: "Vĩnh Long, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Vĩnh Phúc", fullTitle: "Vĩnh Phúc, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
  { name: "Yên Bái", fullTitle: "Yên Bái, Việt Nam", type: "PROVINCE", sub: "Tỉnh thành", isPopular: false },
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
   * Clear all recent searches
   */
  clearRecentSearches() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch (err) {
      console.warn("Lỗi khi xóa lịch sử tìm kiếm:", err);
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

    // 2. Query Public Vietnam Provinces Open API for official provinces
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
      const apiRes = await fetch(
        `https://provinces.open-api.vn/api/p/search/?q=${encodeURIComponent(keyword)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (apiRes.ok) {
        const provinces = await apiRes.json();
        if (Array.isArray(provinces)) {
          provinces.forEach((p) => {
            const cleanName = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
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
    } catch (apiErr) {
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

export default locationService;
