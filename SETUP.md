# Better Auth Setup Guide with Drizzle ORM

This project uses Better Auth with Drizzle ORM and magic link authentication.

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Neon Postgres Database
DATABASE_URL=postgresql://username:password@your-neon-host.neon.tech/your-database-name?sslmode=require

# Email Configuration for Magic Links
RESEND_API_KEY=your-resend-api-key
```

## Generate Secret Key

Generate a secure secret key using one of these methods:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Resend Email Setup

1. Go to [Resend](https://resend.com) and create an account
2. Create an API key in your dashboard
3. Add your API key to the `.env.local` file
4. Configure your domain (optional, you can use the default resend domain for testing)

## Database Setup with Drizzle

1. Create a Neon Postgres database at [neon.tech](https://neon.tech)
2. Copy your connection string
3. Generate the Better Auth schema for Drizzle:

```bash
# Generate Drizzle schema for Better Auth tables
bunx @better-auth/cli generate

# This will create/update lib/schema.ts with the necessary tables
```

4. Push the schema to your database:

```bash
# Push schema to database
bunx drizzle-kit push

# Or generate and run migrations
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

## Running the Application

```bash
# Install dependencies
bun install

# Run development server
bun dev
```

## Drizzle Studio (Database GUI)

To view and manage your database:

```bash
bunx drizzle-kit studio
```

## Available Routes

- `/` - Landing page with sign-in button
- `/signin` - Magic link sign-in page
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/auth/*` - Better Auth API endpoints

## Features

- ✅ Magic link authentication
- ✅ Session management
- ✅ Protected routes
- ✅ Modern UI with shadcn/ui
- ✅ TypeScript support
- ✅ Neon Postgres database with Drizzle ORM
- ✅ Type-safe database queries
- ✅ Database migrations with Drizzle Kit

## Project Structure

```
lib/
├── auth.ts          # Better Auth configuration with magic link provider
├── auth-client.ts   # Client-side auth utilities
├── db.ts           # Drizzle database instance
└── schema.ts       # Database schema
```

## Authentication Flow

1. User enters their email address
2. Magic link is sent to their email via Resend
3. User clicks the magic link in their email
4. User is automatically signed in and redirected to the dashboard
5. Better Auth creates a session
6. User can now access protected routes 