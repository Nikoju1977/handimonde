/**
 * HandiMonde Analytics
 * Lightweight event tracking for performance & UX monitoring
 * © 2026 Studio Niko Design
 */

(function() {
  'use strict';

  const analytics = {
    queue: [],
    endpoint: '/api/analytics',
    batchSize: 5,
    batchTimeout: 30000, // 30 seconds
    timerId: null,

    /**
     * Track an event
     * @param {string} event - Event name (e.g., 'map_load', 'filter_applied')
     * @param {object} props - Event properties
     */
    track(event, props = {}) {
      if (!event) return;
      
      this.queue.push({
        event,
        timestamp: Date.now(),
        url: location.href,
        userAgent: navigator.userAgent.substring(0, 100),
        ...props
      });

      // Send if batch is full
      if (this.queue.length >= this.batchSize) {
        this.flush();
        return;
      }

      // Set timeout to flush
      if (this.timerId) clearTimeout(this.timerId);
      this.timerId = setTimeout(() => this.flush(), this.batchTimeout);
    },

    /**
     * Flush pending events
     */
    flush() {
      if (this.queue.length === 0) return;
      
      const batch = this.queue.splice(0, this.batchSize);
      const payload = JSON.stringify({ events: batch });

      // Use sendBeacon for reliability (survives page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.endpoint, payload);
      } else {
        // Fallback to fetch
        fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(err => console.warn('Analytics send failed:', err));
      }
    }
  };

  // Flush remaining events on unload
  window.addEventListener('beforeunload', () => {
    analytics.flush();
  });

  // Auto-track user interactions
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-event]');
    if (target) {
      analytics.track(target.dataset.event, {
        element: target.tagName,
        class: target.className
      });
    }
  });

  // Expose globally
  window.analytics = analytics;
})();
