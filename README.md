# 💰 IncomeTracker - Financial Intelligence Dashboard

A premium, high-performance dashboard for tracking freelance projects, internships, and college work with real-time financial analytics and interactive summary modals.

![Dashboard Preview](https://img.shields.io/badge/Status-Production--Ready-emerald)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MySQL-blue)

## ✨ Features

- **Interactive Summary Cards:** Drill down into Pending, Received, and Total Work Value.
- **Project Matrix:** Advanced filtering by type (Freelance, Internship, College) and status.
- **Transaction Ledger:** Atomic transaction management with full history.
- **Responsive Mobile-First Design:** Custom card-based views for mobile and pro-tables for desktop.
- **Premium Aesthetics:** Dark mode with glassmorphism, smooth animations, and custom scrollbars.
- **Automatic Status Calculation:** Intelligent status updates based on payment percentages.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Redux Toolkit (RTK Query), Tailwind CSS, Lucide React, Recharts.
- **Backend:** Node.js, Express, MySQL (Aiven/Render compatible).
- **Database:** Atomic transactions with MySQL InnoDB.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Database (Local or Aiven)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd IncomeTracker
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on the deployment guide
   npm start
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file with VITE_API_URL
   npm run dev
   ```

## 🌐 Deployment

This project is optimized for deployment on:
- **Vercel** (Frontend)
- **Render** (Backend)
- **Aiven** (MySQL Database)

Refer to `deployment_guide.md` for detailed environment variable configuration.

## 📝 License
ISC
