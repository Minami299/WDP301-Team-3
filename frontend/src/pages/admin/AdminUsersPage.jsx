import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { adminApi } from "../../services/api/adminApi";
import {
  PageHeader,
  ROLE_LABELS,
  RoleBadge,
  STATUS_LABELS,
  StatusBadge,
  formatDate,
  getInitials,
} from "./adminUi";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_name: "CUSTOMER",
  status: "ACTIVE",
};

const ROLE_TABS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "HOTEL_OWNER", label: "Chủ khách sạn" },
  { value: "ACTIVITY_VENDOR", label: "Đối tác tham quan" },
  { value: "MANAGER", label: "Quản lý kinh doanh" },
  { value: "ADMIN", label: "Quản trị viên" },
];

const LIMIT = 15;

import { Dialog, Field, inputClass } from "./adminDialogs";

function UserForm({ user, onSaved, onClose }) {
  const editing = Boolean(user);
  const [form, setForm] = useState(
    editing
      ? {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone || "",
          password: "",
          role_name: user.role,
          status: user.status,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const CREATABLE_ROLES = ["CUSTOMER", "MANAGER", "ADMIN"];
  const roleOptions = editing ? [user.role] : CREATABLE_ROLES;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form };
    if (editing) delete payload.role_name;
    if (editing && !payload.password) delete payload.password;
    if (editing && user.role === "MANAGER") {
      delete payload.email;
      delete payload.password;
    }
    try {
      if (editing) await adminApi.updateUser(user.id, payload);
      else await adminApi.createUser(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Dialog title={editing ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Họ và tên">
          <input
            className={inputClass}
            required
            maxLength={120}
            placeholder="Nhập họ và tên người dùng"
            value={form.full_name}
            onChange={set("full_name")}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              required
              disabled={editing && user.role === "MANAGER"}
              placeholder="name@example.com"
              value={form.email}
              onChange={set("email")}
            />
          </Field>
          <Field label="Số điện thoại">
            <input
              className={inputClass}
              maxLength={30}
              placeholder="09xxxxxxxx"
              value={form.phone}
              onChange={set("phone")}
            />
          </Field>
        </div>
        <Field label={editing ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu"}>
          <input
            className={inputClass}
            disabled={editing && user.role === "MANAGER"}
            type="password"
            minLength={8}
            required={!editing}
            autoComplete="new-password"
            placeholder={editing ? "••••••••" : "Tối thiểu 8 ký tự"}
            value={form.password}
            onChange={set("password")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vai trò">
            <select disabled={editing} className={inputClass} value={form.role_name} onChange={set("role_name")}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select className={inputClass} value={form.status} onChange={set("status")}>
              {Object.entries(STATUS_LABELS)
                .filter(
                  ([value]) =>
                    !["APPROVED", "REJECTED"].includes(value) &&
                    (value !== "PENDING" || ["HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(form.role_name)),
                )
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
          </Field>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-600 space-y-1">
          <p>
            Vai trò đối tác (Chủ khách sạn, Đối tác tham quan) được cấp qua quy trình xét duyệt tại mục{" "}
            <strong>Duyệt hồ sơ đối tác</strong>.
          </p>
          {editing && user.role === "MANAGER" && (
            <p className="text-amber-800">
              Thông tin đăng nhập Quản lý kinh doanh được quản lý theo quy trình nhân sự riêng.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const role = params.get("role") || "";
  const status = params.get("status") || "";
  const approvalStatus = params.get("approvalStatus") || "";
  const page = Number(params.get("page")) || 1;

  const [searchText, setSearchText] = useState(search);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [lockError, setLockError] = useState("");
  const [lockReason, setLockReason] = useState("");

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listUsers({ search, role, status, approvalStatus, page, limit: LIMIT })
      .then((res) => {
        setResult(res.data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, role, status, approvalStatus, page]);

  useEffect(load, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== search) updateParams({ search: searchText.trim() });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const confirmToggle = async () => {
    const next = lockTarget.status === "LOCKED" ? "ACTIVE" : "LOCKED";
    if (next === "LOCKED" && !lockReason.trim()) {
      setLockError("Vui lòng nhập lý do khóa tài khoản");
      return;
    }
    try {
      await adminApi.setUserStatus(lockTarget.id, next, lockReason.trim());
      setLockTarget(null);
      setLockError("");
      setLockReason("");
      load();
    } catch (err) {
      setLockError(err.message);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const filtered = Boolean(search || role || status || approvalStatus);

  const totalItems = result?.total || 0;
  const totalPages = Math.max(1, result?.pages || 1);
  const startItem = totalItems === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endItem = Math.min(totalItems, page * LIMIT);

  return (
    <>
      <PageHeader title="Quản lý tài khoản">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            type="button"
            onClick={() => setEditor({})}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-xs sm:text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
          >
            + Tạo tài khoản
          </button>
        </div>
      </PageHeader>

      <div className="px-4 sm:px-8 py-6 max-w-screen-2xl space-y-4">
        {/* Bộ lọc & Thanh công cụ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
          {/* Thanh chọn nhanh vai trò */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_TABS.map((tab) => {
                const active = role === tab.value;
                return (
                  <button
                    key={tab.value || "ALL"}
                    type="button"
                    onClick={() => updateParams({ role: tab.value })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {result && (
              <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {totalItems.toLocaleString("vi-VN")} tài khoản
              </span>
            )}
          </div>

          {/* Ô tìm kiếm & bộ lọc chi tiết */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                aria-label="Tìm kiếm tài khoản"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <select
              aria-label="Lọc theo vai trò"
              className="w-full sm:w-auto min-w-[155px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              value={role}
              onChange={(event) => updateParams({ role: event.target.value })}
            >
              <option value="">Tất cả vai trò</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái"
              className="w-full sm:w-auto min-w-[155px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              value={status}
              onChange={(event) => updateParams({ status: event.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS)
                .filter(([value]) => !["APPROVED", "REJECTED"].includes(value))
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>

            <select
              aria-label="Lọc theo xét duyệt"
              className="w-full sm:w-auto min-w-[155px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              value={approvalStatus}
              onChange={(event) => updateParams({ approvalStatus: event.target.value })}
            >
              <option value="">Tất cả hồ sơ đối tác</option>
              <option value="PENDING">Hồ sơ: Chờ duyệt</option>
              <option value="APPROVED">Hồ sơ: Đã duyệt</option>
              <option value="REJECTED">Hồ sơ: Từ chối</option>
            </select>

            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setParams({}, { replace: true });
                }}
                className="px-3 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
            Không thể tải danh sách tài khoản: {error}
          </p>
        )}

        {/* Bảng danh sách tài khoản */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                  <th className="px-5 py-3.5 font-semibold">Người dùng</th>
                  <th className="px-4 py-3.5 font-semibold">Vai trò</th>
                  <th className="px-4 py-3.5 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3.5 font-semibold">Ngày tạo</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result?.items.map((user) => {
                  const self = user.id === currentUser?.id;
                  const protectedRow = !isAdmin && ["ADMIN", "MANAGER"].includes(user.role);
                  const isPartner = ["HOTEL_OWNER", "ACTIVITY_VENDOR"].includes(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-50 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {getInitials(user.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 truncate">{user.full_name}</span>
                              {self && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                              <span className="truncate">{user.email}</span>
                              {user.phone && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-slate-600">{user.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={user.status} />
                          {isPartner && user.approvalStatus && user.approvalStatus !== "APPROVED" && (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Hồ sơ: {STATUS_LABELS[user.approvalStatus] || user.approvalStatus}
                            </span>
                          )}
                        </div>
                        {user.status === "LOCKED" && user.lockReason && (
                          <div className="mt-1.5 max-w-xs text-xs text-rose-700 bg-rose-50/70 border border-rose-100 rounded-lg px-2.5 py-1 break-words">
                            Lý do khóa: {user.lockReason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {protectedRow ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                            Chỉ Quản trị viên
                          </span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditor(user)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                            >
                              Chỉnh sửa
                            </button>
                            {!self && user.status !== "PENDING" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLockError("");
                                  setLockReason("");
                                  setLockTarget(user);
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                  user.status === "LOCKED"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                }`}
                              >
                                {user.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading && !result && (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Đang tải danh sách tài khoản...
            </div>
          )}

          {result && result.items.length === 0 && (
            <div className="px-5 py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                {filtered
                  ? "Không tìm thấy tài khoản nào khớp với bộ lọc hiện tại."
                  : "Chưa có tài khoản nào trên hệ thống."}
              </p>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setParams({}, { replace: true });
                  }}
                  className="text-xs font-semibold text-primary-600 hover:underline cursor-pointer"
                >
                  Đặt lại toàn bộ bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Chân bảng tích hợp phân trang */}
          {result && result.items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 text-xs sm:text-sm text-slate-600">
              <div>
                Hiển thị <strong className="font-mono text-slate-900">{startItem}–{endItem}</strong> trên tổng số{" "}
                <strong className="font-mono text-slate-900">{totalItems.toLocaleString("vi-VN")}</strong> tài khoản
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  ← Trước
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-700">
                  Trang {result.page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editor && (
        <UserForm
          user={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load();
          }}
        />
      )}

      {lockTarget && (
        <Dialog
          title={lockTarget.status === "LOCKED" ? "Mở khóa tài khoản" : "Khóa tài khoản người dùng"}
          onClose={() => setLockTarget(null)}
        >
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-50 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
              {getInitials(lockTarget.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-slate-900 truncate">{lockTarget.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{lockTarget.email}</div>
            </div>
            <RoleBadge role={lockTarget.role} />
          </div>

          <p className="text-sm text-slate-600 mb-4">
            {lockTarget.status === "LOCKED"
              ? "Tài khoản này sẽ được khôi phục trạng thái hoạt động và người dùng có thể đăng nhập trở lại."
              : "Người dùng sẽ bị đăng xuất và chặn truy cập hệ thống cho đến khi được mở khóa."}
          </p>

          {lockTarget.status !== "LOCKED" && (
            <Field label="Lý do khóa tài khoản (bắt buộc)">
              <textarea
                aria-label="Lý do khóa"
                maxLength={1000}
                rows={3}
                placeholder="Nhập lý do khóa tài khoản để lưu nhật ký kiểm duyệt..."
                className={inputClass}
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
              />
            </Field>
          )}

          {lockError && (
            <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 my-3">
              {lockError}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLockTarget(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmToggle}
              disabled={lockTarget.status !== "LOCKED" && !lockReason.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 cursor-pointer ${
                lockTarget.status === "LOCKED"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {lockTarget.status === "LOCKED" ? "Xác nhận mở khóa" : "Xác nhận khóa tài khoản"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
