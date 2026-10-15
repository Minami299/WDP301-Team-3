import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { IconCheck, IconHotel, IconTicket, IconArrowRight } from '../../components/Icons';
import { pendingRegistration } from '../../services/storage/pendingRegistration';

export default function RegistrationPendingPage() {
  const [registration] = useState(pendingRegistration.read);
  if (!registration) return <Navigate to="/auth/register" replace />;
  const hotel = registration.role === 'HOTEL_OWNER';
  const BusinessIcon = hotel ? IconHotel : IconTicket;
  return <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-white font-body">
    <header className="border-b border-slate-200/80 bg-white/90"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6"><Link to="/" className="flex items-center gap-2 text-slate-900"><span className="rounded-xl bg-primary-600 p-2 text-white"><BusinessIcon size={20} /></span><span className="font-heading text-xl font-extrabold">travelio</span></Link><span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">Partner Hub</span></div></header>
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="border-b border-slate-100 bg-gradient-to-b from-primary-50/60 to-white px-5 pb-7 pt-8 text-center sm:px-9 sm:pt-10">
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/50"><svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white"><IconCheck size={15} /></span></div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl">Đăng ký thành công!</h1>
          <p role="status" className="mt-3 text-base font-semibold text-amber-700">Tài khoản của bạn đang chờ xét duyệt</p>
          <p className="mt-5 text-sm leading-7 text-slate-600">Cảm ơn bạn đã đăng ký trở thành đối tác của Travelio. Hồ sơ của bạn đã được gửi đến đội ngũ quản trị. Bạn sẽ có thể đăng nhập sau khi tài khoản được phê duyệt.</p>
        </div>
        <div className="px-5 py-6 sm:px-9 sm:py-8">
          <dl className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:p-5">
            {[['Họ tên người đăng ký', registration.full_name], [hotel ? 'Tên khách sạn / cơ sở lưu trú' : 'Tên cơ sở kinh doanh', registration.facility_name], ['Email đăng ký', registration.email], ['Loại tài khoản', hotel ? 'Hotel Owner' : 'Attraction Vendor']].map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[180px_1fr]"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words font-semibold text-slate-800">{value}</dd></div>)}
            <div className="grid items-center gap-2 border-t border-slate-200 pt-4 sm:grid-cols-[180px_1fr]"><dt className="text-slate-500">Trạng thái</dt><dd><span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Pending Approval</span></dd></div>
          </dl>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><Link to="/" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Back to Home</Link><Link to={`/auth/login?email=${encodeURIComponent(registration.email)}`} className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700">Go to Login<IconArrowRight size={16} /></Link></div>
        </div>
      </article>
      <p className="mt-6 text-center text-xs text-slate-400">Travelio · Kết nối đối tác, mở rộng trải nghiệm</p>
    </main>
  </div>;
}
