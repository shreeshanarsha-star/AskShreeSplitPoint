// scripts/fix-supabase-auth.mjs
// Automated fix for Supabase GoTrue scan error and Site URL configuration

import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "pesqeykpspvjqwljeubc";
const SUPABASE_URL = "https://pesqeykpspvjqwljeubc.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlc3FleWtwc3B2anF3bGpldWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODAyODE0NiwiZXhwIjoyMTAzNjA0MTQ2fQ.h2kDlv9OSupCAx36ttUIXOhNgO4vJ_XOhpc2PmZwK2w";

const token = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Usage: node scripts/fix-supabase-auth.mjs <SUPABASE_ACCESS_TOKEN>");
  process.exit(1);
}

async function run() {
  console.log("⚡ 1. Updating Site URL and Allowed Redirect URIs via Management API...");
  const authConfigRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site_url: "https://www.askshree.com",
      uri_allow_list: "https://www.askshree.com/**,http://localhost:3000/**",
    }),
  });

  const authConfigText = await authConfigRes.text();
  console.log(`Auth config status: ${authConfigRes.status}`, authConfigText.slice(0, 150));

  console.log("\n⚡ 2. Executing SQL to sanitize null tokens in auth.users...");
  const sql = `
    UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
    UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
    UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
    UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
    UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
  `;

  const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const sqlText = await sqlRes.text();
  console.log(`SQL execution status: ${sqlRes.status}`, sqlText.slice(0, 150));

  console.log("\n⚡ 3. Verifying GoTrue health with Supabase Service Role Key...");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("❌ GoTrue still returned error:", error);
  } else {
    console.log(`✅ Success! GoTrue scanned auth.users cleanly. Found ${data.users.length} users.`);
    for (const u of data.users) {
      console.log(`   - ${u.email} (${u.id})`);
    }
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
