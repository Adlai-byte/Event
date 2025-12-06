# Database Setup Guide

## Quick Start

### 1. Install Dependencies

Make sure you have Node.js and MySQL installed. Then install the required packages:

```bash
cd server
npm install mysql2 bcryptjs
```

### 2. Configure Database Connection

Update the database connection settings in `server/db.js` or set environment variables:

```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=event
export DB_PORT=3306
```

### 3. Run Migration

Create all database tables:

```bash
node server/database/migrate.js
```

This will:
- Create the database if it doesn't exist
- Create all necessary tables
- Set up foreign keys and indexes

### 4. Seed Database (Optional)

Populate the database with sample data:

```bash
node server/database/seed.js
```

This creates:
- Admin user: `admin@gmail.com` / `admin123`
- Sample providers and clients
- Sample services
- Sample bookings

### 5. Start the Server

```bash
node server/index.js
```

The API server will start on `http://localhost:3001`

## Database Schema Overview

### Core Tables
- **user** - User accounts (clients, providers, admins)
- **service** - Services offered by providers
- **service_image** - Service images
- **service_availability** - Service availability schedule
- **service_review** - Service reviews and ratings

### Booking Tables
- **booking** - Event bookings
- **booking_service** - Many-to-many relationship between bookings and services
- **payment** - Payment records

### Hiring Tables
- **hiring_request** - Hiring requests from clients
- **hiring_requirement** - Requirements for hiring requests
- **hiring_skill** - Skills required for hiring requests
- **proposal** - Proposals from providers
- **proposal_deliverable** - Deliverables in proposals

### Messaging Tables
- **conversation** - Conversations between users
- **conversation_participant** - Participants in conversations
- **message** - Messages in conversations
- **message_attachment** - Message attachments

### Analytics Tables
- **activity_log** - Activity logs for analytics

## API Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create a user
- `POST /api/users/:id/block` - Block/unblock a user

### Services
- `GET /api/services` - List all services
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create a service
- `POST /api/services/:id/status` - Update service status

### Bookings
- `GET /api/bookings` - List all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings/:id/status` - Update booking status

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Troubleshooting

### Database Connection Error
- Check if MySQL is running
- Verify database credentials
- Ensure the database exists or can be created

### Migration Errors
- Check if tables already exist
- Verify MySQL user has CREATE TABLE permissions
- Check for syntax errors in schema.sql

### Seed Errors
- Ensure migration completed successfully
- Check if admin user already exists
- Verify foreign key constraints

## Next Steps

1. Connect your frontend to the API endpoints
2. Implement authentication and authorization
3. Add more API endpoints as needed
4. Set up production database
5. Configure backup and monitoring
























