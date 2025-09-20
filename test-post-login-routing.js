const { chromium } = require('playwright');

async function testPostLoginRouting() {
  console.log('🚀 Testing post-login routing behavior...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300  // Slower for easier observation
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Collect console messages from the page
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    // Print important logs in real-time
    if (msg.text().includes('🎯') || msg.text().includes('Auth:') || msg.text().includes('New user') || 
        msg.text().includes('initial view') || msg.text().includes('trips loaded') || 
        msg.text().includes('landing') || msg.text().includes('list')) {
      console.log('PAGE LOG:', logEntry);
    }
  });

  try {
    console.log('1. 🌐 Navigating to localhost:3000 and clearing storage');
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('2. 📷 Taking screenshot of login page');
    await page.screenshot({ path: 'login-test-1-login-page.png', fullPage: true });
    
    console.log('3. 📧 Testing email authentication flow');
    
    // Click "Continue with Email" button
    await page.click('button:has-text("Continue with Email")');
    await page.waitForTimeout(1000);
    
    console.log('4. 📝 Filling out signup form for new user');
    // Fill out the email and password fields for signup
    await page.fill('input[type="email"]', 'test.newuser@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Make sure we're in signup mode
    const isSignupMode = await page.isVisible('button:has-text("Sign Up")');
    if (!isSignupMode) {
      console.log('Switching to signup mode...');
      await page.click('button:has-text("Need an account? Sign up")');
      await page.waitForTimeout(500);
    }
    
    console.log('5. 📷 Taking screenshot before signup attempt');
    await page.screenshot({ path: 'login-test-2-before-signup.png', fullPage: true });
    
    // Try to submit the form
    console.log('6. 🔑 Attempting signup...');
    await page.click('button[type="submit"]');
    
    // Wait and observe what happens
    await page.waitForTimeout(5000);
    
    console.log('7. 📊 Analyzing post-authentication state');
    
    // Check the current state
    const postAuthState = await page.evaluate(() => {
      const body = document.body;
      const content = body.textContent || '';
      
      // Check for specific page indicators
      const indicators = {
        hasLandingContent: content.includes('Willkommen bei Trailkeeper') || content.includes('Welcome to Trailkeeper') || content.includes('Entdecke neue Reiseziele') || content.includes('travel suggestions'),
        hasTimelineContent: content.includes('Timeline') || content.includes('Zeitleiste') || content.includes('Enhanced Timeline'),
        hasMapContent: content.includes('Karte') || content.includes('Map View'),
        hasListContent: content.includes('Liste') || content.includes('Reiseziele') || content.includes('destinations') && !content.includes('Entdecke neue Reiseziele'),
        hasLoginContent: content.includes('Login') || content.includes('Anmelden') || content.includes('Sign in') || content.includes('Continue with Google'),
        hasErrorContent: content.includes('Error') || content.includes('Fehler') || content.includes('Invalid') || content.includes('Failed'),
        hasSuccessMessage: content.includes('success') || content.includes('erfolgreich') || content.includes('welcome'),
        hasEmailConfirmation: content.includes('email') && content.includes('confirm')
      };
      
      // Get localStorage content
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            storage[key] = JSON.parse(localStorage.getItem(key) || '{}');
          } catch (e) {
            storage[key] = localStorage.getItem(key);
          }
        }
      }
      
      return {
        indicators,
        storage,
        url: window.location.href,
        bodyTextSample: content.substring(0, 500),
        title: document.title
      };
    });
    
    console.log('📊 Post-Authentication Analysis:');
    console.log('  🎯 Indicators:', JSON.stringify(postAuthState.indicators, null, 2));
    console.log('  🗃️ LocalStorage keys:', Object.keys(postAuthState.storage));
    console.log('  🌐 Current URL:', postAuthState.url);
    console.log('  📄 Page title:', postAuthState.title);
    console.log('  📝 Body text sample:', postAuthState.bodyTextSample.substring(0, 200));
    
    // Determine what view is currently showing
    let currentView = 'unknown';
    if (postAuthState.indicators.hasLandingContent) currentView = 'landing';
    else if (postAuthState.indicators.hasTimelineContent) currentView = 'timeline';
    else if (postAuthState.indicators.hasMapContent) currentView = 'map';
    else if (postAuthState.indicators.hasListContent) currentView = 'list';
    else if (postAuthState.indicators.hasLoginContent) currentView = 'login';
    else if (postAuthState.indicators.hasErrorContent) currentView = 'error';
    else if (postAuthState.indicators.hasEmailConfirmation) currentView = 'email-confirmation';
    
    console.log('🎯 CURRENT VIEW DETECTED:', currentView);
    
    console.log('8. 📷 Taking final screenshot');
    await page.screenshot({ path: 'login-test-3-post-auth.png', fullPage: true });
    
    // If still on login, try with existing user
    if (currentView === 'login' || currentView === 'error') {
      console.log('9. 🔄 Trying login with existing user...');
      
      // Switch to login mode
      const needToSwitchToLogin = await page.isVisible('button:has-text("Already have an account? Sign in")');
      if (needToSwitchToLogin) {
        await page.click('button:has-text("Already have an account? Sign in")');
        await page.waitForTimeout(500);
      }
      
      // Clear fields and try a different approach
      await page.fill('input[type="email"]', 'existing.user@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      console.log('10. 🔑 Attempting login...');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      const finalState = await page.evaluate(() => {
        const content = document.body.textContent || '';
        return {
          url: window.location.href,
          hasLanding: content.includes('Willkommen bei Trailkeeper') || content.includes('Entdecke neue Reiseziele'),
          hasLogin: content.includes('Continue with Google'),
          bodyText: content.substring(0, 300)
        };
      });
      
      console.log('🔍 Final state after login attempt:', finalState);
      await page.screenshot({ path: 'login-test-4-final-attempt.png', fullPage: true });
    }
    
    // Print all console logs from the page
    console.log('\n📋 RELEVANT CONSOLE LOGS:');
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('🎯') || log.includes('Auth:') || log.includes('New user') || 
      log.includes('initial view') || log.includes('trips loaded') || 
      log.includes('landing') || log.includes('list') || log.includes('Error')
    );
    relevantLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });
    
    // Final routing analysis
    console.log('\n🔍 ROUTING ANALYSIS:');
    if (currentView === 'landing') {
      console.log('✅ SUCCESS: User correctly routed to landing page (expected for new users)');
    } else if (currentView === 'list' || currentView === 'timeline') {
      console.log('❌ POTENTIAL ISSUE: User routed to', currentView, '- this might be incorrect for a new user');
      console.log('💡 Expected behavior: New users should see landing page with travel suggestions');
    } else if (currentView === 'login') {
      console.log('⚠️ AUTHENTICATION ISSUE: Still on login page - authentication may have failed');
    } else if (currentView === 'email-confirmation') {
      console.log('📧 EMAIL CONFIRMATION: User needs to confirm email before proceeding');
    } else {
      console.log('❓ UNKNOWN STATE: Unexpected view state detected');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'login-test-error.png', fullPage: true });
  } finally {
    console.log('🔚 Closing browser...');
    await browser.close();
  }
}

testPostLoginRouting().catch(console.error);