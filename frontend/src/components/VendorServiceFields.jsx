import { useEffect, useRef, useState } from 'react';
import { serviceCategories, pricingUnits } from '../utils/vendorServices';
import TicketTypesFields from './TicketTypesFields';
import ImageUpload from './ImageUpload';
import { IconMapPin } from './Icons';

const DEFAULT_COORDS = { lat: 16.068, lng: 108.245 };

export default function VendorServiceFields({ value, onChange, errors = {}, prefix = '', disabled, onBusyChange }) {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isMapClickRef = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const reverseGeocode = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      );
      const data = await res.json();
      if (data && data.display_name) {
        isMapClickRef.current = true;
        onChangeRef.current?.('location', data.display_name.slice(0, 300));
      }
    } catch {
      // Bỏ qua nếu lỗi mạng
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    let disposed = false;
    let resizeTimer;
    let loadingScript;
    let resizeObserver;

    const initMap = () => {
      if (disposed || !mapContainerRef.current || !window.L || mapInstanceRef.current) return;
      const L = window.L;
      const map = L.map(mapContainerRef.current).setView([DEFAULT_COORDS.lat, DEFAULT_COORDS.lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([DEFAULT_COORDS.lat, DEFAULT_COORDS.lng], { draggable: true }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    };

    if (window.L) {
      initMap();
    } else {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const existingScript = document.getElementById('leaflet-js');
      if (existingScript) {
        loadingScript = existingScript;
        existingScript.addEventListener('load', initMap);
      } else {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        loadingScript = script;
        script.addEventListener('load', initMap);
        document.head.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      loadingScript?.removeEventListener('load', initMap);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const locationText = value.location ?? '';
  useEffect(() => {
    if (isMapClickRef.current) {
      isMapClickRef.current = false;
      return undefined;
    }
    const query = locationText.trim();
    if (!query || query.length < 5) return undefined;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=vi`,
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            setCoords({ lat, lng });
            if (mapInstanceRef.current && markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
              mapInstanceRef.current.setView([lat, lng], 16);
            }
          }
        }
      } catch {
        // Bỏ qua nếu không tìm thấy
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [locationText]);

  const field = (key, label, element) => {
    const error = errors[`${prefix}${key}`];
    return <div key={key}><label htmlFor={`service-${prefix}${key}`} className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>{element}<p id={`service-error-${prefix}${key}`} className="mt-1 text-xs text-rose-600">{error}</p></div>;
  };
  const attributes = (key) => ({ id: `service-${prefix}${key}`, name: `${prefix}${key}`, value: value[key] ?? '', onChange: (event) => onChange(key, event.target.value), className: `w-full rounded-xl border px-3 py-2.5 bg-white text-sm focus:outline-none focus:border-primary-500 ${errors[`${prefix}${key}`] ? 'border-rose-400' : 'border-slate-200'}`, 'aria-invalid': Boolean(errors[`${prefix}${key}`]), 'aria-describedby': errors[`${prefix}${key}`] ? `service-error-${prefix}${key}` : undefined });
  const locationAttrs = attributes('location');

  return (
    <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-4">
      {field('name', 'Tên dịch vụ *', <input {...attributes('name')} maxLength={200} placeholder="VD: Tour khám phá Hội An" />)}
      {field('service_category', 'Danh mục dịch vụ *', <select {...attributes('service_category')}>{Object.entries(serviceCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      <div className="sm:col-span-2">{field('description', 'Mô tả dịch vụ', <textarea {...attributes('description')} rows={3} maxLength={5000} placeholder="Giới thiệu dịch vụ, những gì bao gồm và điều kiện sử dụng" />)}</div>
      {field('pricing_unit', 'Đơn vị tính giá *', <select {...attributes('pricing_unit')}>{Object.entries(pricingUnits).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      {['TOUR', 'EXPERIENCE'].includes(value.service_category) && field('duration_minutes', 'Thời lượng (phút, tùy chọn)', <input {...attributes('duration_minutes')} type="number" min="1" step="1" placeholder="VD: 120" />)}
      <div className="sm:col-span-2 space-y-2.5">
        <div>
          <label htmlFor={locationAttrs.id} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {value.service_category === 'TICKET' ? 'Địa điểm (tùy chọn)' : 'Địa điểm tổ chức / tập trung *'}
          </label>
          <div className="relative">
            <IconMapPin
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              {...locationAttrs}
              maxLength={300}
              placeholder="Địa điểm cung cấp dịch vụ / điểm tập trung"
              className={`${locationAttrs.className} pl-10 pr-4`}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Nhập địa điểm bên trên hoặc bấm trực tiếp vào một điểm trên bản đồ (hoặc kéo thả ghim) để tự động đồng bộ địa chỉ.
          </p>
          <p id={`service-error-${prefix}location`} className="mt-1 text-xs text-rose-600">
            {errors[`${prefix}location`]}
          </p>
        </div>
        <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
          <div
            ref={mapContainerRef}
            className="h-64 sm:h-72 w-full z-10 cursor-crosshair"
          />
          <div className="p-3 bg-white border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {isGeocoding
                ? 'Đang lấy địa chỉ từ vị trí bạn vừa chọn trên bản đồ...'
                : `Địa điểm đang chọn (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}): `}
              {!isGeocoding && (
                <strong className="text-slate-900">{locationText || 'Chưa chọn địa điểm'}</strong>
              )}
            </span>
          </div>
        </div>
      </div>
      <TicketTypesFields value={value.ticket_types} onChange={types => onChange('ticket_types', types)} prefix={`${prefix}ticket_types.`} errors={errors} disabled={disabled} />
      <div className="sm:col-span-2">
        <ImageUpload label="Ảnh dịch vụ (không bắt buộc)" value={value.photos} onChange={photos => onChange('photos', photos)} kind="TICKET" maxImages={8} disabled={disabled} error={errors[`${prefix}photos`]} onBusyChange={onBusyChange} />
      </div>
    </fieldset>
  );
}
