import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For development, we'll provide a fallback or better error message
if (!process.env.DATABASE_URL) {
  console.log("⚠️  DATABASE_URL not found in environment variables.");
  console.log("📋 For development, you have a few options:");
  console.log("1. Sign up for a free Neon database at https://neon.tech");
  console.log("2. Set up a local PostgreSQL database");
  console.log("3. Use a cloud PostgreSQL service like Supabase or Railway");
  console.log("");
  console.log("💡 Quick setup with Neon (recommended for development):");
  console.log("   - Go to https://neon.tech");
  console.log("   - Create a free account");
  console.log("   - Create a new project");
  console.log("   - Copy the connection string to your .env file");
  console.log("");
  
  // Provide a mock database URL for development
  process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock_db";
  console.log("🔧 Using mock database for development. Some features may not work.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
