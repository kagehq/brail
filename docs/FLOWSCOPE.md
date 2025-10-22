# FlowScope Integration Guide

FlowScope is a local HTTP request/response viewer that helps you debug API traffic in real-time. This guide explains how to integrate FlowScope with Brail for enhanced development debugging.

## Quick Setup

### 1. Install FlowScope (One-time)

```bash
# In a separate directory (outside brail)
git clone https://github.com/kagehq/flowscope.git
cd flowscope
docker-compose up -d
```

FlowScope will run on:
- **Proxy**: `http://localhost:4317`
- **Dashboard**: `http://localhost:4320`

### 2. Enable in Brail

Create or modify your `.env.local` file:

```bash
# apps/web/.env.local
FLOWSCOPE_ENABLED=true
```

That's it! All frontend API calls will now flow through FlowScope.

## Usage

### Starting Everything

```bash
# Terminal 1: Start FlowScope
cd flowscope && docker-compose up

# Terminal 2: Start Brail
cd brail && pnpm dev
```

Open these in your browser:
- Brail Web: `http://localhost:3001`
- FlowScope Dashboard: `http://localhost:4320`

Now use Brail normally - all API requests will appear in the FlowScope dashboard in real-time!

## Integration Points

### ✅ Frontend → Backend (Already Integrated)

The `useApi` composable has been modified to route through FlowScope when `FLOWSCOPE_ENABLED=true`.

**How it works:**
```typescript
// apps/web/composables/useApi.ts
const baseUrl = config.public.flowscopeEnabled
  ? `http://localhost:4317/proxy/${apiUrl}`  // Routes through FlowScope
  : apiUrl;                                   // Direct connection
```

**What you'll see:**
- All API calls from frontend (sites, deploys, domains, etc.)
- Request/response bodies
- Authentication headers
- Response times
- Status codes

### Backend → External APIs (Manual Integration)

For monitoring external API calls in your NestJS backend, you can optionally route specific calls through FlowScope.

#### Example: ACME/Let's Encrypt SSL Requests

```typescript
// apps/api/src/ssl/acme.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AcmeService {
  private getAcmeUrl(path: string): string {
    const baseUrl = 'https://acme-v02.api.letsencrypt.org';
    
    // Route through FlowScope in development
    if (process.env.FLOWSCOPE_ENABLED === 'true') {
      return `http://localhost:4317/proxy/${baseUrl}${path}`;
    }
    
    return `${baseUrl}${path}`;
  }
}
```

#### Example: Adapter Catalog Fetch

```typescript
// apps/api/src/catalog/adapter-catalog.service.ts
async listAdapters(): Promise<AdapterCatalogEntry[]> {
  let catalogUrl = process.env.ADAPTER_CATALOG_URL;
  
  // Route through FlowScope in development
  if (catalogUrl && process.env.FLOWSCOPE_ENABLED === 'true') {
    catalogUrl = `http://localhost:4317/proxy/${catalogUrl}`;
  }
  
  const response = await fetch(catalogUrl);
  // ... rest of code
}
```

#### Example: Health Checks

```typescript
// apps/api/src/health/health.service.ts
async checkUrl(url: string, options = {}): Promise<void> {
  let checkUrl = url;
  
  // Route through FlowScope in development
  if (process.env.FLOWSCOPE_ENABLED === 'true') {
    checkUrl = `http://localhost:4317/proxy/${url}`;
  }
  
  const response = await fetch(checkUrl, {
    signal: controller.signal,
  });
  // ... rest of code
}
```

## Use Cases

### 1. **Debugging Frontend Issues**

When users report issues with sites not loading or deploys failing:

1. Enable FlowScope
2. Reproduce the issue in the browser
3. Open FlowScope dashboard
4. Filter by "errors" (4xx/5xx)
5. Inspect failed request bodies and responses

**Example**: User reports "site creation fails"
- See the exact `POST /v1/sites` request
- View the error response body
- Compare with a successful request

### 2. **Performance Profiling**

Find slow API endpoints:

1. Use your app normally for a few minutes
2. Open FlowScope dashboard
3. Check p95/p99 response times
4. Filter by "slow requests" (>500ms)
5. Identify bottlenecks

**Example**: Dashboard feels sluggish
- See that `GET /v1/sites/:id/deploys` takes 1.2s
- Optimize the database query
- Verify improvement in FlowScope

### 3. **Integration Testing**

Compare expected vs actual API responses:

1. Make a request you want to test
2. Make the same request with different params
3. Use FlowScope's "Compare" feature
4. See side-by-side diff

**Example**: Testing deploy activation
- Activate deploy with different adapters
- Compare the activation requests
- Ensure all adapters receive correct config

### 4. **External API Debugging**

Monitor calls to third-party services:

1. Integrate FlowScope with external API calls (see examples above)
2. Watch ACME SSL certificate requests
3. Debug Vercel/Cloudflare deployment issues
4. See rate limits and error responses

**Example**: SSL certificate failing
- See ACME challenge requests
- View validation responses
- Debug token mismatches

## Features You'll Use

### Filters

- **Errors Only**: Show only 4xx/5xx status codes
- **Slow Requests**: Show requests >500ms
- **Mutations**: Show only POST/PUT/DELETE
- **By Status**: 200, 404, 500, etc.

### Search

Fuzzy search across:
- Request paths
- Request bodies
- Response bodies
- Headers
- Status codes

### Compare

1. Click "Compare" on any request
2. Select another request
3. See side-by-side diff
4. Great for debugging regressions

### Replay

1. Click on any request
2. Click "Replay"
3. Request is sent again with same body/headers
4. Useful for testing fixes

### Export

- **Copy as cURL**: For terminal reproduction
- **Copy Request**: JSON format
- **Copy Response**: JSON format

## Performance Impact

FlowScope adds **5-20ms latency** to requests, which is negligible for development:

- Frontend API calls: 50-200ms → 55-220ms
- External API calls: 100-500ms → 105-520ms
- No impact on production (only enabled in development)

## Configuration

### Environment Variables

```bash
# apps/web/.env.local (Frontend)
FLOWSCOPE_ENABLED=true           # Enable FlowScope proxy

