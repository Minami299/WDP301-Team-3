export const SCREEN_PATHS = {
  1: "/",
  2: "/search",
  3: "/facilities/demo",
  4: "/checkout",
  5: "/my-trips",
  6: "/vendor",
  7: "/vendor/inventory",
  8: "/vendor/qr",
  9: "/vendor/settlements",
  10: "/vendor/registration",
  11: "/vendor/orders",
  12: "/vendor/cancellations",
  13: "/vendor/payments",
  14: "/vendor/reviews"
};

export const SCREENS = [
  { id: 1, path: "/", label: "Homepage", short: "1", group: "traveler", desc: "Hero & Booking Widget" },
  { id: 2, path: "/search", label: "Search Results", short: "2", group: "traveler", desc: "Listings & Filters" },
  { id: 3, path: "/facilities/demo", label: "Product Detail", short: "3", group: "traveler", desc: "Booking Flow" },
  { id: 4, path: "/checkout", label: "Checkout", short: "4", group: "traveler", desc: "Payment & QR Pass" },
  { id: 5, path: "/my-trips", label: "My Trips", short: "5", group: "traveler", desc: "Itinerary & Tickets" },
  { id: 6, path: "/vendor", label: "Vendor Dashboard", short: "6", group: "partner", desc: "Overview & KPIs" },
  { id: 7, path: "/vendor/inventory", label: "Inventory Manager", short: "7", group: "partner", desc: "Rates & Stop-Sell" },
  { id: 8, path: "/vendor/qr", label: "QR Terminal", short: "8", group: "partner", desc: "Gate Redemption" },
  { id: 9, path: "/vendor/settlements", label: "Settlements", short: "9", group: "partner", desc: "Payouts & Finance" },
  { id: 10, path: "/vendor/registration", label: "Partner Profile & Rooms", short: "10", group: "partner", desc: "Facility & Rooms" },
  { id: 11, path: "/vendor/orders", label: "Orders", short: "11", group: "partner", desc: "Bookings & Orders" },
  { id: 12, path: "/vendor/cancellations", label: "Cancellations", short: "12", group: "partner", desc: "Cancellations & Date Changes" },
  { id: 13, path: "/vendor/payments", label: "Thanh toán", short: "13", group: "partner", desc: "Ticket payments & sales statistics" },
  { id: 14, path: "/vendor/reviews", label: "Đánh giá & Phản hồi", short: "14", group: "partner", desc: "Customer reviews & partner responses" }
];

export const getScreenByPath = (pathname) => {
  if (pathname.startsWith('/my-trips/')) return SCREENS.find(screen => screen.id === 5);
  if (pathname.startsWith("/facilities/")) return SCREENS.find((screen) => screen.id === 3);
  return SCREENS.find((screen) => screen.path === pathname) || SCREENS[0];
};
