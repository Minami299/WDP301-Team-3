import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { vendorApi } from "../../services/api/vendorApi";
import { VendorSidebar } from "./HotelOwnerDashboardPage";
import {
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconZap,
  IconHotel,
  IconCalendar,
  IconRefreshCw,
  IconArrowRight,
  IconEdit,
  IconPercent
} from "../../components/Icons";
import AgodaDatePicker from "../../components/common/AgodaDatePicker";

// Tạo danh sách 12 ngày liên tiếp tính từ hôm nay
const generateUpcomingDates = () => {
  const dates = [];
  const daysOfWeek = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = daysOfWeek[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    const fullKey = `${dayName} ${dateStr}`;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    dates.push({
      key: fullKey,
      dayName,
      dateStr,
      isWeekend,
      rawDate: d.toISOString().split("T")[0]
    });
  }
  return dates;
};

// Huy hiệu trạng thái phòng trống
function AvailabilityBadge({ available, total }) {
  if (available === 0) {
    return (
      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
        HẾT PHÒNG
      </span>
    );
  }
  const ratio = total > 0 ? available / total : 0;
  if (ratio < 0.25) {
    return (
      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
        Còn {available} phòng
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
      {available}/{total}
    </span>
  );
}

export default function HotelOwnerInventoryPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const dates = useMemo(() => generateUpcomingDates(), []);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  // Dữ liệu bảng tồn kho & giá theo ngày
  const [matrixData, setMatrixData] = useState({});
  const [stopSellMap, setStopSellMap] = useState({});
  const [editCell, setEditCell] = useState(null); // { roomName, dateKey }
  const [editPrice, setEditPrice] = useState("");
  const [showStopSellModal, setShowStopSellModal] = useState(null);
  const [saveToast, setSaveToast] = useState("");
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    roomName: "ALL",
    checkIn: dates[0]?.rawDate || new Date().toISOString().split("T")[0],
    checkOut: dates[2]?.rawDate || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    discountPercent: 15
  });

  // Tải danh sách phòng từ cơ sở của đối tác
  useEffect(() => {
    let isMounted = true;
    vendorApi
      .getProfile()
      .then((res) => {
        if (!isMounted) return;
        const pData = res.data;
        setProfileData(pData);

        // Lấy danh sách phòng thực tế từ cơ sở
        const roomsFromDb = [];
        if (pData?.facilities && pData.facilities.length > 0) {
          pData.facilities.forEach((fac) => {
            if (Array.isArray(fac.rooms)) {
              fac.rooms.forEach((r) => {
                roomsFromDb.push({
                  name: r.name,
                  base_price: r.base_price || 500000,
                  total_rooms: Number(r.total_rooms) || 10
                });
              });
            }
          });
        }

        // Nếu DB chưa có phòng, dùng phòng mặc định
        const finalRooms =
          roomsFromDb.length > 0
            ? roomsFromDb
            : [
                { name: "Phòng Deluxe Giường Đôi", base_price: 650000, total_rooms: 15 },
                { name: "Phòng Premier Hướng Biển", base_price: 950000, total_rooms: 10 },
                { name: "Phòng Executive Suite", base_price: 1800000, total_rooms: 5 }
              ];

        // Khởi tạo ma trận tồn kho & giá cho từng ngày từ dữ liệu phòng thực tế
        const initialMatrix = {};
        finalRooms.forEach((r) => {
          initialMatrix[r.name] = {};
          dates.forEach((d) => {
            const price = Number(r.base_price) || 0;
            const total = Number(r.total_rooms) || 1;
            const avail = total;

            initialMatrix[r.name][d.key] = {
              price,
              total,
              available: avail
            };
          });
        });

        setMatrixData(initialMatrix);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dates]);

  const facility = profileData?.facilities?.[0];
  const roomNames = Object.keys(matrixData);

  const roomBasePriceMap = useMemo(() => {
    const map = {};
    if (profileData?.facilities) {
      profileData.facilities.forEach((fac) => {
        if (Array.isArray(fac.rooms)) {
          fac.rooms.forEach((r) => {
            map[r.name] = Number(r.base_price) || 0;
          });
        }
      });
    }
    return map;
  }, [profileData]);

  const formatPrice = (val) =>
    Number(val || 0).toLocaleString("vi-VN") + " đ";

  // Cập nhật giá ô đang sửa
  const handleApplyPriceEdit = () => {
    if (!editCell) return;
    const num = Number(editPrice);
    if (!isNaN(num) && num >= 0) {
      setMatrixData((prev) => ({
        ...prev,
        [editCell.roomName]: {
          ...prev[editCell.roomName],
          [editCell.dateKey]: {
            ...prev[editCell.roomName][editCell.dateKey],
            price: num
          }
        }
      }));
    }
    setEditCell(null);
  };

  // Mở form chỉnh giá đồng loạt
  const handleOpenBulkEdit = () => {
    setBulkForm({
      roomName: roomNames[0] || "ALL",
      checkIn: dates[0]?.rawDate || new Date().toISOString().split("T")[0],
      checkOut: dates[2]?.rawDate || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      discountPercent: 15
    });
    setIsCalendarOpen(false);
    setShowBulkEditModal(true);
  };

  // Áp dụng chỉnh giá đồng loạt từ form (% giảm giá và lịch ngày)
  const handleApplyBulkEdit = (e) => {
    e.preventDefault();
    const discount = Number(bulkForm.discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      alert("Vui lòng nhập phần trăm giảm giá hợp lệ từ 0% đến 100%");
      return;
    }
    if (!bulkForm.checkIn || !bulkForm.checkOut) {
      alert("Vui lòng chọn khoảng thời gian áp dụng");
      return;
    }

    const targetRooms = bulkForm.roomName === "ALL" ? roomNames : [bulkForm.roomName];

    // Lọc các ngày trong ma trận nằm trong khoảng checkIn và checkOut
    const targetDates = dates.filter(
      (d) => d.rawDate >= bulkForm.checkIn && d.rawDate <= bulkForm.checkOut
    );

    if (targetDates.length === 0) {
      alert("Khoảng thời gian bạn chọn không nằm trong phạm vi 12 ngày của ma trận.");
      return;
    }

    setMatrixData((prev) => {
      const next = { ...prev };
      targetRooms.forEach((rName) => {
        const basePrice = roomBasePriceMap[rName] || 500000;
        const newPrice = Math.max(0, Math.round(basePrice * (1 - discount / 100)));

        if (!next[rName]) next[rName] = {};
        targetDates.forEach((d) => {
          const curr = next[rName][d.key] || { total: 10, available: 10, price: basePrice };
          next[rName][d.key] = {
            ...curr,
            price: newPrice
          };
        });
      });
      return next;
    });

    setIsCalendarOpen(false);
    setShowBulkEditModal(false);
    setSaveToast(
      `Đã áp dụng giảm ${discount}% cho ${targetRooms.length} loại phòng từ ${bulkForm.checkIn} đến ${bulkForm.checkOut}`
    );
    setTimeout(() => setSaveToast(""), 3500);
  };

  // Bật/tắt chế độ Stop-sell
  const toggleStopSell = (roomName) => {
    setStopSellMap((prev) => ({
      ...prev,
      [roomName]: !prev[roomName]
    }));
    setShowStopSellModal(null);
    setSaveToast(
      !stopSellMap[roomName]
        ? `Đã kích hoạt Đóng bán (Stop-Sell) cho loại phòng "${roomName}"`
        : `Đã mở bán trở lại cho loại phòng "${roomName}"`
    );
    setTimeout(() => setSaveToast(""), 3500);
  };

  // Lưu toàn bộ bảng tồn kho & giá
  const handleSaveAll = () => {
    setSaveToast("Đã lưu và đồng bộ toàn bộ bảng giá & tồn kho lên hệ thống!");
    setTimeout(() => setSaveToast(""), 3500);
  };

  // Cảnh báo cháy phòng / tồn kho thấp
  const warnings = useMemo(() => {
    const list = [];
    roomNames.forEach((rName) => {
      dates.forEach((d) => {
        const item = matrixData[rName]?.[d.key];
        if (item) {
          if (item.available === 0) {
            list.push({
              room: rName,
              date: d.key,
              type: "danger",
              msg: "Hết phòng (Sold out) — Không còn phòng trống"
            });
          } else if (item.available <= 2) {
            list.push({
              room: rName,
              date: d.key,
              type: "warning",
              msg: `Còn ${item.available} phòng — Nguy cơ quá tải`
            });
          }
        }
      });
    });
    return list.slice(0, 4); // Lấy tối đa 4 cảnh báo tiêu biểu
  }, [matrixData, roomNames, dates]);

  return (
    <div className="flex h-screen bg-[#f8fafc] font-body overflow-hidden">
      {/* Sidebar chung của Vendor */}
      <VendorSidebar
        activeScreen={7}
        onNavigate={(path) => navigate(path)}
        onProfile={() => navigate("/profile")}
        onLogout={() => {
          logout?.();
          navigate("/auth/login");
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between flex-shrink-0 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-slate-900 text-xl tracking-tight">
                Quản lý tồn kho & Biểu giá bán phòng
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                Extranet Rates
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cơ sở: <span className="font-semibold text-slate-800">{facility?.name || "Khách sạn của bạn"}</span> · Điều chỉnh giá theo ngày và kiểm soát đóng/mở bán
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/vendor/registration")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <IconHotel size={15} />
              Quản lý loại phòng
            </button>
            <button
              onClick={handleOpenBulkEdit}
              className="px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <IconEdit size={14} />
              Chỉnh giá đồng loạt
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <IconCheck size={15} />
              Lưu tất cả thay đổi
            </button>
          </div>
        </header>

        {/* Thông báo cập nhật */}
        {saveToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-8 py-2.5 flex items-center justify-between shadow-sm animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <IconCheck size={15} />
              {saveToast}
            </span>
            <button onClick={() => setSaveToast("")} className="text-white/80 hover:text-white">
              <IconX size={14} />
            </button>
          </div>
        )}

        {/* Nội dung chính */}
        <main className="flex-1 overflow-auto p-8 space-y-5">
          {loading && (
            <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Đang tải bảng tồn kho và giá phòng...
            </div>
          )}

          {!loading && (
            <>
              {/* Thanh cảnh báo tồn kho thấp & Cháy phòng */}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <IconAlertTriangle size={14} className="text-amber-500" />
                    Cảnh báo tồn kho theo ngày
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex items-start gap-2.5 shadow-2xs ${
                          w.type === "danger"
                            ? "bg-rose-50/70 border-rose-200 text-rose-800"
                            : "bg-amber-50/70 border-amber-200 text-amber-800"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            w.type === "danger"
                              ? "bg-rose-200/80 text-rose-700"
                              : "bg-amber-200/80 text-amber-700"
                          }`}
                        >
                          <IconAlertTriangle size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs block truncate">
                            {w.room} · {w.date}
                          </span>
                          <span className="text-[11px] block mt-0.5 opacity-90 truncate">
                            {w.msg}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowStopSellModal(w.room)}
                          className="text-[11px] font-extrabold underline hover:no-underline flex-shrink-0 ml-1"
                        >
                          Đóng bán
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bảng ma trận Quản lý tồn kho & Biểu giá */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconCalendar size={18} className="text-primary-600" />
                    <h3 className="font-heading font-bold text-slate-900 text-base">
                      Ma trận giá & phòng trống (12 ngày tiếp theo)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      Nhấp trực tiếp vào ô để sửa giá nhanh
                    </span>
                    <button
                      onClick={handleOpenBulkEdit}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <IconEdit size={13} />
                      Chỉnh giá đồng loạt
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-max border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600">
                        <th className="text-left text-[11px] font-bold uppercase tracking-wider px-6 py-4 w-60 sticky left-0 bg-slate-50/95 backdrop-blur-xs z-10 border-r border-slate-200/80 shadow-xs">
                          Hạng phòng nghỉ
                        </th>
                        {dates.map((d) => (
                          <th
                            key={d.key}
                            className={`text-center text-[11px] font-bold px-3 py-3 min-w-[100px] border-r border-slate-100 ${
                              d.isWeekend
                                ? "bg-amber-50/40 text-amber-900 font-extrabold"
                                : "text-slate-700"
                            }`}
                          >
                            <span className="block text-xs">{d.dayName}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {d.dateStr}
                            </span>
                            {d.isWeekend && (
                              <span className="text-[9px] text-amber-600 font-bold block mt-0.5">
                                Cuối tuần
                              </span>
                            )}
                          </th>
                        ))}
                        <th className="text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider px-5 py-4 sticky right-0 bg-slate-50/95 backdrop-blur-xs z-10 border-l border-slate-200/80 shadow-xs">
                          Trạng thái Stop-Sell
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roomNames.map((roomName) => {
                        const isStopped = Boolean(stopSellMap[roomName]);
                        return (
                          <tr
                            key={roomName}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              isStopped ? "bg-slate-50/60 opacity-60" : ""
                            }`}
                          >
                            {/* Tên loại phòng */}
                            <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-slate-200/80 shadow-xs">
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <IconHotel size={15} className="text-primary-600 flex-shrink-0" />
                                <span className="truncate max-w-[180px]" title={roomName}>
                                  {roomName}
                                </span>
                              </div>
                              {isStopped ? (
                                <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                                  <IconX size={11} /> Đã đóng bán toàn kênh
                                </div>
                              ) : (
                                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                                  <IconCheck size={11} /> Đang mở bán
                                </div>
                              )}
                            </td>

                            {/* Các ô theo ngày */}
                            {dates.map((d) => {
                              const cell = matrixData[roomName]?.[d.key];
                              if (!cell) {
                                return (
                                  <td key={d.key} className="px-2 py-3 text-center text-slate-300">
                                    —
                                  </td>
                                );
                              }

                              const isEditing =
                                editCell?.roomName === roomName && editCell?.dateKey === d.key;
                              const isSoldOut = cell.available === 0;
                              const isLow = cell.available > 0 && cell.available / cell.total < 0.25;

                              return (
                                <td
                                  key={d.key}
                                  className={`p-2 text-center border-r border-slate-100 ${
                                    isStopped ? "pointer-events-none select-none" : ""
                                  }`}
                                >
                                  <div
                                    onClick={() => {
                                      if (isStopped) return;
                                      setEditCell({ roomName, dateKey: d.key });
                                      setEditPrice(String(cell.price));
                                    }}
                                    className={`rounded-xl p-2.5 cursor-pointer border transition-all text-center flex flex-col items-center justify-between min-h-[58px] ${
                                      isSoldOut
                                        ? "bg-rose-50/80 border-rose-200 hover:border-rose-300"
                                        : isLow
                                        ? "bg-amber-50/80 border-amber-200 hover:border-amber-300"
                                        : isEditing
                                        ? "bg-primary-50 border-primary-500 shadow-sm"
                                        : "bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-primary-400 hover:shadow-2xs"
                                    }`}
                                  >
                                    {isEditing ? (
                                      <div
                                        className="flex items-center justify-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="number"
                                          step="10000"
                                          min="0"
                                          value={editPrice}
                                          onChange={(e) => setEditPrice(e.target.value)}
                                          onBlur={handleApplyPriceEdit}
                                          onKeyDown={(e) => e.key === "Enter" && handleApplyPriceEdit()}
                                          autoFocus
                                          className="w-20 text-xs font-bold text-slate-900 text-center bg-white border border-primary-400 rounded-md py-0.5 outline-none shadow-inner"
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-bold text-xs text-slate-900 block tracking-tight">
                                        {formatPrice(cell.price)}
                                      </span>
                                    )}

                                    <div className="mt-1">
                                      <AvailabilityBadge
                                        available={cell.available}
                                        total={cell.total}
                                      />
                                    </div>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Cột hành động Stop-Sell */}
                            <td className="px-5 py-4 sticky right-0 bg-white z-10 text-center border-l border-slate-200/80 shadow-xs">
                              <button
                                onClick={() =>
                                  isStopped ? toggleStopSell(roomName) : setShowStopSellModal(roomName)
                                }
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                                  isStopped
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                }`}
                              >
                                {isStopped ? (
                                  <>
                                    <IconCheck size={12} /> Mở bán lại
                                  </>
                                ) : (
                                  <>
                                    <IconZap size={12} /> Đóng bán (Stop-Sell)
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Chú giải bảng ma trận */}
                <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-slate-700">Chú thích trạng thái:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
                      <span>Còn phòng</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300" />
                      <span>Sắp hết ({`<`}25%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300" />
                      <span>Hết phòng (Sold Out)</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bấm vào ô giá bất kỳ để thay đổi giá bán trong ngày. Thay đổi sẽ tự động áp dụng.
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL XÁC NHẬN KÍCH HOẠT STOP-SELL */}
      {showStopSellModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <IconAlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-slate-900 text-base">
                  Xác nhận Đóng bán (Stop-Sell)?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{showStopSellModal}</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs leading-relaxed">
              <strong>Lưu ý:</strong> Khi kích hoạt Đóng bán, khách hàng sẽ không thể đặt thêm loại phòng{" "}
              <strong>"{showStopSellModal}"</strong> trên toàn bộ hệ thống kênh bán của Travelio. Các đơn đặt phòng đã thanh toán thành công trước đó sẽ không bị ảnh hưởng.
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowStopSellModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => toggleStopSell(showStopSellModal)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <IconZap size={14} />
                Kích hoạt Đóng bán ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM CHỈNH GIÁ ĐỒNG LOẠT THEO NGÀY */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 border border-slate-200 space-y-5 animate-fadeIn relative">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <IconPercent size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-slate-900 text-base">
                    Chỉnh giá theo ngày & Giảm giá %
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chọn loại phòng, thời gian áp dụng và mức % giảm giá
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCalendarOpen(false);
                  setShowBulkEditModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkEdit} className="space-y-4">
              {/* 1. Chọn loại phòng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Chọn loại phòng cần chỉnh giá
                </label>
                <select
                  value={bulkForm.roomName}
                  onChange={(e) => setBulkForm({ ...bulkForm, roomName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="ALL">Tất cả các loại phòng ({roomNames.length})</option>
                  {roomNames.map((r) => (
                    <option key={r} value={r}>
                      {r} {roomBasePriceMap[r] ? `(Giá gốc: ${formatPrice(roomBasePriceMap[r])})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Chọn khoảng thời gian (Agoda Date Picker như ảnh) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Chọn khoảng thời gian áp dụng
                </label>

                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <IconCalendar size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                        Khoảng ngày (Lịch ngày)
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Từ <strong className="text-primary-600">{bulkForm.checkIn}</strong> đến{" "}
                        <strong className="text-primary-600">{bulkForm.checkOut}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/50">
                    {Math.max(
                      1,
                      Math.round(
                        (new Date(bulkForm.checkOut) - new Date(bulkForm.checkIn)) /
                          (1000 * 60 * 60 * 24)
                      )
                    )}{" "}
                    đêm
                  </span>
                </button>

                {/* Popover Agoda Calendar đúng như ảnh người dùng gửi */}
                <AgodaDatePicker
                  isOpen={isCalendarOpen}
                  checkIn={bulkForm.checkIn}
                  checkOut={bulkForm.checkOut}
                  align="left"
                  onChange={(selected) => {
                    setBulkForm((prev) => ({
                      ...prev,
                      checkIn: selected.checkIn || prev.checkIn,
                      checkOut: selected.checkOut || prev.checkOut
                    }));
                  }}
                  onClose={() => setIsCalendarOpen(false)}
                />
              </div>

              {/* 3. Mức phần trăm giảm giá (%) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Ghi phần trăm (%) sẽ giảm <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    {[10, 15, 20, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setBulkForm({ ...bulkForm, discountPercent: pct })}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                          Number(bulkForm.discountPercent) === pct
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    placeholder="Ví dụ: 20"
                    value={bulkForm.discountPercent}
                    onChange={(e) => setBulkForm({ ...bulkForm, discountPercent: e.target.value })}
                    className="w-full pl-3.5 pr-12 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 focus:outline-none font-bold text-slate-800"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Hộp xem trước mức giá sau khi giảm */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Hạng phòng áp dụng:</span>
                  <span className="font-bold text-slate-800">
                    {bulkForm.roomName === "ALL" ? "Tất cả các phòng" : bulkForm.roomName}
                  </span>
                </div>

                {bulkForm.roomName !== "ALL" && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Giá niêm yết hiện tại:</span>
                      <span className="font-bold text-slate-500 line-through">
                        {formatPrice(roomBasePriceMap[bulkForm.roomName] || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-blue-200/60 pt-2">
                      <span className="text-blue-900 font-bold">
                        Giá bán sau khi giảm (-{bulkForm.discountPercent}%):
                      </span>
                      <span className="font-heading font-extrabold text-sm text-primary-600">
                        {formatPrice(
                          Math.max(
                            0,
                            Math.round(
                              (roomBasePriceMap[bulkForm.roomName] || 0) *
                                (1 - Number(bulkForm.discountPercent || 0) / 100)
                            )
                          )
                        )}
                      </span>
                    </div>
                  </>
                )}

                {bulkForm.roomName === "ALL" && (
                  <div className="text-xs text-blue-800 font-medium">
                    Sẽ giảm đồng loạt <strong>{bulkForm.discountPercent}%</strong> trên giá gốc của tất cả loại phòng trong các ngày đã chọn.
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCalendarOpen(false);
                    setShowBulkEditModal(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <IconCheck size={15} />
                  Áp dụng giảm giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

