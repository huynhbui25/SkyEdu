/**
 * SKY EDU - Admin Pro
 * Mở rộng Admin Panel: 4 trang mới (Overview, Ranks, Achievements, Analytics)
 * Tương thích: dùng các hàm có sẵn trong admin.html (App.navigateTo, renderDashboard, ...)
 * + bổ sung SkyStore/RankSystem/AchievementEngine/LearningStats.
 */
(function (global) {
    'use strict';

    const STORAGE_ADMIN_META = 'skyedu_admin_meta';

    const AdminPro = {
        STORAGE_ADMIN_META: STORAGE_ADMIN_META,
        _charts: {},

        /**
         * Trang 1: Tổng quan
         */
        async renderOverview() {
            this._destroyCharts();
            // Stats
            const stats = this._gatherOverviewStats();
            const el = document.getElementById('admOverviewStats');
            if (el) {
                el.innerHTML = `
                    <div class="stat-card bg-blue"><div class="stat-card-icon">👥</div><div class="stat-card-value">${stats.totalUsers}</div><div class="stat-card-label">Tổng user</div></div>
                    <div class="stat-card bg-green"><div class="stat-card-icon">⚡</div><div class="stat-card-value">${stats.activeUsers}</div><div class="stat-card-label">User hoạt động</div></div>
                    <div class="stat-card bg-orange"><div class="stat-card-icon">📝</div><div class="stat-card-value">${stats.totalExams}</div><div class="stat-card-label">Tổng bài làm</div></div>
                    <div class="stat-card bg-purple"><div class="stat-card-icon">❓</div><div class="stat-card-value">${stats.totalQuestions.toLocaleString()}</div><div class="stat-card-label">Tổng câu hỏi</div></div>
                    <div class="stat-card bg-pink"><div class="stat-card-icon">📊</div><div class="stat-card-value">${stats.avgScore}%</div><div class="stat-card-label">Điểm TB</div></div>
                `;
            }

            // Recent users
            const recentEl = document.getElementById('admRecentUsers');
            if (recentEl) {
                const users = await this._getAllUsers();
                const recent = users.slice(-5).reverse();
                if (recent.length === 0) {
                    recentEl.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>Chưa có user nào</p></div>';
                } else {
                    recentEl.innerHTML = `<table class="adm-table">
                        <thead><tr><th>Username</th><th>Họ tên</th><th>Email</th><th>Ngày tạo</th><th>Role</th></tr></thead>
                        <tbody>${recent.map(u => `<tr>
                            <td>${this._esc(u.username)}</td>
                            <td>${this._esc(u.fullname)}</td>
                            <td>${this._esc(u.email)}</td>
                            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
                            <td><span class="badge ${u.role === 'admin' ? 'bg-orange' : ''}">${u.role || 'user'}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>`;
                }
            }

            // Chart: User growth 30 ngày
            await this._renderUserGrowthChart();
            // Chart: Activity
            await this._renderActivityChart();
        },

        /**
         * Trang 2: Quản lý Rank
         */
        renderRanks() {
            const ranks = (typeof RankSystem !== 'undefined') ? RankSystem.getAll() : [];
            const el = document.getElementById('admRanksList');
            if (!el) return;
            el.innerHTML = `<table class="adm-table">
                <thead><tr><th>Cấp</th><th>Tên</th><th>Icon</th><th>XP yêu cầu</th><th>Thao tác</th></tr></thead>
                <tbody>${ranks.map(r => `<tr>
                    <td><strong>Lv. ${r.level}</strong></td>
                    <td><span class="sky-rank-badge" style="--rank-color:${r.color}"><span class="sky-rank-icon">${r.icon}</span><span class="sky-rank-name">${r.name}</span></span></td>
                    <td style="font-size:20px;">${r.icon}</td>
                    <td><input type="number" class="form-control adm-rank-xp" data-level="${r.level}" value="${r.minXP}" style="max-width:120px; display:inline-block; padding:4px 8px;"></td>
                    <td>
                        <button class="btn btn-primary btn-sm adm-rank-save" data-level="${r.level}">💾 Lưu</button>
                    </td>
                </tr>`).join('')}</tbody>
            </table>`;

            el.querySelectorAll('.adm-rank-save').forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.dataset.level;
                    const input = el.querySelector(`.adm-rank-xp[data-level="${level}"]`);
                    const newXP = parseInt(input.value);
                    if (isNaN(newXP) || newXP < 0) {
                        SkyUI.toast('XP phải là số không âm', 'error');
                        return;
                    }
                    SkyUI.confirm({
                        title: 'Xác nhận thay đổi',
                        message: `Đổi XP yêu cầu rank ${level} thành ${newXP}?`,
                        okText: 'Lưu'
                    }).then(ok => {
                        if (!ok) return;
                        RankSystem.updateRankMinXP(parseInt(level), newXP);
                        SkyUI.toast('Đã cập nhật rank!', 'success');
                        this.renderRanks();
                    });
                });
            });

            const resetBtn = document.getElementById('admRanksReset');
            if (resetBtn) {
                resetBtn.onclick = () => {
                    SkyUI.confirm({
                        title: 'Reset Rank',
                        message: 'Đặt lại XP yêu cầu về mặc định?',
                        okText: 'Reset',
                        danger: true
                    }).then(ok => {
                        if (!ok) return;
                        RankSystem.resetAll();
                        SkyUI.toast('Đã reset rank về mặc định!', 'success');
                        this.renderRanks();
                    });
                };
            }
        },

        /**
         * Trang 3: Quản lý Achievement
         */
        renderAchievements() {
            const list = (typeof AchievementEngine !== 'undefined') ? AchievementEngine.list() : [];
            const el = document.getElementById('admAchList');
            if (!el) return;
            if (list.length === 0) {
                el.innerHTML = '<div class="empty-state"><div class="icon">🏅</div><p>Chưa có achievement nào</p></div>';
            } else {
                el.innerHTML = `<table class="adm-table">
                    <thead><tr><th>Icon</th><th>Tên</th><th>Mô tả</th><th>Điều kiện</th><th>Thao tác</th></tr></thead>
                    <tbody>${list.map(a => `<tr>
                        <td style="font-size:24px;">${a.icon}</td>
                        <td><strong>${this._esc(a.name)}</strong></td>
                        <td>${this._esc(a.description)}</td>
                        <td><code>${a.condition.type} ≥ ${a.condition.value}</code></td>
                        <td>
                            <button class="btn btn-secondary btn-sm adm-ach-edit" data-id="${a.id}">✏️ Sửa</button>
                            <button class="btn btn-danger btn-sm adm-ach-del" data-id="${a.id}">🗑️</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table>`;

                el.querySelectorAll('.adm-ach-edit').forEach(btn => {
                    btn.addEventListener('click', () => this._editAchievement(btn.dataset.id));
                });
                el.querySelectorAll('.adm-ach-del').forEach(btn => {
                    btn.addEventListener('click', () => {
                        SkyUI.confirm({
                            title: 'Xóa achievement',
                            message: 'Xóa achievement này?',
                            okText: 'Xóa', danger: true
                        }).then(ok => {
                            if (!ok) return;
                            AchievementEngine.remove(btn.dataset.id);
                            SkyUI.toast('Đã xóa!', 'success');
                            this.renderAchievements();
                        });
                    });
                });
            }

            const createBtn = document.getElementById('admAchCreate');
            if (createBtn) createBtn.onclick = () => this._editAchievement(null);
            const resetBtn = document.getElementById('admAchReset');
            if (resetBtn) resetBtn.onclick = () => {
                SkyUI.confirm({
                    title: 'Reset Achievement',
                    message: 'Khôi phục danh sách achievement mặc định?',
                    okText: 'Reset', danger: true
                }).then(ok => {
                    if (!ok) return;
                    AchievementEngine.reset();
                    SkyUI.toast('Đã reset!', 'success');
                    this.renderAchievements();
                });
            };
        },

        _editAchievement(id) {
            const item = id ? AchievementEngine.get(id) : { name: '', icon: '🏅', description: '', condition: { type: 'totalExams', value: 1 } };
            if (!item) return;
            const body = `
                <div class="form-group">
                    <label class="form-label">Icon</label>
                    <input type="text" class="form-control" id="admAchIcon" value="${item.icon || ''}" maxlength="4">
                </div>
                <div class="form-group">
                    <label class="form-label">Tên <span class="required">*</span></label>
                    <input type="text" class="form-control" id="admAchName" value="${this._esc(item.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Mô tả</label>
                    <input type="text" class="form-control" id="admAchDesc" value="${this._esc(item.description || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Loại điều kiện</label>
                        <select class="form-control" id="admAchType">
                            <option value="totalExams" ${item.condition.type === 'totalExams' ? 'selected' : ''}>Tổng bài thi</option>
                            <option value="totalXP" ${item.condition.type === 'totalXP' ? 'selected' : ''}>Tổng XP</option>
                            <option value="streak" ${item.condition.type === 'streak' ? 'selected' : ''}>Streak ngày</option>
                            <option value="bestScore" ${item.condition.type === 'bestScore' ? 'selected' : ''}>Điểm cao nhất</option>
                            <option value="totalQuestions" ${item.condition.type === 'totalQuestions' ? 'selected' : ''}>Tổng câu hỏi</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Giá trị</label>
                        <input type="number" class="form-control" id="admAchValue" value="${item.condition.value || 0}">
                    </div>
                </div>
            `;
            SkyUI.modal({
                title: id ? 'Sửa Achievement' : 'Tạo Achievement',
                body: body,
                footer: `<button class="btn btn-secondary" onclick="SkyUI.closeModal()">Hủy</button>
                         <button class="btn btn-primary" id="admAchSaveBtn">${id ? 'Cập nhật' : 'Tạo'}</button>`
            });
            setTimeout(() => {
                const saveBtn = document.getElementById('admAchSaveBtn');
                if (saveBtn) {
                    saveBtn.onclick = () => {
                        const data = {
                            name: document.getElementById('admAchName').value.trim(),
                            icon: document.getElementById('admAchIcon').value.trim() || '🏅',
                            description: document.getElementById('admAchDesc').value.trim(),
                            condition: {
                                type: document.getElementById('admAchType').value,
                                value: parseInt(document.getElementById('admAchValue').value) || 0
                            }
                        };
                        if (!data.name) {
                            SkyUI.toast('Vui lòng nhập tên', 'error');
                            return;
                        }
                        if (id) {
                            AchievementEngine.update(id, data);
                            SkyUI.toast('Đã cập nhật!', 'success');
                        } else {
                            AchievementEngine.create(data);
                            SkyUI.toast('Đã tạo!', 'success');
                        }
                        SkyUI.closeModal();
                        this.renderAchievements();
                    };
                }
            }, 50);
        },

        /**
         * Trang 4: Analytics
         */
        async renderAnalytics() {
            this._destroyCharts();
            const stats = this._gatherOverviewStats();
            const ls = (typeof LearningStats !== 'undefined') ? LearningStats.get() : { byDate: {}, accuracyBySubject: {} };

            // Stats cards
            const el = document.getElementById('admAnalyticsStats');
            if (el) {
                el.innerHTML = `
                    <div class="stat-card bg-blue"><div class="stat-card-icon">📈</div><div class="stat-card-value">+${stats.newUsersThisMonth}</div><div class="stat-card-label">User mới (30 ngày)</div></div>
                    <div class="stat-card bg-green"><div class="stat-card-icon">📝</div><div class="stat-card-value">${stats.totalExams}</div><div class="stat-card-label">Bài làm</div></div>
                    <div class="stat-card bg-orange"><div class="stat-card-icon">🎯</div><div class="stat-card-value">${stats.accuracy}%</div><div class="stat-card-label">Tỉ lệ đúng TB</div></div>
                    <div class="stat-card bg-purple"><div class="stat-card-icon">🏆</div><div class="stat-card-value">${stats.totalUsers}</div><div class="stat-card-label">Tổng user</div></div>
                `;
            }

            // Subject chart
            const subjects = Object.keys(ls.accuracyBySubject || {});
            const subEl = document.getElementById('admSubjectChart');
            if (subEl && typeof Chart !== 'undefined') {
                if (subjects.length === 0) {
                    subEl.parentElement.innerHTML = '<div class="empty-state" style="padding:60px;"><div class="icon">📊</div><p>Chưa có dữ liệu môn học</p></div>';
                } else {
                    const total = subjects.reduce((a, s) => {
                        const history = SkyStore.getExamHistory().filter(h => (h.subject || 'TSA') === s);
                        return a + history.length;
                    }, 0);
                    this._charts.subject = new Chart(subEl, {
                        type: 'doughnut',
                        data: {
                            labels: subjects,
                            datasets: [{
                                data: subjects.map(s => SkyStore.getExamHistory().filter(h => (h.subject || 'TSA') === s).length),
                                backgroundColor: ['#1677FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                    });
                }
            }

            // Completion chart
            const compEl = document.getElementById('admCompletionChart');
            if (compEl && typeof Chart !== 'undefined') {
                const history = SkyStore.getExamHistory();
                const completed = history.filter(h => (h.answered || 0) === (h.total || 0)).length;
                const partial = history.length - completed;
                this._charts.completion = new Chart(compEl, {
                    type: 'pie',
                    data: {
                        labels: ['Hoàn thành', 'Chưa hoàn thành'],
                        datasets: [{
                            data: [completed, partial],
                            backgroundColor: ['#10B981', '#F59E0B']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                });
            }
        },

        // === Helpers ===
        _gatherOverviewStats() {
            const users = SkyStore.getUsers();
            const history = SkyStore.getExamHistory();
            const ls = (typeof LearningStats !== 'undefined') ? LearningStats.get() : { totalQuestions: 0, accuracy: 0 };
            const totalExams = history.length;
            const avgScore = totalExams > 0
                ? Math.round(history.reduce((a, b) => a + (b.total > 0 ? (b.score / b.total) * 100 : 0), 0) / totalExams)
                : 0;
            return {
                totalUsers: users.length,
                activeUsers: users.filter(u => !u.banned).length,
                newUsersThisMonth: users.filter(u => u.createdAt && (Date.now() - u.createdAt) < 30 * 24 * 3600 * 1000).length,
                totalExams: totalExams,
                totalQuestions: ls.totalQuestions || 0,
                avgScore: avgScore,
                accuracy: ls.accuracy || 0
            };
        },

        async _getAllUsers() {
            // Ưu tiên Firebase nếu có
            try {
                if (typeof FirebaseAPI !== 'undefined' && FirebaseAPI.isReady && FirebaseAPI.isReady()) {
                    const fb = await FirebaseAPI.getAllUsers();
                    if (fb && fb.length) return fb;
                }
            } catch (e) {}
            return SkyStore.getUsers();
        },

        async _renderUserGrowthChart() {
            const el = document.getElementById('admUserGrowthChart');
            if (!el || typeof Chart === 'undefined') return;
            const users = await this._getAllUsers();
            const last30 = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().substring(0, 10);
                const count = users.filter(u => {
                    if (!u.createdAt) return false;
                    const t = (typeof u.createdAt === 'number') ? u.createdAt : new Date(u.createdAt).getTime();
                    const ts = new Date(t).toISOString().substring(0, 10);
                    return ts === key;
                }).length;
                last30.push({ label: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }), count });
            }
            this._charts.userGrowth = new Chart(el, {
                type: 'line',
                data: {
                    labels: last30.map(d => d.label),
                    datasets: [{
                        label: 'User mới',
                        data: last30.map(d => d.count),
                        borderColor: '#1677FF',
                        backgroundColor: 'rgba(22,119,255,0.15)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        },

        async _renderActivityChart() {
            const el = document.getElementById('admActivityChart');
            if (!el || typeof Chart === 'undefined') return;
            const history = SkyStore.getExamHistory();
            const last14 = [];
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().substring(0, 10);
                const count = history.filter(h => (h.timestamp || '').substring(0, 10) === key).length;
                last14.push({ label: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }), count });
            }
            this._charts.activity = new Chart(el, {
                type: 'bar',
                data: {
                    labels: last14.map(d => d.label),
                    datasets: [{
                        label: 'Lượt làm bài',
                        data: last14.map(d => d.count),
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: '#10B981',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        },

        _destroyCharts() {
            Object.values(this._charts).forEach(c => { try { c.destroy(); } catch (e) {} });
            this._charts = {};
        },

        _esc(s) {
            if (typeof s !== 'string') return '';
            return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
    };

    // Inject CSS cho admin tables
    const css = `
        .adm-table {
            width: 100%; border-collapse: collapse;
            background: var(--card-bg, #FFFFFF);
            border-radius: 8px; overflow: hidden;
        }
        .adm-table th, .adm-table td {
            padding: 12px 14px; text-align: left;
            border-bottom: 1px solid var(--border, #E2E8F0);
            font-size: 13px;
        }
        .adm-table thead {
            background: var(--bg-secondary, #F8FAFC);
        }
        .adm-table th {
            font-weight: 700; color: var(--text-secondary, #475569);
            text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
        }
        .adm-table tbody tr:hover { background: var(--bg-secondary, #F8FAFC); }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        .sky-rank-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 999px;
            background: color-mix(in srgb, var(--rank-color) 12%, transparent);
            border: 1px solid color-mix(in srgb, var(--rank-color) 30%, transparent);
            color: var(--rank-color);
            font-size: 12px; font-weight: 700;
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    global.AdminPro = AdminPro;
})(window);
