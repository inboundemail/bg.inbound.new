# Cursor Background Agent by Inbound

Send an email → Get a pull request. AI-powered code automation via email.

## Features

### 📧 Email → Cursor Agent
- Create email addresses that trigger AI coding agents
- Natural language instructions in email body
- Automatic PR creation

### 🔌 MCP for Cursor
Full Model Context Protocol integration with tools to create, list, monitor, and delete background agents.

## How It Works

1. **Create Agent**: Set up email address linked to your GitHub repo
2. **Send Email**: Email instructions to your agent
3. **Get PR**: AI implements changes and creates pull request

## Quick Start

```bash
bun install
bun run db:push
bun dev
```

See [SETUP.md](./SETUP.md) for environment setup.

## Tech Stack

Next.js 15 • TypeScript • PostgreSQL • Drizzle ORM • InboundEmail • Cursor API • MCP

## Use Cases

- "Add dark mode to settings"
- "Fix login redirect bug"
- "Convert to TypeScript"
- "Add unit tests"

## Security

- Magic link auth
- Encrypted API keys
- Email domain restrictions
- Full audit logging
