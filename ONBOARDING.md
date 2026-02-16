# Developer Onboarding Guide

Welcome to the Defense Radar Dashboard project! This guide is designed to help new developers get up and running quickly.

## 🛠 Tech Stack

- **Frontend:** Vue 3 (Composition API) + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS + HeadlessUI
- **State Management:** Pinia
- **Routing:** Vue Router
- **Maps:** Leaflet
- **Backend:** Node.js + Express
- **Database:** MariaDB/MySQL (Remote) or SQLite (Local)

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18 or higher
- **npm:** v9 or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pro_max
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Setup

The application uses environment variables for configuration. You can start by copying the example file:

```bash
cp env.example .env.local
```

**Key Environment Variables:**

- `VITE_API_BASE_URL`: URL of the backend API (default: `http://localhost:3001/api`)
- `VITE_APP_BRAND`: Controls branding/theming (`original` or `pakistan`)
- `USE_SQLITE`: Set to `true` to use local SQLite file instead of remote MariaDB.

## 📂 Project Structure

The source code is located in the `src` directory:

- **`assets/`**: Static assets like images, icons, and brand-specific files.
- **`components/`**: Reusable Vue components.
  - `layout/`: App shell components (Sidebar, TopNav).
  - `map/`: Map-related components (MapControls, Layers).
  - `shared/`: Generic UI components (Buttons, Inputs).
- **`composables/`**: Vue Composables for reusable logic (e.g., `useDetections.ts`).
- **`config/`**: Configuration files (branding settings).
- **`pages/`**: Main application pages (routed components).
- **`router/`**: Vue Router configuration.
- **`services/`**: API clients and external service integrations.
- **`store/`**: Pinia state stores.
- **`styles/`**: Global styles and Tailwind configuration.
- **`types/`**: TypeScript type definitions.
- **`utils/`**: Helper functions.
- **`views/`**: Feature-specific views (Drones, Sensors).

## 🏃‍♂️ Development Workflow

### Running the Application

You can run the frontend and backend concurrently or separately.

**Concurrent (Recommended):**
```bash
npm run start           # Starts with 'original' brand
npm run start:pakistan  # Starts with 'pakistan' brand
```

**Frontend Only:**
```bash
npm run dev
npm run dev:pakistan
```

**Backend Only:**
```bash
npm run server
```

### Database Modes

1. **Remote MariaDB (Default):**
   - Configured in `.env` or `.env.remote`.
   - Requires network access to the database server.

2. **Local SQLite:**
   - Great for offline development or testing without a DB server.
   - Set `USE_SQLITE=true` in `.env`.
   - Initialize the DB: `node scripts/init-sqlite.js`.

## 🎨 Branding System

The app supports multiple brands. Branding is controlled via the `VITE_APP_BRAND` environment variable.
- **Assets:** Located in `src/assets/brands/<brand_name>`.
- **Config:** See `src/config/brandConfig.ts`.
- **Styles:** Variable overrides in `src/styles/brand-variables.scss`.

## 🧪 Quality Control

- **Linting:** `npm run lint` (ESLint)
- **Formatting:** `npm run format` (Prettier)
- **Type Checking:** `vue-tsc` is run during build.
- **Testing:** `npm run test` (Vitest)

## 📦 Building for Production

To create a production build:

```bash
npm run build           # Original brand
npm run build:pakistan  # Pakistan brand
```

The output will be in the `dist/` directory.

## 📚 Further Reading

For a deep dive into the system architecture, database schema, and API details, please refer to the **[Technical Specification](TECHNICAL_SPECIFICATION.md)**.

## 🤝 Contribution Guidelines


1. Create a new branch for your feature or fix.
2. Follow the existing code style (Composition API, TypeScript).
3. Ensure no linting errors before committing.
4. Add tests if introducing complex logic.
