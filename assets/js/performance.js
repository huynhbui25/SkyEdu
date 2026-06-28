/**
 * SKY EDU - Performance Optimization
 * Lazy loading, Preloading, Image optimization
 */

const Performance = {
    // Initialize
    init() {
        this.setupLazyLoading();
        this.setupPreloading();
        this.setupResourceHints();
        this.setupImageOptimization();
        this.setupDebouncing();
    },
    
    // Setup lazy loading for images
    setupLazyLoading() {
        // Native lazy loading
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
        
        // Intersection Observer for background images
        const bgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const bg = el.dataset.bg;
                    if (bg) {
                        el.style.backgroundImage = `url(${bg})`;
                        bgObserver.unobserve(el);
                    }
                }
            });
        }, { rootMargin: '100px' });
        
        document.querySelectorAll('[data-bg]').forEach(el => {
            bgObserver.observe(el);
        });
        
        // Lazy load iframes
        const iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = entry.target;
                    if (iframe.dataset.src) {
                        iframe.src = iframe.dataset.src;
                        iframeObserver.unobserve(iframe);
                    }
                }
            });
        }, { rootMargin: '100px' });
        
        document.querySelectorAll('iframe[data-src]').forEach(iframe => {
            iframeObserver.observe(iframe);
        });
    },
    
    // Setup preloading for critical resources
    setupPreloading() {
        // Preload critical resources
        const criticalResources = [
            { href: '/assets/css/style.css', as: 'style' },
            { href: '/assets/js/main.js', as: 'script' }
        ];
        
        criticalResources.forEach(res => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = res.href;
            link.as = res.as;
            if (res.as === 'style') {
                link.onload = () => {
                    link.rel = 'stylesheet';
                };
            }
            document.head.appendChild(link);
        });
        
        // Preconnect to important origins
        this.addPreconnect('https://www.gstatic.com', 'preconnect');
        this.addPreconnect('https://cdn.jsdelivr.net', 'preconnect');
        this.addPreconnect('https://firebasestorage.googleapis.com', 'preconnect');
    },
    
    // Add preconnect hints
    addPreconnect(href, rel = 'preconnect') {
        if (document.querySelector(`link[href="${href}"][rel="${rel}"]`)) return;
        
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
    },
    
    // Setup resource hints
    setupResourceHints() {
        // DNS prefetch for Firebase
        this.addPreconnect('https://sky-edu-8be67.firebaseio.com', 'dns-prefetch');
        
        // Prerender for likely navigation
        if (window.location.pathname === '/') {
            const prerender = document.createElement('link');
            prerender.rel = 'prerender';
            prerender.href = '/phong-luyen-tsa/index.html';
            document.head.appendChild(prerender);
        }
    },
    
    // Setup image optimization
    setupImageOptimization() {
        // Progressive image loading
        document.querySelectorAll('img').forEach(img => {
            if (!img.complete) {
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s';
                
                img.addEventListener('load', function() {
                    this.style.opacity = '1';
                });
                
                img.addEventListener('error', function() {
                    this.style.opacity = '1';
                    this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f1f5f9" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="12" x="50" y="50" text-anchor="middle" dy=".3em"%3E%E1%BA%A2nh%3C/text%3E%3C/svg%3E';
                });
            }
        });
    },
    
    // Setup debouncing utilities
    setupDebouncing() {
        // Debounce function
        window.debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
        
        // Throttle function
        window.throttle = (func, limit) => {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        };
    },
    
    // Memory management - cleanup
    cleanup() {
        // Remove event listeners for elements that are no longer visible
        const cleanupObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    const el = entry.target;
                    // Clear large data URIs
                    if (el.tagName === 'IMG' && el.src.startsWith('data:')) {
                        el.src = '';
                    }
                }
            });
        }, { threshold: 0 });
        
        document.querySelectorAll('.cleanup-on-scroll').forEach(el => {
            cleanupObserver.observe(el);
        });
    },
    
    // Measure performance
    measure(name, callback) {
        const start = performance.now();
        callback();
        const end = performance.now();
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    },
    
    // Get loading status
    getLoadStatus() {
        return {
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
        };
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Performance.init();
});

// Initialize after full load
window.addEventListener('load', () => {
    Performance.cleanup();
    
    // Log performance metrics in development
    if (location.hostname === 'localhost') {
        const status = Performance.getLoadStatus();
        console.log('[Performance Metrics]', status);
    }
});

// Export
window.Performance = Performance;
