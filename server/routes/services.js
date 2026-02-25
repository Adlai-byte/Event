// server/routes/services.js
// Service endpoints: CRUD, images, availability, reviews, provider profile/search, payment credentials
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { serviceValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');

// Uploads directory - same resolution as index.js
const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR, 'images')
    : path.join(__dirname, '..', 'uploads', 'images');

// Helper function to save base64 image to file
function saveBase64Image(base64String, serviceId) {
    try {
        // Extract image format and data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image format');
        }

        const imageFormat = matches[1]; // jpeg, png, etc.
        const imageData = matches[2]; // base64 data without prefix

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const filename = `service_${serviceId}_${timestamp}_${randomStr}.${imageFormat}`;
        const filepath = path.join(uploadsDir, filename);

        // Convert base64 to buffer and save
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filepath, buffer);

        // Return the URL path (relative to /uploads)
        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Error saving image file:', error);
        throw error;
    }
}

// Get all services
router.get('/services', async (req, res) => {
    try {
        const pool = getPool();
        // Handle query parameters that might be arrays (if duplicate params in URL) - take first value
        const category = Array.isArray(req.query.category) ? req.query.category[0] : req.query.category;
        const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
        const featured = req.query.featured === 'true';
        const city = Array.isArray(req.query.city) ? req.query.city[0] : req.query.city;
        const providerId = Array.isArray(req.query.providerId) ? req.query.providerId[0] : req.query.providerId; // Firebase UID
        const providerEmail = Array.isArray(req.query.providerEmail) ? req.query.providerEmail[0] : req.query.providerEmail;
        const userLat = req.query.latitude ? parseFloat(Array.isArray(req.query.latitude) ? req.query.latitude[0] : req.query.latitude) : null;
        const userLng = req.query.longitude ? parseFloat(Array.isArray(req.query.longitude) ? req.query.longitude[0] : req.query.longitude) : null;
        const radiusKm = req.query.radius ? parseFloat(Array.isArray(req.query.radius) ? req.query.radius[0] : req.query.radius) : 100; // Default 100km
        const minPrice = req.query.minPrice ? parseFloat(Array.isArray(req.query.minPrice) ? req.query.minPrice[0] : req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(Array.isArray(req.query.maxPrice) ? req.query.maxPrice[0] : req.query.maxPrice) : null;
        const minRating = req.query.minRating ? parseFloat(Array.isArray(req.query.minRating) ? req.query.minRating[0] : req.query.minRating) : null;

        // Check if hourly_price and per_day_price columns exist
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

        let query = `
            SELECT s.*,
                   ${hasHourlyPrice ? 'COALESCE(s.s_hourly_price, s.s_base_price)' : 's.s_base_price'} as s_hourly_price,
                   ${hasPerDayPrice ? 'COALESCE(s.s_per_day_price, s.s_base_price)' : 's.s_base_price'} as s_per_day_price,
                   u.u_fname, u.u_lname, u.u_email as provider_email,
                   CONCAT(u.u_fname, ' ', u.u_lname) as provider_name,
                   si.si_image_url as primary_image
            FROM service s
            LEFT JOIN user u ON s.s_provider_id = u.iduser
            LEFT JOIN service_image si ON s.idservice = si.si_service_id AND si.si_is_primary = 1
            WHERE 1=1
        `;
        const params = [];

        // Filter by provider if specified
        if (providerEmail) {
            query += ` AND u.u_email = ?`;
            params.push(providerEmail);
            // Include both active AND inactive services when provider views their own services
            // No s_is_active filter is added, so all services are returned
        } else if (providerId) {
            // If providerId is an email (contains @), use it
            if (providerId.includes('@')) {
                query += ` AND u.u_email = ?`;
                params.push(providerId);
                // Include both active AND inactive services when provider views their own services
            } else {
                // For Firebase UID, we'd need a mapping - for now, return empty or all
                // This is a limitation - we should store Firebase UID in user table
                return res.json({ ok: true, rows: [] });
            }
        } else {
            // For public listing, only show active services
            query += ` AND s.s_is_active = 1`;
        }

        if (category) {
            query += ` AND s.s_category = ?`;
            params.push(category);
        }

        if (search) {
            query += ` AND (s.s_name LIKE ? OR s.s_description LIKE ? OR u.u_fname LIKE ? OR u.u_lname LIKE ? OR CONCAT(u.u_fname, ' ', u.u_lname) LIKE ? OR u.u_email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (city) {
            // Search in city, state, and address fields to find location matches
            // This allows finding "mati" whether it's in city name, state, or full address
            query += ` AND (s.s_city LIKE ? OR s.s_state LIKE ? OR s.s_address LIKE ?)`;
            params.push(`%${city}%`, `%${city}%`, `%${city}%`);
        }

        if (minPrice !== null && !isNaN(minPrice)) {
            query += ` AND s.s_base_price >= ?`;
            params.push(minPrice);
        }

        if (maxPrice !== null && !isNaN(maxPrice)) {
            query += ` AND s.s_base_price <= ?`;
            params.push(maxPrice);
        }

        if (minRating !== null && !isNaN(minRating)) {
            query += ` AND s.s_rating >= ?`;
            params.push(minRating);
        }

        if (featured) {
            query += ` AND s.s_rating >= 4.5`;
            query += ` ORDER BY s.s_rating DESC, s.s_review_count DESC`;
        } else if (req.query.highRated === 'true') {
            // High-rated services (rating >= 4.0, with at least 1 review, rating is not NULL and not 0)
            query += ` AND s.s_rating IS NOT NULL AND s.s_rating > 0 AND s.s_rating >= 4.0 AND s.s_review_count > 0`;
            query += ` ORDER BY s.s_rating DESC, s.s_review_count DESC`;
        } else {
            query += ` ORDER BY s.s_created_at DESC`;
        }

        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        if (limit && limit > 0) {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        const [rows] = await pool.query(query, params);

        // Filter by distance if user location is provided
        let filteredRows = rows;
        if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng) &&
            userLat >= -90 && userLat <= 90 && userLng >= -180 && userLng <= 180) {
            try {
            filteredRows = rows.filter(service => {
                    try {
                const address = service.s_address || '';
                let serviceLat = null;
                let serviceLng = null;

                // Parse coordinates from address: "address (lat,lng)" or just "lat,lng"
                const coordsMatch = address.match(/\(([\d.-]+),([\d.-]+)\)/);
                if (coordsMatch) {
                    serviceLat = parseFloat(coordsMatch[1]);
                    serviceLng = parseFloat(coordsMatch[2]);
                } else if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(address.trim())) {
                    // Address is just coordinates
                    const [lat, lng] = address.split(',');
                    serviceLat = parseFloat(lat);
                    serviceLng = parseFloat(lng);
                }

                // If service has coordinates, calculate distance
                        if (serviceLat !== null && serviceLng !== null && !isNaN(serviceLat) && !isNaN(serviceLng) &&
                            serviceLat >= -90 && serviceLat <= 90 && serviceLng >= -180 && serviceLng <= 180) {
                    // Haversine formula to calculate distance in kilometers
                    const R = 6371; // Earth's radius in km
                    const dLat = (serviceLat - userLat) * Math.PI / 180;
                    const dLng = (serviceLng - userLng) * Math.PI / 180;
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(userLat * Math.PI / 180) * Math.cos(serviceLat * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;

                    // Add distance to service object
                    service.distance_km = Math.round(distance * 10) / 10; // Round to 1 decimal

                    return distance <= radiusKm;
                }

                // If service doesn't have coordinates, include it (for backward compatibility)
                return true;
                    } catch (filterErr) {
                        console.error('Error filtering service by distance:', filterErr);
                        // Include service if distance calculation fails
                        return true;
                    }
            });

            // Sort by distance if location filtering is active
            filteredRows.sort((a, b) => {
                const distA = a.distance_km || 999999;
                const distB = b.distance_km || 999999;
                return distA - distB;
            });
            } catch (distanceErr) {
                console.error('Error in distance filtering:', distanceErr);
                // If distance filtering fails, return all rows without distance filtering
                filteredRows = rows;
            }
        }

        return res.json({ ok: true, rows: filteredRows });
    } catch (err) {
        console.error('List services failed:', err.code, err.message);
        console.error('Error stack:', err.stack);
        console.error('Request query:', req.query);
        return res.status(500).json({ ok: false, error: err.message || 'Database error', details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
    }
});

// Get service by ID
router.get('/services/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();

        // Check if hourly_price and per_day_price columns exist
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
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }
        return res.json({ ok: true, service: rows[0] });
    } catch (err) {
        console.error('Get service failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get service images
router.get('/services/:id/images', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT si_image_url, si_is_primary, si_order
            FROM service_image
            WHERE si_service_id = ?
            ORDER BY si_is_primary DESC, si_order ASC
        `, [id]);
        return res.json({ ok: true, images: rows });
    } catch (err) {
        console.error('Get service images failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get service availability
router.get('/services/:id/availability', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT sa_day_of_week, sa_start_time, sa_end_time, sa_is_available
            FROM service_availability
            WHERE sa_service_id = ? AND sa_is_available = 1
            ORDER BY sa_day_of_week, sa_start_time
        `, [id]);
        return res.json({ ok: true, availability: rows });
    } catch (err) {
        console.error('Get availability failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get available dates and times for a service
router.get('/services/:id/available-slots', async (req, res) => {
    const id = Number(req.params.id);
    const date = req.query.date; // YYYY-MM-DD format

    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    try {
        const pool = getPool();

        // Get service availability
        const [availabilityRows] = await pool.query(`
            SELECT sa_day_of_week, sa_start_time, sa_end_time
            FROM service_availability
            WHERE sa_service_id = ? AND sa_is_available = 1
        `, [id]);

        if (date) {
            // Get specific date's available times
            const selectedDate = new Date(date);
            const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Check for existing bookings on this date for this specific service
            // This includes both single-day bookings and multi-day bookings that include this date
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
            `, [id, date, date]);

            console.log(`[Available Slots] Service ID: ${id}, Date: ${date}, Found ${bookings.length} existing bookings:`, bookings);

            // Filter availability for this day of week
            let dayAvailability = availabilityRows.filter(a => a.sa_day_of_week === dayOfWeek);

            // If no availability data exists, use default hours (8 AM - 7 PM)
            if (dayAvailability.length === 0 && availabilityRows.length === 0) {
                dayAvailability = [
                    { sa_start_time: '08:00:00', sa_end_time: '19:00:00' }
                ];
            }

            // Generate time slots (every 30 minutes) - return all slots with availability flag
            const allSlots = [];
            for (const avail of dayAvailability) {
                const start = new Date(`2000-01-01T${avail.sa_start_time}`);
                const end = new Date(`2000-01-01T${avail.sa_end_time}`);

                let current = new Date(start);
                while (current < end) {
                    const timeStr = current.toTimeString().slice(0, 5);
                    const endTime = new Date(current.getTime() + 30 * 60000);
                    const endTimeStr = endTime.toTimeString().slice(0, 5);

                    // Check if this slot conflicts with existing bookings
                    // Only mark as unavailable if it directly overlaps with a booking
                    const isBooked = bookings.some(booking => {
                        // Normalize time format to HH:MM:SS
                        const bookingStartStr = booking.b_start_time.toString();
                        const bookingEndStr = booking.b_end_time.toString();
                        const bookingStartTime = bookingStartStr.length === 5 ? `${bookingStartStr}:00` : bookingStartStr;
                        const bookingEndTime = bookingEndStr.length === 5 ? `${bookingEndStr}:00` : bookingEndStr;

                        // Create date objects for comparison (using same base date)
                        const bookingStart = new Date(`2000-01-01T${bookingStartTime}`);
                        const bookingEnd = new Date(`2000-01-01T${bookingEndTime}`);

                        // Standard interval overlap check: two intervals overlap if
                        // slotStart < bookingEnd AND slotEnd > bookingStart
                        // This means the slot and booking share any time in common
                        const overlaps = (current < bookingEnd) && (endTime > bookingStart);

                        return overlaps;
                    });

                    // Add ALL slots (both available and unavailable) so frontend can display them properly
                    if (endTime <= end) {
                        allSlots.push({
                            start: timeStr,
                            end: endTimeStr,
                            available: !isBooked
                        });
                    }

                    current = new Date(current.getTime() + 30 * 60000);
                }
            }

            // Return only available slots
            return res.json({ ok: true, slots: allSlots });
        } else {
            // Get available dates for the next 30 days
            const availableDates = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // If no availability data exists, make all dates available (default behavior)
            const hasAvailabilityData = availabilityRows.length > 0;

            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() + i);
                const dayOfWeek = checkDate.getDay();
                const dateStr = checkDate.toISOString().split('T')[0];

                let isAvailable = false;

                if (hasAvailabilityData) {
                    // Check if service is available on this day of week
                    const hasAvailability = availabilityRows.some(a => a.sa_day_of_week === dayOfWeek);

                    if (hasAvailability) {
                        // Check if there are any bookings on this date
                        // This includes both single-day bookings and multi-day bookings that include this date
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
                        `, [id, dateStr, dateStr]);

                        // Consider date available if not fully booked (you can adjust this logic)
                        if (bookings[0].count < 10) { // Example: max 10 bookings per day
                            isAvailable = true;
                        }
                    }
                } else {
                    // No availability restrictions - all dates are available
                    // Just check if not fully booked
                    // This includes both single-day bookings and multi-day bookings that include this date
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
                    `, [id, dateStr, dateStr]);

                    if (bookings[0].count < 10) {
                        isAvailable = true;
                    }
                }

                if (isAvailable) {
                    availableDates.push(dateStr);
                }
            }

            return res.json({ ok: true, dates: availableDates });
        }
    } catch (err) {
        console.error('Get available slots failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Create service
router.post('/services', authMiddleware, requireRole('provider', 'admin'), serviceValidation, validate, async (req, res) => {
    const { providerId, providerEmail, name, description, category, basePrice, pricingType, duration, maxCapacity, city, state, address, latitude, longitude, image } = req.body || {};

    // Validate required fields
    if ((!providerId && !providerEmail) || !name || !category || basePrice === undefined || basePrice === null) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: providerId or providerEmail, name, category, and basePrice are required' });
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'music'];
    if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Invalid category' });
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid price' });
    }

    try {
        const pool = getPool();

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

        // Look up the database user ID by email or providerId
        let dbUserId = null;

        // If providerId is a number, use it directly
        if (providerId && !isNaN(parseInt(providerId))) {
            console.log('Checking if providerId is a database ID...');
            const [userCheck] = await pool.query('SELECT iduser FROM `user` WHERE iduser = ?', [parseInt(providerId)]);
            if (userCheck.length > 0) {
                dbUserId = userCheck[0].iduser;
                console.log('Found user by ID:', dbUserId);
            }
        }

        // If not found and we have email, look up by email
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

        // If still not found and providerId is a string (Firebase UID), try to find by email from user object
        if (!dbUserId) {
            console.log('ERROR: Provider not found in database');
            return res.status(400).json({ ok: false, error: 'Provider not found in database. Please ensure the user is registered in the system.' });
        }

        // Build address string with coordinates if available
        let fullAddress = address || '';
        if (latitude && longitude) {
            const coords = `${latitude},${longitude}`;
            if (fullAddress) {
                fullAddress = `${fullAddress} (${coords})`;
            } else {
                fullAddress = coords;
            }
        }

        // Check and add hourly_price and per_day_price columns if they don't exist
        try {
            const [hourlyPriceCheck] = await pool.query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'service'
                AND COLUMN_NAME = 's_hourly_price'
            `);
            if (hourlyPriceCheck.length === 0) {
                await pool.query(`ALTER TABLE service ADD COLUMN s_hourly_price DECIMAL(10,2) NULL AFTER s_base_price`);
                console.log('Added s_hourly_price column');
            }
        } catch (alterErr) {
            if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding s_hourly_price column:', alterErr);
            }
        }

        try {
            const [perDayPriceCheck] = await pool.query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'service'
                AND COLUMN_NAME = 's_per_day_price'
            `);
            if (perDayPriceCheck.length === 0) {
                await pool.query(`ALTER TABLE service ADD COLUMN s_per_day_price DECIMAL(10,2) NULL AFTER s_hourly_price`);
                console.log('Added s_per_day_price column');
            }
        } catch (alterErr) {
            if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
                console.error('Error adding s_per_day_price column:', alterErr);
            }
        }

        // Get hourly and per-day prices from request
        const hourlyPrice = req.body.hourlyPrice ? parseFloat(req.body.hourlyPrice) : null;
        const perDayPrice = req.body.perDayPrice ? parseFloat(req.body.perDayPrice) : null;

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
            hourlyPrice,
            perDayPrice
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
                // Save image to file and get file path
                const imagePath = saveBase64Image(image, result.insertId);

                // Store file path in service_image table as primary image
                await pool.query(`
                    INSERT INTO service_image
                    (si_service_id, si_image_url, si_is_primary, si_order)
                    VALUES (?, ?, 1, 0)
                `, [result.insertId, imagePath]);
                console.log('Service image saved successfully:', imagePath);
            } catch (imageErr) {
                console.error('Failed to save service image:', imageErr);
                // Don't fail the entire request if image save fails
            }
        }

        return res.json({ ok: true, id: result.insertId, message: 'Service created successfully' });
    } catch (err) {
        console.log('========================================');
        console.log('CREATE SERVICE FAILED:');
        console.log('========================================');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Full Error:', err);
        console.log('========================================');
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    }
});

