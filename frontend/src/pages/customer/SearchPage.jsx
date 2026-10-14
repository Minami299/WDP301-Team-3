import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchResultsScreen from "../../views/SearchResultsScreen";
import useFacilities from "../../hooks/useFacilities";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract filters from URL
  const filters = useMemo(() => {
    return {
      keyword: searchParams.get("keyword") || searchParams.get("destination") || "",
      type: searchParams.get("type") || "all",
      city: searchParams.get("city") || "",
      stars: searchParams.get("stars") || "",
      checkIn: searchParams.get("checkIn") || "",
      checkOut: searchParams.get("checkOut") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      amenities: searchParams.get("amenities") || "",
      minRating: searchParams.get("minRating") || "",
      sortBy: searchParams.get("sortBy") || "recommended",
      page: searchParams.get("page") || 1,
    };
  }, [searchParams]);

  const {
    facilities,
    pagination,
    filterOptions,
    loading,
    error,
    fetchFacilities,
  } = useFacilities(filters);

  // Update query params in URL
  const handleFilterChange = (newFilters) => {
    const nextParams = new URLSearchParams(searchParams);

    if (newFilters.keyword !== undefined) {
      nextParams.delete("destination");
    }

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "" || val === "all") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });

    // Reset page to 1 on filter changes unless changing page specifically
    if (!newFilters.page && nextParams.get("page")) {
      nextParams.set("page", 1);
    }

    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <SearchResultsScreen
      facilities={facilities}
      pagination={pagination}
      filterOptions={filterOptions}
      loading={loading}
      error={error}
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      onNavigateDetail={(id) => navigate(`/facilities/${id}`)}
      onRetry={() => fetchFacilities(filters)}
    />
  );
}
