import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import AuthPage from "../../pages/auth/AuthPage";
import RegistrationPendingPage from '../../pages/auth/RegistrationPendingPage';
import CheckoutPage from "../../pages/customer/CheckoutPage";
import FacilityDetailPage from "../../pages/customer/FacilityDetailPage";
import HomePage from "../../pages/customer/HomePage";
import MyTripsPage from "../../pages/customer/MyTripsPage";
import BookingDetailPage from "../../pages/customer/BookingDetailPage";
import AttractionOrdersPage from "../../pages/vendor/AttractionOrdersPage";
import PartnerReviewsPage from "../../pages/vendor/PartnerReviewsPage";
import ProfilePage from "../../pages/account/ProfilePage";
import SearchPage from "../../pages/customer/SearchPage";
import HotelOwnerInventoryPage from "../../pages/vendor/HotelOwnerInventoryPage";
import QrTerminalPage from "../../pages/vendor/QrTerminalPage";
import SettlementsPage from "../../pages/vendor/SettlementsPage";
import HotelOwnerDashboardPage from "../../pages/vendor/HotelOwnerDashboardPage";
import HotelOwnerRegistrationPage from "../../pages/vendor/HotelOwnerRegistrationPage";
import PartnerRegistrationProfilePage from "../../pages/vendor/PartnerRegistrationProfilePage";
import AttractionRegistrationPage from "../../pages/vendor/AttractionRegistrationPage";
import AttractionInventoryPage from "../../pages/vendor/AttractionInventoryPage";
import AttractionDashboardPage from "../../pages/vendor/AttractionDashboardPage";
import AttractionVendorRegistrationPage from "../../pages/vendor/AttractionVendorRegistrationPage";
import useAuth from "../../hooks/useAuth";
import PortalLayout from "../../pages/admin/PortalLayout";
import AdminHomePage from "../../pages/admin/AdminHomePage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminApprovalsPage from "../../pages/admin/AdminApprovalsPage";
import AdminRolesPage from "../../pages/admin/AdminRolesPage";
import ProtectedRoute from "./ProtectedRoute";
import { PermissionRoute, PortalIndex } from "./PermissionRoute";

const scroll = (page) => page;

function VendorPage({ hotel, attraction }) {
  const { currentUser } = useAuth();
  return currentUser?.role === "ACTIVITY_VENDOR" ? attraction : hotel;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route path="/partner/register/hotel" element={<HotelOwnerRegistrationPage />} />
      <Route path="/partner/register/attraction" element={<AttractionVendorRegistrationPage />} />
      <Route path="/partner/registration-pending" element={<RegistrationPendingPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={scroll(<HomePage />)} />
        <Route path="search" element={scroll(<SearchPage />)} />
        <Route path="facilities/:id" element={scroll(<FacilityDetailPage />)} />
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="checkout" element={scroll(<CheckoutPage />)} />
          <Route path="my-trips" element={scroll(<MyTripsPage />)} />
          <Route path="my-trips/:id" element={scroll(<BookingDetailPage />)} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<PermissionRoute permission="vendor.dashboard" />}>
            <Route path="vendor" element={<VendorPage hotel={<HotelOwnerDashboardPage />} attraction={<AttractionDashboardPage />} />} />
            <Route path="vendor/reviews" element={<PartnerReviewsPage />} />
            <Route path="vendor/payments" element={<VendorPage hotel={<Navigate to="/vendor" replace />} attraction={<AttractionDashboardPage payments />} />} />
            <Route path="vendor/registration" element={<VendorPage hotel={<PartnerRegistrationProfilePage />} attraction={<AttractionRegistrationPage />} />} />
            <Route path="vendor/inventory" element={<VendorPage hotel={<HotelOwnerInventoryPage />} attraction={<AttractionInventoryPage />} />} />
            <Route path="vendor/orders" element={<VendorPage hotel={<AttractionOrdersPage />} attraction={<AttractionOrdersPage />} />} />
            <Route path="vendor/orders/:id" element={<VendorPage hotel={<AttractionOrdersPage />} attraction={<AttractionOrdersPage />} />} />
            <Route path="vendor/cancellations" element={<VendorPage hotel={<AttractionOrdersPage cancellations />} attraction={<AttractionOrdersPage cancellations />} />} />
            <Route path="vendor/cancellations/:id" element={<VendorPage hotel={<AttractionOrdersPage cancellations />} attraction={<AttractionOrdersPage cancellations />} />} />
          </Route>
          <Route element={<PermissionRoute permission="vendor.qr" />}>
            <Route path="vendor/qr" element={<VendorPage hotel={<QrTerminalPage />} attraction={<Navigate to="/vendor/orders" replace />} />} />
          </Route>
          <Route element={<PermissionRoute permission="vendor.settlements" />}>
            <Route path="vendor/settlements" element={<VendorPage hotel={<SettlementsPage />} attraction={<Navigate to="/vendor/orders" replace />} />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<PortalLayout />}>
          <Route index element={<PortalIndex><AdminHomePage /></PortalIndex>} />
          <Route element={<PermissionRoute permission="users.view" />}>
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          <Route element={<PermissionRoute permission="users.lock" />}>
            <Route path="approvals" element={<AdminApprovalsPage />} />
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
