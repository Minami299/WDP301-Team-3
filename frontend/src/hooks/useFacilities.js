import { useCallback, useEffect, useState } from "react";
import { facilityApi } from "../services/api/facilityApi";

export default function useFacilities(initialParams = null) {
  const [facilities, setFacilities] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    amenities: [],
    priceRange: { min: 0, max: 10000000 },
  });
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState(null);

  const fetchFacilities = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await facilityApi.getFacilities(params);
      if (response && response.success) {
        setFacilities(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setFacilities(response?.data || []);
      }
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách cơ sở dịch vụ.");
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async (params = {}) => {
    setLoadingOptions(true);
    try {
      const response = await facilityApi.getFilterOptions(params);
      if (response && response.success && response.data) {
        setFilterOptions(response.data);
      }
    } catch (err) {
      console.warn("Failed to fetch filter options:", err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const facilityType = initialParams?.type || "";

  useEffect(() => {
    fetchFilterOptions(facilityType ? { type: facilityType } : {});
  }, [fetchFilterOptions, facilityType]);

  useEffect(() => {
    if (initialParams !== null) {
      fetchFacilities(initialParams);
    }
  }, [fetchFacilities, initialParams]);

  return {
    facilities,
    pagination,
    filterOptions,
    loading,
    loadingOptions,
    error,
    fetchFacilities,
    fetchFilterOptions,
  };
}
