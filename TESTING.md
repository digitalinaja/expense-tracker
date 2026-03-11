# 🧪 Testing Guide

## Prerequisites Testing

Sebelum memulai testing, pastikan:

1. ✅ Node.js dan npm sudah terinstall
2. ✅ Wrangler CLI sudah terinstall dan login
3. ✅ Dependencies sudah terinstall (`npm run install:all`)
4. ✅ D1 database sudah dibuat dan migrations di-run

## Local Testing Checklist

### Phase 1: Worker API Testing

#### 1.1 Start Worker Development Server

```bash
cd worker
npx wrangler dev --local
```

Expected output:
```
 ⛅️ wrangler 3.x.x
-------------------
Your worker has access to the following bindings:
- D1 Databases:
  - DB: expense-tracker-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

#### 1.2 Test Health Check Endpoint

```bash
curl http://localhost:8787/
```

Expected response:
```json
{
  "status": "ok",
  "message": "Expense Tracker API",
  "version": "1.0.0",
  "environment": "development"
}
```

#### 1.3 Test Create Expense

```bash
curl -X POST http://localhost:8787/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"name":"Makan Siang","amount":25000,"date":"2024-01-15"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 1
  }
}
```

#### 1.4 Test Get All Expenses

```bash
curl http://localhost:8787/api/expenses
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Makan Siang",
      "amount": 25000,
      "date": "2024-01-15",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### 1.5 Test Create Planning

```bash
curl -X POST http://localhost:8787/api/planning \
  -H "Content-Type: application/json" \
  -d '{"name":"Belanja Bulanan","amount":500000,"date":"2024-01-20"}'
```

#### 1.6 Test Validation Errors

```bash
# Test missing required field
curl -X POST http://localhost:8787/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Expected: 400 Bad Request with validation error
```

#### 1.7 Test Delete Operation

```bash
# Delete expense (replace ID with actual ID from get all)
curl -X DELETE http://localhost:8787/api/expenses/1
```

### Phase 2: Frontend Testing

#### 2.1 Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

#### 2.2 Open Browser

Navigate to: `http://localhost:3000`

#### 2.3 Test User Interface

##### Test 1: Add Expense

1. ✅ Click "Nama Pengeluaran" field
2. ✅ Enter: "Makan Siang"
3. ✅ Click "Jumlah (Rp)" field
4. ✅ Enter: 25000
5. ✅ Click date field
6. ✅ Select today's date
7. ✅ Click "Tambah" button
8. ✅ Verify expense appears in "Riwayat Pengeluaran"
9. ✅ Verify "Total Pengeluaran" updates

##### Test 2: Add Planning

1. ✅ Scroll to "Perencanaan Pengeluaran" section
2. ✅ Click "Nama Perencanaan" field
3. ✅ Enter: "Belanja Bulanan"
4. ✅ Click "Jumlah (Rp)" field
5. ✅ Enter: 500000
6. ✅ Click date field
7. ✅ Select future date
8. ✅ Click "Tambah Perencanaan" button
9. ✅ Verify planning appears in list
10. ✅ Verify "Total Perencanaan" updates

##### Test 3: Verify Summary

1. ✅ Check "Total Pengeluaran" shows correct amount
2. ✅ Check "Total Perencanaan" shows correct amount
3. ✅ Check "Saldo Sisa" calculation is correct
4. ✅ Verify "Saldo Sisa" color:
   - Green if positive
   - Red if negative
   - Yellow if zero

##### Test 4: Delete Items

1. ✅ Click "Hapus" button on an expense
2. ✅ Confirm deletion in dialog
3. ✅ Verify item removed from list
4. ✅ Verify summary updates
5. ✅ Repeat for planning item

##### Test 5: Form Validation

1. ✅ Try to submit empty form (should show errors)
2. ✅ Enter negative amount (should show error)
3. ✅ Enter invalid date format (should show error)
4. ✅ Verify error messages appear in red

##### Test 6: Responsive Design

1. ✅ Resize browser window to mobile size (<480px)
2. ✅ Verify layout adapts correctly
3. ✅ Verify text remains readable
4. ✅ Verify buttons remain clickable

