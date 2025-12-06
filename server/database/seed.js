// Database Seed Script
// Populates the database with sample data for testing

// Load environment variables from parent directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'event';
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function seedDatabase() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            port: DB_PORT
        });

        console.log('Connected to database');
        console.log('Seeding database with sample data...\n');

        // Check if admin user exists
        const [adminUsers] = await connection.query(
            "SELECT iduser FROM `user` WHERE u_email = 'admin@gmail.com'"
        );

        let adminUserId;
        if (adminUsers.length === 0) {
            // Create admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const [result] = await connection.query(
                `INSERT INTO \`user\` (u_fname, u_lname, u_email, u_password, u_role, u_disabled) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Admin', 'User', 'admin@gmail.com', hashedPassword, 'admin', 0]
            );
            adminUserId = result.insertId;
            console.log('✓ Created admin user');
        } else {
            adminUserId = adminUsers[0].iduser;
            console.log('✓ Admin user already exists');
        }

        // Create sample provider users
        const providers = [
            { fname: 'John', lname: 'Provider', email: 'john.provider@example.com', password: 'provider123' },
            { fname: 'Jane', lname: 'Supplier', email: 'jane.supplier@example.com', password: 'provider123' },
            { fname: 'Mike', lname: 'Services', email: 'mike.services@example.com', password: 'provider123' }
        ];

        const providerIds = [];
        for (const provider of providers) {
            const [existing] = await connection.query(
                "SELECT iduser FROM `user` WHERE u_email = ?",
                [provider.email]
            );

            if (existing.length === 0) {
                const hashedPassword = await bcrypt.hash(provider.password, 10);
                const [result] = await connection.query(
                    `INSERT INTO \`user\` (u_fname, u_lname, u_email, u_password, u_role, u_disabled) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [provider.fname, provider.lname, provider.email, hashedPassword, 'provider', 0]
                );
                providerIds.push(result.insertId);
                console.log(`✓ Created provider: ${provider.email}`);
            } else {
                providerIds.push(existing[0].iduser);
            }
        }

        // Create sample client users
        const clients = [
            { fname: 'Alice', lname: 'Client', email: 'alice.client@example.com', password: 'client123' },
            { fname: 'Bob', lname: 'Customer', email: 'bob.customer@example.com', password: 'client123' }
        ];

        const clientIds = [];
        for (const client of clients) {
            const [existing] = await connection.query(
                "SELECT iduser FROM `user` WHERE u_email = ?",
                [client.email]
            );

            if (existing.length === 0) {
                const hashedPassword = await bcrypt.hash(client.password, 10);
                const [result] = await connection.query(
                    `INSERT INTO \`user\` (u_fname, u_lname, u_email, u_password, u_role, u_disabled) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [client.fname, client.lname, client.email, hashedPassword, 'user', 0]
                );
                clientIds.push(result.insertId);
                console.log(`✓ Created client: ${client.email}`);
            } else {
                clientIds.push(existing[0].iduser);
            }
        }

        // Create sample services
        const services = [
            {
                provider_id: providerIds[0],
                name: 'Grand Ballroom',
                description: 'Elegant ballroom venue perfect for weddings and corporate events',
                category: 'venue',
                base_price: 50000,
                pricing_type: 'fixed',
                duration: 480,
                max_capacity: 200,
                city: 'Manila',
                state: 'Metro Manila',
                rating: 4.5,
                review_count: 24
            },
            {
                provider_id: providerIds[1],
                name: 'Wedding Catering Services',
                description: 'Premium catering services for weddings and special events',
                category: 'catering',
                base_price: 15000,
                pricing_type: 'per_person',
                duration: 240,
                max_capacity: 100,
                city: 'Quezon City',
                state: 'Metro Manila',
                rating: 4.8,
                review_count: 45
            },
            {
                provider_id: providerIds[2],
                name: 'Professional Photography',
                description: 'Professional event photography with high-quality equipment',
                category: 'photography',
                base_price: 25000,
                pricing_type: 'fixed',
                duration: 360,
                max_capacity: 1,
                city: 'Makati',
                state: 'Metro Manila',
                rating: 4.7,
                review_count: 32
            },
            {
                provider_id: providerIds[0],
                name: 'DJ Services',
                description: 'Professional DJ services with sound system',
                category: 'music',
                base_price: 12000,
                pricing_type: 'hourly',
                duration: 240,
                max_capacity: 1,
                city: 'Manila',
                state: 'Metro Manila',
                rating: 4.6,
                review_count: 18
            }
        ];

        const serviceIds = [];
        for (const service of services) {
            const [result] = await connection.query(
                `INSERT INTO \`service\` 
                 (s_provider_id, s_name, s_description, s_category, s_base_price, s_pricing_type, 
                  s_duration, s_max_capacity, s_city, s_state, s_rating, s_review_count, s_is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    service.provider_id, service.name, service.description, service.category,
                    service.base_price, service.pricing_type, service.duration, service.max_capacity,
                    service.city, service.state, service.rating, service.review_count, 1
                ]
            );
            serviceIds.push(result.insertId);
            console.log(`✓ Created service: ${service.name}`);
        }

        // Add availability schedules for services
        console.log('\nAdding availability schedules...');
        for (const serviceId of serviceIds) {
            // Add availability for Monday to Friday (9 AM - 6 PM)
            for (let day = 1; day <= 5; day++) { // 1 = Monday, 5 = Friday
                await connection.query(
                    `INSERT INTO service_availability 
                     (sa_service_id, sa_day_of_week, sa_start_time, sa_end_time, sa_is_available)
                     VALUES (?, ?, '09:00:00', '18:00:00', 1)`,
                    [serviceId, day]
                );
            }
            // Add availability for Saturday (9 AM - 2 PM)
            await connection.query(
                `INSERT INTO service_availability 
                 (sa_service_id, sa_day_of_week, sa_start_time, sa_end_time, sa_is_available)
                 VALUES (?, 6, '09:00:00', '14:00:00', 1)`,
                [serviceId]
            );
            // Add availability for Sunday (10 AM - 4 PM)
            await connection.query(
                `INSERT INTO service_availability 
                 (sa_service_id, sa_day_of_week, sa_start_time, sa_end_time, sa_is_available)
                 VALUES (?, 0, '10:00:00', '16:00:00', 1)`,
                [serviceId]
            );
        }
        console.log(`✓ Added availability schedules for ${serviceIds.length} services`);

        // Create sample bookings
        const bookings = [
            {
                client_id: clientIds[0],
                event_name: 'Corporate Event',
                event_date: '2024-02-15',
                start_time: '09:00:00',
                end_time: '17:00:00',
                location: '123 Main St, Manila',
                total_cost: 45000,
                status: 'confirmed',
                attendees: 25
            },
            {
                client_id: clientIds[1],
                event_name: 'Wedding Reception',
                event_date: '2024-02-20',
                start_time: '18:00:00',
                end_time: '23:00:00',
                location: '456 Park Ave, Quezon City',
                total_cost: 125000,
                status: 'pending',
                attendees: 100
            },
            {
                client_id: clientIds[0],
                event_name: 'Birthday Party',
                event_date: '2024-01-10',
                start_time: '14:00:00',
                end_time: '18:00:00',
                location: '789 Oak St, Makati',
                total_cost: 25000,
                status: 'completed',
                attendees: 30
            }
        ];

        const bookingIds = [];
        for (const booking of bookings) {
            const [result] = await connection.query(
                `INSERT INTO \`booking\` 
                 (b_client_id, b_event_name, b_event_date, b_start_time, b_end_time, 
                  b_location, b_total_cost, b_status, b_attendees) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    booking.client_id, booking.event_name, booking.event_date,
                    booking.start_time, booking.end_time, booking.location,
                    booking.total_cost, booking.status, booking.attendees
                ]
            );
            bookingIds.push(result.insertId);
            console.log(`✓ Created booking: ${booking.event_name}`);

            // Link services to bookings
            if (bookingIds.length === 1) {
                // First booking: venue + catering
                await connection.query(
                    `INSERT INTO \`booking_service\` 
                     (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [result.insertId, serviceIds[0], 1, 50000, 50000]
                );
                await connection.query(
                    `INSERT INTO \`booking_service\` 
                     (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [result.insertId, serviceIds[1], 25, 15000, 37500]
                );
            } else if (bookingIds.length === 2) {
                // Second booking: venue + catering + photography + music
                await connection.query(
                    `INSERT INTO \`booking_service\` 
                     (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [result.insertId, serviceIds[0], 1, 50000, 50000]
                );
                await connection.query(
                    `INSERT INTO \`booking_service\` 
                     (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [result.insertId, serviceIds[1], 100, 15000, 150000]
                );
            }
        }

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📝 Sample credentials:');
        console.log('  Admin: admin@gmail.com / admin123');
        console.log('  Provider: john.provider@example.com / provider123');
        console.log('  Client: alice.client@example.com / client123');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nConnection closed');
        }
    }
}

// Run seeding
if (require.main === module) {
    seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };









