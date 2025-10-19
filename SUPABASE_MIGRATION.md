# 🗄️ Supabase Migration Guide for Brail

## Current Authentication System

Brail currently uses a **custom authentication system** with:
- Magic link authentication
- JWT session tokens
- Custom User model in Prisma
- Organization-based multi-tenancy

## Migration Options

### Option A: Keep Current Auth + Use Supabase Database Only (Recommended)

**Pros:**
- ✅ Minimal changes required
- ✅ Keep existing auth flow
- ✅ Faster migration
- ✅ No breaking changes

**Cons:**
- ❌ Miss Supabase Auth features (social login, etc.)
- ❌ Manual auth management

### Option B: Full Supabase Auth Migration

**Pros:**
- ✅ Built-in social authentication
- ✅ Better security features
- ✅ Row Level Security (RLS)
- ✅ Real-time subscriptions

**Cons:**
- ❌ Major refactoring required
- ❌ Breaking changes to auth flow
- ❌ More complex migration

## Option A: Database-Only Migration (Recommended)

### 1. Update Prisma Schema for Supabase

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Supabase URL
}
```

### 2. Environment Variables

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Keep existing auth system
JWT_SECRET=[YOUR_JWT_SECRET]
```

### 3. Migration Steps

```bash
# 1. Update DATABASE_URL in apps/api/.env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# 2. Run migrations
cd apps/api
pnpm prisma migrate deploy

# 3. Generate Prisma client
pnpm prisma generate
```

### 4. Test Migration

```bash
# Test database connection
pnpm prisma studio

# Test API endpoints
curl http://localhost:3000/v1/auth/me
```

## Option B: Full Supabase Auth Migration

### 1. Install Supabase Client

```bash
cd apps/api
pnpm add @supabase/supabase-js
```

### 2. Update Auth Service

```typescript
// apps/api/src/auth/supabase-auth.service.ts
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  async verifyToken(token: string) {
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error) throw new UnauthorizedException('Invalid token');
    return user;
  }
}
```

### 3. Update Prisma Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  supabaseId String? @unique // Link to Supabase auth.users
  createdAt DateTime @default(now())

  // Relations
  orgMembers OrgMember[]
  tokens     Token[]
}
```

### 4. Migration Script

```typescript
// scripts/migrate-to-supabase-auth.ts
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

async function migrateUsers() {
  const prisma = new PrismaClient();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const users = await prisma.user.findMany();
  
  for (const user of users) {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
    });

    if (!error) {
      // Update Prisma user with Supabase ID
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: data.user.id }
      });
    }
  }
}
```

## Recommended Approach: Option A

For the initial SaaS launch, I recommend **Option A** because:

1. **Faster to market** - No auth system changes
2. **Proven system** - Current auth works well
3. **Less risk** - No breaking changes
4. **Easy to upgrade later** - Can migrate to Supabase Auth later

## Migration Checklist

### Database Migration (Option A)
- [ ] Create Supabase project
- [ ] Update DATABASE_URL
- [ ] Run `pnpm prisma migrate deploy`
- [ ] Test database connection
- [ ] Verify all tables created
- [ ] Test API endpoints

### Full Auth Migration (Option B)
- [ ] Install Supabase client
- [ ] Create Supabase project with Auth enabled
- [ ] Update auth service
- [ ] Create migration script
- [ ] Update frontend auth flow
- [ ] Test authentication
- [ ] Update documentation

## Post-Migration

### Option A Benefits
- ✅ Production-ready database
- ✅ Scalable PostgreSQL
- ✅ Real-time capabilities (if needed)
- ✅ Easy backup/restore

### Option B Benefits
- ✅ Social authentication
- ✅ Better security
- ✅ Row Level Security
- ✅ Built-in user management

## Next Steps

1. **Choose migration approach** (A or B)
2. **Set up Supabase project**
3. **Update environment variables**
4. **Run database migrations**
5. **Test thoroughly**
6. **Deploy to production**

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
