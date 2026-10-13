import { Navigate, Route, Routes } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import AuthPage from "../../pages/auth/AuthPage";
import CheckoutPage from "../../pages/customer/CheckoutPage";
import FacilityDetailPage from "../../pages/customer/FacilityDetailPage";
import HomePage from "../../pages/customer/HomePage";
import MyTripsPage from "../../pages/customer/MyTripsPage";
import ProfilePage from "../../pages/account/ProfilePage";
import SearchPage from "../../pages/customer/SearchPage";
import PortalLayout from "../../pages/admin/PortalLayout";
import AdminHomePage from "../../pages/admin/AdminHomePage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminRolesPage from "../../pages/admin/AdminRolesPage";
import VendorDashboardScreen from "../../views/VendorDashboardScreen";
import QrTerminalScreen from "../../views/QrTerminalScreen";
import SettlementsScreen from "../../views/SettlementsScreen";
import ProtectedRoute from "./ProtectedRoute";
import { PermissionRoute, PortalIndex } from "./PermissionRoute";

const scroll = (page) => <div className="h-full overflow-y-auto">{page}</div>;

// Same pages under /admin and /vendor; each is gated by a permission, and PortalLayout
// sends every role to the base that matches it.
const portalRoutes = () => (
  <>
    <Route index element={<PortalIndex><AdminHomePage /></PortalIndex>} />
      <Route element={<PermissionRoute permission="users.view" />}>
        <Route path="users" element={<AdminUsersPage />} />
      </Route>
      <Route element={<PermissionRoute permission="roles.view" />}>
        <Route path="roles" element={<AdminRolesPage />} />
      </Route>
    <Route element={<PermissionRoute permission="vendor.dashboard" />}>
      <Route path="sales" element={<VendorDashboardScreen />} />
    </Route>
    <Route element={<PermissionRoute permission="vendor.qr" />}>
      <Route path="qr" element={<QrTerminalScreen />} />
    </Route>
    <Route element={<PermissionRoute permission="vendor.settlements" />}>
      <Route path="settlements" element={<SettlementsScreen />} />
    </Route>
  </>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route element={<CustomerLayout />}>
        <Route index element={scroll(<HomePage />)} />
        <Route path="search" element={scroll(<SearchPage />)} />
        <Route path="facilities/:id" element={scroll(<FacilityDetailPage />)} />
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="checkout" element={scroll(<CheckoutPage />)} />
          <Route path="my-trips" element={scroll(<MyTripsPage />)} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<PortalLayout base="/admin" />}>
          {portalRoutes()}
        </Route>
        <Route path="vendor" element={<PortalLayout base="/vendor" />}>
          {portalRoutes()}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
