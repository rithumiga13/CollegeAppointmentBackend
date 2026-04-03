# College Appointment System — Backend API

A RESTful API built with **Node.js**, **Express**, and **MongoDB** that enables students to book appointments with professors and professors to manage their availability.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [API Reference](#api-reference)
7. [Complete User Flow (Postman Walkthrough)](#complete-user-flow-postman-walkthrough)
8. [Design Decisions](#design-decisions)

---

## Tech Stack

| Layer        | Technology                      |
|--------------|---------------------------------|
| Runtime      | Node.js (≥ 18)                  |
| Framework    | Express 4                       |
| Database     | MongoDB (via Mongoose 8)        |
| Auth         | JWT (jsonwebtoken) + bcryptjs   |
| Validation   | express-validator               |

---

## Project Structure

```
src/
├── app.js                  # Entry point — Express app, routes, error handler
├── config/
│   └── db.js               # Mongoose connection
├── controllers/
│   ├── authController.js        # register, login, getMe
│   ├── professorController.js   # addSlots, getAvailableSlots, listProfessors
│   └── appointmentController.js # bookAppointment, getMyAppointments, cancelAppointment
├── middleware/
│   ├── auth.js             # protect (JWT guard) + restrictTo (RBAC)
│   └── validate.js         # express-validator error collector
├── models/
│   ├── User.js             # Student / Professor schema
│   ├── TimeSlot.js         # Professor availability window
│   └── Appointment.js      # Booking record
├── routes/
│   ├── auth.js
│   ├── professor.js
│   └── appointment.js
└── utils/
    ├── jwt.js              # signToken / verifyToken helpers
    └── apiResponse.js      # Standardised sendSuccess / sendError helpers
```

---

## Database Schema

### User
| Field        | Type     | Notes                         |
|-------------|----------|-------------------------------|
| `name`      | String   | Required                      |
| `email`     | String   | Unique, indexed               |
| `password`  | String   | bcrypt hashed, never returned |
| `role`      | String   | `student` or `professor`      |
| `department`| String   | Optional                      |

### TimeSlot
| Field       | Type     | Notes                                          |
|-------------|----------|------------------------------------------------|
| `professor` | ObjectId | Ref → User                                     |
| `startTime` | Date     | ISO 8601                                       |
| `endTime`   | Date     | ISO 8601, must be > startTime                 |
| `isBooked`  | Boolean  | Flips to `true` when an appointment is created |

### Appointment
| Field                | Type     | Notes                                  |
|----------------------|----------|----------------------------------------|
| `student`            | ObjectId | Ref → User                             |
| `professor`          | ObjectId | Ref → User                             |
| `timeSlot`           | ObjectId | Ref → TimeSlot, **unique** constraint  |
| `status`             | String   | `pending` \| `cancelled` \| `completed` |
| `cancellationReason` | String   | Optional, set on cancellation          |

**Relationships:**
- One User (professor) → Many TimeSlots
- One TimeSlot → At most One Appointment (unique index)
- One User (student) → Many Appointments

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (`mongod`) **or** a MongoDB Atlas URI

### Installation

```bash
# 1. Clone / enter the project
cd college-appointment-system

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in values
cp .env.example .env

# 4. Start the development server
npm run dev

# The API will be available at http://localhost:5000
```

---

## Environment Variables

| Variable        | Description                          | Default                         |
|-----------------|--------------------------------------|---------------------------------|
| `PORT`          | HTTP port the server listens on      | `5000`                          |
| `MONGO_URI`     | MongoDB connection string            | `mongodb://localhost:27017/...` |
| `JWT_SECRET`    | Secret key for signing JWTs          | *(must be set)*                 |
| `JWT_EXPIRES_IN`| JWT expiry duration                  | `7d`                            |

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Standardised Response Envelope

**Success**
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [ { "field": "email", "message": "..." } ]  // validation only
}
```

---

### Auth Routes — `/api/auth`

#### `POST /api/auth/register`
Register a new student or professor.

**Request Body**
```json
{
  "name": "Alice Student",
  "email": "alice@college.edu",
  "password": "secret123",
  "role": "student",
  "department": "Computer Science"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "token": "<jwt>",
    "user": { "id": "...", "name": "Alice Student", "email": "...", "role": "student" }
  }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive a JWT.

**Request Body**
```json
{
  "email": "alice@college.edu",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "token": "<jwt>",
    "user": { "id": "...", "name": "Alice Student", "role": "student" }
  }
}
```

---

#### `GET /api/auth/me`  🔒
Returns the profile of the currently authenticated user.

**Headers:** `Authorization: Bearer <token>`

---

### Professor Routes — `/api/professors`

All routes require `Authorization: Bearer <token>`.

#### `GET /api/professors`
List all professors.

---

#### `POST /api/professors/slots`  🔒 *(professor only)*
Add one or more availability time slots.

**Request Body**
```json
{
  "slots": [
    {
      "startTime": "2024-09-01T09:00:00.000Z",
      "endTime":   "2024-09-01T09:30:00.000Z"
    },
    {
      "startTime": "2024-09-01T10:00:00.000Z",
      "endTime":   "2024-09-01T10:30:00.000Z"
    }
  ]
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "2 slot(s) added successfully.",
  "data": { "slots": [ ... ] }
}
```

---

#### `GET /api/professors/:professorId/slots`  🔒
View all available (unbooked, future) slots for a professor.

**Response `200`**
```json
{
  "success": true,
  "message": "Available slots fetched.",
  "data": {
    "professor": { "id": "...", "name": "Prof. P1", "department": "..." },
    "totalAvailable": 2,
    "slots": [ { "_id": "...", "startTime": "...", "endTime": "...", "isBooked": false } ]
  }
}
```

---

### Appointment Routes — `/api/appointments`

All routes require `Authorization: Bearer <token>`.

#### `POST /api/appointments`  🔒 *(student only)*
Book an appointment.

**Request Body**
```json
{
  "timeSlotId": "<timeSlot _id>"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Appointment booked successfully.",
  "data": {
    "appointment": {
      "_id": "...",
      "student":   { "name": "Alice", "email": "..." },
      "professor": { "name": "Prof. P1", "department": "..." },
      "timeSlot":  { "startTime": "...", "endTime": "..." },
      "status": "pending"
    }
  }
}
```

---

#### `GET /api/appointments`  🔒
Get all appointments for the authenticated user.
- Students receive their own bookings.
- Professors receive bookings made with them.

**Query Params (optional)**
- `status=pending|cancelled|completed`

---

#### `GET /api/appointments/:appointmentId`  🔒
Get a single appointment. Only the involved student or professor can access it.

---

#### `PATCH /api/appointments/:appointmentId/cancel`  🔒 *(professor only)*
Cancel an appointment. The corresponding time slot is automatically freed.

**Request Body (optional)**
```json
{
  "reason": "I have a faculty meeting at that time."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully.",
  "data": {
    "appointment": { "...", "status": "cancelled", "cancellationReason": "..." }
  }
}
```

---

## Complete User Flow (Postman Walkthrough)

Below is the exact sequence of API calls that covers every step of the assignment:

### Step 1 — Student A1 registers and logs in
```
POST /api/auth/register
{ "name": "Student A1", "email": "a1@college.edu", "password": "pass123", "role": "student" }

POST /api/auth/login
{ "email": "a1@college.edu", "password": "pass123" }
→ Save the returned token as {{studentA1Token}}
```

### Step 2 — Professor P1 registers and logs in
```
POST /api/auth/register
{ "name": "Professor P1", "email": "p1@college.edu", "password": "pass123", "role": "professor", "department": "Physics" }

POST /api/auth/login
{ "email": "p1@college.edu", "password": "pass123" }
→ Save the returned token as {{professorP1Token}}
→ Save the professor's id as {{professorP1Id}}
```

### Step 3 — Professor P1 adds availability slots
```
POST /api/professors/slots
Authorization: Bearer {{professorP1Token}}
{
  "slots": [
    { "startTime": "2024-09-01T09:00:00.000Z", "endTime": "2024-09-01T09:30:00.000Z" },
    { "startTime": "2024-09-01T10:00:00.000Z", "endTime": "2024-09-01T10:30:00.000Z" }
  ]
}
→ Save slot IDs as {{slotT1Id}} and {{slotT2Id}}
```

### Step 4 — Student A1 views available slots for Professor P1
```
GET /api/professors/{{professorP1Id}}/slots
Authorization: Bearer {{studentA1Token}}
```

### Step 5 — Student A1 books slot T1
```
POST /api/appointments
Authorization: Bearer {{studentA1Token}}
{ "timeSlotId": "{{slotT1Id}}" }
→ Save appointment ID as {{appointmentA1Id}}
```

### Step 6 — Student A2 registers, logs in, and books slot T2
```
POST /api/auth/register
{ "name": "Student A2", "email": "a2@college.edu", "password": "pass123", "role": "student" }

POST /api/auth/login  → save as {{studentA2Token}}

POST /api/appointments
Authorization: Bearer {{studentA2Token}}
{ "timeSlotId": "{{slotT2Id}}" }
```

### Step 7 — Professor P1 cancels the appointment with Student A1
```
PATCH /api/appointments/{{appointmentA1Id}}/cancel
Authorization: Bearer {{professorP1Token}}
{ "reason": "Schedule conflict." }
```

### Step 8 — Student A1 checks their appointments (expects empty/cancelled)
```
GET /api/appointments?status=pending
Authorization: Bearer {{studentA1Token}}
→ Response will show 0 pending appointments
```

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **MongoDB transactions** for booking & cancellation | Guarantees atomic slot-locking; prevents two students booking the same slot under concurrent load. |
| **`isBooked` flag on TimeSlot** | Simple O(1) availability check without joining Appointments on every query. Released on cancellation so the slot becomes available again. |
| **Unique index on `Appointment.timeSlot`** | Database-level safety net against duplicate bookings even if application logic is bypassed. |
| **`select: false` on password field** | Password hash is never accidentally leaked in any query result. |
| **Separation of controllers / routes** | Keeps business logic out of route definitions; each layer has a single responsibility. |
| **`restrictTo` middleware factory** | Centralized, reusable RBAC — adding a new role requires one-line change. |
| **Standardised response envelope** | Consistent `{ success, message, data }` / `{ success, message, errors }` shape makes frontend integration and testing predictable. |
