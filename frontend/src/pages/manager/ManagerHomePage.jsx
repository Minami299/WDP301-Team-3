import { Link } from 'react-router-dom';
import AdminBusinessOverview from '../../components/AdminBusinessOverview';
import { PageHeader } from '../admin/adminUi';
export default function ManagerHomePage() {
  return <><PageHeader title="Tổng quan kinh doanh" /><div className="p-5 sm:p-8 space-y-5">
    <div className="flex flex-wrap gap-3 text-sm font-semibold">
      <Link to="/manager/revenue?facility_type=HOTEL" className="rounded-8 bg-primary-500 px-4 py-2 text-white">Doanh thu từng khách sạn</Link>
    </div><AdminBusinessOverview />
  </div></>;
}
