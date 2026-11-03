const isInformational = facility => facility?.listing_mode === 'INFORMATIONAL';

function publicFacility(facility) {
  if (facility?.catalog_key) facility = {
    ...facility,
    has_active_ticket_types: (facility.services || []).some(service => !service.informational_only &&
      (service.ticket_types || []).some(type => type.status === 'ACTIVE')),
  };
  if (!isInformational(facility)) return facility;
  return {
    ...facility,
    min_price: null, max_price: null, estimated_total_price: null,
    services: (facility.services || []).filter(service => service.informational_only).map(service => ({
      ...service, base_price: null,
      ticket_types: (service.ticket_types || []).filter(type => type.status === 'INACTIVE'),
    })),
  };
}

module.exports = { isInformational, publicFacility };
