# Defense Radar Dashboard

A production-ready Vue 3 + TypeScript frontend application for monitoring radar targets and threats with an interactive map interface.

## Features

- 🗺️ **Interactive Map**: Leaflet-based map with custom markers and controls
- 🔐 **Authentication**: Secure login with route guards and session management
- 📊 **Real-time Data**: Live target monitoring with status indicators
- 📱 **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- 🎨 **Modern UI**: TailwindCSS with HeadlessUI components
- ⚡ **Performance**: Code-splitting and lazy loading for optimal performance
- 🔧 **TypeScript**: Full type safety throughout the application

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Styling**: TailwindCSS + HeadlessUI
- **State Management**: Pinia
- **Routing**: Vue Router with guards
- **Maps**: Leaflet + OpenStreetMap
- **HTTP Client**: Axios with interceptors
- **Forms**: Vee-validate
- **Build Tool**: Vite

## Project Structure

```
src/
├── components/
│   ├── layout/          # TopNav, Sidebar, InfoPanel, LayoutWrapper
│   ├── map/             # MapView, MapControls, Marker components
│   └── ui/              # Shared UI components
├── pages/
│   ├── Login.vue
│   └── Dashboard.vue
├── router/
│   └── index.ts         # Routes + navigation guards
├── store/
│   ├── auth.ts          # Pinia auth store
│   └── map.ts           # Pinia map store
├── services/
│   ├── api.ts           # Axios instance + interceptors
│   ├── mapService.ts    # Abstracted map adapter
│   └── mockData.ts      # Dummy pins for development
├── composables/
│   ├── useAuth.ts
│   └── useMapPins.ts
├── styles/
│   └── tailwind.css
├── utils/
│   └── security.md      # Security recommendations
└── main.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-defense-radar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_MAP_PROVIDER=leaflet
   VITE_MAPBOX_KEY=your_mapbox_key_here
   VITE_APP_TITLE=Defense Radar Dashboard
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Demo Credentials

For development, use these credentials to log in:
- **Email**: `admin@radar.com`
- **Password**: `password`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api/v1` |
| `VITE_MAP_PROVIDER` | Map provider (`leaflet` or `mapbox`) | `leaflet` |
| `VITE_MAPBOX_KEY` | Mapbox API key (if using Mapbox) | - |
| `VITE_APP_TITLE` | Application title | `Defense Radar Dashboard` |

### Map Configuration

The application uses Leaflet by default with OpenStreetMap tiles. To switch to Mapbox:

1. Update `VITE_MAP_PROVIDER=mapbox` in your `.env.local`
2. Add your Mapbox API key: `VITE_MAPBOX_KEY=your_key_here`
3. The `mapService.ts` will automatically use Mapbox when configured

## Authentication

### Current Implementation (Development)
- Mock authentication with hardcoded credentials
- Tokens stored in `sessionStorage`
- Route guards protect authenticated routes

### Production Setup
See `src/utils/security.md` for detailed security recommendations including:
- HttpOnly cookies for token storage
- Proper CORS configuration
- Content Security Policy (CSP) headers
- Rate limiting and input validation

## API Integration

### Current Mock Data
The application uses mock data from `src/services/mockData.ts` for development.

### Backend Integration
To connect to a real backend:

1. **Update API endpoints** in `src/services/api.ts`
2. **Replace mock functions** with real API calls
3. **Update authentication flow** to use backend endpoints
4. **Configure CORS** on your backend server

Example API endpoints:
- `POST /auth/login` - User authentication
- `GET /targets` - Get all targets
- `GET /targets/:id` - Get specific target
- `GET /targets?bbox=...` - Get targets in bounds

## Deployment

### Build for Production
```bash
npm run build
```

### Nginx Configuration
See `src/utils/security.md` for complete Nginx configuration with security headers.

### Docker Deployment
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Netlify Deployment
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Security Considerations

### Development
- Mock authentication for testing
- Tokens in sessionStorage (not secure for production)
- No HTTPS required for local development

### Production
- Use HttpOnly cookies for token storage
- Implement proper CORS policies
- Add Content Security Policy headers
- Enable HTTPS with valid SSL certificates
- Implement rate limiting and input validation
- Regular security updates and dependency scanning

See `src/utils/security.md` for comprehensive security guidelines.

## Performance Optimization

### Code Splitting
- Routes are lazy-loaded for optimal bundle size
- Map library is dynamically imported
- Vendor chunks are separated for better caching

### Map Performance
- Marker clustering for large datasets (to be implemented)
- Tile caching for faster map loading
- Throttled re-renders for smooth interactions

### Lighthouse Recommendations
- Use `npm run build` for production builds
- Enable gzip compression on your server
- Implement proper caching headers
- Optimize images and assets

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
1. Check the [security documentation](src/utils/security.md)
2. Review the [Vue.js documentation](https://vuejs.org/)
3. Check [TailwindCSS documentation](https://tailwindcss.com/)
4. Open an issue in the repository

## Roadmap

- [ ] Real-time WebSocket integration
- [ ] Advanced filtering and search
- [ ] Export functionality for reports
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Offline support with service workers


