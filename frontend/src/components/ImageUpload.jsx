import { useEffect, useId, useRef, useState } from 'react';
import { facilityImageApi } from '../services/api/facilityImageApi';
import { IconCamera, IconX } from './Icons';
import { IMAGE_TYPES, isUploadedImage, validateImageFiles } from '../utils/imageUpload';

export default function ImageUpload({ value = [], onChange, label = 'Hình ảnh', maxImages = 10, kind = 'ROOM', disabled = false, error = '', onBusyChange }) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const locked = disabled || uploading;
  const message = uploadError || error;
  const upload = async (selection) => {
    const files = Array.from(selection || []);
    if (!files.length || disabled || sending.current) return;
    const invalid = validateImageFiles(files, value.length, maxImages);
    setUploadError(invalid);
    if (invalid) return;
    sending.current = true; setUploading(true); onBusyChange?.(true);
    try {
      const response = kind === 'TICKET' ? await facilityImageApi.uploadServiceImages(files) : await facilityImageApi.uploadRoomImages(files);
      const urls = response.data;
      if (!Array.isArray(urls) || urls.length !== files.length || !urls.every(isUploadedImage)) throw new Error('Chưa tải được đầy đủ ảnh. Vui lòng thử lại.');
      if (mounted.current) onChange([...value, ...urls]);
    } catch (e) { if (mounted.current) setUploadError(e.message || 'Tải ảnh thất bại. Vui lòng thử lại.'); }
    finally { sending.current = false; if (mounted.current) setUploading(false); onBusyChange?.(false); }
  };
  return <section aria-label={label} aria-busy={uploading} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><label htmlFor={id} className="text-sm font-bold text-slate-800">{label}</label><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">{value.length}/{maxImages} ảnh</span></div>
    <p id={`${id}-help`} className="text-xs text-slate-500 mb-4">Chọn ảnh từ thiết bị hoặc kéo thả vào ô bên dưới. JPG, PNG, WebP; tối đa 5 MB/ảnh.</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {value.map((url, index) => <div key={`${url}-${index}`} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img src={url} alt={`${label} ${index + 1}`} className="h-full w-full object-cover" />
        {index === 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">Ảnh đại diện</span>}
        <button type="button" disabled={locked} aria-label={`Xóa ảnh ${index + 1}`} title="Xóa ảnh khỏi danh sách" className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/75 text-white transition hover:bg-rose-600 focus:opacity-100 disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100" onClick={() => { setUploadError(''); onChange(value.filter((_, i) => i !== index)); }}><IconX size={14} /></button>
      </div>)}
      {(value.length < maxImages || uploading) && <label htmlFor={id} onDragOver={e => { e.preventDefault(); if (!locked) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!locked) upload(e.dataTransfer.files); }} className={`relative flex aspect-video flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition focus-within:ring-2 focus-within:ring-primary-500 ${locked ? 'cursor-wait border-slate-200 opacity-60' : dragging ? 'border-primary-500 bg-primary-50' : 'cursor-pointer border-slate-300 hover:border-primary-500 hover:bg-primary-50/40'}`}>
        <input id={id} type="file" accept={IMAGE_TYPES.join(',')} multiple disabled={locked} aria-label={`Tải ${label.toLocaleLowerCase('vi')} từ thiết bị`} aria-invalid={Boolean(message)} aria-describedby={`${id}-help${message ? ` ${id}-error` : ''}`} className="sr-only" onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; upload(files); }} />
        {uploading ? <><span className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /><span role="status" className="text-xs font-semibold text-primary-600">Đang tải ảnh lên...</span></> : <><span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600"><IconCamera size={20} /></span><span className="text-xs font-semibold text-primary-600">Tải ảnh lên</span><span className="mt-1 text-[10px] text-slate-400">Chọn một hoặc nhiều ảnh</span></>}
      </label>}
    </div>
    {message && <p id={`${id}-error`} role="alert" className="mt-3 text-xs text-rose-600">{message}</p>}
  </section>;
}
