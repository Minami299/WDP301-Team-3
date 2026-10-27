import AdminRevenueReport from '../../components/AdminRevenueReport';
import AttractionLayout from './AttractionLayout';

export default function VendorRevenuePage() {
  return <AttractionLayout activeScreen={15} title="Báo cáo tài chính" description="Đối chiếu thanh toán, hoàn tiền và hoa hồng của bạn; xuất toàn bộ dữ liệu trong kỳ ra PDF hoặc Excel.">
    <AdminRevenueReport partner />
  </AttractionLayout>;
}
