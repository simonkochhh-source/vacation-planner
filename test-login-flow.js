const { chromium } = require('playwright');

async function testLoginFlow() {
  console.log('🚀 Starting comprehensive login flow test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Add delay to see what's happening
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
    if (msg.text().includes('🎯') || msg.text().includes('Auth:') || msg.text().includes('New user') || msg.text().includes('placeholder')) {
      console.log('PAGE LOG:', logEntry);
    }
  });

  try {
    console.log('1. 🌐 Navigating to localhost:3000');
    await page.goto('http://localhost:3000');
    
    console.log('2. 🧹 Clearing browser storage to simulate completely new user');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Also clear any IndexedDB or other storage
      if (window.indexedDB && window.indexedDB.databases) {
        window.indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
    });
    
    // Refresh to ensure clean state
    console.log('3. 🔄 Refreshing page for clean state');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('4. 📷 Taking initial screenshot');
    await page.screenshot({ path: 'test-1-initial-page.png', fullPage: true });
    
    // Check authentication state
    const authInfo = await page.evaluate(() => {
      return {
        hasUser: !!window.localStorage.getItem('supabase.auth.token'),
        isPlaceholder: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50)
      };
    });
    console.log('🔐 Auth state:', authInfo);
    
    // Wait for React to initialize and check for login elements
    console.log('5. 🔍 Checking for authentication elements');
    await page.waitForTimeout(2000);
    
    // More comprehensive check for login elements
    const loginElements = await page.evaluate(() => {
      const selectors = [
        'button:contains("Login")',
        'button:contains("Anmelden")', 
        'a:contains("Login")',
        'a:contains("Anmelden")',
        'button[type="submit"]',
        '.login-button',
        '[data-testid*="login"]'
      ];
      
      const foundElements = [];
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements.push({
              selector,
              count: elements.length,
              text: Array.from(elements).map(el => el.textContent?.substring(0, 50))
            });
          }
        } catch (e) {
          // Ignore invalid selectors
        }
      });
      
      return {
        foundElements,
        bodyText: document.body.textContent?.substring(0, 500),
        loginVisible: document.body.textContent?.includes('Login') || document.body.textContent?.includes('Anmelden')
      };
    });
    
    console.log('🔍 Login elements search result:', JSON.stringify(loginElements, null, 2));
    
    // Check the page title and main content
    const pageTitle = await page.title();
    console.log('📄 Page title:', pageTitle);
    
    // Wait for the app to fully initialize and check view state
    console.log('6. ⏳ Waiting for app initialization (8 seconds)...');
    await page.waitForTimeout(8000);
    
    // Check current view and app state
    const appState = await page.evaluate(() => {
      const body = document.body;
      const content = body.textContent || '';
      
      // Check for specific page indicators
      const indicators = {
        hasLandingContent: content.includes('Willkommen bei Trailkeeper') || content.includes('Welcome to Trailkeeper') || content.includes('Entdecke neue Reiseziele'),
        hasTimelineContent: content.includes('Timeline') || content.includes('Zeitleiste') || content.includes('Enhanced Timeline'),
        hasMapContent: content.includes('Karte') || content.includes('Map View'),
        hasListContent: content.includes('Liste') || content.includes('Reiseziele') || content.includes('destinations'),
        hasLoginContent: content.includes('Login') || content.includes('Anmelden') || content.includes('Sign in'),
        hasErrorContent: content.includes('Error') || content.includes('Fehler')
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
        bodyTextSample: content.substring(0, 300)
      };
    });
    
    console.log('📊 App State Analysis:');
    console.log('  🎯 Indicators:', JSON.stringify(appState.indicators, null, 2));
    console.log('  🗃️ LocalStorage keys:', Object.keys(appState.storage));
    console.log('  🌐 Current URL:', appState.url);
    console.log('  📝 Body text sample:', appState.bodyTextSample);
    
    // Determine what view is currently showing
    let currentView = 'unknown';
    if (appState.indicators.hasLandingContent) currentView = 'landing';
    else if (appState.indicators.hasTimelineContent) currentView = 'timeline';
    else if (appState.indicators.hasMapContent) currentView = 'map';
    else if (appState.indicators.hasListContent) currentView = 'list';
    else if (appState.indicators.hasLoginContent) currentView = 'login';
    else if (appState.indicators.hasErrorContent) currentView = 'error';
    
    console.log('🎯 CURRENT VIEW DETECTED:', currentView);
    
    // Check if trips exist in localStorage or state
    const uiState = appState.storage['vacation-planner-ui-state'];
    const trips = appState.storage['vacation-planner-trips'];
    console.log('📊 UI State:', uiState);
    console.log('🧳 Trips:', Array.isArray(trips) ? `${trips.length} trips` : trips);
    
    console.log('7. 📷 Taking final state screenshot');
    await page.screenshot({ path: 'test-2-final-state.png', fullPage: true });
    
    // Print all console logs from the page
    console.log('\n📋 ALL CONSOLE LOGS FROM PAGE:');
    consoleLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });
    
    // Test scenario analysis
    console.log('\n🔍 SCENARIO ANALYSIS:');
    if (currentView === 'landing') {
      console.log('✅ SUCCESS: New user correctly routed to landing page');
    } else if (currentView === 'timeline' || currentView === 'list') {
      console.log('❌ ISSUE: New user incorrectly routed to', currentView, 'instead of landing page');
    } else if (currentView === 'login') {
      console.log('⚠️ UNEXPECTED: Still showing login page - authentication may not be working');
    } else {
      console.log('❓ UNKNOWN: Unexpected view state detected');
    }
    
    // Test logo navigation to landing page
    console.log('\n8. 🏠 Testing logo navigation to landing page');
    const logoElement = await page.locator('h1:has-text("Trailkeeper"), .logo, [data-testid="logo"]').first();
    const logoExists = await logoElement.isVisible().catch(() => false);
    
    if (logoExists) {
      console.log('🔗 Logo found, clicking...');
      await logoElement.click();
      await page.waitForTimeout(2000);
      
      const afterLogoClick = await page.evaluate(() => {
        const content = document.body.textContent || '';
        return {
          hasLandingContent: content.includes('Willkommen bei Trailkeeper') || content.includes('Welcome to Trailkeeper') || content.includes('Entdecke neue Reiseziele'),
          url: window.location.href,
          bodyTextSample: content.substring(0, 200)
        };
      });
      
      console.log('🏠 After logo click:', afterLogoClick);
      await page.screenshot({ path: 'test-3-after-logo-click.png', fullPage: true });
    } else {
      console.log('❌ Logo not found or not clickable');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'test-error-state.png', fullPage: true });
  } finally {
    console.log('🔚 Closing browser...');
    await browser.close();
  }
}

testLoginFlow().catch(console.error);