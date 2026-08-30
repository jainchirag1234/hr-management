# 🏢 HR Management System

A full-stack HR Management System built with **React + Vite** (Frontend) and **Node.js + Express + MongoDB** (Backend). It provides role-based access for **Admin** and **Employee**, covering attendance tracking, department/designation management, leave management, and more.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Attendance Logic](#attendance-logic)
- [Role-Based Access](#role-based-access)
- [Screenshots](#screenshots)

---

## ✨ Features

### 👨‍💼 Admin
- Dashboard with summary stats
- Manage Employees (Create / View / Edit / Delete)
- Manage Departments & Designations
- View & manage all employees' Attendance records
- Filter attendance by employee, status, and date range
- Create attendance records manually
- Mark attendance status: Present, Absent, Late, Half Day, On Leave, Work From Home

### 👷 Employee
- View personal Dashboard
- Mark Check-In / Check-Out
- Auto **Late** marking if Check-In is after **10:30 AM**
- View personal Attendance History
- Export Attendance to CSV
- View & apply for Leaves
- Manage Profile

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS        |
| Backend    | Node.js, Express.js                 |
| Database   | MongoDB (Mongoose ODM)              |
| Auth       | JWT (JSON Web Tokens), bcrypt       |
| HTTP       | Axios                               |

---

## 📁 Project Structure

```
hr-management/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── attendance.controller.js
│   │   ├── department.controller.js
│   │   ├── designation.controller.js
│   │   ├── leave.controller.js
│   │   └── user.controller.js
│   ├── middlewares/
│   │   └── auth.middleware.js     # JWT auth middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── attendance.js
│   │   ├── department.js
│   │   ├── designation.js
│   │   └── leave.js
│   ├── routes/
│   │   ├── attendance.routes.js
│   │   ├── department.routes.js
│   │   ├── designation.routes.js
│   │   ├── leave.routes.js
│   │   └── user.route.js
│   ├── seeders/
│   │   └── adminSeeder.js         # Seed default admin user
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/                   # Axios instance config
    │   ├── assets/
    │   ├── component/
    │   │   ├── Layout.jsx
    │   │   └── Navbar.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   └── Login.jsx
    │   │   ├── Employee/
    │   │   ├── Attendance.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Department.jsx
    │   │   ├── Designation.jsx
    │   │   ├── EmployeeForm.jsx
    │   │   └── Leave.jsx
    │   ├── services/
    │   │   └── auth.service.js    # All API call functions
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [npm](https://www.npmjs.com/)

---

### Backend Setup

```bash
# 1. Go to backend directory
cd hr-management/backend

# 2. Install dependencies
npm install

# 3. Create .env file (see Environment Variables section)

# 4. Seed the default admin user
npm run seed:admin

# 5. Start the backend server
npm start
```

> Backend runs at: `http://localhost:5000`

---

### Frontend Setup

```bash
# 1. Go to frontend directory
cd hr-management/frontend

# 2. Install dependencies
npm install

# 3. Create .env file (see Environment Variables section)

# 4. Start the dev server
npm run dev
```

> Frontend runs at: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend — `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hr_management
JWT_SECRET=your_super_secret_jwt_key
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📡 API Endpoints

### Auth / Users
| Method | Endpoint               | Description              | Access     |
|--------|------------------------|--------------------------|------------|
| POST   | `/api/user/login`      | Login user               | Public     |
| GET    | `/api/user/all`        | Get all users            | Admin      |
| POST   | `/api/user/create`     | Create new employee      | Admin      |
| GET    | `/api/user/:id`        | Get user by ID           | Admin      |
| PUT    | `/api/user/:id`        | Update user              | Admin/Self |
| DELETE | `/api/user/:id`        | Delete user              | Admin      |

### Attendance
| Method | Endpoint                        | Description                    | Access   |
|--------|---------------------------------|--------------------------------|----------|
| POST   | `/api/attendance/checkin`       | Employee Check-In              | Employee |
| POST   | `/api/attendance/checkout`      | Employee Check-Out             | Employee |
| GET    | `/api/attendance/history/:id`   | Get attendance history by ID   | Both     |
| GET    | `/api/attendance/all`           | Get all attendance records     | Admin    |
| POST   | `/api/attendance/create`        | Create attendance manually     | Admin    |
| PUT    | `/api/attendance/:id`           | Update attendance record       | Admin    |
| DELETE | `/api/attendance/:id`           | Delete attendance record       | Admin    |

### Departments
| Method | Endpoint                  | Description          | Access |
|--------|---------------------------|----------------------|--------|
| GET    | `/api/departments`        | Get all departments  | Admin  |
| POST   | `/api/departments`        | Create department    | Admin  |
| PUT    | `/api/departments/:id`    | Update department    | Admin  |
| DELETE | `/api/departments/:id`    | Delete department    | Admin  |

### Designations
| Method | Endpoint                   | Description           | Access |
|--------|----------------------------|-----------------------|--------|
| GET    | `/api/designations`        | Get all designations  | Admin  |
| POST   | `/api/designations`        | Create designation    | Admin  |
| PUT    | `/api/designations/:id`    | Update designation    | Admin  |
| DELETE | `/api/designations/:id`    | Delete designation    | Admin  |

### Leaves
| Method | Endpoint            | Description          | Access   |
|--------|---------------------|----------------------|----------|
| GET    | `/api/leave`        | Get all leaves       | Admin    |
| POST   | `/api/leave`        | Apply for leave      | Employee |
| PUT    | `/api/leave/:id`    | Update leave status  | Admin    |
| DELETE | `/api/leave/:id`    | Delete leave         | Admin    |

---

## ⏰ Attendance Logic

### Auto Late Marking

When an employee clicks **Check-In**, the backend automatically determines the attendance status:

```
Check-In Time > 10:30 AM  →  Status = "Late"
Check-In Time ≤ 10:30 AM  →  Status = "Present"
```

This logic runs on the **backend** (in `attendance.controller.js` → `checkIn` function), so the status saved to the database is always accurate regardless of the frontend.

### Attendance Statuses

| Status          | Description                             |
|-----------------|-----------------------------------------|
| `Present`       | Checked in at or before 10:30 AM        |
| `Late`          | Checked in after 10:30 AM              |
| `Absent`        | No check-in recorded for the day        |
| `Half Day`      | Worked partial hours                    |
| `On Leave`      | Employee on approved leave              |
| `Work From Home`| Remote working day                      |

### Working Hours Calculation

```
Working Hours = Check-Out Time − Check-In Time (in hours)
```

Calculated automatically on Check-Out and stored in `workingHours` field.

---

## 🔑 Role-Based Access

| Feature                      | Admin | Employee |
|------------------------------|:-----:|:--------:|
| Dashboard                    | ✅    | ✅       |
| View All Employees           | ✅    | ❌       |
| Create / Edit / Delete Users | ✅    | ❌       |
| Departments Management       | ✅    | ❌       |
| Designations Management      | ✅    | ❌       |
| View All Attendance Records  | ✅    | ❌       |
| Add/Edit/Delete Attendance   | ✅    | ❌       |
| Mark Own Check-In/Check-Out  | ❌    | ✅       |
| View Own Attendance History  | ❌    | ✅       |
| Export CSV (own records)     | ❌    | ✅       |
| Apply for Leave              | ❌    | ✅       |
| Approve/Reject Leave         | ✅    | ❌       |

---

## 🗂️ Default Admin Credentials

After running `npm run seed:admin`, the default admin account is created. Check `backend/seeders/adminSeeder.js` for the default email and password, then **change them immediately** after first login.

---

## 📝 License

This project is for educational/internal use. Feel free to customize it for your organization's needs.

---

> Built with ❤️ using React, Node.js, Express & MongoDB
