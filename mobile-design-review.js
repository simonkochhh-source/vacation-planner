#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// iPhone viewport configurations
const VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12/13/14': { width: 390, height: 844 },
  'iPhone 12/13/14 Pro Max': { width: 428, height: 926 }
};

// Test URLs and their descriptions
const TEST_PAGES = [
  { url: 'http://localhost:3000', name: 'landing-view', description: 'Landing/Home Page' },
  { url: 'http://localhost:3000/#search', name: 'search-view', description: 'Search & Discovery' },
  { url: 'http://localhost:3000/#map', name: 'map-view', description: 'Map View' },
  { url: 'http://localhost:3000/#timeline', name: 'timeline-view', description: 'Timeline/Scheduling' },
  { url: 'http://localhost:3000/#budget', name: 'budget-view', description: 'Budget View' },
  { url: 'http://localhost:3000/#photos', name: 'photos-view', description: 'Photos View' }
];

async function runMobileDesignReview() {
  const browser = await chromium.launch({ headless: false });
  const results = [];
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'mobile-design-review-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('🚀 Starting Mobile Design Review for Vacation Planner');
  console.log('📱 Testing iPhone screen sizes:', Object.keys(VIEWPORTS).join(', '));
  
  try {
    for (const [deviceName, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`\n📱 Testing ${deviceName} (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({
        viewport,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true
      });
      
      const page = await context.newPage();
      
      // Enable console logging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('❌ Console Error:', msg.text());
        }
      });
      
      for (const testPage of TEST_PAGES) {
        console.log(`  📄 Testing ${testPage.description}...`);
        
        try {
          // Navigate to page
          await page.goto(testPage.url, { waitUntil: 'networkidle' });
          
          // Wait for page to be ready
          await page.waitForTimeout(2000);
          
          // Check for any obvious layout issues
          const bodyOverflow = await page.evaluate(() => {
            const body = document.body;
            return {
              scrollWidth: body.scrollWidth,
              clientWidth: body.clientWidth,
              hasHorizontalScroll: body.scrollWidth > body.clientWidth
            };
          });
          
          // Check for mobile responsive classes
          const hasMobileClasses = await page.evaluate(() => {
            const elements = document.querySelectorAll('[class*="mobile"]');
            return elements.length > 0;
          });
          
          // Check for safe area CSS usage
          const hasSafeAreaSupport = await page.evaluate(() => {
            const computed = getComputedStyle(document.documentElement);
            return computed.getPropertyValue('--safe-area-inset-top') !== '';
          });
          
          // Take screenshot
          const screenshotName = `${deviceName.replace(/[^a-zA-Z0-9]/g, '-')}-${testPage.name}.png`;
          const screenshotPath = path.join(screenshotsDir, screenshotName);
          await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
          });
          
          console.log(`    ✅ Screenshot saved: ${screenshotName}`);
          
          results.push({
            device: deviceName,
            viewport,
            page: testPage.description,
            url: testPage.url,
            screenshot: screenshotPath,
            hasHorizontalScroll: bodyOverflow.hasHorizontalScroll,
            hasMobileClasses,
            hasSafeAreaSupport,
            bodyWidth: bodyOverflow.clientWidth,
            scrollWidth: bodyOverflow.scrollWidth
          });
          
          if (bodyOverflow.hasHorizontalScroll) {
            console.log(`    ⚠️  Horizontal scroll detected (${bodyOverflow.scrollWidth}px > ${bodyOverflow.clientWidth}px)`);
          }
          
        } catch (error) {
          console.log(`    ❌ Error testing ${testPage.description}:`, error.message);
          results.push({
            device: deviceName,
            viewport,
            page: testPage.description,
            url: testPage.url,
            error: error.message
          });
        }
      }
      
      await context.close();
    }
    
    // Generate report
    const reportPath = path.join(__dirname, 'mobile-design-review-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log('\n📊 Mobile Design Review Complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Summary
    const issues = results.filter(r => r.hasHorizontalScroll || r.error);
    console.log(`\n📈 Summary:`);
    console.log(`- Total tests: ${results.length}`);
    console.log(`- Issues found: ${issues.length}`);
    console.log(`- Success rate: ${((results.length - issues.length) / results.length * 100).toFixed(1)}%`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues detected:');
      issues.forEach(issue => {
        if (issue.hasHorizontalScroll) {
          console.log(`  - ${issue.device} ${issue.page}: Horizontal scroll (${issue.scrollWidth}px > ${issue.bodyWidth}px)`);
        }
        if (issue.error) {
          console.log(`  - ${issue.device} ${issue.page}: ${issue.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Mobile Design Review failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the review
runMobileDesignReview().catch(console.error);