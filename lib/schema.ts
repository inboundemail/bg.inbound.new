import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  defaultCursorApiKey: text("default_cursor_api_key"), // Account-wide default Cursor API key
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const emailAgent = pgTable("email_agent", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Used for email prefix: {name}@bg.inbound.new
  githubRepository: text("github_repository").notNull(),
  githubRef: text("github_ref").notNull().$default(() => "main"),
  cursorApiKey: text("cursor_api_key"), // Now optional - can use account default
  model: text("model").notNull().$default(() => "claude-4-sonnet-thinking"),
  autoCreatePr: boolean("auto_create_pr").$default(() => false).notNull(),
  isActive: boolean("is_active").$default(() => true).notNull(),
  // Sender permissions
  allowedDomains: text("allowed_domains"), // JSON array of allowed domains (e.g., ["@company.com", "@gmail.com"])
  allowedEmails: text("allowed_emails"), // JSON array of specific allowed emails
  // InboundEmail integration fields
  inboundEndpointId: text("inbound_endpoint_id"), // InboundEmail endpoint ID
  inboundEmailAddressId: text("inbound_email_address_id"), // InboundEmail address ID
  emailAddress: text("email_address"), // Generated email like name@bg.inbound.new
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ).notNull(),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ).notNull(),
});

export const agentLaunchLog = pgTable("agent_launch_log", {
  id: text("id").primaryKey(),
  emailAgentId: text("email_agent_id")
    .notNull()
    .references(() => emailAgent.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  senderEmail: text("sender_email").notNull(),
  emailSubject: text("email_subject"),
  cursorAgentId: text("cursor_agent_id"), // Null if failed
  status: text("status").notNull(), // 'success', 'failed', 'rejected'
  errorMessage: text("error_message"), // Error details if failed/rejected
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ).notNull(),
});


