# Archive Cleanup Cron Job Setup

This document explains how to set up automatic cleanup of archived receipts that are older than 30 days.

## Environment Variables

Add the following environment variable to your `.env.local` file:

```
CRON_SECRET=your-secure-secret-key-here
```

## API Endpoints

### Cleanup Endpoint
- **URL**: `POST /api/receipts/cleanup`
- **Authorization**: `Bearer your-secure-secret-key-here`
- **Description**: Permanently deletes receipts that have been archived for more than 30 days

### Dry Run Endpoint
- **URL**: `GET /api/receipts/cleanup`
- **Authorization**: `Bearer your-secure-secret-key-here`
- **Description**: Returns count of receipts that would be deleted without actually deleting them

## Cron Job Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/receipts/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the cleanup job daily at 2 AM UTC.

### Option 2: External Cron Service

Use services like:
- **Cron-job.org**
- **EasyCron**
- **GitHub Actions with scheduled workflows**

Example cURL command:
```bash
curl -X POST https://your-domain.com/api/receipts/cleanup \
  -H "Authorization: Bearer your-secure-secret-key-here" \
  -H "Content-Type: application/json"
```

### Option 3: Server Cron Job

If you have server access, add to crontab:

```bash
# Run daily at 2 AM
0 2 * * * curl -X POST https://your-domain.com/api/receipts/cleanup -H "Authorization: Bearer your-secure-secret-key-here"
```

## Testing

### Test with Dry Run
```bash
curl -X GET https://your-domain.com/api/receipts/cleanup \
  -H "Authorization: Bearer your-secure-secret-key-here"
```

### Test Actual Cleanup
```bash
curl -X POST https://your-domain.com/api/receipts/cleanup \
  -H "Authorization: Bearer your-secure-secret-key-here"
```

## Database Migration

You'll need to add the `archived_at` column to your receipts table:

```sql
ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
```

## Security Notes

1. Keep your `CRON_SECRET` secure and use a strong, random value
2. The cleanup endpoint requires authorization to prevent unauthorized access
3. Files are deleted from both database and storage
4. The operation is irreversible once executed

## Monitoring

The cleanup endpoint returns detailed information about the operation:
- Total receipts found for cleanup
- Number of database records deleted
- Number of files deleted from storage
- Any errors encountered during the process

Consider setting up monitoring/alerting based on these responses to ensure the cleanup job is running successfully. 