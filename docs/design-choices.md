# Design Choices

This document explains the technology decisions made for the Cape Town Load
Shedding & Water Alert Tracker and the reasons behind them.

## Architecture

A two-tier web application: a browser front-end communicates over HTTP with a
Node.js back-end, which stores and retrieves data from a database.

## Front-end: HTML, CSS and vanilla JavaScript
- Matches the project requirement for a JavaScript-driven front-end.
- No framework means fewer moving parts, easier setup and easier code reading.
- The front-end talks to the back-end using the browser's built-in `fetch()`.

## Back-end: Node.js with Express
- Lightweight and quick to set up, with minimal configuration.
- Express makes it simple to define API routes that return or store data.
- Install is just `npm install` followed by `npm start`.

## Database: SQLite
- File-based, so no separate database server needs to be installed.
- Supports real SQL queries for filtering and counting reports.
- Keeps installation simple for anyone marking or running the project.
- The specific SQLite library is chosen in a later step.

## External APIs
None are used. Load shedding schedule data is sample data stored in the app's
own database. This avoids API keys, rate limits and outside failures, so the
project runs reliably for anyone who installs it.

## Why not Java EE / JSF?
Java EE needs an application server and heavier configuration, which adds setup
risk without adding value for this project's scope.