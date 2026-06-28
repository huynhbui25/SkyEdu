/**
 * SKY EDU - Animations & Micro-interactions
 * Smooth animations for enhanced UX
 */

const Animations = {
    // Initialize all animations
    init() {
        this.setupScrollAnimations();
        this.setupButtonEffects();
        this.setupCardAnimations();
        this.setupNumberCounters();
        this.setupTypingEffect();
        this.setupParallax();
        this.setupHoverEffects();
        this.injectAnimationsCSS();
    },
    
    // Inject CSS animations
    injectAnimationsCSS() {
        const css = `
            /* Scroll Animations */
            .animate-on-scroll {
                opacity: 0;
                transform: translateY(30px);
                transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .animate-on-scroll.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            .animate-on-scroll.from-left {
                transform: translateX(-50px);
            }
            
            .animate-on-scroll.from-left.visible {
                transform: translateX(0);
            }
            
            .animate-on-scroll.from-right {
                transform: translateX(50px);
            }
            
            .animate-on-scroll.from-right.visible {
                transform: translateX(0);
            }
            
            .animate-on-scroll.scale-in {
                transform: scale(0.8);
            }
            
            .animate-on-scroll.scale-in.visible {
                transform: scale(1);
            }
            
            /* Stagger children */
            .stagger-children > * {
                opacity: 0;
                transform: translateY(20px);
            }
            
            .stagger-children.visible > *:nth-child(1) { animation: fadeSlideUp 0.5s 0.1s forwards; }
            .stagger-children.visible > *:nth-child(2) { animation: fadeSlideUp 0.5s 0.2s forwards; }
            .stagger-children.visible > *:nth-child(3) { animation: fadeSlideUp 0.5s 0.3s forwards; }
            .stagger-children.visible > *:nth-child(4) { animation: fadeSlideUp 0.5s 0.4s forwards; }
            .stagger-children.visible > *:nth-child(5) { animation: fadeSlideUp 0.5s 0.5s forwards; }
            .stagger-children.visible > *:nth-child(6) { animation: fadeSlideUp 0.5s 0.6s forwards; }
            
            /* Button Effects */
            .btn-primary {
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .btn-primary::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: width 0.6s ease, height 0.6s ease;
            }
            
            .btn-primary:hover::before {
                width: 300px;
                height: 300px;
            }
            
            .btn-primary:active {
                transform: scale(0.97);
            }
            
            .btn-shine {
                background: linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 50%, var(--primary) 100%);
                background-size: 200% 100%;
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
            }
            
            /* Ripple Effect */
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.4);
                transform: scale(0);
                animation: rippleEffect 0.6s linear;
                pointer-events: none;
            }
            
            @keyframes rippleEffect {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            /* Card Animations */
            .card-hover {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .card-hover:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px var(--shadow);
            }
            
            .card-glow:hover {
                box-shadow: 0 0 30px rgba(22, 119, 255, 0.3);
            }
            
            /* Floating Animation */
            .float {
                animation: floating 3s ease-in-out infinite;
            }
            
            @keyframes floating {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .float-slow {
                animation: floating 4s ease-in-out infinite;
            }
            
            .float-delay-1 { animation-delay: 0.5s; }
            .float-delay-2 { animation-delay: 1s; }
            .float-delay-3 { animation-delay: 1.5s; }
            
            /* Pulse Animation */
            .pulse {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            /* Bounce Animation */
            .bounce {
                animation: bounce 1s infinite;
            }
            
            @keyframes bounce {
                0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                70% { transform: translateY(-10px); }
            }
            
            /* Shake Animation */
            .shake {
                animation: shake 0.5s;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            /* Spin Animation */
            .spin {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Fade Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeSlideDown {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            /* Scale Animations */
            @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes scaleOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.8); }
            }
            
            /* Notification Animations */
            .notification-enter {
                animation: slideInRight 0.3s ease forwards;
            }
            
            .notification-exit {
                animation: fadeOut 0.3s ease forwards;
            }
            
            /* Loading Skeleton */
            .skeleton {
                background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
                background-size: 200% 100%;
                animation: skeleton 1.5s infinite;
            }
            
            @keyframes skeleton {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Progress Bar Animation */
            .progress-animated {
                animation: progressFill 1s ease-out forwards;
            }
            
            @keyframes progressFill {
                from { width: 0; }
            }
            
            /* Glow Effect */
            .glow {
                animation: glow 2s ease-in-out infinite alternate;
            }
            
            @keyframes glow {
                from { box-shadow: 0 0 5px var(--primary); }
                to { box-shadow: 0 0 20px var(--primary), 0 0 30px var(--primary); }
            }
            
            /* Confetti Animation */
            .confetti {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                overflow: hidden;
            }
            
            .confetti-piece {
                position: absolute;
                width: 10px;
                height: 10px;
                animation: confettiFall 3s linear forwards;
            }
            
            @keyframes confettiFall {
                0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            
            /* Hero Text Animation */
            .hero-title {
                animation: heroFadeIn 1s ease forwards;
            }
            
            @keyframes heroFadeIn {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .hero-title-delay-1 { animation-delay: 0.2s; opacity: 0; }
            .hero-title-delay-2 { animation-delay: 0.4s; opacity: 0; }
            .hero-title-delay-3 { animation-delay: 0.6s; opacity: 0; }
            
            /* Exam Card Animation */
            .exam-card-animated {
                animation: cardSlideUp 0.5s ease forwards;
                opacity: 0;
            }
            
            @keyframes cardSlideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Quiz Option Animation */
            .quiz-option {
                transition: all 0.2s ease;
            }
            
            .quiz-option:hover {
                transform: translateX(5px);
            }
            
            .quiz-option.selected {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
            }
            
            /* Timer Animation */
            .timer-warning {
                animation: timerPulse 1s infinite;
                color: var(--warning);
            }
            
            @keyframes timerPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            /* Toast Notification Animations */
            .toast {
                animation: toastIn 0.3s ease forwards;
            }
            
            .toast-exit {
                animation: toastOut 0.3s ease forwards;
            }
            
            @keyframes toastIn {
                from { opacity: 0; transform: translateY(-20px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes toastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.9); }
            }
            
            /* Cursor Effect */
            .cursor-glow {
                position: fixed;
                width: 300px;
                height: 300px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(22, 119, 255, 0.1) 0%, transparent 70%);
                pointer-events: none;
                transform: translate(-50%, -50%);
                z-index: 9998;
                transition: opacity 0.3s;
            }
            
            /* Smooth Page Transitions */
            .page-transition {
                animation: pageIn 0.5s ease forwards;
            }
            
            @keyframes pageIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Focus Ring Animation */
            .focus-ring:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.3);
                animation: focusPulse 1.5s infinite;
            }
            
            @keyframes focusPulse {
                0%, 100% { box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.3); }
                50% { box-shadow: 0 0 0 6px rgba(22, 119, 255, 0.1); }
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    },
    
    // Setup scroll animations
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => {
            observer.observe(el);
        });
    },
    
    // Setup button effects
    setupButtonEffects() {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                // Ripple effect
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
                ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    },
    
    // Setup card animations
    setupCardAnimations() {
        document.querySelectorAll('.card-hover').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    },
    
    // Setup number counters
    setupNumberCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.counter);
                    const duration = parseInt(entry.target.dataset.duration) || 2000;
                    this.animateCounter(entry.target, target, duration);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    },
    
    // Animate counter
    animateCounter(element, target, duration) {
        const start = 0;
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString();
            }
        };
        
        requestAnimationFrame(update);
    },
    
    // Setup typing effect
    setupTypingEffect() {
        const typingElements = document.querySelectorAll('[data-typing]');
        
        typingElements.forEach(el => {
            const text = el.textContent;
            el.textContent = '';
            el.style.borderRight = '2px solid var(--primary)';
            
            let index = 0;
            const type = () => {
                if (index < text.length) {
                    el.textContent += text.charAt(index);
                    index++;
                    setTimeout(type, 50 + Math.random() * 50);
                } else {
                    el.style.borderRight = 'none';
                }
            };
            
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setTimeout(type, 500);
                    observer.unobserve(el);
                }
            }, { threshold: 0.5 });
            
            observer.observe(el);
        });
    },
    
    // Setup parallax effect
    setupParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            parallaxElements.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.5;
                el.style.transform = `translateY(${scrollY * speed}px)`;
            });
        });
    },
    
    // Setup hover effects
    setupHoverEffects() {
        // Magnetic button effect
        document.querySelectorAll('.magnetic-btn').forEach(btn => {
            btn.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                this.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translate(0, 0)';
            });
        });
    },
    
    // Show confetti
    showConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti';
        document.body.appendChild(container);
        
        const colors = ['#1677FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        
        for (let i = 0; i < 100; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';
            container.appendChild(piece);
        }
        
        setTimeout(() => container.remove(), 5000);
    },
    
    // Transition between pages
    transitionTo(url) {
        document.body.classList.add('page-transition');
        setTimeout(() => {
            window.location.href = url;
        }, 300);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    Animations.init();
});

// Export
window.Animations = Animations;
