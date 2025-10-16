# SSL/HTTPS Setup Guide

Brail now supports automatic SSL certificate provisioning via Let's Encrypt! 🔒

## Features

- ✅ Automatic SSL certificate provisioning using ACME/Let's Encrypt
- ✅ HTTP-01 challenge verification
- ✅ Automatic certificate renewal (30 days before expiration)
- ✅ Certificate storage with encryption
- ✅ UI for managing SSL certificates
- ✅ Daily cron job for certificate renewal

## Quick Start

### 1. Environment Configuration

Add these environment variables to your `.env` file:

```bash
# SSL/ACME Configuration
ACME_DIRECTORY_URL=https://acme-staging-v02.api.letsencrypt.org/directory  # Use staging for testing
# ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory  # Use production when ready

# Encryption key for storing SSL private keys (CHANGE THIS IN PRODUCTION!)
ENCRYPTION_KEY=your-very-secure-random-32-character-key-here
```

**Important:** 
- **Use staging first!** Let's Encrypt has rate limits. Test with staging before switching to production.
- **Generate a secure encryption key:** `openssl rand -hex 32`
- Never commit your production encryption key to version control!

### 2. Database Migration

The SSL certificate model has been added to your Prisma schema. The migration should already be applied, but if not:

```bash
cd apps/api
npx prisma migrate dev
```

### 3. DNS Configuration

Before provisioning SSL, ensure your domain:
1. Has a CNAME record pointing to your Brail instance
2. Is verified (green status badge in UI)

### 4. HTTP-01 Challenge Endpoint

The SSL service exposes an endpoint for Let's Encrypt verification:

```
GET /.well-known/acme-challenge/:token
```

This endpoint is **public** (no authentication) and must be accessible for Let's Encrypt to verify domain ownership.

**Important:** Ensure your reverse proxy/load balancer forwards requests to `/.well-known/acme-challenge/*` to your API server.

## Using SSL in the UI

### Provisioning a Certificate

1. Navigate to **Sites → [Your Site] → Domains**
2. Add your custom domain and verify DNS
3. Once verified, click **"Enable SSL"**
4. Wait 2-5 minutes for certificate provisioning
5. Certificate status will update automatically

### Certificate Status Badges

- **🟢 issued** - Certificate is active and valid
- **🟡 pending** - Certificate is being provisioned
- **🔴 failed** - Provisioning failed (check domain verification)

## How It Works

### Certificate Provisioning Flow

1. **User clicks "Enable SSL"**
   - UI calls `/v1/domains/:domainId/ssl/provision`

2. **ACME Client Creates Order**
   - Connects to Let's Encrypt
   - Creates CSR (Certificate Signing Request)
   - Generates challenge tokens

3. **HTTP-01 Challenge**
   - Let's Encrypt requests `http://yourdomain.com/.well-known/acme-challenge/TOKEN`
   - Our API responds with key authorization
   - Let's Encrypt verifies domain ownership

4. **Certificate Issuance**
   - Let's Encrypt signs the certificate
   - Certificate and private key are stored encrypted in database
   - Domain status updates to "active"

### Automatic Renewal

A cron job runs **daily at 2 AM** to check for certificates expiring within 30 days:

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async handleCertificateRenewal() {
  await this.acme.checkAndRenewExpiringCertificates();
}
```

Renewal is automatic - no user intervention required!

## API Endpoints

### Provision SSL Certificate
```http
POST /v1/domains/:domainId/ssl/provision
Authorization: Bearer <token>
```

### List Certificates for a Site
```http
GET /v1/sites/:siteId/certificates
Authorization: Bearer <token>
```

### Manually Renew Certificate
```http
POST /v1/certificates/:certificateId/renew
Authorization: Bearer <token>
```

### Revoke Certificate
```http
DELETE /v1/certificates/:certificateId
Authorization: Bearer <token>
```

## Production Deployment

### 1. Switch to Production ACME

```bash
ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory
```

### 2. Configure Reverse Proxy

#### Nginx Example

```nginx
server {
    listen 80;
    server_name *.yourdomain.com;

    # ACME challenge forwarding
    location /.well-known/acme-challenge/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Redirect other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name *.yourdomain.com;

    # SSL certificates loaded from database or filesystem
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Proxy to your application
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Certificate Export (Optional)

If you need to export certificates for use with nginx or other servers:

```typescript
const cert = await prisma.sslCertificate.findFirst({
  where: { hostname: 'example.com', status: 'active' }
});

// Decrypt and write to files
fs.writeFileSync('/etc/nginx/ssl/cert.pem', cert.certPem);
fs.writeFileSync('/etc/nginx/ssl/key.pem', decryptedKey);
```

## Troubleshooting

### Certificate Provisioning Fails

1. **Check DNS Verification**
   - Ensure CNAME record is correct and propagated
   - Domain status should be "verified" before enabling SSL

2. **Check HTTP-01 Challenge Accessibility**
   - Test: `curl http://yourdomain.com/.well-known/acme-challenge/test`
   - Should reach your API server (404 is OK, connection refused is NOT)

3. **Check Rate Limits**
   - Let's Encrypt staging: 30,000 registrations/week
   - Let's Encrypt production: 50 certificates/week per domain
   - If rate limited, wait or use a different domain

4. **Check Logs**
   - API logs will show ACME communication details
   - Look for errors in SSL service logs

### Certificate Not Renewing

1. **Check Cron Job**
   - Ensure `@nestjs/schedule` is installed
   - Check server logs at 2 AM for renewal attempts

2. **Manual Renewal**
   - Use API endpoint: `POST /v1/certificates/:certificateId/renew`

3. **Check Auto-Renewal Flag**
   - Certificate should have `autoRenew: true`

## Security Best Practices

1. **Encryption Key**
   - Use a strong, random 32+ character encryption key
   - Store in environment variable, never commit to git
   - Rotate periodically

2. **Certificate Storage**
   - Private keys are encrypted at rest in database
   - Only decrypt in memory when needed
   - Consider using AWS KMS or HashiCorp Vault in production

3. **ACME Account**
   - One ACME account per Brail instance
   - Account key is stored encrypted per certificate
   - Keep backup of account key

4. **Rate Limits**
   - Use staging for development/testing
   - Monitor certificate issuance count
   - Implement backoff if approaching limits

## Architecture Notes

### Models

- **SslCertificate** - Stores certificates, private keys (encrypted), ACME metadata
- **Domain** - Updated with `certProvider`, `certStatus` fields

### Services

- **AcmeService** - Handles Let's Encrypt communication, challenge management
- **SslService** - High-level SSL operations, renewal cron job
- **SslController** - API endpoints for SSL management

### Security

- Private keys encrypted with AES-256-CBC
- HTTP-01 challenges stored in-memory (Map)
- Challenges cleared after use
- No plaintext keys in logs or responses

## Future Enhancements

- [ ] DNS-01 challenge support (for wildcard certificates)
- [ ] Multi-domain SAN certificates
- [ ] Certificate revocation via ACME
- [ ] Webhook notifications for certificate events
- [ ] Certificate monitoring/alerting
- [ ] External certificate import
- [ ] Certificate export to S3/CDN

## Support

For issues or questions:
- Check logs: `@br/api:dev` logs will show SSL operations
- Verify ACME endpoint: staging vs production
- Test with `curl` before filing issues
- See Let's Encrypt documentation: https://letsencrypt.org/docs/

---

**Made with ❤️ by the Brail team**

