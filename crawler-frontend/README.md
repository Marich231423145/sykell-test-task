# Website Crawler - Sykell Test Task

## Overview
This project is a web application that crawls websites by URL and shows key information about the pages. It consists of:

- Frontend: React + TypeScript app with responsive UI
- Backend: Go (Gin framework) with MySQL database
- Features: add URLs, start/stop crawl, view results, details with charts, bulk actions, and real-time status updates.

## Technologies
- Frontend: React, TypeScript, React Router, React Testing Library
- Backend: Go (Gin), MySQL
- API authentication: JWT tokens

## Setup Instructions

### Backend

1. Install Go 1.20+ and MySQL 8+
2. Create a MySQL database and user
3. Create `.env` file with environment variables:

DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=webcrawler
JWT_SECRET=your_jwt_secret

4. Run database migrations (if provided):
```bash
go run cmd/migrate/main.go

    Start the backend server:

    go run cmd/server/main.go

    The backend listens on http://localhost:4000.

Frontend

    Install Node.js 18+

    Install dependencies:

npm install

Start the frontend dev server:

    npm start

    Open http://localhost:3000 in your browser.

Running Tests

To run frontend tests, use:

npm test

Tests cover main user flows: adding URLs, viewing results, and starting crawls.
API Summary

    All API requests require JWT authorization header:
    Authorization: Bearer <token>

    Main endpoints:

        POST /api/urls — add a URL for crawling

        GET /api/urls — list URLs and crawl results

        POST /api/urls/:id/start — start crawling

        POST /api/urls/:id/stop — stop crawling

        DELETE /api/urls/:id — delete URL

Features

    URL management with add/start/stop controls

    Paginated, sortable, and filterable results table

    Detail view with charts and broken links list

    Bulk actions for re-crawling and deleting URLs

    Real-time crawl status updates using polling

    Responsive UI for desktop and mobile