// Update service status (activate/deactivate)
router.post('/services/:id/status', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    const { isActive } = req.body || {};
    if (!Number.isFinite(id) || typeof isActive !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'Invalid parameters' });
    }
    try {
        const pool = getPool();
        await pool.query('UPDATE service SET s_is_active = ? WHERE idservice = ?', [isActive ? 1 : 0, id]);
        return res.json({ ok: true });
    } catch (err) {
        console.error('Update service status failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update service
router.put('/services/:id', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    const { name, description, category, basePrice, pricingType, duration, maxCapacity, city, state, address, latitude, longitude, image, hourlyPrice, perDayPrice } = req.body || {};

    // Validate required fields
    if (!name || !category || basePrice === undefined || basePrice === null) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: name, category, and basePrice are required' });
    }

    // Validate category
    const validCategories = ['venue', 'catering', 'photography', 'music'];
    if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Invalid category' });
    }

    // Validate price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid price' });
    }

    try {
        const pool = getPool();

        // Check if service exists and belongs to the provider
        const [existing] = await pool.query('SELECT s_provider_id FROM service WHERE idservice = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }

        // Build update query dynamically
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
            // Check and add column if it doesn't exist
            try {
                const [hourlyPriceCheck] = await pool.query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'service'
                    AND COLUMN_NAME = 's_hourly_price'
                `);
                if (hourlyPriceCheck.length === 0) {
                    await pool.query(`ALTER TABLE service ADD COLUMN s_hourly_price DECIMAL(10,2) NULL AFTER s_base_price`);
                }
            } catch (alterErr) {
                if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
                    console.error('Error adding s_hourly_price column:', alterErr);
                }
            }
            updateFields.push('s_hourly_price = ?');
            updateValues.push(hourlyPrice ? parseFloat(hourlyPrice) : null);
        }
        if (perDayPrice !== undefined) {
            // Check and add column if it doesn't exist
            try {
                const [perDayPriceCheck] = await pool.query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'service'
                    AND COLUMN_NAME = 's_per_day_price'
                `);
                if (perDayPriceCheck.length === 0) {
                    await pool.query(`ALTER TABLE service ADD COLUMN s_per_day_price DECIMAL(10,2) NULL AFTER s_hourly_price`);
                }
            } catch (alterErr) {
                if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
                    console.error('Error adding s_per_day_price column:', alterErr);
                }
            }
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
        // Handle address with coordinates (same as create endpoint)
        // Only update address if address, latitude, or longitude is provided
        if (address !== undefined || (latitude !== undefined && longitude !== undefined)) {
            let fullAddress = address || '';
            if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const coords = `${lat},${lng}`;
                    if (fullAddress) {
                        fullAddress = `${fullAddress} (${coords})`;
                    } else {
                        fullAddress = coords;
                    }
                }
            }
            updateFields.push('s_address = ?');
            updateValues.push(fullAddress || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        // Add updated_at
        updateFields.push('s_updated_at = NOW()');
        updateValues.push(id);

        const query = `UPDATE service SET ${updateFields.join(', ')} WHERE idservice = ?`;
        await pool.query(query, updateValues);

        // Handle image update if provided
        if (image && typeof image === 'string' && image.startsWith('data:image')) {
            try {
                console.log('Processing image update for service:', id);

                // Get existing image to delete old file
                const [existingImages] = await pool.query(
                    'SELECT si_image_url FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                    [id]
                );

                // Delete old image file if it exists
                if (existingImages.length > 0 && existingImages[0].si_image_url) {
                    const oldImagePath = existingImages[0].si_image_url;
                    // Only delete if it's a file path (starts with /uploads), not base64
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

                // Save new image to file
                console.log('Saving new image to file...');
                const imagePath = saveBase64Image(image, id);
                console.log('Image saved to:', imagePath);

                // Update or insert image record
                const [imageExists] = await pool.query(
                    'SELECT idimage FROM service_image WHERE si_service_id = ? AND si_is_primary = 1',
                    [id]
                );

                if (imageExists.length > 0) {
                    // Update existing image
                    await pool.query(
                        'UPDATE service_image SET si_image_url = ? WHERE si_service_id = ? AND si_is_primary = 1',
                        [imagePath, id]
                    );
                    console.log('Updated existing image record');
                } else {
                    // Insert new image
                    await pool.query(`
                        INSERT INTO service_image
                        (si_service_id, si_image_url, si_is_primary, si_order)
                        VALUES (?, ?, 1, 0)
                    `, [id, imagePath]);
                    console.log('Inserted new image record');
                }

                console.log('Service image updated successfully:', imagePath);
            } catch (imageErr) {
                console.error('Failed to update service image:', imageErr);
                console.error('Error details:', imageErr.message);
                console.error('Stack:', imageErr.stack);
                // Don't fail the entire request if image update fails
            }
        } else if (image) {
            console.log('Image provided but not in base64 format, skipping image update');
        }

        return res.json({ ok: true, message: 'Service updated successfully' });
    } catch (err) {
        console.error('Update service failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: err.message || 'Database error' });
    }
});

