import AttractionLayout from './AttractionLayout';
import SettlementsPanel from '../../components/SettlementsPanel';

export default function AttractionSettlementsPage() {
  return (
    <AttractionLayout activeScreen={9} title="Quyết toán & Doanh thu" description="Xem doanh thu bán vé, hoa hồng phải trả sàn và gửi yêu cầu rút tiền.">
      <SettlementsPanel />
    </AttractionLayout>
  );
}
