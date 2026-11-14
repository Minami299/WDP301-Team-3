import { useCallback, useEffect, useState } from 'react';
import { qrApi } from '../services/api/qrApi';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const hhmm = (value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

export default function QrNoShowPanel({ refreshKey = 0 }) {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    qrApi.getNoShows({ date })
      .then((response) => setReport(response.data))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(load, [load, refreshKey]);

  return <section className="mt-8">
    <div className="flex items-center justify-between mb-2 gap-2">
      <h2 className="font-heading font-700 text-text-primary text-base">Guests who have not checked in</h2>
      <div className="flex items-center gap-2">
        <input type="date" value={date} max={today()} onChange={(event) => event.target.value && setDate(event.target.value)} className="border border-border rounded-lg px-2 py-1 text-xs" />
        <button onClick={load} className="text-xs text-primary-600 font-semibold">Refresh</button>
      </div>
    </div>
    <p className="text-xs text-text-primary-500 mb-3">Name and phone are shown only after the check-in time has passed by {report?.grace_minutes ? report.grace_minutes / 60 : 2} hours.</p>
    {error && <p className="text-sm text-danger-600">{error}</p>}
    {loading && <p className="text-sm text-text-primary-500">Loading…</p>}
    {!loading && !error && !(report?.data || []).length && <p className="py-4 text-center text-sm text-text-primary-500">No overdue guests on {date}.</p>}
    <div className="space-y-2">
      {(report?.data || []).map((guest) => <div key={guest.detail_id} className="rounded-xl border border-warning-200 bg-warning-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-text-primary truncate">{guest.guest_name}</div>
            <a href={`tel:${guest.guest_phone}`} className="text-sm text-primary-700 font-semibold">{guest.guest_phone}</a>
            <div className="text-xs text-text-primary-500 truncate">{guest.service_name} · {guest.facility_name}</div>
            <div className="font-mono text-[10px] text-text-primary-400">{guest.qr_code} · {guest.booking_code}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold text-warning-700">NOT CHECKED IN</div>
            <div className="text-xs text-text-primary-500">Due {hhmm(guest.check_in_due_at)}</div>
            <div className="text-xs text-text-primary-500">{Math.floor(guest.overdue_minutes / 60)}h {guest.overdue_minutes % 60}m late</div>
          </div>
        </div>
      </div>)}
    </div>
  </section>;
}
