/**
 * SKY EDU - Sky Store
 * Lớp dữ liệu chung: localStorage + Firebase fallback
 * Không phá cấu trúc cũ; chỉ bổ sung key mới.
 */
(function (global) {
    'use strict';

    const USE_FIREBASE = false; // Bật = true nếu muốn đồng bộ Firebase (mặc định false - an toàn)

    const PREFIX = 'skyedu_';
    const SAFE_KEYS = {
        gamification: 'skyedu_gamification',
        dashboard: 'skyedu_dashboard',
        leaderboard: 'skyedu_leaderboard',
        ranks: 'skyedu_ranks_v1',
        achievements: 'skyedu_achievements',
        learningStats: 'skyedu_learning_stats',
        adminMeta: 'skyedu_admin_meta',
        examHistory: 'examHistory',
        users: 'users',
        currentUser: 'currentUser'
    };

    const SkyStore = {
        PREFIX: PREFIX,
        KEYS: SAFE_KEYS,
        USE_FIREBASE: USE_FIREBASE,

        /**
         * Đọc giá trị từ localStorage
         */
        get(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null) return defaultValue;
                return JSON.parse(raw);
            } catch (e) {
                console.warn('[SkyStore.get] Lỗi đọc', key, e);
                return defaultValue;
            }
        },

        /**
         * Ghi giá trị vào localStorage (tùy chọn đồng bộ Firebase)
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                this._syncFirebase(key, value);
                window.dispatchEvent(new CustomEvent('skyStoreUpdate', { detail: { key, value } }));
                return true;
            } catch (e) {
                console.error('[SkyStore.set] Lỗi ghi', key, e);
                return false;
            }
        },

        /**
         * Xoá key
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Đồng bộ Firebase (chỉ khi bật cờ)
         */
        _syncFirebase(key, value) {
            if (!this.USE_FIREBASE) return;
            if (typeof FirebaseAPI === 'undefined' || !FirebaseAPI.isReady || !FirebaseAPI.isReady()) return;
            const user = this.getCurrentUser();
            if (!user || !user.uid) return;
            try {
                const safeKey = key.startsWith(PREFIX) ? key.substring(PREFIX.length) : key;
                FirebaseAPI.updateUser(user.uid, { ['stats_' + safeKey]: value }).catch(() => {});
            } catch (e) {}
        },

        /**
         * Lấy thông tin user hiện tại
         */
        getCurrentUser() {
            return this.get(SAFE_KEYS.currentUser);
        },

        /**
         * Lấy stats gamification
         */
        getGamification() {
            return this.get(SAFE_KEYS.gamification, {
                totalXP: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: null,
                totalExams: 0, totalCorrect: 0, totalQuestions: 0, bestScore: 0,
                averageScore: 0, scores: [], badges: [], achievements: [],
                stats: { earlyBird: false, nightOwl: false, speedDemon: false, noSkip: false }
            });
        },

        /**
         * Lấy lịch sử làm bài
         */
        getExamHistory() {
            return this.get(SAFE_KEYS.examHistory, []);
        },

        /**
         * Lấy danh sách user
         */
        getUsers() {
            return this.get(SAFE_KEYS.users, []);
        },

        /**
         * Lấy thống kê học tập (aggregate từ examHistory + gamification)
         */
        getLearningStats() {
            return this.get(SAFE_KEYS.learningStats, null) || this._buildLearningStats();
        },

        /**
         * Tính toán lại learning stats từ examHistory
         */
        _buildLearningStats() {
            const history = this.getExamHistory();
            const gam = this.getGamification();
            const totalExams = history.length;
            let totalQuestions = 0, totalCorrect = 0, totalTime = 0;
            const byDate = {};
            const bySubject = {};
            const scoreByDate = {};

            history.forEach(h => {
                totalQuestions += (h.total || 0);
                totalCorrect += (h.score || 0);
                totalTime += (h.timeSpent || 0);
                const d = (h.timestamp || '').substring(0, 10);
                if (d) {
                    byDate[d] = (byDate[d] || 0) + 1;
                    if (!scoreByDate[d]) scoreByDate[d] = { sum: 0, count: 0 };
                    const pct = h.total > 0 ? Math.round((h.score / h.total) * 100) : 0;
                    scoreByDate[d].sum += pct;
                    scoreByDate[d].count += 1;
                }
                const subject = h.subject || h.category || 'TSA';
                if (!bySubject[subject]) bySubject[subject] = { correct: 0, total: 0 };
                bySubject[subject].correct += (h.score || 0);
                bySubject[subject].total += (h.total || 0);
            });

            const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
            const avgScore = totalExams > 0 ? Math.round(history.reduce((a, b) => {
                const pct = b.total > 0 ? (b.score / b.total) * 100 : 0;
                return a + pct;
            }, 0) / totalExams) : 0;

            const accuracyBySubject = {};
            Object.keys(bySubject).forEach(k => {
                accuracyBySubject[k] = bySubject[k].total > 0
                    ? Math.round((bySubject[k].correct / bySubject[k].total) * 100)
                    : 0;
            });

            return {
                totalExams,
                totalQuestions,
                totalCorrect,
                totalTime,
                accuracy,
                avgScore,
                bestScore: gam.bestScore || 0,
                totalXP: gam.totalXP || 0,
                currentStreak: gam.currentStreak || 0,
                longestStreak: gam.longestStreak || 0,
                byDate,
                scoreByDate,
                accuracyBySubject,
                updatedAt: new Date().toISOString()
            };
        },

        /**
         * Lưu learning stats (aggregate mới)
         */
        saveLearningStats() {
            const stats = this._buildLearningStats();
            this.set(SAFE_KEYS.learningStats, stats);
            return stats;
        }
    };

    global.SkyStore = SkyStore;
})(window);
