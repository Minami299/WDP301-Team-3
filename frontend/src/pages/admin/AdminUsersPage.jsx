import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { adminApi } from "../../services/api/adminApi";
import {
  PageHeader,
  ROLE_LABELS,
  STATUS_LABELS,
  StatusBadge,
  formatDate,
} from "./adminUi";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_name: "CUSTOMER",
  status: "ACTIVE",
};

import { Dialog, Field, inputClass } from "./adminDialogs";

function UserForm({ user, canAssignPrivileged, onSaved, onClose }) {
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

  const roleOptions = Object.keys(ROLE_LABELS).filter(
    (role) => canAssignPrivileged || !["ADMIN", "MANAGER"].includes(role),
  );

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form };
    if (editing && !payload.password) delete payload.password;
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
    <Dialog title={editing ? "Edit account" : "Create account"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Full name">
          <input className={inputClass} required maxLength={120} value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} maxLength={30} value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label={editing ? "New password (leave blank to keep)" : "Password"}>
          <input
            className={inputClass}
            type="password"
            minLength={8}
            required={!editing}
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className={inputClass} value={form.role_name} onChange={set("role_name")}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={set("status")}>
              {Object.entries(STATUS_LABELS).filter(([value]) => value !== 'PENDING' || ['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(form.role_name)).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-8 text-sm font-semibold border border-border hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-8 text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60">
            {saving ? "Saving..." : editing ? "Save changes" : "Create account"}
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
  const approvalStatus = params.get('approvalStatus') || '';
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
      .listUsers({ search, role, status, approvalStatus, page, limit: 15 })
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
    const next = lockTarget.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    if (next === 'LOCKED' && !lockReason.trim()) {
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

  return (
    <>
      <PageHeader title="Users">
        <button
          onClick={() => setEditor({})}
          className="px-4 py-2 rounded-8 bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600"
        >
          Create account
        </button>
      </PageHeader>

      <div className="px-8 py-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Search users"
            className={`${inputClass} max-w-xs`}
            placeholder="Search name, email or phone"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select aria-label="Filter by role" className={`${inputClass} w-44`} value={role} onChange={(event) => updateParams({ role: event.target.value })}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select aria-label="Filter by status" className={`${inputClass} w-40`} value={status} onChange={(event) => updateParams({ status: event.target.value })}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select aria-label="Filter by approval" className={`${inputClass} w-44`} value={approvalStatus} onChange={event => updateParams({ approvalStatus: event.target.value })}><option value="">All approvals</option><option value="PENDING">Pending Approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-danger-100 rounded-8 px-4 py-3">
            Could not load users: {error}
          </p>
        )}

        <div className="bg-white border border-border rounded-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result?.items.map((user) => {
                const self = user.id === currentUser?.id;
                const protectedRow = !isAdmin && ["ADMIN", "MANAGER"].includes(user.role);
                return (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-xs text-text-secondary">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role] || user.role}</td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} />{user.status === 'LOCKED' && user.lockReason && <div className="mt-1 max-w-xs text-xs text-text-secondary break-words">Lý do: {user.lockReason}</div>}{user.approvalStatus && <div className="mt-1"><StatusBadge status={user.approvalStatus} /></div>}</td>
                    <td className="px-4 py-3">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {protectedRow ? (
                        <span className="text-xs text-text-secondary">Admin only</span>
                      ) : (
                        <>
                          <button onClick={() => setEditor(user)} className="px-3 py-1 rounded-8 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                            Edit
                          </button>
                          {!self && user.status !== 'PENDING' && (
                            <button
                              onClick={() => { setLockError(""); setLockReason(""); setLockTarget(user); }}
                              className="px-3 py-1 rounded-8 text-sm font-semibold text-red-700 hover:bg-danger-100"
                            >
                              {user.status === "LOCKED" ? "Unlock" : "Lock"}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && !result && <p className="px-4 py-6 text-sm text-text-secondary">Loading users...</p>}
          {result && result.items.length === 0 && (
            <p className="px-4 py-8 text-sm text-text-secondary">
              {filtered
                ? "No accounts match these filters. Clear the search or pick a different role or status."
                : "There are no accounts yet. Use Create account to add the first one."}
            </p>
          )}
        </div>

        {result && (
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>{result.total} accounts</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })} className="px-3 py-1 rounded-8 border border-border disabled:opacity-40">
                Previous
              </button>
              <span>Page {result.page} of {result.pages}</span>
              <button disabled={page >= result.pages} onClick={() => updateParams({ page: String(page + 1) })} className="px-3 py-1 rounded-8 border border-border disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editor && (
        <UserForm
          user={editor.id ? editor : null}
          canAssignPrivileged={isAdmin}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); load(); }}
        />
      )}

      {lockTarget && (
        <Dialog
          title={lockTarget.status === "LOCKED" ? "Unlock this account?" : "Lock this account?"}
          onClose={() => setLockTarget(null)}
        >
          <p className="text-sm text-text-secondary mb-4">
            {lockTarget.status === "LOCKED"
              ? `${lockTarget.full_name} will be able to sign in again.`
              : `${lockTarget.full_name} will be blocked from signing in until you unlock the account.`}
          </p>
          {lockTarget.status !== "LOCKED" && (
            <Field label="Lock reason (required)">
              <textarea aria-label="Lock reason" maxLength={1000} rows={3} className={inputClass} value={lockReason} onChange={(event) => setLockReason(event.target.value)} />
            </Field>
          )}
          {lockError && <p role="alert" className="text-sm text-red-700 my-3">{lockError}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setLockTarget(null)} className="px-4 py-2 rounded-8 text-sm font-semibold border border-border hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={confirmToggle} disabled={lockTarget.status !== "LOCKED" && !lockReason.trim()} className="px-4 py-2 rounded-8 text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
              {lockTarget.status === "LOCKED" ? "Unlock account" : "Lock account"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
