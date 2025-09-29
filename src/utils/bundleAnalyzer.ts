/**
 * Bundle analysis utilities for performance optimization
 */

interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  modules: string[];
}

interface AnalysisResult {
  bundles: BundleInfo[];
  totalSize: number;
  recommendations: string[];
}

/**
 * Analyze webpack bundle in development
 */
export function analyzeBundles(): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    // This would be used with webpack-bundle-analyzer
    // In a real implementation, you'd integrate with the build process
    
    const mockAnalysis: AnalysisResult = {
      bundles: [
        {
          name: 'main',
          size: 1024 * 200, // 200KB
          gzipSize: 1024 * 60, // 60KB gzipped
          modules: ['react', 'react-dom', 'app-code']
        },
        {
          name: 'vendor',
          size: 1024 * 300, // 300KB
          gzipSize: 1024 * 90, // 90KB gzipped
          modules: ['node_modules']
        }
      ],
      totalSize: 1024 * 500, // 500KB total
      recommendations: [
        'Consider code splitting large components',
        'Use dynamic imports for non-critical routes',
        'Enable tree shaking for unused code'
      ]
    };

    setTimeout(() => resolve(mockAnalysis), 100);
  });
}

/**
 * Check if bundle size exceeds performance budgets
 */
export function checkBundleBudgets(bundles: BundleInfo[]): {
  passed: boolean;
  violations: Array<{
    bundle: string;
    actual: number;
    budget: number;
    type: 'size' | 'gzipSize';
  }>;
} {
  const budgets = {
    main: 250 * 1024, // 250KB
    vendor: 400 * 1024, // 400KB
    css: 50 * 1024, // 50KB
  };

  const violations = [];
  let passed = true;

  for (const bundle of bundles) {
    const budget = budgets[bundle.name as keyof typeof budgets] || budgets.main;
    
    if (bundle.size > budget) {
      passed = false;
      violations.push({
        bundle: bundle.name,
        actual: bundle.size,
        budget,
        type: 'size' as const,
      });
    }
  }

  return { passed, violations };
}

/**
 * Generate optimization recommendations based on bundle analysis
 */
export function generateOptimizationRecommendations(bundles: BundleInfo[]): string[] {
  const recommendations = [];
  const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);

  // Check total bundle size
  if (totalSize > 1024 * 1024) { // > 1MB
    recommendations.push('Total bundle size exceeds 1MB. Consider aggressive code splitting.');
  }

  // Check individual bundle sizes
  for (const bundle of bundles) {
    if (bundle.size > 500 * 1024) { // > 500KB
      recommendations.push(`${bundle.name} bundle is large (${formatBytes(bundle.size)}). Consider splitting.`);
    }
  }

  // Check vendor bundle
  const vendorBundle = bundles.find(b => b.name.includes('vendor') || b.name.includes('node_modules'));
  if (vendorBundle && vendorBundle.size > 300 * 1024) {
    recommendations.push('Vendor bundle is large. Consider using webpack.optimize.SplitChunksPlugin.');
  }

  // Generic recommendations
  if (bundles.length < 3) {
    recommendations.push('Consider implementing route-based code splitting.');
  }

  return recommendations;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Monitor bundle loading performance
 */
export class BundlePerformanceMonitor {
  private loadTimes: Map<string, number> = new Map();
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver() {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
              this.loadTimes.set(entry.name, entry.duration);
              
              // Log slow loading bundles
              if (entry.duration > 1000) { // > 1 second
                console.warn(`Slow bundle load detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
              }
            }
          }
        });

        this.observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Bundle performance monitoring not supported:', error);
      }
    }
  }

  getLoadTimes(): Record<string, number> {
    return Object.fromEntries(this.loadTimes);
  }

  getSlowestBundles(limit: number = 5): Array<{ name: string; duration: number }> {
    return Array.from(this.loadTimes.entries())
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  dispose() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadTimes.clear();
  }
}

/**
 * Preload critical chunks
 */
export function preloadCriticalChunks(chunkNames: string[]) {
  const preloadedChunks = new Set();

  for (const chunkName of chunkNames) {
    if (preloadedChunks.has(chunkName)) continue;

    // Create preload link
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = `/${chunkName}`;
    link.onload = () => {
      console.log(`Critical chunk preloaded: ${chunkName}`);
    };
    link.onerror = () => {
      console.warn(`Failed to preload chunk: ${chunkName}`);
    };

    document.head.appendChild(link);
    preloadedChunks.add(chunkName);
  }
}

/**
 * Lazy load non-critical chunks
 */
export function lazyLoadChunk(chunkPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chunkPath;
    script.async = true;
    
    script.onload = () => {
      console.log(`Lazy loaded chunk: ${chunkPath}`);
      resolve(true);
    };
    
    script.onerror = () => {
      console.error(`Failed to lazy load chunk: ${chunkPath}`);
      reject(new Error(`Failed to load ${chunkPath}`));
    };
    
    document.head.appendChild(script);
  });
}

// Global bundle monitor instance
export const bundleMonitor = new BundlePerformanceMonitor();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  bundleMonitor.dispose();
});

/**
 * Development-only bundle analysis report
 */
export function generateBundleReport(): void {
  if (process.env.NODE_ENV !== 'development') return;

  analyzeBundles().then((analysis) => {
    console.group('📦 Bundle Analysis Report');
    
    console.log('Bundles:', analysis.bundles.map(b => ({
      name: b.name,
      size: formatBytes(b.size),
      gzipSize: b.gzipSize ? formatBytes(b.gzipSize) : 'Unknown',
      modules: b.modules.length
    })));
    
    console.log('Total Size:', formatBytes(analysis.totalSize));
    
    if (analysis.recommendations.length > 0) {
      console.group('💡 Recommendations');
      analysis.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    const budgetCheck = checkBundleBudgets(analysis.bundles);
    if (!budgetCheck.passed) {
      console.group('⚠️ Budget Violations');
      budgetCheck.violations.forEach(v => {
        console.warn(`${v.bundle}: ${formatBytes(v.actual)} exceeds budget of ${formatBytes(v.budget)}`);
      });
      console.groupEnd();
    } else {
      console.log('✅ All bundles within budget');
    }
    
    console.groupEnd();
  });
}