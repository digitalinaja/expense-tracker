# Cloudflare R2 Setup Guide

## Step 1: Create R2 Bucket

```bash
# Create a new R2 bucket
wrangler r2 bucket create expense-attachments

# List buckets to verify
wrangler r2 bucket list
```

## Step 2: Update wrangler.toml

Add R2 binding to `worker/wrangler.toml`:

```toml
# R2 Bucket binding
[[r2_buckets]]
binding = "R2"
bucket_name = "expense-attachments"
```

## Step 3: Update wrangler.prod.toml (if exists)

Add the same R2 binding to production config:

```toml
# R2 Bucket binding
[[r2_buckets]]
binding = "R2"
bucket_name = "expense-attachments"
```

## Step 4: Run Database Migration

```bash
cd d1
wrangler d1 execute expense-tracker-db --file=./migrations/006_add_attachments.sql --local
```

For production:
```bash
wrangler d1 execute expense-tracker-db --file=./migrations/006_add_attachments.sql --remote
```

## R2 Key Format

Files will be stored with this key pattern:
```
expenses/{expense_id}/{timestamp}_{file_id}.{ext}
```

Example: `expenses/123/1704067200000_1.jpg`

## Public Access (Optional)

If you want to make images publicly accessible:

1. Go to Cloudflare Dashboard > R2 > expense-attachments
2. Click "Settings" > "Public Access"
3. Add a custom domain or use the default public URL

Otherwise, images will be served through the Worker API.
