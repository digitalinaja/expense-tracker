# 🚀 Deployment Guide

## Quick Start Deployment

### Step 1: Setup Cloudflare Account

1. Sign up di [Cloudflare Dashboard](https://dash.cloudflare.com/sign-up)
2. Verify email address
3. Complete account setup

### Step 2: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Step 3: Setup D1 Database

```bash
# Create database
wrangler d1 create expense-tracker-db

# Copy the database_id from output
# Example: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Update `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "expense-tracker-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### Step 4: Initialize Database

```bash
# Run migrations for local development
wrangler d1 execute expense-tracker-db --file=./d1/schema.sql --local

# Run migrations for production
wrangler d1 execute expense-tracker-db --file=./d1/schema.sql --remote
```

### Step 4.5: Setup KV Store (Optional)

KV store digunakan untuk caching. Ini **optional** - aplikasi akan berjalan tanpa KV store.

```bash
# Create KV namespace
wrangler kv:namespace create "EXPENSE_TRACKER_CACHE"

# Copy the namespace_id from output
```

Update `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_NAMESPACE_ID_HERE"
```

**Skip jika tidak diperlukan**: Hapus bagian `[[kv_namespaces]]` dari wrangler.toml dan KV-related code dari worker.

### Step 5: Deploy Worker API

```bash
cd worker
npm install
npm run deploy
```

Copy the Worker URL from output (example: `https://expense-tracker-api.YOUR_SUBDOMAIN.workers.dev`)

### Step 6: Deploy Frontend

#### Option A: Direct Deploy (Quick)

```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name=expense-tracker-frontend
```

#### Option B: Git Integration (Recommended)

1. Push code ke GitHub
2. Go to Cloudflare Dashboard > Pages
3. Click "Create a project" > "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Project name**: expense-tracker-frontend
   - **Production branch**: main
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

### Step 7: Update Frontend API URL

Jika Worker URL berbeda dari default `/api`, update di frontend:

Edit `frontend/src/services/ExpenseService.ts` dan `PlanningService.ts`:

```typescript
// Change this line:
const API_BASE_URL = import.meta.env.DEV ? '/api' : '/api'

// To this (replace with your actual Worker URL):
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://expense-tracker-api.YOUR_SUBDOMAIN.workers.dev/api'
```

Redeploy frontend setelah perubahan.

## Production Checklist

- [ ] Database created dan migrations run
- [ ] Worker deployed dan tested
- [ ] Frontend deployed dengan correct API URL
- [ ] CORS configuration updated untuk production domain
- [ ] Test semua functionality di production URL
- [ ] Setup custom domain (optional)
- [ ] Enable analytics (optional)

## Custom Domain Setup (Optional)

### Worker Domain

1. Go to Workers > Your Worker > Triggers > Custom Domains
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Update DNS records as instructed

### Frontend Domain

1. Go to Pages > Your Project > Custom Domains
2. Add custom domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed

## Monitoring & Analytics

### Cloudflare Analytics

1. Go to Cloudflare Dashboard
2. Select your Worker or Pages project
3. View metrics: requests, errors, latency, etc.

### Database Monitoring

```bash
# View database info
wrangler d1 info expense-tracker-db

# Query database (local)
wrangler d1 execute expense-tracker-db --command="SELECT COUNT(*) FROM expenses" --local

# Query database (production)
wrangler d1 execute expense-tracker-db --command="SELECT COUNT(*) FROM expenses" --remote
```

## Troubleshooting Production Issues

### 1. Worker Returns 404

**Check**: Worker URL is correct
**Check**: Route handlers are properly defined
**Solution**: Check Worker logs in dashboard

### 2. CORS Errors

**Problem**: Frontend domain not allowed in CORS

**Solution**: Update CORS configuration in `worker/src/index.ts`:

```typescript
app.use('*', cors({
  origin: 'https://your-frontend-domain.pages.dev',
  // or use specific array of allowed origins
}))
```

### 3. Database Connection Issues

**Check**: `database_id` in `wrangler.toml` is correct
**Check**: Migrations have been run with `--remote` flag
**Solution**: Re-run migrations

### 4. Frontend Can't Reach API

**Check**: API base URL is correct in services
**Check**: Worker is deployed and accessible
**Check**: CORS configuration allows frontend origin

## Security Hardening

### 1. Restrict CORS Origins

```typescript
// In worker/src/index.ts
const allowedOrigins = [
  'https://your-frontend-domain.pages.dev',
  'https://your-custom-domain.com'
]

app.use('*', cors({
  origin: (origin) => allowedOrigins.includes(origin),
  credentials: true
}))
```

### 2. Add Rate Limiting

Install rate limiting middleware:

```bash
cd worker
npm install @hono/rate-limiter
```

### 3. Enable Cloudflare Web Application Firewall (WAF)

1. Go to Security > WAF
2. Create custom rules untuk protection
3. Enable rate limiting rules

### 4. Use Environment Variables for Secrets

```toml
# In wrangler.toml
[env.production]
vars = { ENVIRONMENT = "production" }

# Add secrets (never commit these)
# wrangler secret put API_KEY
```

## Backup & Recovery

### Database Backup

```bash
# Export database schema and data
wrangler d1 execute expense-tracker-db --command="SELECT * FROM expenses" --remote > expenses_backup.json
wrangler d1 execute expense-tracker-db --command="SELECT * FROM planning" --remote > planning_backup.json
```

### Restore Database

```bash
# Create restore script in d1/restore.sql
# Then run:
wrangler d1 execute expense-tracker-db --file=./d1/restore.sql --remote
```

## Scaling Considerations

### Current Architecture Supports

- ✅ Unlimited requests (Cloudflare Free Tier: 100,000 requests/day)
- ✅ Global edge deployment
- ✅ Auto-scaling
- ✅ D1 database: 5GB storage (Free tier)

### When to Upgrade

- Consider upgrading to paid tier if:
  - More than 100,000 requests/day
  - Need more than 5GB database storage
  - Need advanced analytics
  - Need custom domains (included in paid tier)

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Check Cloudflare analytics
   - Monitor error rates
   - Review database growth

2. **Monthly**:
   - Update dependencies
   - Review and optimize queries
   - Test backup/restore procedures

3. **Quarterly**:
   - Security audit
   - Performance optimization review
   - Cost analysis

## Support Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Hono Framework Documentation](https://hono.dev/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

**Need Help?** Check the main [README.md](README.md) or create an issue in the repository.
