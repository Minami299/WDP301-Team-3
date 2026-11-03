import { Link } from 'react-router-dom';
import { AttractionGallery } from './AttractionDetail';
import { getFacilityImageUrls } from '../utils/facilityImages';
import { TicketTypesSummary } from './TicketTypesFields';

export default function InformationalAttractionDetail({ facility }) {
  const images = getFacilityImageUrls(facility, new URL(
    import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin,
  ).origin);
  const credit = facility.image_credit;
  const hasTicketDrafts = (facility.services || []).some(service => service.ticket_types?.length > 0);

  return (
    <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-900">
      <Link to="/search?type=ATTRACTION" className="text-sm text-primary-600">← Điểm tham quan & trải nghiệm</Link>
      <div className="my-6">
        <span className="text-xs font-bold rounded-full bg-slate-100 px-3 py-1">{hasTicketDrafts ? 'Vé chưa mở bán' : 'Chỉ giới thiệu'}</span>
        <h1 className="text-3xl font-bold mt-3">{facility.name}</h1>
        <p className="text-sm text-slate-600 mt-2">{facility.address}, {facility.city}</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
        <p className="font-semibold">Chưa hỗ trợ đặt vé và thanh toán trên Travelio</p>
        <p className="text-sm mt-2">{hasTicketDrafts ? 'Các hạng vé và giá tham khảo được hiển thị bên dưới. Hiện chưa có vé được phân bổ để đặt trên Travelio.' : 'Thông tin vé, giá và lịch sử dụng hiện chưa được cập nhật trên Travelio.'}</p>
        <p className="mt-2 font-semibold">{hasTicketDrafts ? 'Giá vé: Xem từng hạng vé tham khảo' : 'Giá vé: Chưa cập nhật'}</p>
      </div>
      <AttractionGallery facility={facility} images={images} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
        <h2 className="font-bold text-xl mb-3">Giới thiệu</h2>
        <p className="text-slate-700 leading-relaxed">{facility.description}</p>
        <p className="text-sm text-slate-500 mt-3">Chưa có đánh giá trên Travelio.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
        <h2 className="font-bold text-xl mb-3">Dịch vụ & hạng vé</h2>
        {(facility.services || []).map(service => (
          <article key={service._id} className="py-3 border-b border-slate-100 last:border-0">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{service.description}</p>
            {service.ticket_types?.length > 0 && <>
              <p className="text-xs text-amber-700 mt-3">Giá tham khảo trong cấu hình vé, chưa mở bán. Chưa có tồn kho được phân bổ trên Travelio.</p>
              <TicketTypesSummary types={service.ticket_types} />
            </>}
          </article>
        ))}
      </section>
      <section className="text-sm text-slate-600 space-y-2 mb-8">
        <h2 className="font-semibold text-slate-900">Bản quyền ảnh</h2>
        {credit?.source_url && <p>Ảnh: <a href={credit.source_url} className="underline" target="_blank" rel="noopener noreferrer">{credit.author}</a> · <a href={credit.license_url} className="underline" target="_blank" rel="noopener noreferrer">{credit.license}</a>. {credit.changes}</p>}
      </section>
    </main>
  );
}
