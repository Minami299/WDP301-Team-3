import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import facilityApi from "../../services/api/facilityApi";
import FacilityDetailScreen from "../../views/FacilityDetailScreen";
import AttractionDetail from '../../components/AttractionDetail';
import { SCREEN_PATHS } from "../../utils/screenNavigation";

export default function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCheckIn = searchParams.get("checkIn") || "";
  const initialCheckOut = searchParams.get("checkOut") || "";
  const initialGuests = searchParams.get("guests") || "";
  const initialRooms = searchParams.get("rooms") || "1";
  const initialAdults = searchParams.get("adults") || "2";
  const initialChildren = searchParams.get("children") || "0";

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

  if (!loading && !error && facility?.type === 'ATTRACTION') return <AttractionDetail key={facility._id} facility={facility} />;
  return (
    <FacilityDetailScreen
      facility={facility}
      loading={loading}
      error={error}
      initialCheckIn={initialCheckIn}
      initialCheckOut={initialCheckOut}
      initialGuests={initialGuests}
      initialRooms={initialRooms}
      initialAdults={initialAdults}
      initialChildren={initialChildren}
      onRetry={fetchDetail}
      onRefresh={fetchDetail}
      onNavigate={(screenId, params) => {
        if (screenId === 4) {
          navigate("/checkout", { state: params });
        } else if (screenId === 2) {
          const query = searchParams.toString();
          navigate(query ? `/search?${query}` : "/search");
        } else if (screenId === "login") {
          navigate("/auth/login", { state: params });
        } else {
          navigate(SCREEN_PATHS[screenId] || "/");
        }
      }}
    />
  );
}
