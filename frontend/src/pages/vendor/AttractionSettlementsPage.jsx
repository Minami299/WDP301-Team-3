import AttractionLayout from './AttractionLayout';
import SettlementsPanel from '../../components/SettlementsPanel';

export default function AttractionSettlementsPage() {
  return (
    <AttractionLayout activeScreen={9} title="Quyết toán & Rút tiền" description="Theo dõi số dư khả dụng, gửi yêu cầu rút tiền và xem lịch sử quyết toán.">
      <SettlementsPanel />
    </AttractionLayout>
  );
}
