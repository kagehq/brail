# 🔐 Supabase Auth Migration Guide

## Overview
This guide walks through migrating from custom JWT auth to Supabase Auth while keeping the PostgreSQL database and PAT system.

## Architecture

### Before (Current)
```
Frontend → API → Custom JWT Auth → PostgreSQL
                ↓
              PAT Auth (for CLI)
```

### After (Target)
```
Frontend → Supabase Auth → API → PostgreSQL (Supabase)
                           ↓
                        PAT Auth (for CLI)
```

## Phase 1: Database Migration (No Code Changes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project credentials:
   - Project URL: `https://[PROJECT_REF].supabase.co`
   - Database URL: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
   - Anon Key: `eyJhb...` (for frontend)
   - Service Role Key: `eyJhb...` (for backend)

### Step 2: Run Database Migrations
```bash
# Set your Supabase database URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Run migrations
cd apps/api
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

### Step 3: Update Environment Variables
```bash
# apps/api/.env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# No other changes needed for Phase 1
```

### Step 4: Test
```bash
# Start the app
pnpm dev

# Everything should work exactly as before
# Just using Supabase's PostgreSQL instead of local
```

✅ **Phase 1 Complete**: Your app now uses Supabase PostgreSQL with zero code changes!

---

## Phase 2: Supabase Auth Integration (Main Migration)

### Step 1: Install Supabase Client
```bash
# Add Supabase to web app
cd apps/web
pnpm add @supabase/supabase-js

# Add Supabase to API
cd apps/api
pnpm add @supabase/supabase-js
```

### Step 2: Configure Supabase Auth

#### Enable Email Auth in Supabase Dashboard
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set **Site URL**: `https://yourdomain.com`
5. Add **Redirect URLs**: `https://yourdomain.com/auth/callback`

### Step 3: Create Supabase Client (Frontend)

**File: `apps/web/composables/useSupabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://[PROJECT_REF].supabase.co'
const supabaseAnonKey = 'your-anon-key'

export const useSupabase = () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return { supabase }
}
```

### Step 4: Update Login Page

**File: `apps/web/pages/login.vue`**
```vue
<script setup lang="ts">
const { supabase } = useSupabase()
const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  message.value = ''
  error.value = ''
  
  try {
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (authError) throw authError
    
    message.value = 'Check your email for the login link!'
  } catch (err: any) {
    error.value = err.message || 'Failed to send magic link'
  } finally {
    loading.value = false
  }
}

// Auto-redirect if already authenticated
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    navigateTo('/sites')
  }
})
</script>
```

### Step 5: Create Auth Callback Page

**File: `apps/web/pages/auth/callback.vue`**
```vue
<script setup lang="ts">
const { supabase } = useSupabase()
const api = useApi()
const router = useRouter()

onMounted(async () => {
  // Get the auth token from URL
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Auth error:', error)
    router.push('/login?error=auth_failed')
    return
  }
  
  if (session) {
    // Send Supabase token to our API to sync user
    try {
      await api.syncSupabaseAuth(session.access_token)
      router.push('/sites')
    } catch (err) {
      console.error('Sync error:', err)
      router.push('/login?error=sync_failed')
    }
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="min-h-screen bg-black flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
      <p class="text-gray-400 mt-4">Signing you in...</p>
    </div>
  </div>
</template>
```

### Step 6: Update API Composable

