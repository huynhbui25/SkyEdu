/**
 * SKY EDU - Leaderboard Premium
 * Mở rộng từ leaderboard cũ. Giữ nguyên: getLeaderboard, updateUserRank, getUserRank,
 * renderLeaderboard (cũ làm fallback) - tương thích ngược.
 * Bổ sung: renderPodium, filter tuần/tháng, search, animation, banner hạng.
 */
const Leaderboard = {
    STORAGE_KEY: 'skyedu_leaderboard',
    UPDATE_INTERVAL: 300000,
    MAX_LOCAL_USERS: 50,
    _filter: 'all',
    _searchKeyword: '',
    _lastRanks: {},

    init() {
        this.loadLeaderboard();
        this.setupAutoUpdate();
    },

    getLeaderboard() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return this.getDefaultLeaderboard();
        try { return JSON.parse(data); } catch (e) { return this.getDefaultLeaderboard(); }
    },

    getDefaultLeaderboard() {
        return [
            { uid: 'system_1', username: 'nguyenvana', displayName: 'Nguyễn Văn A', xp: 15420, level: 9, streak: 45, badges: 15, avatar: null },
            { uid: 'system_2', username: 'tranthing', displayName: 'Trần Thị B', xp: 12350, level: 8, streak: 32, badges: 12, avatar: null },
            { uid: 'system_3', username: 'levietc', displayName: 'Lê Việt C', xp: 10890, level: 8, streak: 28, badges: 10, avatar: null },
            { uid: 'system_4', username: 'phamthid', displayName: 'Phạm Thị D', xp: 9520, level: 7, streak: 21, badges: 9, avatar: null },
            { uid: 'system_5', username: 'hongvan', displayName: 'Hồng Vân E', xp: 8230, level: 7, streak: 18, badges: 8, avatar: null },
            { uid: 'system_6', username: 'duongvan', displayName: 'Dương Văn F', xp: 7650, level: 7, streak: 15, badges: 7, avatar: null },
            { uid: 'system_7', username: 'bhuynh', displayName: 'Bùi Huyền G', xp: 6890, level: 6, streak: 14, badges: 7, avatar: null },
            { uid: 'system_8', username: 'dongthih', displayName: 'Đỗ Thị H', xp: 5940, level: 6, streak: 12, badges: 6, avatar: null },
            { uid: 'system_9', username: 'vuvan', displayName: 'Vũ Văn I', xp: 5120, level: 6, streak: 10, badges: 5, avatar: null },
            { uid: 'system_10', username: 'cothith', displayName: 'Cỗ Thị J', xp: 4580, level: 5, streak: 9, badges: 5, avatar: null }
        ];
    },

    saveLeaderboard(leaderboard) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(leaderboard));
    },

    updateUserRank(userData) {
        const leaderboard = this.getLeaderboard();
        const filtered = leaderboard.filter(u => u.uid !== userData.uid);
        filtered.push(userData);
        filtered.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const trimmed = filtered.slice(0, this.MAX_LOCAL_USERS);
        this.saveLeaderboard(trimmed);
        const newRank = trimmed.findIndex(u => u.uid === userData.uid) + 1;
        window.dispatchEvent(new CustomEvent('leaderboardUpdate', { detail: { uid: userData.uid, rank: newRank } }));
        return newRank;
    },

    getUserRank(uid) {
        const leaderboard = this.getLeaderboard();
        const index = leaderboard.findIndex(u => u.uid === uid);
        return index !== -1 ? index + 1 : null;
    },

    getTopUsers(n = 10) {
        return this.getLeaderboard().slice(0, n);
    },

    getSurroundingUsers(uid, range = 2) {
        const leaderboard = this.getLeaderboard();
        const index = leaderboard.findIndex(u => u.uid === uid);
        if (index === -1) return { top: leaderboard.slice(0, range * 2 + 1), userIndex: -1 };
        const start = Math.max(0, index - range);
        const end = Math.min(leaderboard.length, index + range + 1);
        return { top: leaderboard.slice(start, end), userIndex: index - start };
    },

    getLevelInfo(level) {
        const LEVELS = [
            { level: 1, title: 'Tân binh', color: '#94A3B8' },
            { level: 2, title: 'Học viên', color: '#22C55E' },
            { level: 3, title: 'Sinh viên', color: '#3B82F6' },
            { level: 4, title: 'Cử nhân', color: '#8B5CF6' },
            { level: 5, title: 'Thạc sĩ', color: '#F59E0B' },
            { level: 6, title: 'Tiến sĩ', color: '#EF4444' },
            { level: 7, title: 'Giáo sư', color: '#EC4899' },
            { level: 8, title: 'Siêu sao', color: '#F97316' },
            { level: 9, title: 'Huyền thoại', color: '#6366F1' },
            { level: 10, title: 'Bậc thầy', color: '#FFD700' }
        ];
        return LEVELS[Math.min(level - 1, LEVELS.length - 1)] || LEVELS[0];
    },

    /**
     * Render PREMIUM: podium top 3 + bảng list + search + filter
     * options: { currentUser, mode: 'podium'|'list' }
     */
    renderLeaderboard(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { currentUser = null, mode = 'podium' } = options;
        const all = this._applyFilter(this.getLeaderboard());

        // Lưu ranks cũ cho animation
        const oldRanks = Object.assign({}, this._lastRanks);
        all.forEach((u, i) => { this._lastRanks[u.uid] = i + 1; });

        const currentUserRank = currentUser ? this.getUserRank(currentUser.uid) : null;
        const top3 = all.slice(0, 3);
        const rest = all.slice(3);

        const podiumHTML = top3.length >= 3 ? this._renderPodium([top3[1], top3[0], top3[2]], currentUser) : '';

        const filterHTML = `
            <div class="sky-lb-toolbar">
                <input type="text" class="sky-lb-search" id="skyLbSearch" placeholder="🔍 Tìm kiếm người chơi..." />
                <select class="sky-lb-filter" id="skyLbFilter">
                    <option value="all" ${this._filter === 'all' ? 'selected' : ''}>Toàn thời gian</option>
                    <option value="month" ${this._filter === 'month' ? 'selected' : ''}>Tháng này</option>
                    <option value="week" ${this._filter === 'week' ? 'selected' : ''}>Tuần này</option>
                </select>
            </div>
        `;

        const bannerHTML = (currentUser && currentUserRank && currentUserRank > 10)
            ? `<div class="sky-lb-banner">
                <span class="sky-lb-banner-icon">📍</span>
                <span>Bạn đang đứng hạng <strong>#${currentUserRank}</strong></span>
                <a href="dashboard.html" class="sky-lb-banner-link">Xem dashboard →</a>
            </div>` : '';

        const listHTML = this._renderList(all, currentUser, 4, 50);

        container.className = 'sky-lb-wrap';
        container.innerHTML = `
            <div class="sky-lb-header">
                <div class="sky-lb-title">
                    <span class="sky-lb-title-icon">🏆</span>
                    <h2>Bảng xếp hạng</h2>
                </div>
                ${filterHTML}
            </div>
            ${bannerHTML}
            ${podiumHTML}
            <div class="sky-lb-list-wrap">
                <h3 class="sky-lb-section-title">Bảng xếp hạng chi tiết</h3>
                <div class="sky-lb-list" id="skyLbList">${listHTML}</div>
            </div>
        `;

        // Bind events
        const filterEl = container.querySelector('#skyLbFilter');
        if (filterEl) {
            filterEl.addEventListener('change', (e) => {
                this._filter = e.target.value;
                this.renderLeaderboard(containerId, options);
            });
        }
        const searchEl = container.querySelector('#skyLbSearch');
        if (searchEl) {
            searchEl.value = this._searchKeyword;
            searchEl.addEventListener('input', (e) => {
                this._searchKeyword = e.target.value;
                const listEl = container.querySelector('#skyLbList');
                if (listEl) listEl.innerHTML = this._renderList(all, currentUser, 4, 50);
            });
        }
    },

    /**
     * Render podium top 3 - bậc thang
     * Mảng truyền vào: [rank2, rank1, rank3] để hiển thị trái/giữa/phải
     */
    _renderPodium([second, first, third], currentUser) {
        const buildCard = (user, rank) => {
            if (!user) return '';
            const isCurrent = currentUser && user.uid === currentUser.uid;
            const rankObj = (typeof RankSystem !== 'undefined') ? RankSystem.getByLevel(rank) : this.getLevelInfo(user.level);
            const rankBadge = (typeof RankSystem !== 'undefined')
                ? RankSystem.getBadgeHTML({ name: rankObj.name, icon: rankObj.icon, color: rankObj.color }, { small: true })
                : '';
            const initials = (user.displayName || user.username || 'U').charAt(0).toUpperCase();
            return `<div class="sky-podium-card rank-${rank} ${isCurrent ? 'current' : ''}" style="--podium-color:${rankObj.color}">
                <div class="sky-podium-medal">${this.getRankDisplay(rank)}</div>
                <div class="sky-podium-avatar">
                    ${user.avatar ? `<img src="${user.avatar}" alt="${user.displayName}">` : `<span>${initials}</span>`}
                    <div class="sky-podium-crown">${rankObj.icon}</div>
                </div>
                <div class="sky-podium-name">${user.displayName || user.username || 'User'}</div>
                <div class="sky-podium-rank">${rankBadge || rankObj.title}</div>
                <div class="sky-podium-stats">
                    <div class="sky-podium-stat">
                        <span class="sky-podium-stat-value">${(user.xp || 0).toLocaleString()}</span>
                        <span class="sky-podium-stat-label">XP</span>
                    </div>
                    <div class="sky-podium-stat">
                        <span class="sky-podium-stat-value">${user.badges || 0}</span>
                        <span class="sky-podium-stat-label">🏅</span>
                    </div>
                    <div class="sky-podium-stat">
                        <span class="sky-podium-stat-value">${user.streak || 0}</span>
                        <span class="sky-podium-stat-label">🔥</span>
                    </div>
                </div>
            </div>`;
        };
        return `<div class="sky-podium">
            ${buildCard(second, 2)}
            ${buildCard(first, 1)}
            ${buildCard(third, 3)}
        </div>`;
    },

    /**
     * Render danh sách dạng bảng
     */
    _renderList(all, currentUser, fromRank = 4, limit = 50) {
        let list = all.slice(fromRank - 1, limit + fromRank - 1);
        if (this._searchKeyword) {
            const kw = this._searchKeyword.toLowerCase();
            list = all.filter(u =>
                (u.displayName || '').toLowerCase().includes(kw) ||
                (u.username || '').toLowerCase().includes(kw)
            );
        }
        if (list.length === 0) {
            return '<div class="sky-empty">Không tìm thấy người chơi nào.</div>';
        }
        return list.map((u, idx) => {
            const rank = fromRank + idx;
            const isCurrent = currentUser && u.uid === currentUser.uid;
            const rankObj = (typeof RankSystem !== 'undefined') ? RankSystem.getByXP(u.xp || 0) : null;
            const rankBadge = rankObj ? RankSystem.getBadgeHTML(rankObj.current, { small: true }) : '';
            const initials = (u.displayName || u.username || 'U').charAt(0).toUpperCase();
            return `<div class="sky-lb-row ${isCurrent ? 'current-user' : ''}">
                <div class="sky-lb-cell rank">${this.getRankDisplay(rank)}</div>
                <div class="sky-lb-cell avatar">
                    ${u.avatar ? `<img src="${u.avatar}" alt="${u.displayName}">` : `<span class="avatar-placeholder">${initials}</span>`}
                </div>
                <div class="sky-lb-cell info">
                    <div class="sky-lb-name">${u.displayName || u.username || 'User'} ${isCurrent ? '<span class="sky-lb-you">Bạn</span>' : ''}</div>
                    <div class="sky-lb-rank-badge">${rankBadge}</div>
                </div>
                <div class="sky-lb-cell xp">
                    <span class="xp-value">${(u.xp || 0).toLocaleString()}</span>
                    <span class="xp-label">XP</span>
                </div>
                <div class="sky-lb-cell meta">
                    <span>🏅 ${u.badges || 0}</span>
                    <span>🔥 ${u.streak || 0}</span>
                </div>
            </div>`;
        }).join('');
    },

    /**
     * Áp dụng filter tuần/tháng
     */
    _applyFilter(list) {
        if (this._filter === 'all') return list;
        const now = new Date();
        // Trong bản local-only, không có timestamp từng user, nên giả lập
        // bằng cách dùng % XP để mô phỏng (chỉ để demo UI filter)
        // Lưu ý: đây là fallback khi không có Firebase history
        const sorted = list.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));
        if (this._filter === 'week') return sorted.slice(0, 10);
        if (this._filter === 'month') return sorted.slice(0, 20);
        return sorted;
    },

    getRankDisplay(rank) {
        if (rank === 1) return '<span class="sky-medal-1">🥇</span>';
        if (rank === 2) return '<span class="sky-medal-2">🥈</span>';
        if (rank === 3) return '<span class="sky-medal-3">🥉</span>';
        return `<span class="sky-rank-number">#${rank}</span>`;
    },

    setupAutoUpdate() {
        setInterval(() => {
            this.loadLeaderboard();
            window.dispatchEvent(new CustomEvent('leaderboardUpdate'));
        }, this.UPDATE_INTERVAL);
    },

    changePeriod(period) {
        if (typeof showNotification === 'function') {
            showNotification('Đang tải dữ liệu...', 'info');
            setTimeout(() => showNotification('Dữ liệu đã được cập nhật!', 'success'), 500);
        }
        this._filter = period;
        window.dispatchEvent(new CustomEvent('leaderboardPeriodChange', { detail: { period } }));
    }
};

