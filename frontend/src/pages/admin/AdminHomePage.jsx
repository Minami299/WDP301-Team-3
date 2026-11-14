import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/api/adminApi";
import {
  PageHeader,
  ROLE_LABELS,
  RoleBadge,
  StatusBadge,
  formatDate,
  getInitials,
} from "./adminUi";

const ROLE_BAR_COLORS = {
  ACTIVITY_VENDOR: "bg-primary-500",
  CUSTOMER: "bg-emerald-500",
  HOTEL_OWNER: "bg-indigo-500",
  MANAGER: "bg-amber-500",
  ADMIN: "bg-slate-700",
};

export default function AdminHomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .getOverview()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const total = data?.total || 0;
  const activeCount = data?.by_status?.ACTIVE || 0;
  const pendingCount = data?.by_status?.PENDING || 0;
  const inactiveCount = data?.by_status?.INACTIVE || 0;
  const lockedCount = data?.by_status?.LOCKED || 0;
  const flagged = lockedCount + inactiveCount;

  const roles = Object.entries(data?.by_role || {}).sort((a, b) => b[1] - a[1]);
  const maxRole = Math.max(1, ...roles.map(([, count]) => count));

  const statCards = [
    {
      label: "Tổng số tài khoản",
      value: total,
      sub: "Toàn bộ người dùng trên hệ thống",
      to: "/admin/users",
      accent: "border-l-4 border-l-primary-500",
      valueClass: "text-slate-900",
    },
    {
      label: "Đang hoạt động",
      value: activeCount,
      sub: total > 0 ? `${Math.round((activeCount / total) * 100)}% tổng tài khoản` : "0% tổng tài khoản",
      to: "/admin/users?status=ACTIVE",
      accent: "border-l-4 border-l-emerald-500",
      valueClass: "text-emerald-700",
    },
    {
      label: "Chờ xét duyệt",
      value: pendingCount,
      sub: "Tài khoản đối tác đang chờ duyệt",
      to: "/admin/users?status=PENDING",
      accent: "border-l-4 border-l-sky-500",
      valueClass: "text-sky-700",
    },
    {
      label: "Chưa kích hoạt",
      value: inactiveCount,
      sub: "Chưa hoàn tất xác thực / tạm ngưng",
      to: "/admin/users?status=INACTIVE",
      accent: "border-l-4 border-l-amber-500",
      valueClass: "text-amber-700",
    },
    {
      label: "Đã khóa",
      value: lockedCount,
      sub: lockedCount > 0 ? "Cần kiểm tra lý do khóa" : "Không có tài khoản bị khóa",
      to: "/admin/users?status=LOCKED",
      accent: "border-l-4 border-l-rose-500",
      valueClass: "text-rose-700",
    },
  ];

  return (
    <>
      <PageHeader title="Tổng quan tài khoản">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <Link
            to="/admin/roles"
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Phân quyền vai trò
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-xs sm:text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
          >
            Quản lý tài khoản
          </Link>
        </div>
      </PageHeader>

      <div className="px-4 sm:px-8 py-6 max-w-screen-2xl space-y-6">
        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
            Không thể tải dữ liệu tổng quan: {error}
          </p>
        )}

        {!data && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
            Đang tải dữ liệu tài khoản...
          </div>
        )}

        {data && (
          <>
            {/* Thẻ chỉ số KPI */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map((card) => (
                <Link
                  key={card.label}
                  to={card.to}
                  className={`bg-white border border-slate-200 ${card.accent} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {card.label}
                    </span>
                    <span className="text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      Xem →
                    </span>
                  </div>
                  <div className={`font-heading font-extrabold text-3xl mt-2 ${card.valueClass}`}>
                    {card.value.toLocaleString("vi-VN")}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 truncate">{card.sub}</p>
                </Link>
              ))}
            </section>

            {/* Cảnh báo nhanh nếu có tài khoản bị khóa hoặc chưa kích hoạt */}
            {flagged > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-900">
                <div>
                  Hiện có <strong>{flagged}</strong> tài khoản đang ở trạng thái <strong>Đã khóa</strong> hoặc <strong>Chưa kích hoạt</strong> cần rà soát.
                </div>
                <Link
                  to={lockedCount > 0 ? "/admin/users?status=LOCKED" : "/admin/users?status=INACTIVE"}
                  className="font-bold text-primary-700 hover:underline whitespace-nowrap"
                >
                  Kiểm tra danh sách tài khoản →
                </Link>
              </div>
            )}

            {/* Nội dung chính: Phân bổ theo vai trò & Tài khoản mới nhất */}
            <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
              {/* Cột trái: Phân bổ theo vai trò */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-heading font-bold text-base text-slate-900">
                      Phân bổ theo vai trò
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tỷ trọng tài khoản theo từng nhóm người dùng
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {roles.length} vai trò
                  </span>
                </div>

                <ul className="space-y-4 mt-5">
                  {roles.map(([role, count]) => {
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    const barColor = ROLE_BAR_COLORS[role] || "bg-primary-500";
                    return (
                      <li key={role}>
                        <Link
                          to={`/admin/users?role=${role}`}
                          className="block p-2.5 -mx-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                              {ROLE_LABELS[role] || role}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-mono">{percent}%</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {count}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full transition-all duration-300`}
                              style={{ width: `${(count / maxRole) * 100}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Cột phải: Tài khoản mới nhất */}
              <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-heading font-bold text-base text-slate-900">
                      Tài khoản mới đăng ký
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Danh sách các tài khoản vừa được tạo gần đây nhất
                    </p>
                  </div>
                  <Link
                    to="/admin/users"
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Xem tất cả →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-100">
                        <th className="px-5 py-3 font-semibold">Người dùng</th>
                        <th className="px-4 py-3 font-semibold">Vai trò</th>
                        <th className="px-4 py-3 font-semibold">Trạng thái</th>
                        <th className="px-5 py-3 font-semibold text-right">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recent.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-50 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {getInitials(user.full_name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">{user.full_name}</div>
                                <div className="text-xs text-slate-500 truncate">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
