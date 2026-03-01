// server/svc/serviceService.js
// Pure business logic and database queries for service-related operations.
// No req/res awareness — takes plain params, returns data or throws.

const path = require('path');
const fs = require('fs');
const { getPool } = require('../db');

// Uploads directory - same resolution as index.js
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, '..', 'uploads', 'images');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Save a base64-encoded image to disk and return the public URL path.
 */
function saveBase64Image(base64String, serviceId) {
    try {
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }

        const imageFormat = matches[1];
        const imageData = matches[2];

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `service_${serviceId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);

        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving image file:', error);
        throw error;
    }
}

/**
 * Check which optional pricing columns exist on the service table.
 * Returns { hasHourlyPrice: boolean, hasPerDayPrice: boolean }
 */
async function checkPricingColumns(pool) {
    let hasHourlyPrice = false;
    let hasPerDayPrice = false;
    try {
        const [hourlyCheck] = await pool.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'service'
              AND COLUMN_NAME = 's_hourly_price'
        `);
        hasHourlyPrice = hourlyCheck.length > 0;

        const [perDayCheck] = await pool.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'service'
              AND COLUMN_NAME = 's_per_day_price'
        `);
        hasPerDayPrice = perDayCheck.length > 0;
    } catch (colErr) {
        console.log('Could not check for pricing columns, using defaults');
    }
    return { hasHourlyPrice, hasPerDayPrice };
}

/**
 * Ensure the s_hourly_price column exists, adding it if necessary.
 */
async function ensureHourlyPriceColumn(pool) {
    try {
        const [check] = await pool.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'service'
              AND COLUMN_NAME = 's_hourly_price'
        `);
        if (check.length === 0) {
            await pool.query(`ALTER TABLE service ADD COLUMN s_hourly_price DECIMAL(10,2) NULL AFTER s_base_price`);
            console.log('Added s_hourly_price column');
        }
    } catch (alterErr) {
        if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding s_hourly_price column:', alterErr);
        }
    }
}

/**
 * Ensure the s_per_day_price column exists, adding it if necessary.
 */
async function ensurePerDayPriceColumn(pool) {
    try {
        const [check] = await pool.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'service'
              AND COLUMN_NAME = 's_per_day_price'
        `);
        if (check.length === 0) {
            await pool.query(`ALTER TABLE service ADD COLUMN s_per_day_price DECIMAL(10,2) NULL AFTER s_hourly_price`);
            console.log('Added s_per_day_price column');
        }
    } catch (alterErr) {
        if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error adding s_per_day_price column:', alterErr);
        }
    }
}

/**
 * Ensure a column exists on the user table, adding it if necessary.
 */
async function ensureUserColumn(pool, columnName, definition) {
    try {
        await pool.query(`SELECT ${columnName} FROM \`user\` LIMIT 1`);
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            await pool.query(`ALTER TABLE \`user\` ADD COLUMN ${columnName} ${definition}`);
        }
    }
}

/**
 * Calculate Haversine distance between two lat/lng points (in km).
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Parse lat/lng from an address string.
 * Supports formats: "address (lat,lng)" and plain "lat,lng".
 * Returns { lat, lng } or null.
 */
function parseCoordinates(address) {
    if (!address) return null;
    const coordsMatch = address.match(/\(([\d.-]+),([\d.-]+)\)/);
    if (coordsMatch) {
        return { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) };
    }
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(address.trim())) {
        const [lat, lng] = address.split(',');
        return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    return null;
}

/**
 * Normalise a query-string value that might come through as an array (duplicate params).
 */
function first(val) {
    return Array.isArray(val) ? val[0] : val;
}

// ---------------------------------------------------------------------------
// Service CRUD
// ---------------------------------------------------------------------------

/**
 * List services with filtering, distance calculation and pagination.
 * @param {object} query   – the raw req.query object
 * @param {object} pagination – { page, limit, offset }
 * @returns {{ rows: Array, total: number }}
 */
