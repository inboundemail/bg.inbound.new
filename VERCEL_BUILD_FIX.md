# Vercel Build Fix - bg.inbound.new

## Problem
The Vercel build was failing with multiple issues:
1. Missing `lightningcss` native module for Tailwind CSS v4
2. Incompatible Tailwind CSS v4 syntax
3. Missing environment variables causing build-time errors

## Solutions Applied

### 1. Downgraded Tailwind CSS from v4 to v3
**Issue:** Tailwind CSS v4 requires `lightningcss` which has platform-specific native modules that weren't being installed correctly on Vercel.

**Fix:**
- Downgraded from `tailwindcss: ^4.1.11` to `tailwindcss: ^3.4.17`
- Removed `@tailwindcss/postcss: ^4` and `tw-animate-css` dependencies
- Updated `postcss.config.mjs` to use v3 syntax
- Created `tailwind.config.ts` with proper v3 configuration

### 2. Updated CSS to Tailwind v3 Syntax
**Issue:** The `globals.css` was using Tailwind v4's `@import "tailwindcss"` syntax.

**Fix:**
- Changed to v3 directives: `@tailwind base`, `@tailwind components`, `@tailwind utilities`
- Converted CSS variables to work with v3
- Removed v4-specific `@theme` and `@custom-variant` directives

### 3. Fixed Build-Time Environment Variable Errors
**Issue:** Code was checking for environment variables at module level, causing build failures when they weren't available.

**Fix:**
- Made Resend initialization conditional in `/lib/auth.ts`
- Implemented lazy loading for InboundEmail client in `/lib/inbound-email.ts`
- Added null checks before using these services

### 4. Added Missing Dependencies
**Issue:** `@modelcontextprotocol/sdk` was missing but required by `@vercel/mcp-adapter`.

**Fix:**
- Added `@modelcontextprotocol/sdk` to dependencies

## Files Modified

1. **package.json** - Updated dependencies
2. **postcss.config.mjs** - Updated for Tailwind v3
3. **tailwind.config.ts** - Created new v3 configuration
4. **app/globals.css** - Converted to v3 syntax
5. **lib/auth.ts** - Made Resend initialization conditional
6. **lib/inbound-email.ts** - Implemented lazy loading
7. **.npmrc** - Added to ensure proper native module installation

## Environment Variables Required

For production deployment, ensure these environment variables are set in Vercel:

```env
# Required for authentication
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=https://your-domain.com

# Required for email functionality (optional if not using email features)
RESEND_API_KEY=re_xxxxx
INBOUND_API_KEY=your-inbound-api-key
INBOUND_DOMAIN_ID=your-domain-id

# Required for database
DATABASE_URL=postgresql://...

# Required for Cursor API integration
# (Can be set per user in the app, but a default is helpful)
DEFAULT_CURSOR_API_KEY=your-cursor-api-key
```

## Build Commands

The build should now work with standard commands:
```bash
npm install
npm run build
```

## Deployment Notes

1. The build warnings about `BETTER_AUTH_SECRET` are expected during build time
2. Environment variables for external services (Resend, InboundEmail) are only required at runtime
3. The application will gracefully handle missing API keys with appropriate error messages

## Testing

After deployment, test:
1. Basic page loading
2. Authentication flows (if Resend is configured)
3. Cursor API integration (with valid API keys)
4. Email agent creation (if InboundEmail is configured)