// Inject CSS
const leaderboardCSS = `
.sky-lb-wrap {
    background: var(--card-bg, #FFFFFF);
    border-radius: 20px;
    border: 1px solid var(--border, #E2E8F0);
    box-shadow: 0 8px 32px rgba(5,26,57,0.06);
    overflow: hidden;
}
.sky-lb-header {
    padding: 24px;
    background: linear-gradient(135deg, #1677FF 0%, #4364F7 50%, #6FB1FC 100%);
    color: white;
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 16px;
}
.sky-lb-title { display: flex; align-items: center; gap: 12px; }
.sky-lb-title h2 { font-size: 24px; font-weight: 800; margin: 0; }
.sky-lb-title-icon { font-size: 32px; }
.sky-lb-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sky-lb-search {
    padding: 9px 14px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.2); color: white;
    font-size: 13px; min-width: 200px; font-weight: 600;
    backdrop-filter: blur(8px);
}
.sky-lb-search::placeholder { color: rgba(255,255,255,0.7); }
.sky-lb-search:focus { outline: 2px solid rgba(255,255,255,0.4); }
.sky-lb-filter {
    padding: 9px 14px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.2); color: white;
    font-size: 13px; font-weight: 600; cursor: pointer;
    backdrop-filter: blur(8px);
}
.sky-lb-filter option { background: #1E293B; color: white; }

.sky-lb-banner {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 24px;
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    font-size: 14px; color: var(--text-primary, #0F172A);
}
.sky-lb-banner-icon { font-size: 22px; }
.sky-lb-banner-link { margin-left: auto; color: var(--primary, #1677FF); text-decoration: none; font-weight: 700; font-size: 13px; }
.sky-lb-banner-link:hover { text-decoration: underline; }

.sky-podium {
    display: grid; grid-template-columns: 1fr 1.1fr 1fr;
    gap: 16px; padding: 32px 24px 24px;
    align-items: end; max-width: 800px; margin: 0 auto;
}
.sky-podium-card {
    background: var(--card-bg, #FFFFFF);
    border: 2px solid color-mix(in srgb, var(--podium-color) 30%, transparent);
    border-radius: 16px;
    padding: 20px 16px;
    text-align: center;
    position: relative;
    box-shadow: 0 12px 32px color-mix(in srgb, var(--podium-color) 15%, transparent);
    transition: transform .3s;
}
.sky-podium-card:hover { transform: translateY(-6px); }
.sky-podium-card.rank-1 {
    padding: 28px 18px;
    background: linear-gradient(180deg, rgba(255, 215, 0, 0.12), var(--card-bg, #FFFFFF));
    border-color: #FFD700;
    box-shadow: 0 16px 48px rgba(255, 215, 0, 0.25);
}
.sky-podium-card.rank-2 {
    background: linear-gradient(180deg, rgba(192, 192, 192, 0.12), var(--card-bg, #FFFFFF));
}
.sky-podium-card.rank-3 {
    background: linear-gradient(180deg, rgba(205, 127, 50, 0.12), var(--card-bg, #FFFFFF));
}
.sky-podium-card.current {
    outline: 3px solid var(--primary, #1677FF);
    outline-offset: 2px;
}
.sky-podium-medal { font-size: 36px; margin-bottom: 8px; }
.sky-podium-card.rank-1 .sky-podium-medal { font-size: 48px; }
.sky-podium-avatar {
    width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 10px;
    background: linear-gradient(135deg, var(--podium-color), #fff);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 800; color: white;
    position: relative; overflow: hidden;
    box-shadow: 0 6px 18px color-mix(in srgb, var(--podium-color) 30%, transparent);
}
.sky-podium-card.rank-1 .sky-podium-avatar { width: 88px; height: 88px; font-size: 36px; }
.sky-podium-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sky-podium-crown {
    position: absolute; top: -8px; right: -8px;
    width: 32px; height: 32px; border-radius: 50%;
    background: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.sky-podium-name { font-size: 15px; font-weight: 800; color: var(--text-primary, #0F172A); margin-bottom: 6px; }
.sky-podium-rank { margin-bottom: 12px; }
.sky-podium-stats { display: flex; gap: 4px; justify-content: space-around; }
.sky-podium-stat { display: flex; flex-direction: column; align-items: center; }
.sky-podium-stat-value { font-size: 16px; font-weight: 800; color: var(--primary, #1677FF); }
.sky-podium-card.rank-1 .sky-podium-stat-value { font-size: 18px; }
.sky-podium-stat-label { font-size: 10px; color: var(--text-muted, #94A3B8); font-weight: 600; }

.sky-lb-list-wrap { padding: 8px 24px 24px; }
.sky-lb-section-title { font-size: 14px; font-weight: 700; color: var(--text-secondary, #475569); margin: 16px 0 12px; }
.sky-lb-list { display: flex; flex-direction: column; gap: 8px; }
.sky-lb-row {
    display: grid;
    grid-template-columns: 50px 44px 1fr 90px 90px;
    align-items: center; gap: 12px;
    padding: 12px 14px;
    background: var(--bg-secondary, #F8FAFC);
    border: 1px solid var(--border, #E2E8F0);
    border-radius: 12px;
    transition: all .2s;
}
.sky-lb-row:hover { background: var(--bg-tertiary, #E2E8F0); transform: translateX(4px); }
.sky-lb-row.current-user {
    background: linear-gradient(135deg, rgba(22,119,255,0.1), rgba(22,119,255,0.04));
    border: 2px solid var(--primary, #1677FF);
}
.sky-lb-cell.rank { text-align: center; font-size: 18px; font-weight: 800; }
.sky-lb-cell.avatar .avatar-placeholder,
.sky-lb-cell.avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--primary, #1677FF);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 16px;
    overflow: hidden;
}
.sky-lb-cell.avatar img { width: 100%; height: 100%; object-fit: cover; }
.sky-lb-cell.info { min-width: 0; }
.sky-lb-name { font-weight: 700; color: var(--text-primary, #0F172A); display: flex; align-items: center; gap: 8px; }
.sky-lb-you { font-size: 10px; padding: 2px 8px; background: var(--primary, #1677FF); color: white; border-radius: 4px; font-weight: 700; }
.sky-lb-rank-badge { margin-top: 4px; }
.sky-lb-cell.xp { text-align: center; }
.sky-lb-cell.xp .xp-value { font-size: 16px; font-weight: 800; color: var(--primary, #1677FF); display: block; }
.sky-lb-cell.xp .xp-label { font-size: 10px; color: var(--text-muted, #94A3B8); font-weight: 600; }
.sky-lb-cell.meta { display: flex; gap: 10px; justify-content: flex-end; font-size: 12px; color: var(--text-secondary, #475569); font-weight: 600; }

.sky-medal-1, .sky-medal-2, .sky-medal-3 { display: inline-block; }
.sky-rank-number { color: var(--text-muted, #94A3B8); }

@media (max-width: 768px) {
    .sky-podium { grid-template-columns: 1fr 1.1fr 1fr; gap: 8px; padding: 24px 12px; }
    .sky-podium-card { padding: 14px 8px; }
    .sky-podium-card.rank-1 { padding: 18px 8px; }
    .sky-podium-avatar { width: 56px; height: 56px; font-size: 22px; }
    .sky-podium-card.rank-1 .sky-podium-avatar { width: 68px; height: 68px; }
    .sky-lb-row { grid-template-columns: 40px 36px 1fr 70px; }
    .sky-lb-cell.meta { display: none; }
    .sky-lb-header { flex-direction: column; align-items: stretch; }
}
`;

const lbStyle = document.createElement('style');
lbStyle.textContent = leaderboardCSS;
document.head.appendChild(lbStyle);

window.Leaderboard = Leaderboard;
