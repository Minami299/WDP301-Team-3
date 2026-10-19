import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingApi } from '../../services/api/bookingApi';
import TripCard from '../../components/TripCard';
import { groupTrips } from '../../utils/tripManagement';

const tabs = [
  { id: 'upcoming', label: 'Sắp tới' },
  { id: 'completed', label: 'Đã hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export default function MyTripsPage() {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [params, setParams] = useSearchParams();
  const activeTab = tabs.some((tab) => tab.id === params.get('tab'))
    ? params.get('tab')
    : 'upcoming';
  const loading = result?.revision !== revision;
  const data = loading ? null : result.data;
  const error = loading ? '' : result.error;

  useEffect(() => {
    let active = true;
    bookingApi
      .list()
      .then((response) => {
        if (active) setResult({ revision, data: response.data });
      })
      .catch((err) => {
        if (active) setResult({ revision, error: err.message });
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const groups = groupTrips(data || []);
  const tabCounts = {
    upcoming: groups.upcoming.length + groups.pending.length,
    completed: groups.completed.length,
    cancelled: groups.cancelled.length,
  };
  const changeTab = (id) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', id);
      return next;
    });

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-7 sm:py-10"
      aria-labelledby="my-trips-title"
    >
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-blue-600">My Trips</p>
          <h1
            id="my-trips-title"
            className="text-2xl font-bold text-slate-900 sm:text-3xl"
          >
            Chuyến đi của tôi
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi chuyến đi, vé sử dụng và biên nhận đặt chỗ.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
          className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Tải lại
        </button>
      </div>
      <div
        role="tablist"
        aria-label="Trạng thái chuyến đi"
        className="mb-6 flex overflow-x-auto border-b border-slate-200"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => changeTab(tab.id)}
            onKeyDown={(event) => {
              const offset =
                event.key === 'ArrowRight'
                  ? 1
                  : event.key === 'ArrowLeft'
                    ? -1
                    : 0;
              const nextIndex =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : offset
                      ? (index + offset + tabs.length) % tabs.length
                      : null;
              if (nextIndex !== null) {
                event.preventDefault();
                changeTab(tabs[nextIndex].id);
                document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
              }
            }}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition sm:px-6 ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-600'}`}
          >
            {tab.label}
            {data && !loading && !error && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>
      {loading ? (
        <div
          role="status"
          className="rounded-2xl border bg-white p-8 text-center text-slate-500"
        >
          Đang tải chuyến đi...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-6"
        >
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="mt-3 text-sm font-semibold text-blue-700 underline"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'upcoming' && groups.pending.length > 0 && (
            <section
              className="mb-7 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5"
              aria-labelledby="pending-title"
            >
              <h2 id="pending-title" className="font-bold text-amber-900">
                Đơn chờ thanh toán ({groups.pending.length})
              </h2>
              <p className="mb-4 mt-1 text-sm text-amber-800">
                Mở chi tiết đơn để tiếp tục thanh toán và theo dõi thời hạn giữ
                chỗ.
              </p>
              <div className="space-y-4">
                {groups.pending.map((booking) => (
                  <TripCard key={booking._id} booking={booking} />
                ))}
              </div>
            </section>
          )}
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="space-y-5"
          >
            {groups[activeTab].length ? (
              groups[activeTab].map((booking) => (
                <TripCard key={booking._id} booking={booking} />
              ))
            ) : activeTab === 'upcoming' && groups.pending.length > 0 ? null : (
              <div className="rounded-2xl border border-slate-200 bg-white p-9 text-center">
                <h2 className="font-semibold text-slate-800">
                  {!data?.length
                    ? 'Bạn chưa có đơn đặt chỗ nào'
                    : `Chưa có chuyến đi ${tabs.find((tab) => tab.id === activeTab).label.toLowerCase()}`}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Chuyến đi sẽ được hiển thị theo trạng thái đặt chỗ của bạn.
                </p>
                <Link
                  to="/search"
                  className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Khám phá dịch vụ
                </Link>
              </div>
            )}
          </div>
          {activeTab === 'upcoming' && groups.other.length > 0 && (
            <section className="mt-8" aria-labelledby="other-trips-title">
              <h2
                id="other-trips-title"
                className="text-lg font-bold text-slate-800"
              >
                Các đơn khác
              </h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                Đơn đã qua ngày sử dụng nhưng chưa được đánh dấu hoàn thành và
                các trạng thái khác vẫn được giữ tại đây.
              </p>
              <div className="space-y-5">
                {groups.other.map((booking) => (
                  <TripCard key={booking._id} booking={booking} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
