import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, mcp } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./schema";
import { Resend } from "resend";

// Initialize Resend only if API key is available
// During build time, this might not be available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: process.env.BETTER_AUTH_URL || "https://development.exon.dev",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        if (!resend) {
          console.error('Resend API key not configured');
          throw new Error('Email service not configured');
        }
        await resend.emails.send({
          from: "noreply@inbound.new",
          to: email,
          subject: "Sign in to bg.inbound",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to BG by Inbound</h2>
              <p>Click the link below to sign in to your account:</p>
              <a href="${url}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign In</a>
              <p>This link will expire in 5 minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
      expiresIn: 300, // 5 minutes (default)
    }),
    mcp({
      loginPage: "/signin" // path to your login page
    })
  ],
  emailVerification: {
    sendVerificationEmail: async (data, request) => {
      const { user, url, token } = data;
      
      if (!resend) {
        console.error('Resend API key not configured');
        throw new Error('Email service not configured');
      }
      await resend.emails.send({
        from: "noreply@inbound.new",
        to: user.email,
        subject: "Verify your email for Clack",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify your email for Clack</h2>
            <p>Click the link below to verify your email address:</p>
            <a href="${url}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
  },
  trustedOrigins: ["https://development.exon.dev"],
}); 