#!/usr/bin/env node

/**
 * Supabase Connection Validator
 * Run with: node scripts/validate-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

const pass = (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`);
const fail = (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`);
const warn = (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
const info = (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
const header = (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}`);

async function validateSupabase() {
  console.log('\n🔍 Supabase Connection Validator\n');

  let passCount = 0;
  let failCount = 0;

  // ═══════════════════════════════════════════════════════════
  header('1. Environment Variables');
  // ═══════════════════════════════════════════════════════════

  // Check SUPABASE_URL
  if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
    fail('NEXT_PUBLIC_SUPABASE_URL is not set or using placeholder');
    failCount++;
  } else if (!SUPABASE_URL.includes('supabase.co')) {
    warn(`NEXT_PUBLIC_SUPABASE_URL may be invalid: ${SUPABASE_URL}`);
    failCount++;
  } else {
    pass(`NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL.substring(0, 40)}...`);
    passCount++;
  }

  // Check ANON_KEY (supports both legacy JWT format and new sb_publishable_ format)
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('placeholder')) {
    fail('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set or using placeholder');
    failCount++;
  } else if (!SUPABASE_ANON_KEY.startsWith('eyJ') && !SUPABASE_ANON_KEY.startsWith('sb_publishable_')) {
    warn('NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid key (expected JWT or sb_publishable_)');
    failCount++;
  } else {
    const keyType = SUPABASE_ANON_KEY.startsWith('sb_publishable_') ? '(new format)' : '(JWT)';
    pass(`NEXT_PUBLIC_SUPABASE_ANON_KEY ${keyType}: ${SUPABASE_ANON_KEY.substring(0, 25)}...`);
    passCount++;
  }

  // Check SERVICE_KEY (optional but recommended)
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('placeholder')) {
    warn('SUPABASE_SERVICE_KEY not set (optional, needed for admin operations)');
  } else {
    pass(`SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
    passCount++;
  }

  // Stop if no valid credentials
  if (failCount > 0) {
    console.log(`\n${colors.red}Cannot continue without valid Supabase credentials.${colors.reset}`);
    console.log(`\nUpdate your .env.local file with credentials from:`);
    console.log(`${colors.dim}Supabase Dashboard → Settings → API${colors.reset}\n`);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  header('2. Supabase Connection');
  // ═══════════════════════════════════════════════════════════

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Test basic connection with a simple query
    const { error } = await supabase.from('organizations').select('count').limit(1);

    if (error && error.code === '42P01') {
      fail('Connection works but tables not created');
      info('Run the migration: supabase/migrations/001_initial_schema.sql');
      failCount++;
    } else if (error) {
      fail(`Connection error: ${error.message}`);
      failCount++;
    } else {
      pass('Connected to Supabase successfully');
      passCount++;
    }
  } catch (err) {
    fail(`Connection failed: ${err.message}`);
    failCount++;
  }

  // ═══════════════════════════════════════════════════════════
  header('3. Database Tables');
  // ═══════════════════════════════════════════════════════════

  const requiredTables = ['organizations', 'events', 'attendees', 'responses', 'matches'];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);

      if (error && error.code === '42P01') {
        fail(`Table '${table}' does not exist`);
        failCount++;
      } else if (error && error.code === '42501') {
        // Permission denied but table exists
        pass(`Table '${table}' exists (RLS enabled)`);
        passCount++;
      } else if (error) {
        warn(`Table '${table}': ${error.message}`);
      } else {
        pass(`Table '${table}' exists and accessible`);
        passCount++;
      }
    } catch (err) {
      fail(`Error checking '${table}': ${err.message}`);
      failCount++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  header('4. Auth Configuration');
  // ═══════════════════════════════════════════════════════════

  try {
    // Test auth endpoint
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      fail(`Auth error: ${error.message}`);
      failCount++;
    } else {
      pass('Auth endpoint responding');
      passCount++;

      if (data?.session) {
        info(`Active session found for: ${data.session.user.email}`);
      } else {
        info('No active session (expected for new setup)');
      }
    }
  } catch (err) {
    fail(`Auth check failed: ${err.message}`);
    failCount++;
  }

  // ═══════════════════════════════════════════════════════════
  header('5. pgvector Extension');
  // ═══════════════════════════════════════════════════════════

  try {
    // Check if vector extension is enabled by checking responses table structure
    const { data, error } = await supabase
      .from('responses')
      .select('embedding')
      .limit(1);

    if (error && error.message.includes('vector')) {
      fail('pgvector extension may not be enabled');
      info('Run in SQL Editor: CREATE EXTENSION IF NOT EXISTS vector;');
      failCount++;
    } else if (error && error.code === '42P01') {
      warn('Cannot check pgvector - responses table missing');
    } else {
      pass('pgvector extension appears to be working');
      passCount++;
    }
  } catch (err) {
    warn(`Could not verify pgvector: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════
  header('Results');
  // ═══════════════════════════════════════════════════════════

  console.log(`\n${colors.green}Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);

  if (failCount === 0) {
    console.log(`\n${colors.green}🎉 All checks passed! Supabase is ready.${colors.reset}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Start the dev server: ${colors.dim}npm run dev${colors.reset}`);
    console.log(`  2. Open: ${colors.dim}http://localhost:3000/signup${colors.reset}`);
    console.log(`  3. Create a test account and explore!\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}Some checks failed. Please fix the issues above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run validation
validateSupabase().catch(console.error);
