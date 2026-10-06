import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import AuthPage from "../../pages/auth/AuthPage";
import CheckoutPage from "../../pages/customer/CheckoutPage";
import FacilityDetailPage from "../../pages/customer/FacilityDetailPage";
import HomePage from "../../pages/customer/HomePage";
import MyTripsPage from "../../pages/customer/MyTripsPage";
import SearchPage from "../../pages/customer/SearchPage";
import InventoryPage from "../../pages/vendor/InventoryPage";
import QrTerminalPage from "../../pages/vendor/QrTerminalPage";
import SettlementsPage from "../../pages/vendor/SettlementsPage";
import VendorDashboardPage from "../../pages/vendor/VendorDashboardPage";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

const VENDOR_ROLES = ["ADMIN", "MANAGER", "HOTEL_OWNER", "ACTIVITY_VENDOR"];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<div className="h-full overflow-y-auto"><HomePage /></div>} />
        <Route path="search" element={<div className="h-full overflow-y-auto"><SearchPage /></div>} />
        <Route path="facilities/:id" element={<div className="h-full overflow-y-auto"><FacilityDetailPage /></div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<div className="h-full overflow-y-auto"><CheckoutPage /></div>} />
          <Route path="my-trips" element={<div className="h-full overflow-y-auto"><MyTripsPage /></div>} />
        </Route>
        <Route element={<RoleRoute allowedRoles={VENDOR_ROLES} />}>
          <Route path="vendor" element={<VendorDashboardPage />} />
          <Route path="vendor/inventory" element={<InventoryPage />} />
          <Route path="vendor/qr" element={<QrTerminalPage />} />
          <Route path="vendor/settlements" element={<SettlementsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