async function listServices(query, pagination) {
    const pool = getPool();

    const category = first(query.category);
    const search = first(query.search);
    const featured = query.featured === 'true';
    const city = first(query.city);
    const providerId = first(query.providerId);
    const providerEmail = first(query.providerEmail);
    const userLat = query.latitude ? parseFloat(first(query.latitude)) : null;
    const userLng = query.longitude ? parseFloat(first(query.longitude)) : null;
    const radiusKm = query.radius ? parseFloat(first(query.radius)) : 100;
    const minPrice = query.minPrice ? parseFloat(first(query.minPrice)) : null;
    const maxPrice = query.maxPrice ? parseFloat(first(query.maxPrice)) : null;
    const minRating = query.minRating ? parseFloat(first(query.minRating)) : null;
    const availableDate = first(query.availableDate);

    const { hasHourlyPrice, hasPerDayPrice } = await checkPricingColumns(pool);

    const fromClause = `
        FROM service s
        LEFT JOIN user u ON s.s_provider_id = u.iduser
        LEFT JOIN service_image si ON s.idservice = si.si_service_id AND si.si_is_primary = 1`;
    let where = ' WHERE 1=1';
    const params = [];

    // Provider filter
    if (providerEmail) {
        where += ` AND u.u_email = ?`;
        params.push(providerEmail);
    } else if (providerId) {
        if (providerId.includes('@')) {
            where += ` AND u.u_email = ?`;
            params.push(providerId);
        } else {
            // Not an email – short-circuit with empty result
            return { rows: [], total: 0, shortCircuit: true };
        }
    } else {
        where += ` AND s.s_is_active = 1`;
    }

    if (category) {
        where += ` AND s.s_category = ?`;
        params.push(category);
    }

    if (search) {
        where += ` AND (s.s_name LIKE ? OR s.s_description LIKE ? OR u.u_fname LIKE ? OR u.u_lname LIKE ? OR CONCAT(u.u_fname, ' ', u.u_lname) LIKE ? OR u.u_email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (city) {
        where += ` AND (s.s_city LIKE ? OR s.s_state LIKE ? OR s.s_address LIKE ?)`;
        params.push(`%${city}%`, `%${city}%`, `%${city}%`);
    }

    if (minPrice !== null && !isNaN(minPrice)) {
        where += ` AND s.s_base_price >= ?`;
        params.push(minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
        where += ` AND s.s_base_price <= ?`;
        params.push(maxPrice);
    }
    if (minRating !== null && !isNaN(minRating)) {
        where += ` AND s.s_rating >= ?`;
        params.push(minRating);
    }

    if (availableDate) {
        // Exclude services whose provider has blocked this date
        where += ` AND s.s_provider_id NOT IN (
            SELECT pbd_provider_id FROM provider_blocked_date WHERE pbd_date = ?
        )`;
        params.push(availableDate);

        // Require service has availability for this day of week OR a specific date override
        where += ` AND (
            EXISTS (SELECT 1 FROM service_availability WHERE sa_service_id = s.idservice AND sa_day_of_week = DAYOFWEEK(?) - 1 AND sa_is_available = 1 AND sa_specific_date IS NULL)
            OR EXISTS (SELECT 1 FROM service_availability WHERE sa_service_id = s.idservice AND sa_specific_date = ? AND sa_is_available = 1)
        )`;
        params.push(availableDate, availableDate);

        // Exclude services whose provider already has a confirmed booking on this date
        where += ` AND s.s_provider_id NOT IN (
            SELECT s2.s_provider_id FROM booking b
            JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            JOIN service s2 ON bs.bs_service_id = s2.idservice
            WHERE b.b_event_date = ? AND b.b_status IN ('pending', 'confirmed')
        )`;
        params.push(availableDate);
    }

    let orderBy = '';
    if (featured) {
        where += ` AND s.s_rating >= 4.5`;
        orderBy = ` ORDER BY s.s_rating DESC, s.s_review_count DESC`;
    } else if (query.highRated === 'true') {
        where += ` AND s.s_rating IS NOT NULL AND s.s_rating > 0 AND s.s_rating >= 4.0 AND s.s_review_count > 0`;
        orderBy = ` ORDER BY s.s_rating DESC, s.s_review_count DESC`;
    } else {
        orderBy = ` ORDER BY s.s_created_at DESC`;
    }

    // Count total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total ${fromClause}${where}`, params
    );
    const total = countResult[0].total;

    // Main query
    const selectClause = `
        SELECT s.*,
               ${hasHourlyPrice ? 'COALESCE(s.s_hourly_price, s.s_base_price)' : 's.s_base_price'} as s_hourly_price,
               ${hasPerDayPrice ? 'COALESCE(s.s_per_day_price, s.s_base_price)' : 's.s_base_price'} as s_per_day_price,
               u.u_fname, u.u_lname, u.u_email as provider_email,
               CONCAT(u.u_fname, ' ', u.u_lname) as provider_name,
               si.si_image_url as primary_image`;
    const paginationParams = [...params, pagination.limit, pagination.offset];
    const [rows] = await pool.query(
        `${selectClause}${fromClause}${where}${orderBy} LIMIT ? OFFSET ?`,
        paginationParams
    );

    // Distance filtering
    let filteredRows = rows;
    if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng) &&
        userLat >= -90 && userLat <= 90 && userLng >= -180 && userLng <= 180) {
        try {
            filteredRows = rows.filter(service => {
                try {
                    const coords = parseCoordinates(service.s_address);
                    if (coords && !isNaN(coords.lat) && !isNaN(coords.lng) &&
                        coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
                        const distance = haversineDistance(userLat, userLng, coords.lat, coords.lng);
                        service.distance_km = Math.round(distance * 10) / 10;
                        return distance <= radiusKm;
                    }
                    return true;
                } catch (filterErr) {
                    console.error('Error filtering service by distance:', filterErr);
                    return true;
                }
            });

            filteredRows.sort((a, b) => {
                const distA = a.distance_km || 999999;
                const distB = b.distance_km || 999999;
                return distA - distB;
            });
        } catch (distanceErr) {
            console.error('Error in distance filtering:', distanceErr);
            filteredRows = rows;
        }
    }

    return { rows: filteredRows, total };
}

