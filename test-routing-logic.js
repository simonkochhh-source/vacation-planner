const { chromium } = require('playwright');

async function testRoutingLogic() {
  console.log('🚀 Testing routing logic with simulated authentication...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
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
        msg.text().includes('landing') || msg.text().includes('list') || 
        msg.text().includes('placeholder') || msg.text().includes('AppContext')) {
      console.log('PAGE LOG:', logEntry);
    }
  });

  try {
    console.log('1. 🌐 Navigating to localhost:3000');
    await page.goto('http://localhost:3000');
    
    console.log('2. 🧹 Clearing storage completely for new user simulation');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('3. 🔧 Temporarily overriding environment to use placeholder credentials');
    // Override the environment variables in the page context
    await page.addInitScript(() => {
      // Override Supabase credentials to use placeholders
      Object.defineProperty(window, '__SUPABASE_TEST_OVERRIDE__', {
        value: true,
        writable: false
      });
      
      // Mock the environment variables
      if (!window.process) {
        window.process = { env: {} };
      }
      window.process.env.REACT_APP_SUPABASE_URL = 'your-project-ref';
      window.process.env.REACT_APP_SUPABASE_ANON_KEY = 'your_supabase_anon_key';
    });
    
    console.log('4. 🔄 Reloading to trigger placeholder credential detection');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for React to initialize
    await page.waitForTimeout(3000);
    
    console.log('5. 📷 Taking screenshot after override');
    await page.screenshot({ path: 'routing-test-1-after-override.png', fullPage: true });
    
    console.log('6. ⏳ Waiting for app initialization and routing logic...');
    await page.waitForTimeout(8000);
    
    console.log('7. 📊 Analyzing routing behavior');
    
    const appState = await page.evaluate(() => {
      const body = document.body;
      const content = body.textContent || '';
      
      // Check for specific page indicators
      const indicators = {
        hasLandingContent: content.includes('Willkommen bei Trailkeeper') || content.includes('Welcome to Trailkeeper') || content.includes('Entdecke neue Reiseziele') || content.includes('travel suggestions') || content.includes('Create your first trip'),
        hasTimelineContent: content.includes('Timeline') || content.includes('Zeitleiste') || content.includes('Enhanced Timeline'),
        hasMapContent: content.includes('Karte') || content.includes('Map View'),
        hasListContent: content.includes('Liste') || content.includes('destinations') && !content.includes('Entdecke neue Reiseziele') && !content.includes('travel suggestions'),
        hasLoginContent: content.includes('Login') || content.includes('Anmelden') || content.includes('Sign in') || content.includes('Continue with Google'),
        hasErrorContent: content.includes('Error') || content.includes('Fehler'),
        hasPlaceholderMode: content.includes('Demo Mode') || content.includes('placeholder')
      };
      
      // Get localStorage content
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            storage[key] = value ? JSON.parse(value) : value;
          } catch (e) {
            storage[key] = localStorage.getItem(key);
          }
        }
      }
      
      return {
        indicators,
        storage,
        url: window.location.href,
        bodyTextSample: content.substring(0, 800),
        title: document.title
      };
    });
    
    console.log('📊 Routing Analysis Results:');
    console.log('  🎯 Content Indicators:', JSON.stringify(appState.indicators, null, 2));
    console.log('  🗃️ LocalStorage keys:', Object.keys(appState.storage));
    
    // Check UI state and trips data
    const uiState = appState.storage['vacation-planner-ui-state'];
    const trips = appState.storage['vacation-planner-trips'];
    
    console.log('  📊 UI State:', uiState ? `currentView: ${uiState.currentView}` : 'No UI state');
    console.log('  🧳 Trips:', Array.isArray(trips) ? `${trips.length} trips found` : trips || 'No trips');
    
    console.log('  🌐 Current URL:', appState.url);
    console.log('  📄 Page title:', appState.title);
    console.log('  📝 Body text sample:');
    console.log('    ', appState.bodyTextSample.substring(0, 300).replace(/\n/g, ' '));
    
    // Determine what view is currently showing
    let currentView = 'unknown';
    if (appState.indicators.hasLandingContent) currentView = 'landing';
    else if (appState.indicators.hasTimelineContent) currentView = 'timeline';
    else if (appState.indicators.hasMapContent) currentView = 'map';
    else if (appState.indicators.hasListContent) currentView = 'list';
    else if (appState.indicators.hasLoginContent) currentView = 'login';
    else if (appState.indicators.hasErrorContent) currentView = 'error';
    
    console.log('🎯 DETECTED VIEW:', currentView);
    
    console.log('8. 📷 Taking final screenshot');
    await page.screenshot({ path: 'routing-test-2-final-state.png', fullPage: true });
    
    // Test clicking on specific navigation elements to verify routing
    console.log('\n9. 🧪 Testing navigation routing:');
    
    // Try clicking logo to navigate to landing page
    const logoElement = await page.locator('h1:has-text("Trailkeeper"), .logo, a:has-text("Trailkeeper")').first();
    const logoExists = await logoElement.isVisible().catch(() => false);
    
    if (logoExists) {
      console.log('   🏠 Testing logo click -> landing page');
      await logoElement.click();
      await page.waitForTimeout(2000);
      
      const afterLogoClick = await page.evaluate(() => {
        const content = document.body.textContent || '';
        return {
          hasLanding: content.includes('Willkommen bei Trailkeeper') || content.includes('Entdecke neue Reiseziele') || content.includes('travel suggestions'),
          url: window.location.href,
          currentView: content.includes('Timeline') ? 'timeline' : content.includes('Entdecke neue Reiseziele') ? 'landing' : 'unknown'
        };
      });
      
      console.log('   📊 After logo click:', afterLogoClick);
      await page.screenshot({ path: 'routing-test-3-after-logo-click.png', fullPage: true });
    }
    
    // Print relevant console logs
    console.log('\n📋 ROUTING-RELATED CONSOLE LOGS:');
    const routingLogs = consoleLogs.filter(log => 
      log.includes('🎯') || log.includes('initial view') || log.includes('trips loaded') || 
      log.includes('landing') || log.includes('list') || log.includes('New user') ||
      log.includes('AppContext initialized') || log.includes('placeholder')
    );
    routingLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });
    
    // Final analysis
    console.log('\n🔍 ROUTING BEHAVIOR ANALYSIS:');
    console.log('========================================');
    
    if (currentView === 'landing') {
      console.log('✅ SUCCESS: New user correctly routed to landing page');
      console.log('💡 This is the expected behavior for users with no trips');
    } else if (currentView === 'timeline' || currentView === 'list') {
      console.log('❌ ISSUE FOUND: New user incorrectly routed to', currentView);
      console.log('💡 Expected: New users (no trips) should see landing page');
      console.log('🔧 Problem: getInitialView() may not be working correctly');
      
      // Check if the issue is with trips detection
      if (Array.isArray(trips) && trips.length > 0) {
        console.log('🧳 Root cause: User has trips, so routing to list view is correct');
      } else {
        console.log('🧳 Root cause: No trips found, but still not routing to landing page');
        console.log('🔍 Check: getInitialView() logic in SupabaseAppContext.tsx');
      }
    } else if (currentView === 'login') {
      console.log('⚠️ AUTH ISSUE: Still showing login page despite placeholder override');
      console.log('🔧 Check: Environment override may not be working properly');
    } else {
      console.log('❓ UNKNOWN: Unexpected view state detected');
      console.log('🔧 Check: App may not be loading properly');
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('- User reports: New users routed to timeline instead of landing page');
    console.log('- Current behavior:', currentView);
    console.log('- Expected behavior: landing page for new users (no trips)');
    console.log('- Test method: Simulated new user with cleared storage');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'routing-test-error.png', fullPage: true });
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
}

testRoutingLogic().catch(console.error);