# PortfoRadar

A NestJS application that retrieves and manages portfolio company data from KKR's investment portfolio.

## Overview

PortfoRadar ingests portfolio company information from KKR's public API and provides a queryable REST API to explore the data. It stores companies in MongoDB with proper indexing for efficient filtering by asset class, industry, and region.

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript
- **Framework**: NestJS
- **Database**: MongoDB + Mongoose

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- MongoDB 7.x (local or Docker)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Start MongoDB (via Docker)

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 4. Run the Application

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 5. Verify

```bash
curl http://localhost:3000
# Expected: {"message":"Hello World!"}
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start the app |
| `npm run start:dev` | Start in watch mode (development) |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

## Project Structure

```
src/
├── app.module.ts       # Root application module
├── app.controller.ts   # Root controller
├── app.service.ts      # Root service
└── main.ts             # Application entry point

test/
├── app.e2e-spec.ts     # E2E tests
└── jest-e2e.json       # Jest E2E config

docs/
├── DEVELOPMENT_PHASES.md  # Development roadmap
└── source-analysis.md     # KKR API analysis
```

## Documentation

- [Development Phases](docs/DEVELOPMENT_PHASES.md) — Detailed implementation roadmap
- [Source Analysis](docs/source-analysis.md) — KKR API endpoint documentation

## API Endpoints (Coming Soon)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List companies with filters |
| GET | `/companies/:id` | Get single company |
| GET | `/stats` | Aggregated statistics |
| GET | `/health` | Health check |

## License

MIT License — see [LICENSE](LICENSE) for details.