##### Test 7: Data Persistence

1. ✅ Refresh page (F5)
2. ✅ Verify data still loaded from API
3. ✅ Verify summary still correct

### Phase 3: Integration Testing

#### 3.1 Test API-Frontend Connection

1. ✅ Open Browser DevTools (F12)
2. ✅ Go to Network tab
3. ✅ Add new expense
4. ✅ Verify POST request to `/api/expenses`
5. ✅ Verify response is successful
6. ✅ Verify GET request to fetch updated list
7. ✅ Check no CORS errors in console

#### 3.2 Test Error Handling

1. ✅ Stop Worker server (Ctrl+C)
2. ✅ Try to add expense in frontend
3. ✅ Verify error message appears
4. ✅ Restart Worker server
5. ✅ Verify app recovers and loads data

### Phase 4: Production Readiness Testing

#### 4.1 Build Production Bundle

```bash
cd frontend
npm run build
```

Expected: No build errors, `dist` folder created

#### 4.2 Test Production Build Locally

```bash
npm run preview
```

Navigate to preview URL and verify all functionality works

## Automated Testing (Future Enhancement)

### Unit Tests Setup

```bash
# Install testing dependencies
npm install --save-dev vitest @vitest/ui

# Create test files
touch frontend/src/components/__tests__/ExpenseForm.test.ts
```

### Example Test Structure

```typescript
// frontend/src/components/__tests__/ExpenseForm.test.ts
import { describe, it, expect } from 'vitest'
import { ExpenseForm } from '../ExpenseForm'

describe('ExpenseForm', () => {
  it('should validate expense data correctly', () => {
    const formData = {
      name: 'Test Expense',
      amount: 10000,
      date: '2024-01-15'
    }
    // Add test assertions
  })
})
```

## Performance Testing

### 1. API Response Time

```bash
# Test response time
time curl http://localhost:8787/api/expenses
```

Target: < 100ms for most requests

### 2. Frontend Load Time

1. Open DevTools > Network tab
2. Reload page
3. Check load time metrics

Target: < 2s for initial page load

### 3. Database Query Performance

```bash
# Test with large dataset
wrangler d1 execute expense-tracker-db \
  --command="SELECT COUNT(*) FROM expenses" --local
```

## Browser Compatibility Testing

Test in following browsers:

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available on Mac)
- ✅ Mobile browsers (Chrome Mobile, Safari Mobile)

## Test Results Summary

Create a test report:

```markdown
## Test Results - [Date]

### Environment
- Node.js: [version]
- OS: [Windows/Mac/Linux]
- Browser: [name and version]

### Test Results
- [ ] Worker API tests: PASSED/FAILED
- [ ] Frontend UI tests: PASSED/FAILED
- [ ] Integration tests: PASSED/FAILED
- [ ] Build tests: PASSED/FAILED

### Issues Found
1. [Description of issue]
2. [Description of issue]

### Notes
[Additional observations]
```

## Troubleshooting Common Test Failures

### Issue 1: Worker Not Starting

**Error**: `Port 8787 already in use`

**Solution**:
```bash
# Find and kill process on port 8787
netstat -ano | findstr :8787  # Windows
lsof -ti:8787 | xargs kill -9  # Mac/Linux
```

### Issue 2: Database Connection Error

**Error**: `D1 binding not found`

**Solution**:
1. Check `wrangler.toml` has correct `database_id`
2. Run `wrangler d1 execute expense-tracker-db --command="SELECT 1" --local`
3. Verify migrations were run

### Issue 3: Frontend Can't Connect to Worker

**Error**: `Network error` or `CORS error`

**Solution**:
1. Verify Worker is running on `http://localhost:8787`
2. Check Vite proxy configuration
3. Test Worker endpoint directly with curl
4. Check CORS settings in Worker

## Continuous Testing

For production, consider setting up:

1. **Automated Testing**: GitHub Actions with test workflows
2. **Monitoring**: Cloudflare Analytics integration
3. **Error Tracking**: Sentry or similar service
4. **Performance Monitoring**: Web Vitals tracking

---

**Happy Testing! 🧪**

If you find any bugs or issues, please create an issue in the repository.