/**
 * Get a single service by ID.
 * @returns {object|null} The service row or null if not found.
 */
async function getServiceById(id) {
    const pool = getPool();
    const { hasHourlyPrice, hasPerDayPrice } = await checkPricingColumns(pool);

    const [rows] = await pool.query(`
        SELECT s.*,
               ${hasHourlyPrice ? 'COALESCE(s.s_hourly_price, s.s_base_price)' : 's.s_base_price'} as s_hourly_price,
               ${hasPerDayPrice ? 'COALESCE(s.s_per_day_price, s.s_base_price)' : 's.s_base_price'} as s_per_day_price,
               u.u_fname, u.u_lname, u.u_email as provider_email,
               CONCAT(u.u_fname, ' ', u.u_lname) as provider_name
        FROM service s
        LEFT JOIN user u ON s.s_provider_id = u.iduser
        WHERE s.idservice = ?
    `, [id]);

    return rows.length > 0 ? rows[0] : null;
}

/**
 * Get images for a service.
 */
async function getServiceImages(serviceId) {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT si_image_url, si_is_primary, si_order
        FROM service_image
        WHERE si_service_id = ?
        ORDER BY si_is_primary DESC, si_order ASC
    `, [serviceId]);
    return rows;
}

/**
 * Get availability rows for a service.
 */
async function getServiceAvailability(serviceId) {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT sa_day_of_week, sa_start_time, sa_end_time, sa_is_available
        FROM service_availability
        WHERE sa_service_id = ? AND sa_is_available = 1
        ORDER BY sa_day_of_week, sa_start_time
    `, [serviceId]);
    return rows;
}

/**
 * Get available time slots (or dates) for a service.
 * If `date` is provided (YYYY-MM-DD), returns time slots for that day.
 * Otherwise, returns available dates for the next 30 days.
 */
async function getAvailableSlots(serviceId, date) {
    const pool = getPool();

    // Get service availability rows
    const [availabilityRows] = await pool.query(`
        SELECT sa_day_of_week, sa_start_time, sa_end_time
        FROM service_availability
        WHERE sa_service_id = ? AND sa_is_available = 1
    `, [serviceId]);

    if (date) {
        return _getTimeSlotsForDate(pool, serviceId, date, availabilityRows);
    } else {
        return _getAvailableDates(pool, serviceId, availabilityRows);
    }
}

/**
 * Internal: build time slots for a specific date.
 */
async function _getTimeSlotsForDate(pool, serviceId, date, availabilityRows) {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();

    const [bookings] = await pool.query(`
        SELECT b_start_time, b_end_time, b.b_event_name, b.b_status
        FROM booking b
        INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
        WHERE bs.bs_service_id = ?
          AND b.b_status IN ('pending', 'confirmed')
          AND (
              b.b_event_date = ?
              OR (
                  b.b_notes IS NOT NULL
                  AND b.b_notes != ''
                  AND JSON_VALID(b.b_notes)
                  AND JSON_EXTRACT(b.b_notes, '$.allDates') IS NOT NULL
                  AND JSON_CONTAINS(JSON_EXTRACT(b.b_notes, '$.allDates'), JSON_QUOTE(?))
              )
          )
    `, [serviceId, date, date]);

    console.log(`[Available Slots] Service ID: ${serviceId}, Date: ${date}, Found ${bookings.length} existing bookings:`, bookings);

    let dayAvailability = availabilityRows.filter(a => a.sa_day_of_week === dayOfWeek);
    if (dayAvailability.length === 0 && availabilityRows.length === 0) {
        dayAvailability = [{ sa_start_time: '08:00:00', sa_end_time: '19:00:00' }];
    }

    const allSlots = [];
    for (const avail of dayAvailability) {
        const start = new Date(`2000-01-01T${avail.sa_start_time}`);
        const end = new Date(`2000-01-01T${avail.sa_end_time}`);

        let current = new Date(start);
        while (current < end) {
            const timeStr = current.toTimeString().slice(0, 5);
            const endTime = new Date(current.getTime() + 30 * 60000);
            const endTimeStr = endTime.toTimeString().slice(0, 5);

            const isBooked = bookings.some(booking => {
                const bookingStartStr = booking.b_start_time.toString();
                const bookingEndStr = booking.b_end_time.toString();
                const bookingStartTime = bookingStartStr.length === 5 ? `${bookingStartStr}:00` : bookingStartStr;
                const bookingEndTime = bookingEndStr.length === 5 ? `${bookingEndStr}:00` : bookingEndStr;

                const bookingStart = new Date(`2000-01-01T${bookingStartTime}`);
                const bookingEnd = new Date(`2000-01-01T${bookingEndTime}`);

                return (current < bookingEnd) && (endTime > bookingStart);
            });

            if (endTime <= end) {
                allSlots.push({ start: timeStr, end: endTimeStr, available: !isBooked });
            }
            current = new Date(current.getTime() + 30 * 60000);
        }
    }

    return { slots: allSlots };
}

/**
 * Internal: build available dates for the next 30 days.
 */
