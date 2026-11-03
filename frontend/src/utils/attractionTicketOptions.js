export function attractionTicketOptions(service, type, date, availabilityReady) {
  const canSelect = availabilityReady && !service.informational_only && type.status === 'ACTIVE';
  if (type.schedules?.length) return type.schedules.map(row => ({
    ...row,
    line_key: String(row.inventory_id),
    service_id: service._id,
    ticket_type_id: type._id,
    visit_date: date,
    available_qty: canSelect ? row.available_qty : 0,
  }));
  return [{
    line_key: `${service._id}:${type._id}:${date}`,
    service_id: service._id,
    ticket_type_id: type._id,
    visit_date: date,
    price: type.price,
    time_slot: 'ALL_DAY',
    available_qty: canSelect && type.requires_schedule === false ? 1000 : 0,
  }];
}
