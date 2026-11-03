import AdminBusinessOverview from '../../components/AdminBusinessOverview';
import { PageHeader } from './adminUi';

export default function AdminAnalyticsPage() {
  return <><PageHeader title="Business performance" /><div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-8"><AdminBusinessOverview /></div></>;
}