async function _getAvailableDates(pool, serviceId, availabilityRows) {
    const availableDates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasAvailabilityData = availabilityRows.length > 0;

    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dayOfWeek = checkDate.getDay();
        const dateStr = checkDate.toISOString().split('T')[0];

        let isAvailable = false;

        if (hasAvailabilityData) {
            const hasAvailability = availabilityRows.some(a => a.sa_day_of_week === dayOfWeek);
            if (hasAvailability) {
                const [bookings] = await pool.query(`
                    SELECT COUNT(*) as count
                    FROM booking b
                    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                    WHERE bs.bs_service_id = ?
                      AND b.b_status IN ('pending', 'confirmed')
                      AND (
                          b.b_event_date = ?
                          OR (
                              b.b_notes IS NOT NULL
                              AND b.b_notes != ''
                              AND JSON_VALID(b.b_notes)
                              AND JSON_EXTRACT(b.b_notes, '$.allDates') IS NOT NULL
                              AND JSON_CONTAINS(JSON_EXTRACT(b.b_notes, '$.allDates'), JSON_QUOTE(?))
                          )
                      )
                `, [serviceId, dateStr, dateStr]);

                if (bookings[0].count < 10) {
                    isAvailable = true;
                }
            }
        } else {
            const [bookings] = await pool.query(`
                SELECT COUNT(*) as count
                FROM booking b
                INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                WHERE bs.bs_service_id = ?
                  AND b.b_status IN ('pending', 'confirmed')
                  AND (
                      b.b_event_date = ?
                      OR (
                          b.b_notes IS NOT NULL
                          AND b.b_notes != ''
                          AND JSON_VALID(b.b_notes)
                          AND JSON_EXTRACT(b.b_notes, '$.allDates') IS NOT NULL
                          AND JSON_CONTAINS(JSON_EXTRACT(b.b_notes, '$.allDates'), JSON_QUOTE(?))
                      )
                  )
            `, [serviceId, dateStr, dateStr]);

            if (bookings[0].count < 10) {
                isAvailable = true;
            }
        }

        if (isAvailable) {
            availableDates.push(dateStr);
        }
    }

    return { dates: availableDates };
}

/**
 * Create a new service.
 * @param {object} data – service fields from the request body
 * @returns {{ id: number }}
 */
