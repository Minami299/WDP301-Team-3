export const SCREEN_PATHS = {
  1: "/",
  2: "/search",
  3: "/facilities/demo",
  4: "/checkout",
  5: "/my-trips",
  6: "/vendor",
  7: "/vendor/inventory",
  8: "/vendor/qr",
  9: "/vendor/settlements"
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
  { id: 9, path: "/vendor/settlements", label: "Settlements", short: "9", group: "partner", desc: "Payouts & Finance" }
];

export const getScreenByPath = (pathname) => {
  if (pathname.startsWith("/facilities/")) return SCREENS.find((screen) => screen.id === 3);
  return SCREENS.find((screen) => screen.path === pathname) || SCREENS[0];
};
