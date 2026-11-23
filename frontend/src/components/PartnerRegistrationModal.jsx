import { useNavigate } from 'react-router-dom';
import { IconArrowRight, IconHotel, IconTicket, IconX } from './Icons';
import useAuth from '../hooks/useAuth';

export default function PartnerRegistrationModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  if (!isOpen) return null;
  const choose = (path) => { onClose(); navigate(path); };

  const hasHotelDraft = Boolean(
    typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem(`travelio_hotel_registration_draft_${currentUser?.id}`) ||
     localStorage.getItem('travelio_hotel_registration_draft'))
  );

  const hasAttractionDraft = Boolean(
    typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem(`travelio_attraction_registration_draft_${currentUser?.id}`) ||
     localStorage.getItem('travelio_attraction_registration_draft_guest'))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="partner-title" className="relative bg-white rounded-2xl max-w-xl w-full p-7 shadow-2xl">
        <button aria-label="Đóng" onClick={onClose} className="absolute top-5 right-5 text-slate-500"><IconX size={18} /></button>
        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-2">Travelio Partner Network</p>
        <h3 id="partner-title" className="font-heading font-extrabold text-2xl text-slate-900 mb-2">Trở thành đối tác Travelio</h3>
        <p className="text-sm text-slate-500 mb-6">Chọn mô hình kinh doanh phù hợp để bắt đầu.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => choose('/partner/register/hotel')} className="rounded-xl border border-slate-200 p-5 text-left hover:border-primary-500 hover:bg-primary-50 transition relative">
            {hasHotelDraft && (
              <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Bản nháp
              </span>
            )}
            <IconHotel size={26} className="text-primary-600 mb-3" />
            <h4 className="font-bold mb-2">Hotel Owner</h4>
            <p className="text-xs text-slate-500 mb-4">Quản lý khách sạn, resort, villa, homestay và các hạng phòng.</p>
            <span className="flex items-center gap-2 text-xs text-primary-600 font-semibold">
              {hasHotelDraft ? 'Tiếp tục đăng ký cơ sở lưu trú' : 'Đăng ký cơ sở lưu trú'} <IconArrowRight size={14} />
            </span>
          </button>
          <button onClick={() => choose('/partner/register/attraction')} className="rounded-xl border border-slate-200 p-5 text-left hover:border-primary-500 hover:bg-primary-50 transition relative">
            {hasAttractionDraft && (
              <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Bản nháp
              </span>
            )}
            <IconTicket size={26} className="text-primary-600 mb-3" />
            <h4 className="font-bold mb-2">Attraction Vendor</h4>
            <p className="text-xs text-slate-500 mb-4">Đăng ký qua 4 bước: tài khoản, cơ sở kinh doanh, dịch vụ và xác nhận.</p>
            <span className="flex items-center gap-2 text-xs text-primary-600 font-semibold">
              {hasAttractionDraft ? 'Tiếp tục đăng ký Attraction Vendor' : 'Đăng ký Attraction Vendor'} <IconArrowRight size={14} />
            </span>
          </button>
        </div>
        <button onClick={() => choose('/partner/registration-pending')} className="mt-5 text-sm font-semibold text-primary-600">Đã đăng ký? Mở hồ sơ và theo dõi xét duyệt</button>
      </div>
    </div>
  );
}