**File: `apps/web/composables/useApi.ts`**
```typescript
export const useApi = () => {
  const config = useRuntimeConfig()
  const { supabase } = useSupabase()
  
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
    return {}
  }
  
  const syncSupabaseAuth = async (accessToken: string) => {
    const response = await fetch(`${config.public.apiUrl}/v1/auth/supabase-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error('Failed to sync auth')
    }
    
    return response.json()
  }
  
  // ... rest of API methods
  // Add await getAuthHeaders() to all API calls
}
```

### Step 7: Create Supabase Auth Strategy (API)

**File: `apps/api/src/auth/supabase.strategy.ts`**
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private supabase;

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SUPABASE_JWT_SECRET,
      algorithms: ['HS256'],
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async validate(payload: any) {
    // Verify token with Supabase
    const { data: { user }, error } = await this.supabase.auth.getUser(payload.sub);
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid Supabase token');
    }

    // Get or create user in our database
    let dbUser = await this.prisma.user.findUnique({
      where: { email: user.email! },
    });

    if (!dbUser) {
      // Create user and default org
      dbUser = await this.prisma.user.create({
        data: { email: user.email! },
      });

      const org = await this.prisma.org.create({
        data: { name: `${user.email}'s Org` },
      });

      await this.prisma.orgMember.create({
        data: {
          userId: dbUser.id,
          orgId: org.id,
          role: 'owner',
        },
      });
    }

    return dbUser;
  }
}
```

### Step 8: Add Supabase Sync Endpoint

**File: `apps/api/src/auth/auth.controller.ts`**
```typescript
@Post('supabase-sync')
@UseGuards(AuthGuard('supabase'))
async supabaseSync(@Req() req: any, @Res() res: Response) {
  // User is already validated and created by SupabaseStrategy
  const user = req.user;
  
  // Generate our own session token for cookie-based auth
  const sessionToken = await this.authService.generateSessionToken(user.id);
  
  // Set session cookie
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('br_session', sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  res.json({ success: true, user });
}
```

### Step 9: Update Auth Module

**File: `apps/api/src/auth/auth.module.ts`**
```typescript
import { SupabaseStrategy } from './supabase.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy,      // Keep for session cookies
    BearerStrategy,   // Keep for PATs
    SupabaseStrategy, // New for Supabase auth
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

### Step 10: Update Auth Guards

**File: `apps/api/src/auth/auth.decorator.ts`** (or create if needed)
```typescript
// Support both Supabase tokens and session cookies
@UseGuards(AuthGuard(['jwt', 'supabase', 'bearer']))
```

### Step 11: Environment Variables

**Production `.env`:**
```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings

# Keep existing for sessions
JWT_SECRET=your-existing-jwt-secret
SECRET_KEY_256=your-existing-encryption-key

# Storage
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=brail-deploys
S3_ACCESS_KEY=[YOUR_KEY]
S3_SECRET_KEY=[YOUR_SECRET]

# URLs
WEB_URL=https://brail.app
PUBLIC_HOST=brail.app
DEV_PUBLIC_BASE=https://api.brail.app
NODE_ENV=production
PORT=3000
```

### Step 12: Update Frontend Environment

**File: `apps/web/.env`**
```bash
NUXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NUXT_PUBLIC_API_URL=https://api.brail.app
```

---

## Testing Checklist

### Phase 1 (Database Only)
- [ ] Local dev works with Supabase DB
- [ ] Existing users can still log in
- [ ] PATs still work for CLI
- [ ] All features functional

### Phase 2 (Supabase Auth)
- [ ] New users can sign up via email
- [ ] Magic links are delivered
- [ ] Users can log in successfully
- [ ] Session persists across refreshes
- [ ] Logout works correctly
- [ ] PATs still work for CLI/API
- [ ] All authenticated endpoints work
- [ ] Team invitations work

---

## Rollback Plan

If anything goes wrong:

1. **Database**: Just change `DATABASE_URL` back to previous DB
2. **Auth**: Remove Supabase auth guards, keep JWT/cookie auth
3. **Quick rollback**: Comment out SupabaseStrategy in auth.module.ts

---

## Benefits After Migration

✅ **Professional email delivery** - No more console logs
✅ **Social login ready** - Add Google, GitHub in minutes
✅ **Better security** - Rate limiting, session management
✅ **MFA support** - Add 2FA easily
✅ **Real-time subscriptions** - Use Supabase real-time if needed
✅ **Managed infrastructure** - Less ops work
✅ **Cost effective** - Free tier covers initial users

---

## Migration Timeline

- **Phase 1 (DB)**: 1 hour
- **Phase 2 (Auth)**: 4-6 hours
- **Testing**: 2 hours
- **Total**: 1 day of focused work

---

## Next Steps After Migration

1. [ ] Add social login (Google, GitHub)
2. [ ] Enable MFA/2FA
3. [ ] Set up Supabase email templates
4. [ ] Configure rate limiting
5. [ ] Add user profile management
6. [ ] Implement billing system (Stripe)

