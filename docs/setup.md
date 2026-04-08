# Setup Guide

This document explains how to configure and run the Host TalkDrove application on your own server.

## Prerequisites

- **Node.js** (version 14 or newer)
- **npm** for installing dependencies
- **MySQL** server for the application database

## Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd HTD-V1
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env` from the repository and fill in your database credentials and other values.
   - Ensure the MySQL server is reachable with the credentials provided.
4. **Run the web installer**
   - Start the server with `npm start` and browse to `/install`.
   - Provide your MySQL credentials and initial admin user information.
   - The installer will import `api/talkdrove.sql` and configure the `.env` file.
5. **Start the development server**
   ```bash
   npm run dev
   ```
   This uses `nodemon` and reloads on file changes.
6. **Start for production**
   ```bash
   npm start
   ```

The application will be available on the port set in the `.env` file.
