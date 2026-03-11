# 🚀 Tracker Pengeluaran - Cloudflare Edition

Aplikasi Tracker Pengeluaran yang sudah di-upgrade ke arsitektur modern dengan Cloudflare ecosystem.

## 📋 Tech Stack

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool dan dev server
- **Cloudflare Pages** - Global CDN hosting

### Backend
- **Cloudflare Workers** - Serverless edge computing
- **Hono Framework** - Fast, lightweight web framework
- **TypeScript** - Type-safe development

### Database
- **Cloudflare D1** - SQLite database at the edge
- **Prepared Statements** - SQL injection protection

## 🏗️ Project Structure

```
/cloudflare-expense-tracker
├── /frontend              # Frontend application (Vite + TypeScript)
│   ├── /src
│   │   ├── /components   # UI components
│   │   ├── /services     # API services
│   │   ├── /stores       # State management
│   │   ├── /utils        # Helper functions
│   │   ├── /types        # TypeScript types
│   │   ├── /styles       # CSS styles
│   │   └── main.ts       # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── /worker                # Worker API (Hono + TypeScript)
│   ├── /src
│   │   ├── /routes       # API routes
│   │   ├── /middleware   # Auth & validation
│   │   ├── /db          # D1 operations
│   │   └── index.ts      # Worker entry
│   ├── wrangler.toml
│   └── package.json
├── /d1                    # Database schema
│   └── schema.sql
└── README.md
```

## 🛠️ Prerequisites

Sebelum memulai, pastikan Anda sudah menginstall:

