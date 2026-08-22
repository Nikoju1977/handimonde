/**
 * HandiMonde Build Configuration
 * Optimizations for production deployment
 * © 2026 Studio Niko Design
 */

module.exports = {
  // Asset minification
  minify: true,
  minifyCSS: true,
  minifyJS: true,

  // Tree-shaking unused code
  treeshake: {
    unused: true,
    sideEffects: false
  },

  // CSS purge (remove unused selectors)
  purge: [
    './index.html',
    './public/**/*.js'
  ],

  // Compression
  compression: {
    gzip: true,
    brotli: true
  },

  // Code splitting
  chunks: {
    leaflet: ['leaflet'],
    analytics: ['analytics.js', 'web-vitals.js'],
    main: ['index.html']
  },

  // Source maps (disabled in production)
  sourcemap: process.env.NODE_ENV === 'development',

  // Critical CSS extraction
  critical: {
    enabled: true,
    dimensions: [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ]
  },

  // Image optimization
  imageMin: {
    jpg: { quality: 80 },
    png: { compressionLevel: 9 },
    webp: { quality: 75 }
  },

  // Browser support
  browsers: ['last 2 versions', '> 1%'],

  // Performance budgets
  budgets: [
    {
      type: 'bundle',
      name: 'main',
      threshold: '280kb' // Gzipped
    },
    {
      type: 'bundle',
      name: 'leaflet',
      threshold: '150kb'
    }
  ],

  // Preload critical resources
  preload: [
    { href: 'https://fonts.gstatic.com/s/atkinson/v14/EJRSRgKws0IsUVVUW4NOqFQNcuZcw.woff2', as: 'font', crossorigin: true },
    { href: 'https://fonts.gstatic.com/s/lexend/v18/wg-e_KynxHVkxq7wPM3STJIEo2q-awZnFLs8gYvMqEQuHkTwXwNKbOwRVg.woff2', as: 'font', crossorigin: true }
  ],

  // DNS prefetch
  dnsPrefetch: [
    'https://overpass-api.de',
    'https://overpass.private.coffee',
    'https://overpass.kumi.systems',
    'https://api.openstreetmap.fr'
  ]
};
