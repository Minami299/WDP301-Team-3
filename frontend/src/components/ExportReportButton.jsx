import { useRef, useState } from 'react';
import { exportRevenueReport } from '../services/api/reportExportApi';

export default function ExportReportButton({ period, vendorId, partner = false, disabled = false, empty = false }) {
  const [format, setFormat] = useState('xlsx');
  const [state, setState] = useState({ busy: false, key: '', error: '', filename: '' });
  const exporting = useRef(false);
  const key = JSON.stringify([period.from, period.to, vendorId, partner]);
  const download = async () => {
    if (disabled || exporting.current) return;
    exporting.current = true;
    setState({ busy: true, key, error: '', filename: '' });
    try {
      const file = await exportRevenueReport({ from: period.from, to: period.to, format, ...(vendorId ? { vendor_id: vendorId } : {}) }, partner);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setState({ busy: false, key, error: '', filename: file.filename });
    } catch (error) { setState({ busy: false, key, error: error.message || 'Không xuất được báo cáo.', filename: '' }); }
    finally { exporting.current = false; }
  };
  return <div className="space-y-2" aria-busy={state.busy} data-report-export>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm">Định dạng <select aria-label="Định dạng xuất báo cáo" value={format} disabled={state.busy} onChange={event => setFormat(event.target.value)} className="ml-2 border border-border rounded-8 px-3 py-2 bg-white">
        <option value="xlsx">Excel (.xlsx)</option><option value="pdf">PDF</option>
      </select></label>
      <button type="button" onClick={download} disabled={disabled || state.busy} className="px-4 py-2 rounded-8 bg-primary-500 text-white text-sm font-semibold disabled:opacity-40">{state.busy ? 'Đang xuất báo cáo...' : 'Xuất báo cáo'}</button>
      <span className="text-xs text-text-secondary">Xuất toàn bộ giao dịch của kỳ đã áp dụng.</span>
    </div>
    {empty && <p className="text-xs text-text-secondary">Kỳ này không có giao dịch; file xuất vẫn có phần tổng hợp và tiêu đề.</p>}
    {state.key === key && state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.key === key && state.filename && <p role="status" className="text-sm text-emerald-700">Đã tải: {state.filename}</p>}
  </div>;
}
