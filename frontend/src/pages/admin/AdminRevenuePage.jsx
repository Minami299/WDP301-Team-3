import AdminRevenueReport from '../../components/AdminRevenueReport';
import { PageHeader } from './adminUi';

export default function AdminRevenuePage() {
  return <><PageHeader title="Doanh thu & hoa hồng" /><div className="px-4 sm:px-8 py-6"><AdminRevenueReport /></div></>;
}
