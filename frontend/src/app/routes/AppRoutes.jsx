import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import AuthPage from "../../pages/auth/AuthPage";
import CheckoutPage from "../../pages/customer/CheckoutPage";
import FacilityDetailPage from "../../pages/customer/FacilityDetailPage";
import HomePage from "../../pages/customer/HomePage";
import MyTripsPage from "../../pages/customer/MyTripsPage";
import ProfilePage from "../../pages/account/ProfilePage";
import SearchPage from "../../pages/customer/SearchPage";
import HotelOwnerInventoryPage from "../../pages/vendor/HotelOwnerInventoryPage";
import QrTerminalPage from "../../pages/vendor/QrTerminalPage";
import SettlementsPage from "../../pages/vendor/SettlementsPage";
import HotelOwnerDashboardPage from "../../pages/vendor/HotelOwnerDashboardPage";
import HotelOwnerRegistrationPage from "../../pages/vendor/HotelOwnerRegistrationPage";
import PartnerRegistrationProfilePage from "../../pages/vendor/PartnerRegistrationProfilePage";
import PortalLayout from "../../pages/admin/PortalLayout";
import AdminHomePage from "../../pages/admin/AdminHomePage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminRolesPage from "../../pages/admin/AdminRolesPage";
import ProtectedRoute from "./ProtectedRoute";
import { PermissionRoute, PortalIndex } from "./PermissionRoute";

const scroll = (page) => page;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route path="/partner/register/hotel" element={<HotelOwnerRegistrationPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={scroll(<HomePage />)} />
        <Route path="search" element={scroll(<SearchPage />)} />
        <Route path="facilities/:id" element={scroll(<FacilityDetailPage />)} />
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="checkout" element={scroll(<CheckoutPage />)} />
          <Route path="my-trips" element={scroll(<MyTripsPage />)} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<PermissionRoute permission="vendor.dashboard" />}>
            <Route path="vendor" element={<HotelOwnerDashboardPage />} />
            <Route path="vendor/registration" element={<PartnerRegistrationProfilePage />} />
            <Route path="vendor/inventory" element={<HotelOwnerInventoryPage />} />
          </Route>
          <Route element={<PermissionRoute permission="vendor.qr" />}>
            <Route path="vendor/qr" element={<QrTerminalPage />} />
          </Route>
          <Route element={<PermissionRoute permission="vendor.settlements" />}>
            <Route path="vendor/settlements" element={<SettlementsPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<PortalLayout />}>
          <Route index element={<PortalIndex><AdminHomePage /></PortalIndex>} />
          <Route element={<PermissionRoute permission="users.view" />}>
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          <Route element={<PermissionRoute permission="roles.view" />}>
            <Route path="roles" element={<AdminRolesPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
