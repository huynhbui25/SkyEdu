/**
 * SKY EDU - Dashboard Premium
 * Mở rộng từ dashboard cũ. Tương thích ngược với Dashboard.saveExamResult, getStats, renderCharts.
 */
const Dashboard = {
    STORAGE_KEY: 'skyedu_dashboard',
    CHARTS_LOADED: false,
    _chartInstances: {},

    init() {
        this.loadChartsLibrary();
        this.renderDashboard();
        this.setupAutoRefresh();
    },

    loadChartsLibrary() {
        if (window.Chart) {
            this.CHARTS_LOADED = true;
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => {
            this.CHARTS_LOADED = true;
            this.renderCharts();
        };
        document.head.appendChild(script);
    },

    /**
     * Lấy thống kê - tương thích ngược (giữ cấu trúc cũ + bổ sung)
     */
    getStats() {
        const history = this.getExamHistory();
        const gamification = window.Gamification ? Gamification.getStats() : null;
        const stats = LearningStats ? LearningStats.get() : null;

        return {
            totalExams: history.length,
            averageScore: history.length > 0
                ? Math.round(history.reduce((a, b) => a + b.score / b.total * 100, 0) / history.length)
                : 0,
            bestScore: history.length > 0
                ? Math.max(...history.map(h => Math.round(h.score / h.total * 100)))
                : 0,
            totalTime: history.reduce((a, b) => a + (b.timeSpent || 0), 0),
            streak: gamification?.currentStreak || 0,
            totalXP: gamification?.totalXP || 0,
            level: gamification ? Gamification.getLevelInfo(gamification).current.title : 'Newbie',
            recentScores: history.slice(-7).map(h => Math.round(h.score / h.total * 100)),
            dates: history.slice(-7).map(h => new Date(h.timestamp).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })),
            totalQuestions: stats ? stats.totalQuestions : history.reduce((a, b) => a + (b.total || 0), 0),
            accuracy: stats ? stats.accuracy : 0
        };
    },

    getExamHistory() {
        const history = JSON.parse(localStorage.getItem('examHistory') || '[]');
        return history;
    },

    /**
     * Render dashboard mới (Premium layout)
     */
    renderDashboard() {
        const stats = this.getStats();
        const user = SkyStore ? SkyStore.getCurrentUser() : null;
        const gam = SkyStore ? SkyStore.getGamification() : null;
        const rankInfo = (typeof RankSystem !== 'undefined' && gam)
            ? RankSystem.getByXP(gam.totalXP || 0)
            : null;
        const container = document.getElementById('dashboardContainer');
        if (!container) return;

        const displayName = user ? (user.fullname || user.username || 'Học viên') : 'Khách';
        const initials = displayName.charAt(0).toUpperCase();
        const avatarHTML = user && user.avatar
            ? `<img src="${user.avatar}" alt="${displayName}">`
            : initials;

        container.innerHTML = `
            <!-- HERO PROFILE -->
            <section class="sky-dash-hero">
                <div class="sky-dash-hero-bg"></div>
                <div class="sky-dash-hero-content">
                    <div class="sky-dash-avatar-wrap">
                        <div class="sky-dash-avatar">${avatarHTML}</div>
                        <div class="sky-dash-avatar-glow"></div>
                    </div>
                    <div class="sky-dash-info">
                        <h2 class="sky-dash-name">${displayName}</h2>
                        <div class="sky-dash-badges">
                            ${rankInfo ? RankSystem.getBadgeHTML(rankInfo.current) : ''}
                            ${gam && gam.currentStreak > 0 ? `<span class="sky-streak-chip"><span>🔥</span> ${gam.currentStreak} ngày</span>` : ''}
                        </div>
                        <div class="sky-dash-xp-row">
                            <div class="sky-dash-xp">
                                <span class="sky-dash-xp-value">⭐ ${(gam?.totalXP || 0).toLocaleString()}</span>
                                <span class="sky-dash-xp-label">XP</span>
                            </div>
                            <div class="sky-dash-xp">
                                <span class="sky-dash-xp-value">${rankInfo ? `Lv. ${rankInfo.level}` : 'Lv. 1'}</span>
                                <span class="sky-dash-xp-label">Cấp bậc</span>
                            </div>
                        </div>
                        ${rankInfo ? RankSystem.getProgressHTML(rankInfo) : ''}
                    </div>
                </div>
            </section>

            <!-- STATS GRID 6 -->
            <section class="sky-dash-stats">
                ${this._renderStatCard('📚', 'Tổng câu đã làm', stats.totalQuestions, 'linear-gradient(135deg, #667EEA, #764BA2)', 0)}
                ${this._renderStatCard('📝', 'Đề hoàn thành', stats.totalExams, 'linear-gradient(135deg, #F093FB, #F5576C)', 1)}
                ${this._renderStatCard('🎯', 'Tỉ lệ đúng', stats.accuracy + '%', 'linear-gradient(135deg, #4FACFE, #00F2FE)', 2)}
                ${this._renderStatCard('📊', 'Điểm trung bình', stats.averageScore + '%', 'linear-gradient(135deg, #FA709A, #FEE140)', 3)}
                ${this._renderStatCard('⏱️', 'Thời gian học', this._formatTime(stats.totalTime), 'linear-gradient(135deg, #FBC2EB, #A6C1EE)', 4)}
                ${this._renderStatCard(rankInfo ? rankInfo.current.icon : '🏆', 'Rank', rankInfo ? rankInfo.current.name : 'Tân Binh', 'linear-gradient(135deg, ' + (rankInfo ? rankInfo.current.color : '#FFD700') + ', #FFD700)', 5)}
            </section>

            <!-- HEATMAP -->
            <section class="sky-card">
                <div class="sky-card-header">
                    <h3><span class="sky-card-icon">📅</span> Lịch sử học tập</h3>
                    <span class="sky-card-sub">Heatmap 12 tuần gần nhất</span>
                </div>
                ${LearningStats ? LearningStats.renderHeatmap(12) : '<div class="sky-empty">Chưa có dữ liệu</div>'}
            </section>

            <!-- CHARTS -->
            <section class="sky-charts-grid">
                <div class="sky-card">
                    <div class="sky-card-header">
                        <h3><span class="sky-card-icon">📈</span> Điểm theo thời gian</h3>
                    </div>
                    <div class="sky-chart-container"><canvas id="progressChart"></canvas></div>
                </div>
                <div class="sky-card">
                    <div class="sky-card-header">
                        <h3><span class="sky-card-icon">🎯</span> Phân bố điểm</h3>
                    </div>
                    <div class="sky-chart-container"><canvas id="scoreDistribution"></canvas></div>
                </div>
                <div class="sky-card">
                    <div class="sky-card-header">
                        <h3><span class="sky-card-icon">📚</span> Câu làm mỗi ngày</h3>
                    </div>
                    <div class="sky-chart-container"><canvas id="questionsPerDay"></canvas></div>
                </div>
                <div class="sky-card">
                    <div class="sky-card-header">
                        <h3><span class="sky-card-icon">📊</span> Độ chính xác theo môn</h3>
                    </div>
                    <div class="sky-chart-container"><canvas id="accuracyBySubject"></canvas></div>
                </div>
            </section>

            <!-- AI INSIGHT -->
            <section class="sky-card sky-card-ai">
                <div class="sky-card-header">
                    <h3><span class="sky-card-icon">🧠</span> Phân tích học tập <span class="sky-ai-badge">AI</span></h3>
                    <span class="sky-card-sub">Điểm mạnh, điểm yếu & gợi ý</span>
                </div>
                ${AIInsight ? AIInsight.render() : '<div class="sky-empty">AI chưa sẵn sàng</div>'}
            </section>

            <!-- ACHIEVEMENTS -->
            <section class="sky-card">
                <div class="sky-card-header">
                    <h3><span class="sky-card-icon">🏅</span> Thành tích <span class="sky-ach-counter" id="skyAchCounter"></span></h3>
                    <span class="sky-card-sub">Hoàn thành điều kiện để nhận huy hiệu</span>
                </div>
                <div id="skyAchievements" class="sky-ach-grid">${this._renderAchievements()}</div>
            </section>

            <!-- RECENT ACTIVITY -->
            <section class="sky-card">
                <div class="sky-card-header">
                    <h3><span class="sky-card-icon">⚡</span> Hoạt động gần đây</h3>
                </div>
                <div id="recentList" class="sky-recent-list">${this.renderRecentActivity()}</div>
            </section>
        `;

        // Animation count-up
        requestAnimationFrame(() => {
            container.querySelectorAll('[data-counter]').forEach(el => {
                this._animateCounter(el, parseInt(el.dataset.counter) || 0);
            });
        });

        if (this.CHARTS_LOADED) {
            this.renderCharts();
        }
    },

    _renderStatCard(icon, label, value, gradient, idx) {
        return `<div class="sky-stat-card" style="--stat-bg:${gradient}; animation-delay:${idx * 0.08}s">
            <div class="sky-stat-icon">${icon}</div>
            <div class="sky-stat-content">
                <div class="sky-stat-value" data-counter="${typeof value === 'number' ? value : 0}">${value}</div>
                <div class="sky-stat-label">${label}</div>
            </div>
        </div>`;
    },

    _renderAchievements() {
        if (typeof AchievementEngine === 'undefined') {
            return '<div class="sky-empty">Achievement chưa sẵn sàng</div>';
        }
        const gam = SkyStore ? SkyStore.getGamification() : {};
        const stats = LearningStats ? LearningStats.get() : {};
        const earned = AchievementEngine.evaluate({
            totalExams: gam.totalExams || 0,
            totalXP: gam.totalXP || 0,
            streak: gam.currentStreak || 0,
            bestScore: gam.bestScore || 0,
            totalQuestions: stats.totalQuestions || 0
        });
        const list = AchievementEngine.list();
        const counter = document.getElementById('skyAchCounter');
        if (counter) counter.textContent = `${earned.length}/${list.length}`;

        return list.map(a => {
            const isEarned = earned.includes(a.id);
            return `<div class="sky-ach-item ${isEarned ? 'earned' : 'locked'}" data-id="${a.id}" title="${a.description}">
                <div class="sky-ach-icon">${isEarned ? a.icon : '🔒'}</div>
                <div class="sky-ach-name">${a.name}</div>
                <div class="sky-ach-desc">${a.description}</div>
            </div>`;
        }).join('');
    },

    _animateCounter(el, target) {
        const start = 0;
        const startTime = performance.now();
        const duration = 1200;
        const update = (t) => {
            const elapsed = t - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            el.textContent = current.toLocaleString('vi-VN');
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = target.toLocaleString('vi-VN');
        };
        requestAnimationFrame(update);
    },

    _formatTime(seconds) {
        if (!seconds) return '0 phút';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins} phút`;
    },

    /**
     * Render charts (Chart.js) - mở rộng từ 2 charts cũ lên 4
     */
    renderCharts() {
        if (!this.CHARTS_LOADED || typeof Chart === 'undefined') return;

        // Hủy instance cũ
        Object.values(this._chartInstances).forEach(c => { try { c.destroy(); } catch (e) {} });
        this._chartInstances = {};

        const stats = this.getStats();
        const history = this.getExamHistory();
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#F8FAFC' : '#0F172A';
        const gridColor = isDark ? '#334155' : '#E2E8F0';

        // 1) Progress line
        const progressCtx = document.getElementById('progressChart');
        if (progressCtx) {
            this._chartInstances.progress = new Chart(progressCtx, {
                type: 'line',
                data: {
                    labels: stats.dates.length ? stats.dates : ['Chưa có dữ liệu'],
                    datasets: [{
                        label: 'Điểm số',
                        data: stats.recentScores.length ? stats.recentScores : [0],
                        borderColor: '#1677FF',
                        backgroundColor: 'rgba(22, 119, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#1677FF',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: this._chartOptions(textColor, gridColor, 0, 100)
            });
        }

        // 2) Score distribution (doughnut)
        const scoreCtx = document.getElementById('scoreDistribution');
        if (scoreCtx) {
            const distribution = {
                excellent: history.filter(h => h.score / h.total >= 0.9).length,
                good: history.filter(h => h.score / h.total >= 0.7 && h.score / h.total < 0.9).length,
                average: history.filter(h => h.score / h.total >= 0.5 && h.score / h.total < 0.7).length,
                poor: history.filter(h => h.score / h.total < 0.5).length
            };
            this._chartInstances.dist = new Chart(scoreCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Xuất sắc (90%+)', 'Tốt (70-90%)', 'Trung bình (50-70%)', 'Cần cải thiện (<50%)'],
                    datasets: [{
                        data: [distribution.excellent, distribution.good, distribution.average, distribution.poor],
                        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: textColor, padding: 16 } },
                        tooltip: { backgroundColor: isDark ? '#1E293B' : '#fff', titleColor: textColor, bodyColor: textColor }
                    }
                }
            });
        }

        // 3) Questions per day (bar)
        const qpdCtx = document.getElementById('questionsPerDay');
        if (qpdCtx) {
            const byDate = (typeof LearningStats !== 'undefined' ? LearningStats.get() : {}).byDate || {};
            const last7 = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().substring(0, 10);
                last7.push({ label: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }), count: byDate[key] || 0 });
            }
            this._chartInstances.qpd = new Chart(qpdCtx, {
                type: 'bar',
                data: {
                    labels: last7.map(d => d.label),
                    datasets: [{
                        label: 'Số đề',
                        data: last7.map(d => d.count),
                        backgroundColor: 'rgba(139, 92, 246, 0.7)',
                        borderColor: '#8B5CF6',
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: this._chartOptions(textColor, gridColor, 0, undefined, true)
            });
        }

        // 4) Accuracy by subject (bar)
        const accCtx = document.getElementById('accuracyBySubject');
        if (accCtx) {
            const accBySub = (typeof LearningStats !== 'undefined' ? LearningStats.get() : {}).accuracyBySubject || {};
            const subjects = Object.keys(accBySub);
            if (subjects.length === 0) {
                accCtx.parentElement.innerHTML = '<div class="sky-empty">Chưa có dữ liệu môn học</div>';
            } else {
                this._chartInstances.acc = new Chart(accCtx, {
                    type: 'bar',
                    data: {
                        labels: subjects.map(s => this._prettySubject(s)),
                        datasets: [{
                            label: 'Độ chính xác (%)',
                            data: subjects.map(s => accBySub[s]),
                            backgroundColor: subjects.map(s => accBySub[s] >= 70 ? 'rgba(16, 185, 129, 0.7)' : accBySub[s] >= 50 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                            borderRadius: 8
                        }]
                    },
                    options: this._chartOptions(textColor, gridColor, 0, 100, true)
                });
            }
        }
    },

    _chartOptions(textColor, gridColor, yMin, yMax, hideLegend) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: !hideLegend },
                tooltip: {
                    backgroundColor: document.body.classList.contains('dark-mode') ? '#1E293B' : '#fff',
                    titleColor: textColor, bodyColor: textColor,
                    borderColor: gridColor, borderWidth: 1, padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: yMin === 0,
                    max: yMax,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        };
    },

    _prettySubject(s) {
        const map = { 'TSA': 'Tư duy', 'HSA': 'Năng lực', 'math': 'Toán', 'logic': 'Logic' };
        return map[s] || s;
    },

    /**
     * Recent activity (giữ nguyên logic cũ, làm đẹp hơn)
     */
    renderRecentActivity() {
        const history = this.getExamHistory().slice(-5).reverse();
        if (history.length === 0) {
            return `<div class="sky-empty">
                <div style="font-size:48px; margin-bottom:12px;">📝</div>
                <p>Chưa có hoạt động nào</p>
                <a href="phong-luyen-tsa/index.html" class="btn btn-primary" style="margin-top:16px; display:inline-flex; padding:10px 20px; border-radius:8px; text-decoration:none; color:white; font-weight:700; background:linear-gradient(135deg,#1677FF,#4364F7);">
                    Bắt đầu làm bài
                </a>
            </div>`;
        }
        return history.map(exam => {
            const score = exam.total > 0 ? Math.round((exam.score / exam.total) * 100) : 0;
            const scoreClass = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
            const date = new Date(exam.timestamp).toLocaleString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `<div class="sky-activity-item">
                <div class="sky-activity-icon ${scoreClass}">${score >= 80 ? '🎯' : score >= 50 ? '📝' : '📚'}</div>
                <div class="sky-activity-info">
                    <strong>${exam.name || 'Đề thi'}</strong>
                    <span>${date}</span>
                </div>
                <div class="sky-activity-score ${scoreClass}">${score}%</div>
            </div>`;
        }).join('');
    },

    /**
     * Render badges preview (giữ tương thích ngược - cũ gọi từ index)
     */
    renderBadgesPreview() {
        if (typeof AchievementEngine === 'undefined') {
            if (window.Gamification) return this._legacyBadgePreview();
            return '<p>Đăng nhập để xem thành tựu</p>';
        }
        const gam = SkyStore ? SkyStore.getGamification() : {};
        const stats = LearningStats ? LearningStats.get() : {};
        const earned = AchievementEngine.evaluate({
            totalExams: gam.totalExams || 0,
            totalXP: gam.totalXP || 0,
            streak: gam.currentStreak || 0,
            bestScore: gam.bestScore || 0,
            totalQuestions: stats.totalQuestions || 0
        });
        return AchievementEngine.renderGrouped(earned).earned;
    },

    _legacyBadgePreview() {
        const stats = Gamification.getStats();
        const badges = Object.entries(Gamification.BADGES).slice(0, 6);
        return badges.map(([id, badge]) => {
            const earned = stats.badges.includes(id);
            return `<div class="badge-preview ${earned ? 'earned' : 'locked'}" title="${badge.name}: ${badge.description}">
                <span class="badge-icon">${earned ? badge.icon : '🔒'}</span>
                <span class="badge-name">${badge.name}</span>
            </div>`;
        }).join('');
    },

    setupAutoRefresh() {
        window.addEventListener('themeChange', () => this.renderCharts());
        window.addEventListener('gamificationUpdate', () => this.renderDashboard());
        window.addEventListener('skyStoreUpdate', () => this.renderDashboard());
        window.addEventListener('rankUpdate', () => this.renderDashboard());
    },

    /**
     * Save exam result (giữ signature cũ - tương thích ngược)
     */
    saveExamResult(result) {
        try {
            const history = this.getExamHistory();
            history.push({ ...result, timestamp: new Date().toISOString() });
            localStorage.setItem('examHistory', JSON.stringify(history.slice(-200)));

            // Recompute learning stats
            if (typeof SkyStore !== 'undefined') SkyStore.saveLearningStats();

            // Process gamification
            if (window.Gamification) {
                const gamResult = Gamification.processExamResult(result);
                if (gamResult.newBadges && gamResult.newBadges.length > 0) {
                    gamResult.newBadges.forEach(badgeId => {
                        Gamification.showAchievement('badge', { badgeId });
                    });
                }
                if (gamResult.levelInfo && gamResult.levelInfo.next) {
                    const prevLevel = Gamification.getLevelInfo({
                        totalXP: (result.totalXP || 0) - (gamResult.xpEarned || 0)
                    });
                    if (prevLevel.level < gamResult.levelInfo.level) {
                        Gamification.showAchievement('levelup', gamResult.levelInfo);
                    }
                }
            }

            this.renderDashboard();
        } catch (e) {
            console.error('[Dashboard.saveExamResult]', e);
        }
    }
};

// Inject CSS cho Dashboard Premium
const dashboardCSS = `
.sky-dash-hero {
    position: relative; border-radius: 24px; overflow: hidden;
    background: linear-gradient(135deg, #1677FF 0%, #4364F7 50%, #6FB1FC 100%);
    padding: 32px; margin-bottom: 28px;
    box-shadow: 0 20px 60px rgba(22,119,255,0.25);
    color: white;
}
.sky-dash-hero-bg {
    position: absolute; inset: 0; opacity: 0.15;
    background-image:
        radial-gradient(circle at 20% 30%, white 1px, transparent 1px),
        radial-gradient(circle at 70% 60%, white 1px, transparent 1px);
    background-size: 30px 30px, 40px 40px;
    pointer-events: none;
}
.sky-dash-hero-content {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
}
.sky-dash-avatar-wrap { position: relative; flex-shrink: 0; }
.sky-dash-avatar {
    width: 96px; height: 96px; border-radius: 50%;
    background: rgba(255,255,255,0.25); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; font-weight: 800; color: white;
    border: 4px solid rgba(255,255,255,0.4);
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: float 3s ease-in-out infinite;
}
.sky-dash-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sky-dash-avatar-glow {
    position: absolute; inset: -8px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.3), transparent 60%);
    z-index: -1;
    animation: pulse 2s ease-in-out infinite;
}
.sky-dash-info { flex: 1; min-width: 240px; }
.sky-dash-name { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
.sky-dash-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.sky-streak-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 12px; border-radius: 999px;
    background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
    font-size: 13px; font-weight: 700;
}
.sky-dash-xp-row { display: flex; gap: 20px; margin-bottom: 12px; flex-wrap: wrap; }
.sky-dash-xp { display: flex; flex-direction: column; }
.sky-dash-xp-value { font-size: 22px; font-weight: 800; line-height: 1.1; }
.sky-dash-xp-label { font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

.sky-dash-stats {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px; margin-bottom: 24px;
}
.sky-stat-card {
    display: flex; align-items: center; gap: 14px;
    padding: 20px; border-radius: 16px;
    background: var(--card-bg, #FFFFFF);
    border: 1px solid var(--border, #E2E8F0);
    box-shadow: 0 4px 12px rgba(5,26,57,0.04);
    transition: all .3s; opacity: 0;
    animation: slideUp 0.5s ease forwards;
    position: relative; overflow: hidden;
}
.sky-stat-card::before {
    content: ''; position: absolute; inset: 0;
    background: var(--stat-bg); opacity: 0.05; pointer-events: none;
}
.sky-stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(5,26,57,0.1); }
.sky-stat-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: var(--stat-bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: white; flex-shrink: 0;
    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
    position: relative; z-index: 1;
}
.sky-stat-content { flex: 1; min-width: 0; position: relative; z-index: 1; }
.sky-stat-value { font-size: 22px; font-weight: 800; color: var(--text-primary, #0F172A); line-height: 1.1; }
.sky-stat-label { font-size: 12px; color: var(--text-muted, #94A3B8); font-weight: 600; margin-top: 2px; }

.sky-card {
    background: var(--card-bg, #FFFFFF);
    border: 1px solid var(--border, #E2E8F0);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 4px 12px rgba(5,26,57,0.04);
}
.sky-card-ai { background: linear-gradient(135deg, rgba(167, 139, 250, 0.05), rgba(96, 165, 250, 0.05)); }
.sky-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.sky-card-header h3 { font-size: 17px; font-weight: 800; color: var(--text-primary, #0F172A); margin: 0; display: flex; align-items: center; gap: 8px; }
.sky-card-icon { font-size: 22px; }
.sky-card-sub { font-size: 12px; color: var(--text-muted, #94A3B8); font-weight: 600; }
.sky-ai-badge {
    background: linear-gradient(135deg, #8B5CF6, #EC4899);
    color: white; font-size: 10px; padding: 2px 8px; border-radius: 999px;
    font-weight: 800; letter-spacing: 0.5px;
}
.sky-ach-counter {
    background: var(--bg-secondary, #F8FAFC); color: var(--text-secondary, #475569);
    padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;
}
.sky-ach-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
}

.sky-charts-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px; margin-bottom: 24px;
}
.sky-chart-container { position: relative; height: 260px; }

.sky-recent-list { display: flex; flex-direction: column; gap: 10px; }
.sky-activity-item {
    display: flex; align-items: center; gap: 14px;
    padding: 14px; background: var(--bg-secondary, #F8FAFC);
    border-radius: 12px; transition: all .2s;
}
.sky-activity-item:hover { background: var(--bg-tertiary, #E2E8F0); transform: translateX(4px); }
.sky-activity-icon {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
}
.sky-activity-icon.high { background: rgba(16,185,129,0.15); }
.sky-activity-icon.medium { background: rgba(245,158,11,0.15); }
.sky-activity-icon.low { background: rgba(239,68,68,0.15); }
.sky-activity-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sky-activity-info strong { color: var(--text-primary, #0F172A); font-weight: 700; }
.sky-activity-info span { color: var(--text-muted, #94A3B8); font-size: 12px; }
.sky-activity-score {
    font-size: 18px; font-weight: 800; padding: 6px 14px; border-radius: 10px;
}
.sky-activity-score.high { background: rgba(16,185,129,0.15); color: #10B981; }
.sky-activity-score.medium { background: rgba(245,158,11,0.15); color: #F59E0B; }
.sky-activity-score.low { background: rgba(239,68,68,0.15); color: #EF4444; }

@keyframes slideUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } }

@media (max-width: 768px) {
    .sky-dash-hero-content { flex-direction: column; text-align: center; }
    .sky-dash-xp-row { justify-content: center; }
    .sky-dash-stats { grid-template-columns: repeat(2, 1fr); }
    .sky-charts-grid { grid-template-columns: 1fr; }
    .sky-stat-card { padding: 14px; }
    .sky-stat-value { font-size: 18px; }
}
`;

const dashboardStyle = document.createElement('style');
dashboardStyle.textContent = dashboardCSS;
document.head.appendChild(dashboardStyle);

window.Dashboard = Dashboard;