async function createService(data) {
    const pool = getPool();
    const {
        providerId, providerEmail, name, description, category,
        basePrice, pricingType, duration, maxCapacity,
        city, state, address, latitude, longitude, image,
        hourlyPrice, perDayPrice,
    } = data;

    console.log('========================================');
    console.log('RECEIVED SERVICE CREATION REQUEST:');
    console.log('========================================');
    console.log('Provider ID (from request):', providerId);
    console.log('Provider Email:', providerEmail);
    console.log('Service Name:', name);
    console.log('Description:', description);
    console.log('Category:', category);
    console.log('Base Price:', basePrice);
    console.log('Pricing Type:', pricingType);
    console.log('Duration:', duration);
    console.log('Max Capacity:', maxCapacity);
    console.log('City:', city);
    console.log('State:', state);
    console.log('Address:', address);
    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);
    console.log('========================================');

    // Resolve the database user ID
    let dbUserId = null;

    if (providerId && !isNaN(parseInt(providerId))) {
        console.log('Checking if providerId is a database ID...');
        const [userCheck] = await pool.query('SELECT iduser FROM `user` WHERE iduser = ?', [parseInt(providerId)]);
        if (userCheck.length > 0) {
            dbUserId = userCheck[0].iduser;
            console.log('Found user by ID:', dbUserId);
        }
    }

    if (!dbUserId && providerEmail) {
        console.log('Looking up user by email:', providerEmail);
        const [userByEmail] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
        if (userByEmail.length > 0) {
            dbUserId = userByEmail[0].iduser;
            console.log('Found user by email. Database ID:', dbUserId);
        } else {
            console.log('User not found by email:', providerEmail);
        }
    }

    if (!dbUserId) {
        console.log('ERROR: Provider not found in database');
        const err = new Error('Provider not found in database. Please ensure the user is registered in the system.');
        err.code = 'NOT_FOUND';
        throw err;
    }

    // Build address string with coordinates
    let fullAddress = address || '';
    if (latitude && longitude) {
        const coords = `${latitude},${longitude}`;
        fullAddress = fullAddress ? `${fullAddress} (${coords})` : coords;
    }

    // Ensure pricing columns exist
    await ensureHourlyPriceColumn(pool);
    await ensurePerDayPriceColumn(pool);

    const price = parseFloat(basePrice);
    const parsedHourlyPrice = hourlyPrice ? parseFloat(hourlyPrice) : null;
    const parsedPerDayPrice = perDayPrice ? parseFloat(perDayPrice) : null;

    const insertData = [
        dbUserId,
        name.trim(),
        description ? description.trim() : null,
        category.toLowerCase(),
        price,
        pricingType || 'fixed',
        duration || 60,
        maxCapacity || 1,
        city || null,
        state || null,
        fullAddress || null,
        1,
        parsedHourlyPrice,
        parsedPerDayPrice,
    ];

    console.log('========================================');
    console.log('INSERTING INTO DATABASE:');
    console.log('========================================');
    console.log('SQL: INSERT INTO service');
    console.log('Columns: s_provider_id, s_name, s_description, s_category, s_base_price, s_pricing_type, s_duration, s_max_capacity, s_city, s_state, s_address, s_is_active, s_hourly_price, s_per_day_price');
    console.log('Values:');
    console.log('  s_provider_id:', insertData[0]);
    console.log('  s_name:', insertData[1]);
    console.log('  s_description:', insertData[2]);
    console.log('  s_category:', insertData[3]);
    console.log('  s_base_price:', insertData[4]);
    console.log('  s_pricing_type:', insertData[5]);
    console.log('  s_duration:', insertData[6]);
    console.log('  s_max_capacity:', insertData[7]);
    console.log('  s_city:', insertData[8]);
    console.log('  s_state:', insertData[9]);
    console.log('  s_address:', insertData[10]);
    console.log('  s_is_active:', insertData[11]);
    console.log('  s_hourly_price:', insertData[12]);
    console.log('  s_per_day_price:', insertData[13]);
    console.log('========================================');

    const [result] = await pool.query(`
        INSERT INTO service
        (s_provider_id, s_name, s_description, s_category, s_base_price, s_pricing_type,
         s_duration, s_max_capacity, s_city, s_state, s_address, s_is_active, s_hourly_price, s_per_day_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, insertData);

    console.log('========================================');
    console.log('SERVICE CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log('New Service ID:', result.insertId);
    console.log('Provider Database ID:', dbUserId);
    console.log('========================================');

    // Save service image if provided
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
        try {
            const imagePath = saveBase64Image(image, result.insertId);
            await pool.query(`
                INSERT INTO service_image
                (si_service_id, si_image_url, si_is_primary, si_order)
                VALUES (?, ?, 1, 0)
            `, [result.insertId, imagePath]);
            console.log('Service image saved successfully:', imagePath);
        } catch (imageErr) {
            console.error('Failed to save service image:', imageErr);
        }
    }

    return { id: result.insertId };
}

/**
 * Update service active status.
 */
async function updateServiceStatus(serviceId, isActive) {
    const pool = getPool();
    await pool.query('UPDATE service SET s_is_active = ? WHERE idservice = ?', [isActive ? 1 : 0, serviceId]);
}

/**
 * Update a service.
 * @param {number} serviceId
 * @param {object} data – fields from the request body
 * @returns {{ message: string }}
 */
async function updateService(serviceId, data) {
    const pool = getPool();
    const {
        name, description, category, basePrice, pricingType,
        duration, maxCapacity, city, state, address,
        latitude, longitude, image, hourlyPrice, perDayPrice,
    } = data;

    // Check existence
    const [existing] = await pool.query('SELECT s_provider_id FROM service WHERE idservice = ?', [serviceId]);
    if (existing.length === 0) {
        const err = new Error('Service not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    const price = parseFloat(basePrice);

    // Build dynamic update
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
        updateFields.push('s_name = ?');
        updateValues.push(name);
    }
    if (description !== undefined) {
        updateFields.push('s_description = ?');
        updateValues.push(description);
    }
    if (category !== undefined) {
        updateFields.push('s_category = ?');
        updateValues.push(category.toLowerCase());
    }
    if (basePrice !== undefined) {
        updateFields.push('s_base_price = ?');
        updateValues.push(price);
    }
    if (hourlyPrice !== undefined) {
        await ensureHourlyPriceColumn(pool);
        updateFields.push('s_hourly_price = ?');
        updateValues.push(hourlyPrice ? parseFloat(hourlyPrice) : null);
    }
    if (perDayPrice !== undefined) {
        await ensurePerDayPriceColumn(pool);
        updateFields.push('s_per_day_price = ?');
        updateValues.push(perDayPrice ? parseFloat(perDayPrice) : null);
    }
    if (pricingType !== undefined) {
        updateFields.push('s_pricing_type = ?');
        updateValues.push(pricingType);
    }
    if (duration !== undefined) {
        updateFields.push('s_duration = ?');
        updateValues.push(parseInt(duration) || null);
    }
    if (maxCapacity !== undefined) {
        updateFields.push('s_max_capacity = ?');
        updateValues.push(parseInt(maxCapacity) || null);
    }
    if (city !== undefined) {
        updateFields.push('s_city = ?');
        updateValues.push(city || null);
    }
    if (state !== undefined) {
        updateFields.push('s_state = ?');
        updateValues.push(state || null);
    }
    if (address !== undefined || (latitude !== undefined && longitude !== undefined)) {
        let fullAddress = address || '';
        if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                const coords = `${lat},${lng}`;
                fullAddress = fullAddress ? `${fullAddress} (${coords})` : coords;
            }
        }
        updateFields.push('s_address = ?');
        updateValues.push(fullAddress || null);
    }

    if (updateFields.length === 0) {
        const err = new Error('No fields to update');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    updateFields.push('s_updated_at = NOW()');
    updateValues.push(serviceId);

    const query = `UPDATE service SET ${updateFields.join(', ')} WHERE idservice = ?`;
    await pool.query(query, updateValues);

    // Handle image update
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
        try {
            console.log('Processing image update for service:', serviceId);

            const [existingImages] = await pool.query(
                'SELECT si_image_url FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                [serviceId]
            );

            // Delete old image file
            if (existingImages.length > 0 && existingImages[0].si_image_url) {
                const oldImagePath = existingImages[0].si_image_url;
                if (oldImagePath.startsWith('/uploads/')) {
                    const oldFilePath = path.join(__dirname, '..', oldImagePath.replace('/uploads/', 'uploads/'));
                    if (fs.existsSync(oldFilePath)) {
                        try {
                            fs.unlinkSync(oldFilePath);
                            console.log('Deleted old image file:', oldFilePath);
                        } catch (deleteErr) {
                            console.warn('Could not delete old image file:', deleteErr.message);
                        }
                    } else {
                        console.log('Old image file not found (may have been deleted):', oldFilePath);
                    }
                }
            }

            // Save new image
            console.log('Saving new image to file...');
            const imagePath = saveBase64Image(image, serviceId);
            console.log('Image saved to:', imagePath);

            // Upsert image record
            const [imageExists] = await pool.query(
                'SELECT idimage FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                [serviceId]
            );

            if (imageExists.length > 0) {
                await pool.query(
                    'UPDATE service_image SET si_image_url = ? WHERE si_service_id = ? AND si_is_primary = 1',
                    [imagePath, serviceId]
                );
                console.log('Updated existing image record');
            } else {
                await pool.query(`
                    INSERT INTO service_image
                    (si_service_id, si_image_url, si_is_primary, si_order)
                    VALUES (?, ?, 1, 0)
                `, [serviceId, imagePath]);
                console.log('Inserted new image record');
            }

            console.log('Service image updated successfully:', imagePath);
        } catch (imageErr) {
            console.error('Failed to update service image:', imageErr);
            console.error('Error details:', imageErr.message);
            console.error('Stack:', imageErr.stack);
        }
    } else if (image) {
        console.log('Image provided but not in base64 format, skipping image update');
    }

    return { message: 'Service updated successfully' };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/**
 * Get reviews for a service.
 */
async function getServiceReviews(serviceId) {
    const pool = getPool();

    console.log('Getting reviews for serviceId:', serviceId);

    const [reviewRows] = await pool.query(`
        SELECT
            sr.idreview,
            sr.sr_rating,
            sr.sr_comment,
            sr.sr_created_at,
            sr.sr_updated_at,
            u.u_fname,
            u.u_lname,
            u.u_email,
            u.u_profile_picture
        FROM service_review sr
        INNER JOIN user u ON sr.sr_user_id = u.iduser
        WHERE sr.sr_service_id = ?
        ORDER BY sr.sr_created_at DESC
    `, [serviceId]);

    console.log(`Found ${reviewRows.length} reviews for service ${serviceId}`);

    const reviews = reviewRows.map((row) => ({
        id: row.idreview,
        rating: row.sr_rating,
        comment: row.sr_comment,
        createdAt: row.sr_created_at,
        updatedAt: row.sr_updated_at,
        userName: `${row.u_fname || ''} ${row.u_lname || ''}`.trim() || 'Anonymous',
        userEmail: row.u_email,
        userProfilePicture: row.u_profile_picture || null,
    }));

    console.log('Returning reviews:', reviews.length);
    return reviews;
}

// ---------------------------------------------------------------------------
// Provider profile / search / services
// ---------------------------------------------------------------------------

/**
 * Get provider profile by email.
 * @returns {object|null} provider row or null
 */
async function getProviderProfile(providerEmail) {
    const pool = getPool();

    const [userCheck] = await pool.query(
        'SELECT iduser, u_provider_status FROM `user` WHERE u_email = ?',
        [providerEmail]
    );

    if (userCheck.length === 0) {
        const err = new Error('Provider not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    const userId = userCheck[0].iduser;

    // Check if review table exists
    let reviewTableExists = false;
    try {
        await pool.query('SELECT 1 FROM `review` LIMIT 1');
        reviewTableExists = true;
    } catch (_err) {
        reviewTableExists = false;
    }

    let query;
    if (reviewTableExists) {
        query = `
            SELECT
                u.iduser,
                u.u_email,
                u.u_fname,
                u.u_lname,
                u.u_phone,
                u.u_address,
                u.u_city,
                u.u_state,
                u.u_profile_picture,
                u.u_provider_status,
                COUNT(DISTINCT s.idservice) as total_services,
                COUNT(DISTINCT bs.bs_booking_id) as total_bookings,
                AVG(r.r_rating) as average_rating,
                COUNT(DISTINCT r.idreview) as total_reviews
            FROM user u
            LEFT JOIN service s ON u.iduser = s.s_provider_id AND s.s_is_active = 1
            LEFT JOIN booking_service bs ON s.idservice = bs.bs_service_id
            LEFT JOIN review r ON s.idservice = r.r_service_id
            WHERE u.iduser = ?
            GROUP BY u.iduser
            HAVING total_services > 0
        `;
    } else {
        query = `
            SELECT
                u.iduser,
                u.u_email,
                u.u_fname,
                u.u_lname,
                u.u_phone,
                u.u_address,
                u.u_city,
                u.u_state,
                u.u_profile_picture,
                u.u_provider_status,
                COUNT(DISTINCT s.idservice) as total_services,
                COUNT(DISTINCT bs.bs_booking_id) as total_bookings,
                AVG(CASE WHEN s.s_rating IS NOT NULL AND s.s_rating > 0 THEN s.s_rating ELSE NULL END) as average_rating,
                SUM(COALESCE(s.s_review_count, 0)) as total_reviews
            FROM user u
            LEFT JOIN service s ON u.iduser = s.s_provider_id AND s.s_is_active = 1
            LEFT JOIN booking_service bs ON s.idservice = bs.bs_service_id
            WHERE u.iduser = ?
            GROUP BY u.iduser
            HAVING total_services > 0
        `;
    }

    const [providerRows] = await pool.query(query, [userId]);

    if (providerRows.length === 0) {
        const err = new Error('Provider not found or has no active services');
        err.code = 'NOT_FOUND';
        throw err;
    }

    const provider = providerRows[0];

    // Normalize types
    provider.average_rating = provider.average_rating !== null && provider.average_rating !== undefined
        ? parseFloat(provider.average_rating)
        : null;
    provider.total_reviews = provider.total_reviews !== null && provider.total_reviews !== undefined
        ? (parseInt(provider.total_reviews) || 0)
        : 0;
    provider.total_services = parseInt(provider.total_services) || 0;
    provider.total_bookings = parseInt(provider.total_bookings) || 0;

    return provider;
}

/**
 * Search providers by name / email.
 */
async function searchProviders(searchTerm) {
    const pool = getPool();
    const likeTerm = `%${searchTerm.trim()}%`;

    // Check if service_review table exists
    let reviewTableExists = false;
    try {
        await pool.query('SELECT 1 FROM `service_review` LIMIT 1');
        reviewTableExists = true;
    } catch (_err) {
        reviewTableExists = false;
    }

    let query;
    if (reviewTableExists) {
        query = `
            SELECT DISTINCT
                u.iduser,
                u.u_fname,
                u.u_lname,
                u.u_email,
                u.u_profile_picture,
                CONCAT(u.u_fname, ' ', u.u_lname) as provider_name,
                COUNT(DISTINCT s.idservice) as service_count,
                AVG(s.s_rating) as avg_rating,
                COUNT(DISTINCT sr.idreview) as review_count
            FROM user u
            INNER JOIN service s ON u.iduser = s.s_provider_id
            LEFT JOIN service_review sr ON s.idservice = sr.sr_service_id
            WHERE s.s_is_active = 1
                AND (u.u_fname LIKE ? OR u.u_lname LIKE ? OR CONCAT(u.u_fname, ' ', u.u_lname) LIKE ? OR u.u_email LIKE ?)
            GROUP BY u.iduser, u.u_fname, u.u_lname, u.u_email, u.u_profile_picture
            HAVING service_count > 0
            ORDER BY avg_rating DESC, service_count DESC
            LIMIT 20
        `;
    } else {
        query = `
            SELECT DISTINCT
                u.iduser,
                u.u_fname,
                u.u_lname,
                u.u_email,
                u.u_profile_picture,
                CONCAT(u.u_fname, ' ', u.u_lname) as provider_name,
                COUNT(DISTINCT s.idservice) as service_count,
                AVG(s.s_rating) as avg_rating,
                0 as review_count
            FROM user u
            INNER JOIN service s ON u.iduser = s.s_provider_id
            WHERE s.s_is_active = 1
                AND (u.u_fname LIKE ? OR u.u_lname LIKE ? OR CONCAT(u.u_fname, ' ', u.u_lname) LIKE ? OR u.u_email LIKE ?)
            GROUP BY u.iduser, u.u_fname, u.u_lname, u.u_email, u.u_profile_picture
            HAVING service_count > 0
            ORDER BY avg_rating DESC, service_count DESC
            LIMIT 20
        `;
    }

    const [rows] = await pool.query(query, [likeTerm, likeTerm, likeTerm, likeTerm]);
    return rows;
}

/**
 * Get provider services by email.
 */
async function getProviderServices(providerEmail) {
    const pool = getPool();

    const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
    if (userRows.length === 0) {
        return [];
    }

    const providerId = userRows[0].iduser;

    // Check if service_image table exists
    let serviceImageTableExists = false;
    try {
        await pool.query('SELECT 1 FROM `service_image` LIMIT 1');
        serviceImageTableExists = true;
    } catch (_err) {
        serviceImageTableExists = false;
    }

    const { hasHourlyPrice, hasPerDayPrice } = await checkPricingColumns(pool);

    let query;
    if (serviceImageTableExists) {
        query = `
            SELECT
                s.*,
                ${hasHourlyPrice ? 'COALESCE(s.s_hourly_price, s.s_base_price)' : 's.s_base_price'} as s_hourly_price,
                ${hasPerDayPrice ? 'COALESCE(s.s_per_day_price, s.s_base_price)' : 's.s_base_price'} as s_per_day_price,
                si.si_image_url as primary_image
            FROM service s
            LEFT JOIN service_image si ON s.idservice = si.si_service_id AND si.si_is_primary = 1
            WHERE s.s_provider_id = ? AND s.s_is_active = 1
            ORDER BY s.idservice DESC
        `;
    } else {
        query = `
            SELECT
                s.*,
                ${hasHourlyPrice ? 'COALESCE(s.s_hourly_price, s.s_base_price)' : 's.s_base_price'} as s_hourly_price,
                ${hasPerDayPrice ? 'COALESCE(s.s_per_day_price, s.s_base_price)' : 's.s_base_price'} as s_per_day_price,
                NULL as primary_image
            FROM service s
            WHERE s.s_provider_id = ? AND s.s_is_active = 1
            ORDER BY s.idservice DESC
        `;
    }

    const [serviceRows] = await pool.query(query, [providerId]);
    console.log(`Found ${serviceRows.length} services for provider ${providerEmail} (ID: ${providerId})`);

    return serviceRows;
}

// ---------------------------------------------------------------------------
// PayMongo payment credentials
// ---------------------------------------------------------------------------

/**
 * Get provider's PayMongo payment link.
 */
async function getProviderPaymentLink(providerEmail) {
    const pool = getPool();

    await ensureUserColumn(pool, 'u_paymongo_payment_link', 'VARCHAR(500) DEFAULT NULL');

    const [userRows] = await pool.query(
        'SELECT u_paymongo_payment_link FROM `user` WHERE u_email = ? AND u_role = ?',
        [providerEmail, 'provider']
    );

    if (userRows.length === 0) {
        const err = new Error('Provider not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    return { paymentLink: userRows[0].u_paymongo_payment_link || null };
}

/**
 * Update provider's PayMongo payment link.
 */
async function updateProviderPaymentLink(providerEmail, paymentLink) {
    const pool = getPool();

    await ensureUserColumn(pool, 'u_paymongo_payment_link', 'VARCHAR(500) DEFAULT NULL');

    const [userRows] = await pool.query(
        'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
        [providerEmail, 'provider']
    );

    if (userRows.length === 0) {
        const err = new Error('Provider not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    await pool.query(
        'UPDATE `user` SET u_paymongo_payment_link = ? WHERE u_email = ? AND u_role = ?',
        [paymentLink.trim(), providerEmail, 'provider']
    );

    return { message: 'Payment link updated successfully', paymentLink: paymentLink.trim() };
}

/**
 * Save provider's PayMongo API credentials.
 */
async function savePaymongoCredentials(providerEmail, secretKey, publicKey, mode) {
    const pool = getPool();

    // Ensure columns exist
    try {
        await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_secret_key VARCHAR(500) DEFAULT NULL');
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_public_key VARCHAR(500) DEFAULT NULL');
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_mode VARCHAR(10) DEFAULT NULL');
        }
    }

    const [userRows] = await pool.query(
        'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
        [providerEmail, 'provider']
    );

    if (userRows.length === 0) {
        const err = new Error('Provider not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    await pool.query(
        'UPDATE `user` SET u_paymongo_secret_key = ?, u_paymongo_public_key = ?, u_paymongo_mode = ? WHERE u_email = ? AND u_role = ?',
        [
            secretKey.trim(),
            publicKey && publicKey.trim() !== '' ? publicKey.trim() : null,
            mode,
            providerEmail,
            'provider',
        ]
    );

    return { message: 'PayMongo credentials saved successfully', mode };
}

/**
 * Get provider's PayMongo credentials.
 */
async function getPaymongoCredentials(providerEmail) {
    const pool = getPool();

    // Ensure columns exist
    try {
        await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_secret_key VARCHAR(500) DEFAULT NULL');
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_public_key VARCHAR(500) DEFAULT NULL');
            await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_mode VARCHAR(10) DEFAULT NULL');
        }
    }

    const [userRows] = await pool.query(
        'SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` WHERE u_email = ? AND u_role = ?',
        [providerEmail, 'provider']
    );

    if (userRows.length === 0) {
        const err = new Error('Provider not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    return {
        secretKey: userRows[0].u_paymongo_secret_key || null,
        publicKey: userRows[0].u_paymongo_public_key || null,
        mode: userRows[0].u_paymongo_mode || null,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    // helpers (exported for potential reuse)
    saveBase64Image,
    // service CRUD
    listServices,
    getServiceById,
    getServiceImages,
    getServiceAvailability,
    getAvailableSlots,
    createService,
    updateServiceStatus,
    updateService,
    // reviews
    getServiceReviews,
    // provider
    getProviderProfile,
    searchProviders,
    getProviderServices,
    // payment
    getProviderPaymentLink,
    updateProviderPaymentLink,
    savePaymongoCredentials,
    getPaymongoCredentials,
};