- **Node.js** (v18+ atau v20+) - [Download](https://nodejs.org/)
- **npm** atau **yarn** - Biasanya sudah terinstall dengan Node.js
- **Git** - [Download](https://git-scm.com/)
- **Cloudflare Account** - [Sign up gratis](https://dash.cloudflare.com/sign-up)

## 📦 Installation

### 1. Clone Repository

```bash
cd d:\Gitrepos\html-play
```

### 2. Install Dependencies

#### Frontend Dependencies

```bash
cd frontend
npm install
```

#### Worker Dependencies

```bash
cd worker
npm install
```

### 3. Setup Wrangler (Cloudflare CLI)

```bash
# Install Wrangler globally
npm install -g wrangler

# Login ke Cloudflare
wrangler login
```

## 🗄️ Database Setup (D1)

### 1. Create D1 Database

```bash
# Buat database baru
wrangler d1 create expense-tracker-db
```

Catat `database_id` yang diberikan.

### 2. Update Wrangler Configuration

Edit [worker/wrangler.toml](worker/wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "expense-tracker-db"
database_id = "PASTE_DATABASE_ID_DISINI"
```

### 3. Run Database Migrations

```bash
cd d1

# Create tables
wrangler d1 execute expense-tracker-db --file=./schema.sql --local

# Untuk production
wrangler d1 execute expense-tracker-db --file=./schema.sql --remote
```

## 🔑 KV Store Setup (Optional)

KV store digunakan untuk caching dan dapat meningkatkan performa. Ini **optional** - aplikasi akan tetap berjalan tanpa KV store.

### 1. Create KV Namespace

**Option A: Menggunakan npm script (Recommended)**

```bash
# Create KV namespace dengan npm script
npm run kv:create
```

**Option B: Manual dengan wrangler**

```bash
# Buat KV namespace baru
wrangler kv:namespace create "EXPENSE_TRACKER_CACHE"
```

Catat `namespace_id` yang diberikan (contoh: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).

### 2. Update Wrangler Configuration

Edit [worker/wrangler.toml](worker/wrangler.toml):

```toml
[[kv_namespaces]]
binding = "KV"
id = "PASTE_NAMESPACE_ID_DISINI"
```

### 3. Skip KV Setup (Jika Tidak Diperlukan)

Jika Anda tidak ingin menggunakan KV store, hapus bagian `[[kv_namespaces]]` dari [worker/wrangler.toml](worker/wrangler.toml) dan remove KV-related code dari [worker/src/index.ts](worker/src/index.ts):

```typescript
// Hapus atau comment baris ini:
// KV: KVNamespace
```

## 🚀 Local Development

### Start Worker API (Backend)

```bash
cd worker

# Start worker dengan D1 local
npx wrangler dev --local

# Worker akan berjalan di http://localhost:8787
```

### Start Frontend (Development Mode)

```bash
cd frontend

# Start Vite dev server (terbuka di browser)
npm run dev

# Frontend akan berjalan di http://localhost:3000
```

Vite sudah dikonfigurasi untuk proxy API calls ke worker di `http://localhost:8787`.

## 🧪 Testing

### Test API Endpoints

Anda bisa test API endpoints menggunakan:

1. **Browser** - Buka langsung URL endpoint
2. **Postman** - Import dan test endpoints
3. **curl** - Command line testing

Contoh dengan curl:

```bash
# Test health check
curl http://localhost:8787/

# Create expense
curl -X POST http://localhost:8787/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"name":"Makan Siang","amount":25000,"date":"2024-01-15"}'

# Get all expenses
curl http://localhost:8787/api/expenses
```

### Test Frontend

Buka `http://localhost:3000` di browser dan test:

1. ✅ Add expense
2. ✅ Add planning
3. ✅ Delete items
4. ✅ View summary
5. ✅ Check data persistence

## 🌐 Deployment

### Deploy Worker API

```bash
cd worker

# Deploy ke Cloudflare Workers
npm run deploy

# Atau
npx wrangler deploy
```

Catat Worker URL yang diberikan (contoh: `https://expense-tracker-api.YOUR_SUBDOMAIN.workers.dev`)

### Deploy Frontend ke Cloudflare Pages

#### Option 1: Manual Deploy

```bash
cd frontend

# Build untuk production
npm run build

# Deploy ke Cloudflare Pages
npx wrangler pages deploy dist
```

#### Option 2: Git Integration (Recommended)

1. Push code ke GitHub/GitLab
2. Connect repository ke Cloudflare Pages
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

### Update Frontend API URL

Jika Worker URL berbeda dari development, update di [frontend/src/services/ExpenseService.ts](frontend/src/services/ExpenseService.ts):

```typescript
// Untuk production dengan custom Worker URL
const API_BASE_URL = 'https://your-worker-url.workers.dev/api'
```

## 🔧 Configuration

### Environment Variables

#### Worker (wrangler.toml)

```toml
[env.production]
vars = { ENVIRONMENT = "production" }
```

#### Frontend

Untuk production build, update API base URL di services.

### CORS Configuration

CORS settings ada di [worker/src/index.ts](worker/src/index.ts). Untuk production, update origin:

```typescript
app.use('*', cors({
  origin: 'https://your-frontend-domain.pages.dev',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
```

## 📊 API Documentation

### Endpoints

#### Health Check
- `GET /` - API status check

#### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

#### Planning
- `GET /api/planning` - Get all planning items
- `GET /api/planning/:id` - Get single planning item
- `POST /api/planning` - Create new planning item
- `PUT /api/planning/:id` - Update planning item
- `DELETE /api/planning/:id` - Delete planning item

### Request/Response Format

#### Create Expense Request

```json
{
  "name": "Makan Siang",
  "amount": 25000,
  "date": "2024-01-15"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 1
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Worker tidak bisa connect ke D1

**Problem**: Database binding error

**Solution**:
- Pastikan `database_id` di `wrangler.toml` sudah benar
- Run migrations dengan flag `--remote` untuk production

#### 2. Frontend tidak bisa connect ke Worker API

**Problem**: CORS error atau connection refused

**Solution**:
- Pastikan Worker sudah running di `http://localhost:8787`
- Check CORS configuration di Worker
- Check Vite proxy configuration

#### 3. Build Error TypeScript

**Problem**: Type errors saat build

**Solution**:
```bash
# Type check untuk debug
npm run type-check

# Fix errors atau gunakan // @ts-ignore jika necessary
```

## 🔒 Security Best Practices

1. **SQL Injection**: D1 menggunakan prepared statements
2. **Input Validation**: Validasi di frontend dan backend
3. **CORS**: Restrict origins di production
4. **Rate Limiting**: Add rate limiting untuk production
5. **Error Messages**: Jangan expose sensitive data di error messages

## 📈 Performance Optimization

### Current Optimizations

- ✅ Edge computing dengan Cloudflare Workers
- ✅ D1 database di edge locations
- ✅ Vite untuk fast builds
- ✅ TypeScript untuk type safety
- ✅ Modular component architecture

### Future Improvements

- [ ] Add Cloudflare KV untuk caching
- [ ] Implement rate limiting
- [ ] Add analytics tracking
- [ ] Optimize bundle size
- [ ] Add service worker untuk offline support

## 🤝 Contributing

Contributions are welcome! Silakan:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

Project ini adalah open source dan available untuk penggunaan pribadi dan komersial.

## 📞 Support

Jika ada pertanyaan atau issues:

- Create issue di GitHub repository
- Check documentation ini
- Review Cloudflare docs:
  - [Workers](https://developers.cloudflare.com/workers/)
  - [D1](https://developers.cloudflare.com/d1/)
  - [Pages](https://developers.cloudflare.com/pages/)

## ✨ Acknowledgments

- Original expense tracker codebase
- Cloudflare for amazing developer platform
- Hono framework for elegant Worker API
- Vite for blazing fast builds

---

**Happy Coding! 🚀**

Dibuat dengan ❤️ menggunakan Cloudflare ecosystem
