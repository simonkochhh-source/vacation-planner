// Performance monitoring utilities for Core Web Vitals optimization
// Targeting INP ≤ 200ms and RAIL model compliance

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isInitialized = false;

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.observeWebVitals();
    this.observeUserInteractions();
  }

  private observeWebVitals() {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // First Input Delay (FID)
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'first-input') {
              const firstInputEntry = entry as any; // Cast to access processingStart
              this.recordMetric('FID', firstInputEntry.processingStart - entry.startTime);
            }
          }
        }).observe({ entryTypes: ['first-input'] });

        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('LCP', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any; // Cast to access hadRecentInput
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          this.recordMetric('CLS', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  private observeUserInteractions() {
    // Track interaction latency for INP optimization
    const interactionTypes = ['pointerdown', 'pointerup', 'click', 'keydown'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const startTime = performance.now();
        
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const latency = endTime - startTime;
          
          if (latency > 50) { // Only track meaningful delays
            this.recordMetric(`${type}_latency`, latency);
          }
        });
      }, { passive: true });
    });
  }

  recordMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href
    };

    this.metrics.push(metric);

    // Log performance issues
    if (this.isPerformanceIssue(metric)) {
      console.warn(`Performance issue detected: ${name} = ${value.toFixed(2)}ms`);
    }
  }

  private isPerformanceIssue(metric: PerformanceMetric): boolean {
    const thresholds = {
      'FID': 100,
      'LCP': 2500,
      'CLS': 0.1,
      'click_latency': 200,
      'pointerdown_latency': 200,
      'keydown_latency': 200
    };

    return metric.value > (thresholds[metric.name as keyof typeof thresholds] || Infinity);
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Export functions
export const initPerformanceMonitoring = () => {
  performanceMonitor.init();
};

export const getPerformanceMetrics = () => {
  return performanceMonitor.getMetrics();
};

export const clearPerformanceMetrics = () => {
  performanceMonitor.clearMetrics();
};

// Export the performance monitor instance
export { performanceMonitor };

// Performance budget checker
export const checkPerformanceBudget = () => {
  const metrics = performanceMonitor.getMetrics();
  const issues = metrics.filter(metric => {
    const thresholds = {
      'FID': 100,
      'LCP': 2500,
      'CLS': 0.1,
      'click_latency': 200
    };
    return metric.value > (thresholds[metric.name as keyof typeof thresholds] || Infinity);
  });

  return {
    passed: issues.length === 0,
    issues,
    totalMetrics: metrics.length
  };
};