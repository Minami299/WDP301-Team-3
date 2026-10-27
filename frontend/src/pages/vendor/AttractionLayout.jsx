import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { VendorSidebar } from './HotelOwnerDashboardPage';

export function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}

export function Notice({ error, success }) {
  return <>{error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{success && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}</>;
}

export default function AttractionLayout({ activeScreen, title, description, children }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const isHotel = currentUser?.role === 'HOTEL_OWNER';
  return (
    <div className="flex h-full min-h-0 bg-slate-50">
      <div className="hidden md:block"><VendorSidebar activeScreen={activeScreen} onNavigate={navigate} onProfile={() => navigate('/profile')} onLogout={() => { logout(); navigate('/'); }} /></div>
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-7 lg:p-9">
        <nav className="md:hidden flex gap-3 overflow-x-auto text-xs font-semibold text-primary-700 mb-5">
          {['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role) && <Link className="whitespace-nowrap" aria-current={activeScreen === 15 ? 'page' : undefined} to="/vendor/revenue">Báo cáo tài chính</Link>}
          <Link to="/vendor">Tổng quan</Link><Link to="/vendor/registration">{isHotel ? "Hồ sơ & Phòng" : "Thông tin & Hạng vé"}</Link><Link to="/vendor/inventory">{isHotel ? "Quản lý tồn kho" : "Lịch bán vé"}</Link>
          <Link className="whitespace-nowrap" to="/vendor/orders">{isHotel ? "Đơn đặt phòng" : "Đơn đặt vé"}</Link><Link className="whitespace-nowrap" to="/vendor/cancellations">{isHotel ? "Yêu cầu hủy / đổi ngày" : "Yêu cầu hủy"}</Link>
          {currentUser?.role === 'ACTIVITY_VENDOR' && <Link className="whitespace-nowrap" aria-current={activeScreen === 13 ? 'page' : undefined} to="/vendor/payments">Thanh toán</Link>}
          {['HOTEL_OWNER', 'ACTIVITY_VENDOR'].includes(currentUser?.role) && <Link className="whitespace-nowrap" aria-current={activeScreen === 14 ? 'page' : undefined} to="/vendor/reviews">Đánh giá & Phản hồi</Link>}
        </nav>
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-primary-600 font-bold mb-2">
            {isHotel ? "Hotel Partner · Partner Extranet" : "Attraction Vendor · Partner Extranet"}
          </p>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-2 mb-7">{description}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
