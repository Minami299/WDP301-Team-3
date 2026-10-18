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
      guests: searchParams.get("guests") || "",
      rooms: searchParams.get("rooms") || "",
      adults: searchParams.get("adults") || "",
      children: searchParams.get("children") || "",
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
      onNavigateDetail={(id, customDates) => {
        const nextParams = new URLSearchParams(searchParams);
        if (customDates?.checkIn) {
          nextParams.set("checkIn", customDates.checkIn);
          nextParams.set("date", customDates.checkIn);
        }
        if (customDates?.checkOut) nextParams.set("checkOut", customDates.checkOut);
        if (customDates?.guests) nextParams.set("guests", customDates.guests);
        if (customDates?.adults) nextParams.set("adults", customDates.adults);
        if (customDates?.children !== undefined) nextParams.set("children", customDates.children);
        if (customDates?.rooms) nextParams.set("rooms", customDates.rooms);
        const query = nextParams.toString();
        navigate(query ? `/facilities/${id}?${query}` : `/facilities/${id}`);
      }}
      onRetry={() => fetchFacilities(filters)}
    />
  );
}