# apps/api/.env (Backend - optional)
FLOWSCOPE_ENABLED=true           # Enable for backend external calls
```

### Custom FlowScope Port

If port 4317 conflicts with another service:

```bash
# In flowscope directory
# Edit docker-compose.yml or .env
PORT=9000  # Change proxy port

# Update Brail config
# apps/web/composables/useApi.ts
const baseUrl = config.public.flowscopeEnabled
  ? `http://localhost:9000/proxy/${apiUrl}`  // Updated port
  : apiUrl;
```

## Troubleshooting

### Requests not appearing in dashboard

1. Check FlowScope is running: `docker ps | grep flowscope`
2. Visit `http://localhost:4320` - should show dashboard
3. Check `FLOWSCOPE_ENABLED=true` in `.env.local`
4. Restart Nuxt dev server

### CORS errors

FlowScope should handle CORS transparently, but if you see errors:

1. Check FlowScope logs: `docker-compose logs -f`
2. Ensure FlowScope dashboard origin is allowed
3. Try clearing browser cache

### FlowScope dashboard shows "no requests"

1. Make a request in Brail (refresh page, create site, etc.)
2. Check console for fetch errors
3. Verify the proxy URL format: `http://localhost:4317/proxy/http://localhost:3000`

### Performance feels slow

FlowScope adds 5-20ms latency. If it feels slower:

1. Check FlowScope isn't under heavy load
2. Restart FlowScope: `docker-compose restart`
3. Disable if not actively debugging: `FLOWSCOPE_ENABLED=false`

## When to Use FlowScope

### ✅ Use FlowScope when:

- Debugging specific user-reported issues
- Profiling API performance
- Comparing request/response differences
- Testing integration with external services
- Learning API patterns in the codebase

### ❌ Don't use FlowScope when:

- Running automated tests (adds latency)
- Not actively debugging (unnecessary overhead)
- In production (security risk, performance impact)

## Disabling FlowScope

Temporarily disable:

```bash
# apps/web/.env.local
FLOWSCOPE_ENABLED=false
```

Or just remove the line entirely - FlowScope is disabled by default.

## Advanced: Selective Proxying

If you only want to monitor specific API calls, you can create a helper:

```typescript
// apps/web/composables/useFlowScope.ts
export const useFlowScope = () => {
  const config = useRuntimeConfig();
  
  const proxyUrl = (url: string, force = false) => {
    if (!config.public.flowscopeEnabled && !force) {
      return url;
    }
    
    return `http://localhost:4317/proxy/${url}`;
  };
  
  return { proxyUrl };
};

// Usage in components
const { proxyUrl } = useFlowScope();

// Only proxy specific calls
const deployUrl = proxyUrl('http://localhost:3000/v1/deploys/xyz');
const response = await fetch(deployUrl);
```

## Resources

- **FlowScope GitHub**: https://github.com/kagehq/flowscope
- **FlowScope Dashboard** (when running): http://localhost:4320
- **Brail API Docs**: See `docs/DETAILED.md`

## Summary

FlowScope is a powerful debugging tool that saves time by providing visual insights into your API traffic. It's especially useful when:

1. **Finding bugs fast** - See exact request/response data without scrolling logs
2. **Performance tuning** - Identify slow endpoints with p95/p99 stats
3. **Integration testing** - Compare requests and responses side-by-side
4. **External API debugging** - Monitor calls to ACME, Vercel, Cloudflare, etc.

Start it when you need it, disable it when you don't. Zero config required in production.

