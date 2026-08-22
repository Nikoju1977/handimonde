/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals (LCP, FID, CLS) for performance monitoring
 * © 2026 Studio Niko Design
 */

(function() {
  'use strict';

  // Polyfill for PerformanceObserver if needed
  if (!window.PerformanceObserver) return;

  const vitals = {
    lcp: null,
    fid: null,
    cls: 0
  };

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        console.log('LCP:', vitals.lcp);
        
        // Send to analytics
        if (window.analytics) {
          window.analytics.track('web-vitals', {
            metric: 'LCP',
            value: vitals.lcp,
            timestamp: Date.now()
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer failed:', e);
    }
  }

  // First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          vitals.fid = entry.processingDuration;
          console.log('FID:', vitals.fid);
          
          if (window.analytics) {
            window.analytics.track('web-vitals', {
              metric: 'FID',
              value: vitals.fid,
              timestamp: Date.now()
            });
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer failed:', e);
    }
  }

  // Cumulative Layout Shift (CLS)
  if ('PerformanceObserver' in window) {
    try {
      const clsObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            vitals.cls += entry.value;
            console.log('CLS:', vitals.cls);
            
            if (window.analytics) {
              window.analytics.track('web-vitals', {
                metric: 'CLS',
                value: vitals.cls,
                timestamp: Date.now()
              });
            }
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer failed:', e);
    }
  }

  // Expose vitals globally
  window.webVitals = vitals;
})();
