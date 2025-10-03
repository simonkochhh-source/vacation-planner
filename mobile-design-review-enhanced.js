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

async function runEnhancedMobileReview() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'mobile-design-review-enhanced');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('🚀 Enhanced Mobile Design Review for Vacation Planner');
  console.log('📱 Testing iPhone screen sizes with authentication flow analysis');
  
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
      
      // Navigate to homepage
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Take screenshot of login/landing page
      const loginScreenshot = path.join(screenshotsDir, `${deviceName.replace(/[^a-zA-Z0-9]/g, '-')}-01-landing-login.png`);
      await page.screenshot({ path: loginScreenshot, fullPage: true });
      console.log(`  📸 Login page captured`);
      
      // Analyze authentication screen for mobile usability
      const authAnalysis = await page.evaluate(() => {
        // Check button sizes for touch accessibility
        const buttons = Array.from(document.querySelectorAll('button'));
        const buttonAnalysis = buttons.map(btn => {
          const rect = btn.getBoundingClientRect();
          return {
            text: btn.textContent?.trim() || '',
            width: rect.width,
            height: rect.height,
            isTouchFriendly: rect.width >= 44 && rect.height >= 44
          };
        });
        
        // Check font sizes
        const textElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button'));
        const fontSizes = textElements.map(el => {
          const computed = getComputedStyle(el);
          return {
            fontSize: computed.fontSize,
            tagName: el.tagName,
            text: el.textContent?.trim().substring(0, 50) || ''
          };
        });
        
        // Check for proper spacing and layout
        const body = document.body;
        return {
          buttons: buttonAnalysis,
          fontSizes,
          hasHorizontalScroll: body.scrollWidth > body.clientWidth,
          bodyWidth: body.clientWidth,
          scrollWidth: body.scrollWidth,
          viewportHeight: window.innerHeight,
          contentHeight: body.scrollHeight,
          hasOverflow: body.scrollHeight > window.innerHeight
        };
      });
      
      console.log(`  📊 Auth Screen Analysis:`);
      console.log(`    - Touch-friendly buttons: ${authAnalysis.buttons.filter(b => b.isTouchFriendly).length}/${authAnalysis.buttons.length}`);
      console.log(`    - Horizontal scroll: ${authAnalysis.hasHorizontalScroll ? 'YES' : 'NO'}`);
      console.log(`    - Content overflow: ${authAnalysis.hasOverflow ? 'YES' : 'NO'}`);
      
      // Check buttons specifically
      const nonTouchFriendlyButtons = authAnalysis.buttons.filter(b => !b.isTouchFriendly);
      if (nonTouchFriendlyButtons.length > 0) {
        console.log(`    ⚠️  Non-touch-friendly buttons found:`);
        nonTouchFriendlyButtons.forEach(btn => {
          console.log(`      - "${btn.text}" (${btn.width}x${btn.height}px)`);
        });
      }
      
      // Check font sizes for iOS zoom prevention
      const smallFonts = authAnalysis.fontSizes.filter(f => {
        const size = parseInt(f.fontSize);
        return size < 16;
      });
      
      if (smallFonts.length > 0) {
        console.log(`    ⚠️  Small fonts found (may cause iOS zoom):`);
        smallFonts.forEach(font => {
          console.log(`      - ${font.tagName}: ${font.fontSize} "${font.text}"`);
        });
      }
      
      // Test form interactions if present
      const inputs = await page.$$('input, textarea');
      if (inputs.length > 0) {
        console.log(`  🔧 Testing form interactions (${inputs.length} inputs found)`);
        
        for (let i = 0; i < Math.min(inputs.length, 3); i++) {
          try {
            await inputs[i].click();
            await page.waitForTimeout(500);
            
            // Check if keyboard appeared (viewport change on mobile)
            const keyboardTest = await page.evaluate(() => {
              return {
                activeElement: document.activeElement?.tagName,
                viewportHeight: window.innerHeight
              };
            });
            
            // Take screenshot with focused input
            const inputScreenshot = path.join(screenshotsDir, `${deviceName.replace(/[^a-zA-Z0-9]/g, '-')}-02-input-focus-${i}.png`);
            await page.screenshot({ path: inputScreenshot, fullPage: false });
            
          } catch (error) {
            console.log(`    ⚠️  Error testing input ${i}: ${error.message}`);
          }
        }
      }
      
      // Test touch interactions and gestures
      console.log(`  👆 Testing touch interactions`);
      
      // Test scroll behavior
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(500);
      
      const scrollScreenshot = path.join(screenshotsDir, `${deviceName.replace(/[^a-zA-Z0-9]/g, '-')}-03-scroll-test.png`);
      await page.screenshot({ path: scrollScreenshot, fullPage: false });
      
      // Check for any mobile-specific CSS classes
      const mobileClasses = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const mobileClassNames = [];
        elements.forEach(el => {
          const classes = Array.from(el.classList);
          const mobileCls = classes.filter(cls => 
            cls.includes('mobile') || 
            cls.includes('touch') || 
            cls.includes('ios') ||
            cls.includes('responsive')
          );
          if (mobileCls.length > 0) {
            mobileClassNames.push(...mobileCls);
          }
        });
        return [...new Set(mobileClassNames)];
      });
      
      console.log(`  📱 Mobile-specific classes found: ${mobileClasses.length}`);
      if (mobileClasses.length > 0) {
        console.log(`    ${mobileClasses.slice(0, 5).join(', ')}`);
      }
      
      // Test navigation accessibility
      const navElements = await page.$$('nav, [role="navigation"], header, .header, .navigation');
      if (navElements.length > 0) {
        console.log(`  🧭 Navigation elements found: ${navElements.length}`);
        
        // Test if navigation is keyboard accessible
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        
        const navFocusScreenshot = path.join(screenshotsDir, `${deviceName.replace(/[^a-zA-Z0-9]/g, '-')}-04-nav-focus.png`);
        await page.screenshot({ path: navFocusScreenshot, fullPage: false });
      }
      
      await context.close();
    }
    
    console.log('\n✅ Enhanced Mobile Design Review Complete!');
    console.log(`📁 Enhanced screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Enhanced Mobile Design Review failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the enhanced review
runEnhancedMobileReview().catch(console.error);