// Get service reviews
router.get('/services/:serviceId/reviews', async (req, res) => {
    const serviceId = Number(req.params.serviceId);

    console.log('Getting reviews for serviceId:', serviceId);

    if (!Number.isFinite(serviceId)) {
        console.error('Invalid service ID:', req.params.serviceId);
        return res.status(400).json({ ok: false, error: 'Invalid service ID' });
    }

    try {
        const pool = getPool();

        // Get all reviews for this service with user information
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
            userProfilePicture: row.u_profile_picture || null
        }));

        console.log('Returning reviews:', reviews.length);
        return res.json({ ok: true, reviews });
    } catch (err) {
        console.error('Get service reviews failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get provider profile
router.get('/provider/profile', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const providerEmail = req.query.email;

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    try {
        const pool = getPool();

        // First check if user exists
        const [userCheck] = await pool.query(
            'SELECT iduser, u_provider_status FROM `user` WHERE u_email = ?',
            [providerEmail]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }

        const userId = userCheck[0].iduser;
        const providerStatus = userCheck[0].u_provider_status;

        // Check if review table exists
        let reviewTableExists = false;
        try {
            await pool.query('SELECT 1 FROM `review` LIMIT 1');
            reviewTableExists = true;
        } catch (err) {
            // Review table doesn't exist, that's okay
            reviewTableExists = false;
        }

        // Get provider information (allow viewing even if not approved, but only if they have services)
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
            // Use service ratings directly from service table
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
            return res.status(404).json({ ok: false, error: 'Provider not found or has no active services' });
        }

        const provider = providerRows[0];

        // Convert average_rating to number
        if (provider.average_rating !== null && provider.average_rating !== undefined) {
            provider.average_rating = parseFloat(provider.average_rating);
        } else {
            provider.average_rating = null;
        }

        // Ensure total_reviews is a number
        if (provider.total_reviews !== null && provider.total_reviews !== undefined) {
            provider.total_reviews = parseInt(provider.total_reviews) || 0;
        } else {
            provider.total_reviews = 0;
        }

        // Ensure counts are numbers
        provider.total_services = parseInt(provider.total_services) || 0;
        provider.total_bookings = parseInt(provider.total_bookings) || 0;

        return res.json({ ok: true, provider });
    } catch (err) {
        console.error('Get provider profile failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Search providers
router.get('/providers/search', searchLimiter, async (req, res) => {
    const search = req.query.search;

    if (!search || !search.trim()) {
        return res.json({ ok: true, providers: [] });
    }

    try {
        const pool = getPool();
        const searchTerm = `%${search.trim()}%`;

        // Check if service_review table exists
        let reviewTableExists = false;
        try {
            await pool.query('SELECT 1 FROM `service_review` LIMIT 1');
            reviewTableExists = true;
        } catch (err) {
            reviewTableExists = false;
        }

        // Build query based on whether review table exists
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

        const [rows] = await pool.query(query, [searchTerm, searchTerm, searchTerm, searchTerm]);

        return res.json({ ok: true, providers: rows });
    } catch (err) {
        console.error('Search providers failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get provider services by email
router.get('/provider/services', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const providerEmail = req.query.email;

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    try {
        const pool = getPool();

        // Get provider user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
        if (userRows.length === 0) {
            return res.json({ ok: true, services: [] });
        }

        const providerId = userRows[0].iduser;

        // Check if service_image table exists
        let serviceImageTableExists = false;
        try {
            await pool.query('SELECT 1 FROM `service_image` LIMIT 1');
            serviceImageTableExists = true;
        } catch (err) {
            // service_image table doesn't exist, that's okay
            serviceImageTableExists = false;
        }

        // Check if hourly_price and per_day_price columns exist
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

        // Get provider's active services
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

        // Map image URLs - return relative paths, client will handle full URL
        const services = serviceRows.map(service => {
            // Keep the image path as is - client will prepend base URL if needed
            // If it's already a full URL, keep it; if it's relative, client will handle it
            return service;
        });

        return res.json({ ok: true, services });
    } catch (err) {
        console.error('Get provider services failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get provider's PayMongo payment link
router.get('/provider/payment-link', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const providerEmail = req.query.providerEmail;

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    try {
        const pool = getPool();

        // Ensure column exists
        try {
            await pool.query('SELECT u_paymongo_payment_link FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_payment_link VARCHAR(500) DEFAULT NULL');
            }
        }

        const [userRows] = await pool.query(
            'SELECT u_paymongo_payment_link FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );

        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }

        return res.json({
            ok: true,
            paymentLink: userRows[0].u_paymongo_payment_link || null
        });
    } catch (err) {
        console.error('Get provider payment link failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update provider's PayMongo payment link
router.post('/provider/payment-link', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const { providerEmail, paymentLink } = req.body || {};

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    if (!paymentLink || typeof paymentLink !== 'string' || paymentLink.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Payment link is required' });
    }

    // Validate PayMongo payment link format
    const paymongoLinkPattern = /^https?:\/\/(paymongo\.page|l\.paymongo\.com)\//;
    if (!paymongoLinkPattern.test(paymentLink.trim())) {
        return res.status(400).json({
            ok: false,
            error: 'Invalid PayMongo payment link format. Must be a valid PayMongo payment page URL.'
        });
    }

    try {
        const pool = getPool();

        // Ensure column exists
        try {
            await pool.query('SELECT u_paymongo_payment_link FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_payment_link VARCHAR(500) DEFAULT NULL');
            }
        }

        // Verify user is a provider
        const [userRows] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );

        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }

        // Update payment link
        await pool.query(
            'UPDATE `user` SET u_paymongo_payment_link = ? WHERE u_email = ? AND u_role = ?',
            [paymentLink.trim(), providerEmail, 'provider']
        );

        return res.json({
            ok: true,
            message: 'Payment link updated successfully',
            paymentLink: paymentLink.trim()
        });
    } catch (err) {
        console.error('Update provider payment link failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Save provider's PayMongo credentials
router.post('/provider/paymongo-credentials', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const { providerEmail, secretKey, publicKey, mode } = req.body || {};

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Secret key is required' });
    }

    // Validate secret key format (should start with sk_test_ or sk_live_)
    const secretKeyPattern = /^sk_(test|live)_/;
    if (!secretKeyPattern.test(secretKey.trim())) {
        return res.status(400).json({
            ok: false,
            error: 'Invalid secret key format. Must start with sk_test_ or sk_live_'
        });
    }

    // Validate public key format if provided (should start with pk_test_ or pk_live_)
    if (publicKey && publicKey.trim() !== '') {
        const publicKeyPattern = /^pk_(test|live)_/;
        if (!publicKeyPattern.test(publicKey.trim())) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid public key format. Must start with pk_test_ or pk_live_'
            });
        }

        // Ensure secret and public keys match in mode
        const secretMode = secretKey.trim().startsWith('sk_test_') ? 'test' : 'live';
        const publicMode = publicKey.trim().startsWith('pk_test_') ? 'test' : 'live';
        if (secretMode !== publicMode) {
            return res.status(400).json({
                ok: false,
                error: 'Secret key and public key must be from the same mode (both TEST or both LIVE)'
            });
        }
    }

    // Validate mode if provided
    const validModes = ['test', 'live'];
    const finalMode = mode || (secretKey.trim().startsWith('sk_test_') ? 'test' : 'live');
    if (!validModes.includes(finalMode)) {
        return res.status(400).json({
            ok: false,
            error: 'Mode must be either "test" or "live"'
        });
    }

    try {
        const pool = getPool();

        // Ensure columns exist
        try {
            await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                // Add columns if they don't exist
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_secret_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_public_key VARCHAR(500) DEFAULT NULL');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_paymongo_mode VARCHAR(10) DEFAULT NULL');
            }
        }

        // Verify user is a provider
        const [userRows] = await pool.query(
            'SELECT iduser FROM `user` WHERE u_email = ? AND u_role = ?',
            [providerEmail, 'provider']
        );

        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }

        // Update credentials
        await pool.query(
            'UPDATE `user` SET u_paymongo_secret_key = ?, u_paymongo_public_key = ?, u_paymongo_mode = ? WHERE u_email = ? AND u_role = ?',
            [
                secretKey.trim(),
                publicKey && publicKey.trim() !== '' ? publicKey.trim() : null,
                finalMode,
                providerEmail,
                'provider'
            ]
        );

        return res.json({
            ok: true,
            message: 'PayMongo credentials saved successfully',
            mode: finalMode
        });
    } catch (err) {
        console.error('Save PayMongo credentials failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get provider's PayMongo credentials
router.get('/provider/paymongo-credentials', authMiddleware, requireRole('provider', 'admin'), async (req, res) => {
    const providerEmail = req.query.providerEmail;

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    try {
        const pool = getPool();

        // Ensure columns exist
        try {
            await pool.query('SELECT u_paymongo_secret_key, u_paymongo_public_key, u_paymongo_mode FROM `user` LIMIT 1');
        } catch (checkErr) {
            if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
                // Add columns if they don't exist
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
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }

        return res.json({
            ok: true,
            secretKey: userRows[0].u_paymongo_secret_key || null,
            publicKey: userRows[0].u_paymongo_public_key || null,
            mode: userRows[0].u_paymongo_mode || null
        });
    } catch (err) {
        console.error('Get PayMongo credentials failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

module.exports = router;
