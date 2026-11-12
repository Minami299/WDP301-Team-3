import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { checkinApi } from '../../services/api/checkinApi';
import { formatStay, formatUsedAt } from '../../utils/checkinLink';

const OUTCOMES = {
  READY: null,
  VALID: {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    title: 'Đã check-in thành công',
    text: 'Mã này đã bị vô hiệu và không thể dùng lại. Cho khách vào.',
  },
  ALREADY_REDEEMED: {
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    title: 'Mã đã được sử dụng',
    text: 'Không cho khách vào bằng mã này. Hỏi khách hoặc báo quản lý cơ sở nếu có thắc mắc.',
  },
  WRONG_DATE: {
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    title: 'Chưa đúng ngày sử dụng',
    text: 'Mã chỉ có hiệu lực trong khoảng ngày bên dưới. Chưa check-in.',
  },
  INVALID: {
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
    title: 'Mã không hợp lệ',
    text: 'Mã không tồn tại, chưa thanh toán hoặc đơn đã huỷ. Không cho khách vào bằng mã này.',
  },
};

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function CheckinPage() {
  const { code } = useParams();
  const [state, setState] = useState({ code: null });
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    let active = true;
    checkinApi
      .preview(code)
      .then((response) => active && setState({ code, attempt, data: response.data }))
      .catch((error) => active && setState({ code, attempt, error: error.message }));
    return () => {
      active = false;
    };
  }, [code, attempt]);

  const loading = state.code !== code || state.attempt !== attempt;
  const data = loading ? null : state.data;
  const outcome = data ? OUTCOMES[data.result] : null;

  const confirm = async () => {
    setSubmitting(true);
    setConfirmError('');
    try {
      const response = await checkinApi.confirm(code);
      setState({ code, attempt, data: response.data });
    } catch (error) {
      setConfirmError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold text-blue-700">Travelio</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Check-in khách</h1>

        <p role="note" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-semibold">Chỉ nhân viên của cơ sở mới được quét và xác nhận.</span> Khách không tự quét mã của mình.
          Mỗi mã chỉ check-in được một lần, quét nhầm sẽ làm khách mất quyền sử dụng.
        </p>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
          {loading && <p role="status" className="py-6 text-center text-sm text-slate-500">Đang kiểm tra mã...</p>}

          {!loading && state.error && (
            <div role="alert">
              <p className="text-sm text-rose-700">{state.error}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Kiểm tra lại
              </button>
            </div>
          )}

          {data && (
            <>
              {outcome && (
                <div role="status" className={`rounded-xl border p-4 ${outcome.tone}`}>
                  <p className="text-base font-bold">{outcome.title}</p>
                  <p className="mt-1 text-sm">{outcome.text}</p>
                </div>
              )}
              {data.result !== 'INVALID' && (
                <dl className="mt-3 divide-y divide-slate-100">
                  <Row label="Cơ sở" value={data.facility_name} />
                  <Row label="Dịch vụ" value={data.service_name} />
                  <Row label="Ngày sử dụng" value={formatStay(data.date_from, data.date_to)} />
                  <Row label="Khách" value={data.guest_name} />
                  <Row label="Mã đơn" value={data.booking_code} />
                  <Row label="Đã dùng lúc" value={data.result === 'ALREADY_REDEEMED' || data.result === 'VALID' ? formatUsedAt(data.checked_in_at) : ''} />
                </dl>
              )}
              {data.result === 'READY' && (
                <>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={submitting}
                    className="mt-4 min-h-[48px] w-full rounded-lg bg-blue-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    {submitting ? 'Đang check-in...' : 'Check-in khách này'}
                  </button>
                  {confirmError && <p role="alert" className="mt-3 text-sm text-rose-700">{confirmError}</p>}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
