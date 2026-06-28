/**
 * SKY EDU - Dark Mode & Theme System
 * Toggle Dark/Light mode với smooth transitions
 */

const Theme = {
    STORAGE_KEY: 'skyedu_theme',
    THEMES: {
        light: {
            name: 'Sáng',
            icon: 'sun',
            colors: {
                '--bg-primary': '#FFFFFF',
                '--bg-secondary': '#F8FAFC',
                '--bg-tertiary': '#F1F5F9',
                '--text-primary': '#0F172A',
                '--text-secondary': '#475569',
                '--text-muted': '#94A3B8',
                '--border': '#E2E8F0',
                '--primary': '#1677FF',
                '--primary-hover': '#0C63E7',
                '--success': '#10B981',
                '--warning': '#F59E0B',
                '--danger': '#EF4444',
                '--shadow': 'rgba(5, 26, 57, 0.1)',
                '--card-bg': '#FFFFFF',
                '--nav-bg': '#051A39',
                '--gradient-start': '#EBF4FF',
                '--gradient-end': '#FFF7ED'
            }
        },
        dark: {
            name: 'Tối',
            icon: 'moon',
            colors: {
                '--bg-primary': '#0F172A',
                '--bg-secondary': '#1E293B',
                '--bg-tertiary': '#334155',
                '--text-primary': '#F8FAFC',
                '--text-secondary': '#CBD5E1',
                '--text-muted': '#64748B',
                '--border': '#334155',
                '--primary': '#38BDF8',
                '--primary-hover': '#0EA5E9',
                '--success': '#34D399',
                '--warning': '#FBBF24',
                '--danger': '#F87171',
                '--shadow': 'rgba(0, 0, 0, 0.3)',
                '--card-bg': '#1E293B',
                '--nav-bg': '#020617',
                '--gradient-start': '#1E293B',
                '--gradient-end': '#1E293B'
            }
        },
        system: {
            name: 'Hệ thống',
            icon: 'monitor',
            colors: {}
        }
    },
    
    currentTheme: 'light',
    
    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            this.currentTheme = saved;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = 'dark';
            }
        }
        
        this.applyTheme(this.currentTheme);
        this.createToggleButton();
        this.setupSystemPreferenceListener();
    },
    
    setupSystemPreferenceListener() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === 'system') {
                    this.applyTheme('dark', true);
                }
            });
        }
    },
    
    applyTheme(theme, skipSave = false) {
        let targetTheme = theme;
        
        // If system, detect system preference
        if (theme === 'system') {
            targetTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) 
                ? 'dark' : 'light';
        }
        
        const themeData = this.THEMES[targetTheme];
        if (!themeData) return;
        
        // Apply CSS variables
        const root = document.documentElement;
        for (const [variable, value] of Object.entries(themeData.colors)) {
            root.style.setProperty(variable, value);
        }
        
        // Add/remove dark class
        document.body.classList.toggle('dark-mode', targetTheme === 'dark');
        
        // Update button state
        this.updateToggleButton(targetTheme);
        
        // Save preference
        if (!skipSave) {
            this.currentTheme = theme;
            localStorage.setItem(this.STORAGE_KEY, theme);
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('themeChange', { 
            detail: { theme: targetTheme }
        }));
    },
    
    toggle() {
        const themes = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.applyTheme(nextTheme);
    },
    
    createToggleButton() {
        // Check if button already exists
        let btn = document.getElementById('themeToggle');
        
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'themeToggle';
            btn.className = 'theme-toggle-btn';
            btn.setAttribute('aria-label', 'Chuyển chế độ màu');
            btn.innerHTML = this.getIconHTML(this.currentTheme === 'system' ? 'monitor' : (this.currentTheme === 'dark' ? 'moon' : 'sun'));
            
            btn.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.1);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            `;
            
            btn.addEventListener('click', () => this.toggle());
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)';
                btn.style.background = 'rgba(255,255,255,0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.background = 'rgba(255,255,255,0.1)';
            });
            
            // Add to header
            const header = document.querySelector('.header .header-content');
            if (header) {
                header.appendChild(btn);
            }
        }
    },
    
    updateToggleButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        
        let icon;
        if (theme === 'system') {
            icon = 'monitor';
        } else if (theme === 'dark') {
            icon = 'moon';
        } else {
            icon = 'sun';
        }
        
        btn.innerHTML = this.getIconHTML(icon);
        btn.title = `Chế độ: ${this.THEMES[theme === 'system' ? 'system' : theme].name}`;
    },
    
    getIconHTML(type) {
        const icons = {
            sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
            moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
            monitor: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
        };
        return icons[type] || icons.sun;
    }
};

// Dark mode CSS
const darkModeCSS = `
    /* Dark mode specific overrides */
    .dark-mode {
        color-scheme: dark;
    }
    
    .dark-mode .card {
        background: var(--card-bg);
        border-color: var(--border);
    }
    
    .dark-mode .modal-content,
    .dark-mode .dropdown-menu {
        background: var(--bg-secondary);
        border-color: var(--border);
    }
    
    .dark-mode input,
    .dark-mode select,
    .dark-mode textarea {
        background: var(--bg-tertiary);
        border-color: var(--border);
        color: var(--text-primary);
    }
    
    .dark-mode .exam-card,
    .dark-mode .course-card {
        background: var(--card-bg);
        border-color: var(--border);
    }
    
    .dark-mode .exam-card:hover {
        border-color: var(--primary);
        box-shadow: 0 16px 40px rgba(56, 189, 248, 0.15);
    }
    
    .dark-mode .feature-card,
    .dark-mode .stat-card {
        background: var(--card-bg);
        border-color: var(--border);
    }
    
    .dark-mode .footer {
        background: var(--nav-bg);
    }
    
    .dark-mode .countdown {
        background: var(--bg-secondary);
        border-color: var(--border);
    }
    
    .dark-mode .cta-section {
        background: var(--bg-secondary);
        border-color: var(--border);
    }
    
    .dark-mode .timer-box {
        background: var(--bg-tertiary);
        color: var(--primary);
    }
    
    .dark-mode .progress-bar-bg {
        background: var(--bg-tertiary);
    }
    
    .dark-mode .mcq-option {
        background: var(--bg-secondary);
        border-color: var(--border);
        color: var(--text-primary);
    }
    
    .dark-mode .mcq-option:hover {
        background: var(--bg-tertiary);
        border-color: var(--primary);
    }
    
    .dark-mode .question-number-badge {
        background: var(--bg-tertiary);
        border-color: var(--primary);
        color: var(--primary);
    }
    
    .dark-mode .badge {
        background: var(--bg-tertiary);
    }
    
    .dark-mode .empty-exam-card {
        background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
        border-color: var(--border);
    }
    
    /* Smooth transitions */
    * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }
    
    /* Theme toggle animation */
    .theme-toggle-btn {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }
`;

// Inject dark mode CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = darkModeCSS;
document.head.appendChild(styleSheet);

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
});

// Export
window.Theme = Theme;
