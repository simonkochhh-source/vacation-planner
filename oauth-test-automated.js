const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * AUTOMATED OAUTH FLOW TEST
 * Tests the complete Google OAuth integration with screenshots
 * Target: Development Environment (Test Database)
 */

const CONFIG = {
  appUrl: 'http://localhost:3001',
  testTimeout: 30000,
  screenshotDir: './oauth-test-screenshots',
  supabaseTestUrl: 'lsztvtauiapnhqplapgb.supabase.co'
};

class OAuthFlowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
    this.logs = [];
    this.testResults = {
      appLoad: false,
      environmentDetection: false,
      oauthButtonClick: false,
      googleRedirect: false,
      authComplete: false,
      dashboardAccess: false,
      databaseVerification: false
    };
  }

  async setup() {
    console.log('🚀 Starting OAuth Flow Test Setup...');
    
    // Create screenshot directory
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Keep visible for debugging
      slowMo: 1000     // Slow down for better observation
    });

    const context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    this.page = await context.newPage();

    // Capture console logs
    this.page.on('console', (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      this.logs.push(logEntry);
      console.log('📋 Console:', logEntry);
    });

    // Capture network errors
    this.page.on('response', (response) => {
      if (!response.ok()) {
        const errorEntry = `[NETWORK] ${response.status()} ${response.url()}`;
        this.logs.push(errorEntry);
        console.log('🔴 Network Error:', errorEntry);
      }
    });

    console.log('✅ Browser setup complete');
  }

  async takeScreenshot(name, description) {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    
    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    this.screenshots.push({ name, description, filename, filepath });
    console.log(`📸 Screenshot saved: ${filename} - ${description}`);
  }

  async testAppLoad() {
    console.log('\n🔍 Test 1: App Load & Initial State...');
    
    try {
      await this.page.goto(CONFIG.appUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.testTimeout 
      });

      await this.takeScreenshot('01-app-load', 'Initial app load - Login page');

      // Check if page loaded successfully
      const title = await this.page.title();
      console.log(`   Page title: ${title}`);

      // Wait for potential React hydration
      await this.page.waitForTimeout(2000);

      this.testResults.appLoad = true;
      console.log('✅ App loaded successfully');

    } catch (error) {
      console.log('❌ App load failed:', error.message);
      await this.takeScreenshot('01-app-load-error', 'App load error');
    }
  }

  async testEnvironmentDetection() {
    console.log('\n🔍 Test 2: Environment Detection...');

    try {
      // Wait for environment initialization
      await this.page.waitForTimeout(3000);

      // Check environment variables via console
      const envCheck = await this.page.evaluate(() => {
        return {
          supabaseUrl: window?.process?.env?.REACT_APP_SUPABASE_URL || 'Not found',
          environment: window?.process?.env?.REACT_APP_ENVIRONMENT || 'Not found',
          stage: window?.process?.env?.REACT_APP_STAGE || 'Not found'
        };
      });

      console.log('   Environment Variables:', envCheck);

      // Check if using test database
      const usingTestDb = envCheck.supabaseUrl.includes(CONFIG.supabaseTestUrl);
      
      if (usingTestDb) {
        console.log('✅ Correct database detected: Test DB');
        this.testResults.environmentDetection = true;
      } else {
        console.log('⚠️  Database might not be Test DB:', envCheck.supabaseUrl);
      }

      await this.takeScreenshot('02-environment-check', 'Environment detection complete');

    } catch (error) {
      console.log('❌ Environment detection failed:', error.message);
    }
  }

  async testOAuthButton() {
    console.log('\n🔍 Test 3: OAuth Button Interaction...');

    try {
      // Look for Google OAuth button
      const googleButtons = await this.page.locator('button:has-text("Google"), button:has-text("Continue with Google")').count();
      console.log(`   Found ${googleButtons} Google button(s)`);

      if (googleButtons === 0) {
        console.log('❌ No Google OAuth button found');
        await this.takeScreenshot('03-no-oauth-button', 'No OAuth button found');
        return;
      }

      // Take screenshot before clicking
      await this.takeScreenshot('03-before-oauth-click', 'Before clicking OAuth button');

      // Click the Google OAuth button
      const googleButton = this.page.locator('button:has-text("Google"), button:has-text("Continue with Google")').first();
      await googleButton.click();

      console.log('🔄 OAuth button clicked');
      
      // Wait for potential redirect or error
      await this.page.waitForTimeout(3000);

      await this.takeScreenshot('03-after-oauth-click', 'After OAuth button click');

      this.testResults.oauthButtonClick = true;
      console.log('✅ OAuth button interaction successful');

    } catch (error) {
      console.log('❌ OAuth button test failed:', error.message);
      await this.takeScreenshot('03-oauth-button-error', 'OAuth button error');
    }
  }

  async testGoogleRedirect() {
    console.log('\n🔍 Test 4: Google OAuth Redirect...');

    try {
      // Wait for potential redirect to Google
      await this.page.waitForTimeout(5000);

      const currentUrl = this.page.url();
      console.log(`   Current URL: ${currentUrl}`);

      // Check if we were redirected to Google
      if (currentUrl.includes('accounts.google.com')) {
        console.log('✅ Successfully redirected to Google OAuth');
        this.testResults.googleRedirect = true;
        await this.takeScreenshot('04-google-oauth-page', 'Google OAuth consent screen');
        
        // Note: We won't proceed with actual Google login in automation
        console.log('ℹ️  Stopping here - Manual Google login required');
        
      } else if (currentUrl === CONFIG.appUrl || currentUrl.includes('localhost')) {
        // Check for error messages
        const errorElements = await this.page.locator('[class*="error"], [class*="alert"], [id*="error"]').count();
        
        if (errorElements > 0) {
          console.log('❌ OAuth configuration error detected');
          const errorText = await this.page.locator('[class*="error"], [class*="alert"], [id*="error"]').first().textContent();
          console.log(`   Error: ${errorText}`);
        } else {
          console.log('⚠️  No redirect to Google - OAuth might not be configured');
        }
        
        await this.takeScreenshot('04-no-google-redirect', 'No redirect to Google OAuth');
      }

    } catch (error) {
      console.log('❌ Google redirect test failed:', error.message);
      await this.takeScreenshot('04-google-redirect-error', 'Google redirect error');
    }
  }

  async generateReport() {
    console.log('\n📊 GENERATING TEST REPORT...');
    console.log('='.repeat(50));

    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      testResults: this.testResults,
      screenshots: this.screenshots,
      consoleLogs: this.logs,
      summary: this.generateSummary()
    };

    // Save report as JSON
    const reportPath = path.join(CONFIG.screenshotDir, 'oauth-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const mdReportPath = path.join(CONFIG.screenshotDir, 'OAUTH-TEST-RESULTS.md');
    fs.writeFileSync(mdReportPath, markdownReport);

    console.log(`📄 JSON Report saved: ${reportPath}`);
    console.log(`📄 Markdown Report saved: ${mdReportPath}`);

    return report;
  }

  generateSummary() {
    const total = Object.keys(this.testResults).length;
    const passed = Object.values(this.testResults).filter(Boolean).length;
    const percentage = Math.round((passed / total) * 100);

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      successPercentage: percentage,
      overallResult: percentage >= 75 ? 'SUCCESS' : percentage >= 50 ? 'PARTIAL' : 'FAILURE'
    };
  }

  generateMarkdownReport(report) {
    const { summary, testResults, screenshots } = report;
    
    return `# 🔐 OAuth Flow Test Results

## 📊 Test Summary
- **Overall Result**: ${summary.overallResult}
- **Success Rate**: ${summary.successPercentage}%
- **Tests Passed**: ${summary.passedTests}/${summary.totalTests}
- **Timestamp**: ${report.timestamp}

## 🧪 Individual Test Results

| Test | Status | Description |
|------|--------|-------------|
| App Load | ${testResults.appLoad ? '✅' : '❌'} | Initial application loading |
| Environment Detection | ${testResults.environmentDetection ? '✅' : '❌'} | Correct database configuration |
| OAuth Button Click | ${testResults.oauthButtonClick ? '✅' : '❌'} | Google OAuth button interaction |
| Google Redirect | ${testResults.googleRedirect ? '✅' : '❌'} | Redirect to Google OAuth |
| Auth Complete | ${testResults.authComplete ? '✅' : '❌'} | OAuth flow completion |
| Dashboard Access | ${testResults.dashboardAccess ? '✅' : '❌'} | Post-login dashboard access |
| Database Verification | ${testResults.databaseVerification ? '✅' : '❌'} | Correct database usage |

## 📸 Screenshots

${screenshots.map((s, i) => `${i + 1}. **${s.name}**: ${s.description}`).join('\n')}

## 🔍 Console Logs

\`\`\`
${report.consoleLogs.join('\n')}
\`\`\`

## 🎯 Recommendations

${this.generateRecommendations(summary, testResults)}
`;
  }

  generateRecommendations(summary, testResults) {
    const recommendations = [];

    if (!testResults.appLoad) {
      recommendations.push('- Fix app loading issues - check if localhost:3001 is running');
    }

    if (!testResults.environmentDetection) {
      recommendations.push('- Verify environment configuration - check .env file');
    }

    if (!testResults.oauthButtonClick) {
      recommendations.push('- Check OAuth button implementation in React components');
    }

    if (!testResults.googleRedirect) {
      recommendations.push('- Verify Google OAuth configuration in Supabase Dashboard');
      recommendations.push('- Check Client ID, Client Secret, and Redirect URLs');
    }

    if (recommendations.length === 0) {
      recommendations.push('- All basic tests passed! Ready for manual OAuth completion');
      recommendations.push('- Complete Google login manually to test full flow');
    }

    return recommendations.join('\n');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async runFullTest() {
    try {
      await this.setup();
      await this.testAppLoad();
      await this.testEnvironmentDetection();
      await this.testOAuthButton();
      await this.testGoogleRedirect();

      const report = await this.generateReport();
      
      console.log('\n🎉 TEST COMPLETION SUMMARY:');
      console.log(`   Overall Result: ${report.summary.overallResult}`);
      console.log(`   Success Rate: ${report.summary.successPercentage}%`);
      console.log(`   Screenshots: ${report.screenshots.length} saved`);
      
      return report;

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      await this.takeScreenshot('99-test-failure', 'Test execution failure');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new OAuthFlowTester();
  
  tester.runFullTest()
    .then((report) => {
      console.log('\n✨ OAuth Flow Test Complete!');
      console.log('Check the oauth-test-screenshots/ directory for results');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = OAuthFlowTester;