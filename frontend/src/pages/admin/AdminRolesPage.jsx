import { useEffect, useState } from "react";
import { adminApi } from "../../services/api/adminApi";
import { PageHeader, ROLE_LABELS } from "./adminUi";

export default function AdminRolesPage() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [savedId, setSavedId] = useState("");

  useEffect(() => {
    adminApi
      .listRoles()
      .then((res) => {
        setData(res.data);
        setDraft(
          Object.fromEntries(res.data.roles.map((role) => [role.id, role.permissions])),
        );
      })
      .catch((err) => setError(err.message));
  }, []);

  const toggle = (role, key) => {
    setSavedId("");
    setDraft((current) => {
      const has = current[role.id].includes(key);
      return {
        ...current,
        [role.id]: has
          ? current[role.id].filter((item) => item !== key)
          : [...current[role.id], key],
      };
    });
  };

  const save = async (role) => {
    setSavingId(role.id);
    setError("");
    try {
      await adminApi.setRolePermissions(role.id, draft[role.id]);
      setData((current) => ({
        ...current,
        roles: current.roles.map((item) =>
          item.id === role.id ? { ...item, permissions: draft[role.id] } : item,
        ),
      }));
      setSavedId(role.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  const groups = data
    ? [...new Set(data.catalog.map((permission) => permission.group))]
    : [];

  return (
    <>
      <PageHeader title="Roles and access" />
      <div className="px-8 py-6 space-y-4 max-w-5xl">
        <p className="text-sm text-text-secondary">
          Each role gets only the admin actions ticked below. Admin always keeps every permission so the
          platform cannot be locked out. Changes apply on the next request, with no re-login needed.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700 bg-danger-100 rounded-8 px-4 py-3">{error}</p>
        )}
        {!data && !error && <p className="text-sm text-text-secondary">Loading roles...</p>}

        {data && (
          <div className="bg-white border border-border rounded-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="px-4 py-3 font-semibold text-text-secondary">Permission</th>
                  {data.roles.map((role) => (
                    <th key={role.id} className="px-4 py-3 font-semibold text-center">
                      <div>{ROLE_LABELS[role.role_name] || role.role_name}</div>
                      <div className="text-xs font-normal text-text-secondary">{role.user_count} users</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <GroupRows key={group} group={group} data={data} draft={draft} toggle={toggle} />
                ))}
                <tr>
                  <td className="px-4 py-3" />
                  {data.roles.map((role) => {
                    const dirty =
                      [...draft[role.id]].sort().join() !== [...role.permissions].sort().join();
                    return (
                      <td key={role.id} className="px-4 py-3 text-center">
                        {role.locked ? (
                          <span className="text-xs text-text-secondary">Fixed</span>
                        ) : (
                          <button
                            disabled={!dirty || savingId === role.id}
                            onClick={() => save(role)}
                            className="px-3 py-1.5 rounded-8 text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40"
                          >
                            {savingId === role.id ? "Saving..." : savedId === role.id ? "Saved" : "Save"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function GroupRows({ group, data, draft, toggle }) {
  return (
    <>
      <tr className="bg-slate-50">
        <td colSpan={data.roles.length + 1} className="px-4 py-2 text-xs font-semibold text-text-secondary">
          {group}
        </td>
      </tr>
      {data.catalog
        .filter((permission) => permission.group === group)
        .map((permission) => (
          <tr key={permission.key} className="border-b border-border last:border-0">
            <td className="px-4 py-3">{permission.label}</td>
            {data.roles.map((role) => (
              <td key={role.id} className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-500"
                  aria-label={`${permission.label} for ${ROLE_LABELS[role.role_name] || role.role_name}`}
                  checked={draft[role.id].includes(permission.key)}
                  disabled={role.locked}
                  onChange={() => toggle(role, permission.key)}
                />
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}
