#!/usr/bin/env node

/**
 * OAuth Flow Test Script
 * Tests the Google OAuth integration for Development environment
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

console.log('🧪 OAUTH FLOW TEST - DEVELOPMENT ENVIRONMENT');
console.log('='.repeat(50));

// Test Configuration
const CONFIG = {
  appUrl: 'http://localhost:3001',
  supabaseUrl: 'https://lsztvtauiapnhqplapgb.supabase.co',
  environment: 'development'
};

console.log('📊 Test Configuration:');
console.log(`   App URL: ${CONFIG.appUrl}`);
console.log(`   Database: ${CONFIG.supabaseUrl}`);
console.log(`   Environment: ${CONFIG.environment}`);
console.log('');

// Test 1: App Availability
async function testAppAvailability() {
  return new Promise((resolve) => {
    console.log('🔍 Test 1: App Availability...');
    
    const req = http.get(CONFIG.appUrl, (res) => {
      const success = res.statusCode === 200;
      console.log(`   Status: ${res.statusCode} ${success ? '✅' : '❌'}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      resolve(success);
    });
    
    req.on('error', (err) => {
      console.log(`   Error: ${err.message} ❌`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('   Timeout ❌');
      req.abort();
      resolve(false);
    });
  });
}

// Test 2: Supabase Connection
async function testSupabaseConnection() {
  return new Promise((resolve) => {
    console.log('🔍 Test 2: Supabase Database Connection...');
    
    const url = new URL('/rest/v1/', CONFIG.supabaseUrl);
    
    const req = https.get(url.toString(), (res) => {
      const success = res.statusCode < 500; // Accept 401/403 as valid connection
      console.log(`   Status: ${res.statusCode} ${success ? '✅' : '❌'}`);
      console.log(`   Database URL: ${CONFIG.supabaseUrl}`);
      resolve(success);
    });
    
    req.on('error', (err) => {
      console.log(`   Error: ${err.message} ❌`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('   Timeout ❌');
      req.abort();
      resolve(false);
    });
  });
}

// Test 3: OAuth Configuration Check
async function testOAuthConfig() {
  console.log('🔍 Test 3: OAuth Configuration...');
  console.log('   ⚠️  Manual check required in Supabase Dashboard:');
  console.log(`   📱 https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/auth/providers`);
  console.log('   ✅ Google Provider: Enable + Configure');
  console.log('   ✅ Redirect URLs: http://localhost:3001/auth/callback');
  console.log('   ✅ Site URL: http://localhost:3001');
  return true;
}

// Run All Tests
async function runTests() {
  console.log('🚀 Starting OAuth Flow Tests...\n');
  
  const results = {
    app: await testAppAvailability(),
    database: await testSupabaseConnection(),
    oauth: await testOAuthConfig()
  };
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('='.repeat(30));
  console.log(`App Availability: ${results.app ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OAuth Config: ${results.oauth ? '⚠️  MANUAL CHECK' : '❌ FAIL'}`);
  
  const overallSuccess = results.app && results.database;
  
  console.log('\n🎯 NEXT STEPS:');
  if (overallSuccess) {
    console.log('✅ Technical setup is ready!');
    console.log('🔧 Manual OAuth configuration needed in Supabase Dashboard');
    console.log('🧪 Ready for browser testing!');
  } else {
    console.log('❌ Technical issues need to be resolved first');
  }
  
  console.log('\n🌐 BROWSER TEST INSTRUCTIONS:');
  console.log('1. Open: http://localhost:3001');
  console.log('2. Click "Continue with Google"');
  console.log('3. Complete OAuth flow');
  console.log('4. Verify successful dashboard access');
  console.log('5. Check browser console for auth logs');
  
  return overallSuccess;
}

// Execute Tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };