import { IconBarChart, IconDollar, IconHome, IconPercent, IconQR, IconShield, IconTicket, IconUsers } from '../components/Icons';
import { hasPermission } from './permissions';
export const PORTAL_ITEMS = [
  { to: '/admin', end: true, label: 'Tổng quan tài khoản', permission: 'users.view', roles: ['ADMIN'], icon: IconHome },
  { to: '/admin/users', label: 'Tài khoản người dùng', permission: 'users.view', roles: ['ADMIN'], icon: IconUsers },
  { to: '/manager', end: true, label: 'Tổng quan kinh doanh', permission: 'analytics.view', roles: ['MANAGER'], icon: IconHome },
  { to: '/manager/revenue', label: 'Doanh thu & khách sạn', permission: 'revenue.view', roles: ['MANAGER'], icon: IconDollar },
  { to: '/manager/analytics', label: 'Phân tích kinh doanh', permission: 'analytics.view', roles: ['MANAGER'], icon: IconBarChart },
  { to: '/manager/approvals', label: 'Hồ sơ đối tác', permission: 'partners.review', roles: ['MANAGER'], icon: IconShield },
  { to: '/manager/settlements', label: 'Đối soát & thanh toán', permission: 'payouts.review', roles: ['MANAGER'], icon: IconDollar },
  { to: '/manager/pricing', label: 'Giá & hoa hồng', permission: 'pricing.manage', roles: ['MANAGER'], icon: IconPercent },
  { to: '/manager/promotions', label: 'Khuyến mãi', permission: 'promotions.manage', roles: ['MANAGER'], icon: IconTicket },
  { to: '/manager/sales', label: 'Vận hành bán hàng', permission: 'vendor.dashboard', roles: ['MANAGER'], icon: IconBarChart },
  { to: '/manager/qr', label: 'Kiểm tra QR', permission: 'vendor.qr', roles: ['MANAGER'], icon: IconQR },
];
export const allowedPortalItems = user => PORTAL_ITEMS.filter(item => item.roles.includes(user?.role) && hasPermission(user, item.permission));
