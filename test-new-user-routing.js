const { chromium } = require('playwright');

async function testNewUserRouting() {
  console.log('🚀 Testing new user routing with placeholder credentials...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Collect ALL console messages from the page
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    // Print important logs in real-time
    if (msg.text().includes('🎯') || msg.text().includes('Auth:') || msg.text().includes('New user') || 
        msg.text().includes('initial view') || msg.text().includes('trips loaded') || 
        msg.text().includes('landing') || msg.text().includes('list') || 
        msg.text().includes('placeholder') || msg.text().includes('AppContext') ||
        msg.text().includes('getInitialView') || msg.text().includes('UPDATE_UI_STATE') ||
        msg.text().includes('Supabase') || msg.text().includes('initialized')) {
      console.log('🔍 PAGE LOG:', logEntry);
    }
  });

  try {
    console.log('\n=== TEST SCENARIO: New User (No Trips) ===');
    console.log('Expected: Should route to landing page with travel suggestions');
    console.log('==============================================\n');

    console.log('1. 🌐 Navigating to localhost:3000');
    await page.goto('http://localhost:3000');
    
    console.log('2. 🧹 Clearing ALL storage to simulate completely new user');
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if available
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        }).catch(() => {});
      }
      
      // Clear any cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });
    
    console.log('3. 🔄 Reloading page to ensure clean state');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('4. ⏳ Waiting for React app to initialize completely...');
    await page.waitForTimeout(5000);
    
    console.log('5. 📊 Checking authentication state');
    const authState = await page.evaluate(() => {
      return {
        isPlaceholder: window.location.hostname === 'localhost',
        hasAuthToken: !!localStorage.getItem('supabase.auth.token'),
        localStorageKeys: Object.keys(localStorage)
      };
    });
    
    console.log('   🔐 Auth state:', authState);
    
    console.log('6. 📷 Taking initial screenshot');
    await page.screenshot({ path: 'new-user-test-1-initial.png', fullPage: true });
    
    console.log('7. ⏳ Waiting for routing logic to complete...');
    await page.waitForTimeout(8000);
    
    console.log('8. 📊 Analyzing current application state');
    
    const appAnalysis = await page.evaluate(() => {
      const body = document.body;
      const content = body.textContent || '';
      
      // More comprehensive content detection
      const contentChecks = {
        // Landing page indicators
        hasWelcomeMessage: content.includes('Willkommen bei Trailkeeper') || content.includes('Welcome to Trailkeeper'),
        hasTravelSuggestions: content.includes('Entdecke neue Reiseziele') || content.includes('travel suggestions') || content.includes('Discover new destinations'),
        hasCreateFirstTrip: content.includes('Create your first trip') || content.includes('Erstelle deine erste Reise'),
        hasLandingCTA: content.includes('Start planning') || content.includes('Plane jetzt'),
        
        // List/Timeline view indicators  
        hasTimelineElements: content.includes('Timeline') || content.includes('Zeitleiste'),
        hasDestinationList: content.includes('destinations') && (content.includes('filter') || content.includes('sort')),
        hasListView: content.includes('Liste') && content.includes('Reiseziele'),
        hasEnhancedTimeline: content.includes('Enhanced Timeline'),
        
        // Other views
        hasMapView: content.includes('Karte') || content.includes('Map View'),
        hasBudgetView: content.includes('Budget') || content.includes('Expenses'),
        
        // Authentication
        hasLoginForm: content.includes('Continue with Google') || content.includes('Continue with Email'),
        hasAuthError: content.includes('Invalid login') || content.includes('authentication failed'),
        
        // Demo mode
        hasPlaceholderMode: content.includes('Demo Mode') || content.includes('placeholder credentials'),
        
        // Error states
        hasErrorMessage: content.includes('Error') || content.includes('Fehler') || content.includes('Something went wrong')
      };
      
      // Get detailed localStorage content
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
      
      // Check current URL and page structure
      const pageInfo = {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        hasMainContent: !!document.querySelector('main, .main-content, .app-container'),
        hasSidebar: !!document.querySelector('.sidebar, nav'),
        hasHeader: !!document.querySelector('header, .header')
      };
      
      return {
        contentChecks,
        storage,
        pageInfo,
        bodyTextSample: content.substring(0, 1000),
        relevantElements: {
          headings: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.substring(0, 50)),
          buttons: Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => b.textContent?.substring(0, 30)),
          mainSections: Array.from(document.querySelectorAll('[data-testid], .view, .page')).map(el => el.className || el.getAttribute('data-testid'))
        }
      };
    });
    
    console.log('\n📊 DETAILED APPLICATION ANALYSIS:');
    console.log('=====================================');
    
    console.log('\n🎯 Content Analysis:');
    Object.entries(appAnalysis.contentChecks).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${key}: ${value}`);
    });
    
    console.log('\n🗃️ Storage Analysis:');
    console.log('   📦 LocalStorage keys:', Object.keys(appAnalysis.storage));
    
    // Analyze UI state and trips
    const uiState = appAnalysis.storage['vacation-planner-ui-state'];
    const trips = appAnalysis.storage['vacation-planner-trips'];
    
    if (uiState) {
      console.log('   📊 UI State found:');
      console.log('      - Current view:', uiState.currentView || 'undefined');
      console.log('      - Active trip:', uiState.activeTripId || 'none');
      console.log('      - Filters active:', Object.keys(uiState.filters || {}).length > 0);
    } else {
      console.log('   📊 No UI state found in localStorage');
    }
    
    if (trips) {
      console.log('   🧳 Trips data:');
      console.log('      - Number of trips:', Array.isArray(trips) ? trips.length : 'not an array');
      if (Array.isArray(trips) && trips.length > 0) {
        console.log('      - First trip:', trips[0].name || 'unnamed');
      }
    } else {
      console.log('   🧳 No trips found in localStorage');
    }
    
    console.log('\n🌐 Page Information:');
    console.log('   - URL:', appAnalysis.pageInfo.url);
    console.log('   - Title:', appAnalysis.pageInfo.title);
    console.log('   - Has main content:', appAnalysis.pageInfo.hasMainContent);
    console.log('   - Has sidebar:', appAnalysis.pageInfo.hasSidebar);
    console.log('   - Has header:', appAnalysis.pageInfo.hasHeader);
    
    console.log('\n📝 Page Elements:');
    console.log('   - Headings:', appAnalysis.relevantElements.headings);
    console.log('   - Buttons:', appAnalysis.relevantElements.buttons);
    console.log('   - Main sections:', appAnalysis.relevantElements.mainSections);
    
    // Determine the current view
    let detectedView = 'unknown';
    
    if (appAnalysis.contentChecks.hasLoginForm) {
      detectedView = 'login';
    } else if (appAnalysis.contentChecks.hasWelcomeMessage || appAnalysis.contentChecks.hasTravelSuggestions || appAnalysis.contentChecks.hasCreateFirstTrip) {
      detectedView = 'landing';
    } else if (appAnalysis.contentChecks.hasEnhancedTimeline || appAnalysis.contentChecks.hasTimelineElements) {
      detectedView = 'timeline';
    } else if (appAnalysis.contentChecks.hasDestinationList || appAnalysis.contentChecks.hasListView) {
      detectedView = 'list';
    } else if (appAnalysis.contentChecks.hasMapView) {
      detectedView = 'map';
    } else if (appAnalysis.contentChecks.hasErrorMessage) {
      detectedView = 'error';
    }
    
    console.log('\n🎯 DETECTED VIEW:', detectedView.toUpperCase());
    
    console.log('9. 📷 Taking analysis screenshot');
    await page.screenshot({ path: 'new-user-test-2-analysis.png', fullPage: true });
    
    // Test navigation if we're in the wrong view
    if (detectedView !== 'landing') {
      console.log('\n10. 🧪 Testing manual navigation to landing page');
      
      // Try clicking logo or home button
      const homeElements = [
        'h1:has-text("Trailkeeper")',
        '.logo',
        'a:has-text("Trailkeeper")',
        'button:has-text("Home")',
        'a[href="/"]',
        'a[href="#"]'
      ];
      
      let homeClicked = false;
      for (const selector of homeElements) {
        try {
          const element = await page.locator(selector).first();
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`   🏠 Clicking ${selector}...`);
            await element.click();
            await page.waitForTimeout(2000);
            homeClicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (homeClicked) {
        const afterClick = await page.evaluate(() => {
          const content = document.body.textContent || '';
          return {
            hasLanding: content.includes('Entdecke neue Reiseziele') || content.includes('travel suggestions'),
            url: window.location.href,
            mainHeading: document.querySelector('h1')?.textContent
          };
        });
        
        console.log('   📊 After home click:', afterClick);
        await page.screenshot({ path: 'new-user-test-3-after-home-click.png', fullPage: true });
      } else {
        console.log('   ❌ Could not find home/logo element to click');
      }
    }
    
    // Print relevant console logs
    console.log('\n📋 ROUTING-RELATED CONSOLE LOGS:');
    console.log('===============================');
    const routingLogs = consoleLogs.filter(log => 
      log.includes('🎯') || log.includes('initial view') || log.includes('trips loaded') || 
      log.includes('landing') || log.includes('list') || log.includes('New user') ||
      log.includes('AppContext') || log.includes('placeholder') || log.includes('getInitialView') ||
      log.includes('UPDATE_UI_STATE') || log.includes('initialized')
    );
    
    if (routingLogs.length > 0) {
      routingLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log}`);
      });
    } else {
      console.log('No routing-specific logs found. Showing all logs:');
      consoleLogs.slice(-10).forEach((log, index) => {
        console.log(`${index + 1}. ${log}`);
      });
    }
    
    // Final assessment
    console.log('\n🔍 FINAL ROUTING ASSESSMENT:');
    console.log('============================');
    
    const hasTrips = Array.isArray(trips) && trips.length > 0;
    const expectedView = hasTrips ? 'list' : 'landing';
    
    console.log('📋 Test Scenario: New user (cleared storage)');
    console.log('🧳 Trips found:', hasTrips ? `Yes (${trips.length})` : 'No');
    console.log('🎯 Expected view:', expectedView);
    console.log('🎯 Actual view:', detectedView);
    console.log('✅ Result:', detectedView === expectedView ? 'CORRECT' : 'INCORRECT');
    
    if (detectedView === expectedView) {
      console.log('\n✅ SUCCESS: Routing is working correctly!');
      if (detectedView === 'landing') {
        console.log('💡 New users are properly seeing the landing page with travel suggestions');
      }
    } else {
      console.log('\n❌ ISSUE IDENTIFIED: Routing problem found!');
      console.log('💡 Problem details:');
      
      if (detectedView === 'login') {
        console.log('   - User stuck on login page (placeholder credentials may not be working)');
      } else if (detectedView === 'timeline' || detectedView === 'list') {
        console.log('   - New user incorrectly routed to', detectedView, 'instead of landing page');
        console.log('   - Check getInitialView() logic in SupabaseAppContext.tsx');
        console.log('   - Verify trips.length === 0 condition is working');
      } else {
        console.log('   - Unexpected view state:', detectedView);
        console.log('   - May indicate app initialization issues');
      }
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Check getInitialView() function logic');
      console.log('2. Verify localStorage is being cleared properly');
      console.log('3. Check if trips are being loaded from another source');
      console.log('4. Ensure placeholder credentials bypass authentication correctly');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'new-user-test-error.png', fullPage: true });
  } finally {
    console.log('\n🔚 Test completed. Closing browser...');
    await browser.close();
  }
}

testNewUserRouting().catch(console.error);