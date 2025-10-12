# Security Recommendations for Production Deployment

## Authentication & Session Management

### Current Implementation (Development)
- Tokens stored in `sessionStorage` for persistence across page reloads
- Mock authentication with hardcoded credentials
- No token refresh mechanism

### Production Requirements

#### 1. HttpOnly Cookies (Recommended)
Replace client-side token storage with HttpOnly cookies:

```typescript
// In services/api.ts - Update axios interceptors
api.interceptors.request.use((config) => {
  // Remove Authorization header - cookies will be sent automatically
  // if (authStore.token && config.headers) {
  //   config.headers.Authorization = `Bearer ${authStore.token}`
  // }
  return config
})
```

#### 2. Backend Cookie Configuration
```javascript
// Express.js example
app.post('/auth/login', (req, res) => {
  // ... authentication logic
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
})
```

#### 3. Token Refresh Endpoint
```javascript
// Backend refresh endpoint
app.post('/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refresh_token
  // ... validate refresh token
  res.cookie('auth_token', newToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  })
})
```

## Content Security Policy (CSP)

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # CSP Headers
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https: blob:;
        connect-src 'self' https://api.your-domain.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
    " always;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # HTTPS Only
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Vite Configuration for CSP
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    }
  }
})
```

## CORS Configuration

### Backend CORS Setup
```javascript
// Express.js with cors middleware
const cors = require('cors')

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
```

## Environment Variables Security

### Required Environment Variables
```bash
# Production .env
NODE_ENV=production
VITE_API_BASE_URL=https://api.your-domain.com
VITE_MAP_PROVIDER=mapbox
VITE_MAPBOX_KEY=your_actual_mapbox_key
VITE_APP_TITLE=Defense Radar Dashboard

# Backend .env
JWT_SECRET=your_super_secure_jwt_secret
JWT_REFRESH_SECRET=your_super_secure_refresh_secret
DB_CONNECTION_STRING=your_secure_database_url
REDIS_URL=your_redis_url
```

### Environment Variable Validation
```typescript
// utils/env.ts
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_MAP_PROVIDER'
]

requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
})
```

## API Security

### Rate Limiting
```javascript
// Backend rate limiting
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})

app.use('/api/', limiter)
```

### Input Validation
```javascript
// Backend input validation
const { body, validationResult } = require('express-validator')

app.post('/api/targets', [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('title').isLength({ min: 1, max: 100 }),
  body('type').isIn(['radar', 'target', 'threat', 'friendly', 'unknown'])
], (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  // ... process request
})
```

## Database Security

### Connection Security
```javascript
// Use connection pooling and SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

### Query Parameterization
```javascript
// Always use parameterized queries
const query = 'SELECT * FROM targets WHERE id = $1'
const result = await pool.query(query, [targetId])
```

## Deployment Security

### Docker Security
```dockerfile
# Use non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

### Kubernetes Security
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radar-dashboard
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: app
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

## Monitoring & Logging

### Security Event Logging
```javascript
// Backend security logging
const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
})

// Log authentication events
app.post('/auth/login', (req, res) => {
  logger.info('Login attempt', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })
})
```

## Checklist for Production Deployment

- [ ] Replace sessionStorage with HttpOnly cookies
- [ ] Implement proper CORS configuration
- [ ] Add CSP headers
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Implement rate limiting
- [ ] Add input validation and sanitization
- [ ] Use parameterized database queries
- [ ] Set up security monitoring and logging
- [ ] Configure proper environment variables
- [ ] Use non-root containers in production
- [ ] Implement proper error handling (no sensitive data in errors)
- [ ] Regular security updates and dependency scanning
- [ ] Backup and disaster recovery procedures
- [ ] Security testing and penetration testing

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vue.js Security Guide](https://vuejs.org/guide/best-practices/security.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Nginx Security Headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html)


