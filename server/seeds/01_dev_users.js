/**
 * Seed development/test users.
 * Safe to run multiple times — clears and re-inserts.
 */
exports.seed = async function (knex) {
  // Truncate in reverse FK order
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  await knex('booking_service').truncate();
  await knex('booking').truncate();
  await knex('service_image').truncate();
  await knex('service').truncate();
  await knex('user').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // Insert users
  const [adminId] = await knex('user').insert({
    u_fname: 'Admin', u_lname: 'User',
    u_email: 'admin@event.test', u_role: 'admin',
  });

  const [providerId] = await knex('user').insert({
    u_fname: 'Jane', u_lname: 'Provider',
    u_email: 'provider@event.test', u_role: 'provider',
  });

  const [clientId] = await knex('user').insert({
    u_fname: 'John', u_lname: 'Client',
    u_email: 'client@event.test', u_role: 'user',
  });

  // Insert services
  const [svc1] = await knex('service').insert({
    s_provider_id: providerId, s_name: 'Pro Photography',
    s_description: 'Professional event photography', s_category: 'photography',
    s_base_price: 5000, s_city: 'Davao City', s_state: 'Davao del Sur',
    s_is_active: 1, s_rating: 4.5, s_review_count: 10,
  });

  const [svc2] = await knex('service').insert({
    s_provider_id: providerId, s_name: 'DJ Services',
    s_description: 'Professional DJ for events', s_category: 'music',
    s_base_price: 3000, s_city: 'Davao City', s_state: 'Davao del Sur',
    s_is_active: 1, s_rating: 4.2, s_review_count: 5,
  });

  // Insert a booking
  const [bookingId] = await knex('booking').insert({
    b_client_id: clientId, b_event_name: 'Birthday Party',
    b_event_date: '2026-04-15', b_start_time: '14:00', b_end_time: '20:00',
    b_location: 'Davao City', b_total_cost: 8000, b_status: 'confirmed',
  });

  await knex('booking_service').insert([
    { bs_booking_id: bookingId, bs_service_id: svc1, bs_quantity: 1, bs_unit_price: 5000, bs_total_price: 5000 },
    { bs_booking_id: bookingId, bs_service_id: svc2, bs_quantity: 1, bs_unit_price: 3000, bs_total_price: 3000 },
  ]);
};
