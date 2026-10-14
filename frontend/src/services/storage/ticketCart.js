const KEY = 'travelio_ticket_cart';
export const ticketCart = {
  read() { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } },
  write(value) { sessionStorage.setItem(KEY, JSON.stringify(value)); },
  clear() { sessionStorage.removeItem(KEY); }
};
