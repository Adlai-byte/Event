# Database Schema and Migration

This directory contains the database schema and migration scripts for the Event Management System.

## Files

- `schema.sql` - Complete database schema with all tables
- `migrate.js` - Migration script to create all tables
- `seed.js` - Seed script to populate database with sample data

## Setup

### 1. Install Dependencies

Make sure you have the required npm packages installed:
```bash
npm install mysql2 bcryptjs
```

### 2. Configure Database

Set environment variables or update the connection settings in the migration script:

```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=event
export DB_PORT=3306
```

Or create a `.env` file in the server directory.

### 3. Run Migration

Create all database tables:

```bash
node server/database/migrate.js
```

### 4. Seed Database (Optional)

Populate the database with sample data:

```bash
node server/database/seed.js
```

## Database Schema

### Core Tables

1. **user** - User accounts (clients, providers, admins)
2. **service** - Services offered by providers
3. **service_image** - Service images
4. **service_availability** - Service availability schedule
5. **service_review** - Service reviews and ratings

### Booking Tables

6. **booking** - Event bookings
7. **booking_service** - Many-to-many relationship between bookings and services
8. **payment** - Payment records

### Hiring Tables

9. **hiring_request** - Hiring requests from clients
10. **hiring_requirement** - Requirements for hiring requests
11. **hiring_skill** - Skills required for hiring requests
12. **proposal** - Proposals from providers
13. **proposal_deliverable** - Deliverables in proposals

### Messaging Tables

14. **conversation** - Conversations between users
15. **conversation_participant** - Participants in conversations
16. **message** - Messages in conversations
17. **message_attachment** - Message attachments

### Analytics Tables

18. **activity_log** - Activity logs for analytics

## Default Credentials (After Seeding)

- **Admin**: admin@gmail.com / admin123
- **Provider**: john.provider@example.com / provider123
- **Client**: alice.client@example.com / client123

## Table Relationships

```
user (1) ──< (N) service
user (1) ──< (N) booking
user (1) ──< (N) hiring_request
user (1) ──< (N) proposal
user (1) ──< (N) message

service (1) ──< (N) service_image
service (1) ──< (N) service_availability
service (1) ──< (N) service_review
service (N) >──< (N) booking (via booking_service)

booking (1) ──< (N) booking_service
booking (1) ──< (N) payment
booking (1) ──< (N) conversation

hiring_request (1) ──< (N) hiring_requirement
hiring_request (1) ──< (N) hiring_skill
hiring_request (1) ──< (N) proposal

conversation (1) ──< (N) conversation_participant
conversation (1) ──< (N) message
message (1) ──< (N) message_attachment
```

## Notes

- All tables use `utf8mb4` charset for full Unicode support
- Timestamps are automatically managed with `CURRENT_TIMESTAMP`
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- Indexes are created for frequently queried columns
- The schema supports soft deletes via status fields
























