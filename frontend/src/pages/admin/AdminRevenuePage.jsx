import AdminRevenueReport from '../../components/AdminRevenueReport';
import { PageHeader } from './adminUi';

export default function AdminRevenuePage() {
  return <><PageHeader title="Revenue & Commission" /><div className="px-8 py-6"><AdminRevenueReport /></div></>;
}
