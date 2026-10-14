import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/api/adminApi";
import { PageHeader, ROLE_LABELS, StatusBadge, formatDate } from "./adminUi";

export default function AdminHomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .getOverview()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const flagged = (data?.by_status?.LOCKED || 0) + (data?.by_status?.INACTIVE || 0);
  const roles = Object.entries(data?.by_role || {}).sort((a, b) => b[1] - a[1]);
  const maxRole = Math.max(1, ...roles.map(([, count]) => count));

  return (
    <>
      <PageHeader title="Home">
        <Link
          to="/admin/users"
          className="px-4 py-2 rounded-8 bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600"
        >
          Manage users
        </Link>
      </PageHeader>

      <div className="px-8 py-6 max-w-5xl space-y-8">
        {error && (
          <p role="alert" className="text-sm text-red-700 bg-danger-100 rounded-8 px-4 py-3">
            Could not load the overview: {error}
          </p>
        )}
        {!data && !error && (
          <p className="text-sm text-text-secondary">Loading accounts...</p>
        )}

        {data && (
          <>
            <section className="flex flex-wrap items-end gap-x-12 gap-y-4">
              <div>
                <div className="font-heading font-800 text-5xl text-text-primary">
                  {data.total}
                </div>
                <div className="text-sm text-text-secondary">accounts on the platform</div>
              </div>
              <dl className="flex gap-8 text-sm">
                <div>
                  <dt className="text-text-secondary">Active</dt>
                  <dd className="font-heading font-700 text-xl">{data.by_status.ACTIVE || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Inactive</dt>
                  <dd className="font-heading font-700 text-xl">{data.by_status.INACTIVE || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Locked</dt>
                  <dd className="font-heading font-700 text-xl">{data.by_status.LOCKED || 0}</dd>
                </div>
              </dl>
              {flagged > 0 && (
                <Link
                  to="/admin/users?status=LOCKED"
                  className="text-sm font-semibold text-primary-600 underline underline-offset-2"
                >
                  Review locked accounts
                </Link>
              )}
            </section>

            <div className="grid lg:grid-cols-[2fr_3fr] gap-8">
              <section>
                <h2 className="font-heading font-700 text-base mb-3">Accounts by role</h2>
                <ul className="space-y-3">
                  {roles.map(([role, count]) => (
                    <li key={role}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{ROLE_LABELS[role] || role}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-4">
                        <div
                          className="h-1.5 bg-primary-500 rounded-4"
                          style={{ width: `${(count / maxRole) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="font-heading font-700 text-base mb-3">Newest accounts</h2>
                <div className="bg-white border border-border rounded-8 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-secondary border-b border-border">
                        <th className="px-4 py-2 font-semibold">Name</th>
                        <th className="px-4 py-2 font-semibold">Role</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((user) => (
                        <tr key={user.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-xs text-text-secondary">{user.email}</div>
                          </td>
                          <td className="px-4 py-2">{ROLE_LABELS[user.role] || user.role}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-4 py-2">{formatDate(user.created_at)}</td>
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
