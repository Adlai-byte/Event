# E-VENT Application

E-Vent is a comprehensive event services, booking, and hiring application built on top of Expo (React Native for Web) and a Node.js (Express) backend. The platform integrates MySQL for data persistence, Firebase for authentication and real-time messaging, and PayMongo for processing payment transactions.

## Prerequisites

Before setting up the project locally, ensure you have the following installed to your machine:
*   **Node.js** (v18+ recommended)
*   **MySQL Server** (v8.0+ recommended)
*   **Git**

---

## 🚀 Local Setup Instructions

### 1. Clone and Install Dependencies

Clone the repository and install both the root (frontend) and backend library requirements:

```bash
# Clone the repository
git clone https://github.com/Adlai-byte/Event.git
cd Event

# Install frontend Expo/React dependencies
npm install

# Install the backend Express dependencies
cd server
npm install
cd ..
```

### 2. Database Configuration

Create a local MySQL database to power the application.

1.  Log into your local MySQL instance:
    ```bash
    mysql -u root -p
    ```
2.  Execute the following SQL commands to bootstrap the database:
    ```sql
    CREATE DATABASE event;
    CREATE DATABASE event_test; -- Needed if running the Jest/Playwright tests
    EXIT;
    ```
3.  Import the structured tables into your main database:
    ```bash
    mysql -u root -p event < server/database/schema.sql
    ```

### 3. Environment Variables (`.env`)

You must set up two environment files to configure your local instances.

**A. Frontend Environment (`.env` in the root `/Event` directory)**
Create a `.env` file and insert your API routing alongside your PayMongo public keys:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
NODE_ENV=development

# PayMongo Keys
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
PAYMONGO_MODE=live
```

**B. Backend Environment (`server/.env`)**
Create the `.env` inside the `/server` folder specifically for your MySQL credentials:
```env
# Database Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=event
DB_PORT=3306

# Express Server Configuration
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001

# PayMongo Keys
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
PAYMONGO_MODE=live
```

### 4. Firebase Authentication Setup

The project strictly guards route access through Firebase authentication tokens.

1.  **Frontend (Client SDK):** Ensure your Firebase Web API keys are supplied in `mvc/services/firebase.ts`.
2.  **Backend (Admin SDK):** To properly verify authenticated tokens, the backend requires a Service Account Key from the Firebase Console (Project Settings > Service Accounts > Generate new private key). Download this JSON key into the `/server` directory and ensure your backend Firebase configuration targets this file.

*(Note: Sensitive keys like `.env` and Firebase `.json` service accounts should never be committed into source control).*

### 5. Running the Application

Once your database and environment variables are connected, boot up the local servers.

**Terminal 1 (Backend Server):**
```bash
cd server
npm start 
# (Or run `node index.js`)
```

**Terminal 2 (Frontend Client):**
```bash
# Ensure you are in the root /Event directory
npx expo start --web --clear
```
The application should now be live on `http://localhost:8081` mapping successfully to the `http://localhost:3001` backend endpoints.

---

## 🧪 Testing and Verification

The repository contains a robust test-suite ready for deployment checks. 

**Run Backend Jest Tests:**
```bash
cd server
npm test
```

**Run End-to-End Playwright Workflows (Auth, Providers, Customers, Admins):**
*Note: Ensure both your frontend (`npx expo start --web`) and backend (`node server/index.js`) servers are currently running before starting the Playwright runner.*
```bash
npx playwright test
```
