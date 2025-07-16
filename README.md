Website Crawler – Sykell Test Task
📖 Overview

A full-stack web application for crawling websites and visualizing crawl results.

Features include:

    Add URLs for crawling

    View crawl results with charts and detailed info

    Perform bulk actions

    Real-time status updates

    Responsive UI

🛠 Tech Stack

    Frontend: React, TypeScript, React Router, React Testing Library

    Backend: Go (Gin framework), MySQL

    Authentication: JWT tokens

🚀 Setup Instructions
Backend

    Install dependencies:

        Go 1.20+

        MySQL 8+

    Create a MySQL database.

    Create a .env file in the root with the following content:

DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=crawler


Run database migrations:

go run cmd/migrate/main.go

Start the backend server:

    go run cmd/server/main.go

    Backend will be available at http://localhost:4000

Frontend

    Install Node.js (version 18+)

    Install dependencies:

npm install

Start the dev server:

    npm start

    Frontend will run at http://localhost:3000

🧪 Running Tests

To run frontend tests:

npm test

    Tests cover key flows: adding URLs, starting crawls, viewing results.

🔐 API Summary

All requests require an Authorization header:

Authorization: Bearer <token>

Main Endpoints:

    POST /api/urls – Add a new URL

    GET /api/urls – List all URLs with crawl results

    POST /api/urls/:id/start – Start crawling a URL

    POST /api/urls/:id/stop – Stop crawling a URL

    DELETE /api/urls/:id – Delete a URL

✨ Features

    ✅ Add, start, stop, and delete URLs

    ✅ Paginated and filterable results table

    ✅ Detailed view with charts and broken links

    ✅ Bulk re-crawl and deletion

    ✅ Real-time crawling status (polling)

    ✅ Mobile-friendly UI

