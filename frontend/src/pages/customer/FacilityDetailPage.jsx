import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import facilityApi from "../../services/api/facilityApi";
import FacilityDetailScreen from "../../views/FacilityDetailScreen";
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCheckIn = searchParams.get("checkIn") || "";
  const initialCheckOut = searchParams.get("checkOut") || "";
  const initialGuests = searchParams.get("guests") || "";

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await facilityApi.getFacilityById(id || "demo");
      const data = res.data?.data || res.data;
      setFacility(data);
    } catch (err) {
      console.error("Error loading facility detail:", err);
      setError(
        err.response?.data?.message || "Không thể tải thông tin cơ sở dịch vụ."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  return (
    <FacilityDetailScreen
      facility={facility}
      loading={loading}
      error={error}
      initialCheckIn={initialCheckIn}
      initialCheckOut={initialCheckOut}
      initialGuests={initialGuests}
      onRetry={fetchDetail}
      onRefresh={fetchDetail}
      onNavigate={(screenId, params) => {
        if (screenId === 4) {
          navigate("/checkout", { state: params });
        } else if (screenId === 2) {
          navigate("/search");
        } else if (screenId === "login") {
          navigate("/auth/login");
        } else {
          navigate(SCREEN_PATHS[screenId] || "/");
        }
      }}
    />
  );
}
