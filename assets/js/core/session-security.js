/**
 * SKY EDU - Session Security
 * Quản lý session expiry, kiểm tra token hết hạn, tự động logout.
 *
 * Cơ chế:
 *  - Mỗi lần login, lưu sessionExpiresAt = Date.now() + 1 giờ
 *  - Mỗi lần trang load / mỗi lần dùng session, kiểm tra expiresAt
 *  - Nếu hết hạn → xoá currentUser → redirect về trang login
 *  - Validate JSON trước khi parse để tránh crash
 */
(function(global){
    'use strict';

    const SESSION_KEY = 'currentUser';
    const SESSION_TTL_MS = 60 * 60 * 1000;        // 1 giờ
    const WARNING_BEFORE_MS = 5 * 60 * 1000;      // cảnh báo trước 5 phút

    /**
     * Safe JSON.parse, trả về fallback nếu lỗi
     */
    function safeParse(json, fallback) {
        if (typeof json !== 'string') return fallback;
        if (!json || json === 'null' || json === 'undefined') return fallback;
        try {
            return JSON.parse(json);
        } catch (e) {
            console.warn('safeParse failed:', e.message);
            return fallback;
        }
    }

    const SessionSecurity = {
        SESSION_KEY: SESSION_KEY,
        SESSION_TTL_MS: SESSION_TTL_MS,

        /**
         * Lưu session với expiresAt = now + TTL
         */
        saveSession(user) {
            if (!user || typeof user !== 'object') return false;
            const expiresAt = Date.now() + SESSION_TTL_MS;
            const session = Object.assign({}, user, {
                sessionExpiresAt: expiresAt,
                sessionCreatedAt: Date.now()
            });
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                return true;
            } catch (e) {
                console.error('saveSession failed:', e);
                return false;
            }
        },

        /**
         * Lấy session hiện tại, null nếu hết hạn / không hợp lệ
         */
        getSession() {
            const raw = (() => {
                try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
            })();
            if (!raw) return null;
            const session = safeParse(raw, null);
            if (!session) return null;

            // Check expiry
            const expiresAt = session.sessionExpiresAt;
            if (typeof expiresAt !== 'number' || expiresAt < Date.now()) {
                console.warn('Session hết hạn — tự động đăng xuất');
                this.clearSession();
                return null;
            }
            return session;
        },

        /**
         * Xoá session
         */
        clearSession() {
            try {
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {}
        },

        /**
         * Kiểm tra session còn hạn không. Gọi lúc page load.
         * Nếu hết hạn → xoá + trả về false
         */
        checkSession() {
            const s = this.getSession();
            return s !== null;
        },

        /**
         * Còn bao nhiêu ms tới khi hết hạn (số âm = đã hết hạn)
         */
        msUntilExpiry() {
            const s = this.getSession();
            if (!s || typeof s.sessionExpiresAt !== 'number') return -1;
            return s.sessionExpiresAt - Date.now();
        },

        /**
         * Có cần cảnh báo user trước khi hết hạn không (< 5 phút)
         */
        needsWarning() {
            const ms = this.msUntilExpiry();
            return ms > 0 && ms < WARNING_BEFORE_MS;
        },

        /**
         * Gia hạn session thêm 1 giờ (gọi khi user có action)
         */
        refresh() {
            const s = this.getSession();
            if (!s) return false;
            return this.saveSession(s);
        },

        /**
         * Hiển thị modal cảnh báo (gọi 1 lần)
         */
        showExpiryWarning() {
            // Inject CSS nếu chưa có
            if (!document.getElementById('session-warning-css')) {
                const css = document.createElement('style');
                css.id = 'session-warning-css';
                css.textContent = `
                    .session-warning-banner {
                        position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
                        background: linear-gradient(135deg, #F59E0B, #EF4444);
                        color: white; padding: 12px 20px; text-align: center;
                        font-family: system-ui, sans-serif; font-size: 14px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        display: flex; align-items: center; justify-content: center;
                        gap: 16px;
                    }
                    .session-warning-banner button {
                        background: white; color: #EF4444; border: none;
                        padding: 6px 16px; border-radius: 6px; font-weight: 700;
                        cursor: pointer;
                    }
                    .session-warning-banner button:hover { transform: scale(1.05); }
                `;
                document.head.appendChild(css);
            }

            // Tránh trùng lặp
            if (document.getElementById('session-warning-banner')) return;

            const banner = document.createElement('div');
            banner.id = 'session-warning-banner';
            banner.className = 'session-warning-banner';
            const minutes = Math.ceil(this.msUntilExpiry() / 60000);
            banner.innerHTML = `
                <span>⚠️ Phiên đăng nhập sẽ hết hạn sau <b>${minutes} phút</b>. Bạn có muốn tiếp tục?</span>
                <button type="button" id="session-refresh-btn">Gia hạn</button>
                <button type="button" id="session-logout-btn">Đăng xuất</button>
            `;
            document.body.appendChild(banner);

            document.getElementById('session-refresh-btn').onclick = () => {
                this.refresh();
                banner.remove();
                console.log('Session đã gia hạn');
            };
            document.getElementById('session-logout-btn').onclick = () => {
                banner.remove();
                this.clearSession();
                if (typeof logout === 'function') logout();
                else window.location.href = 'index.html';
            };
        },

        /**
         * Auto-check mỗi 30s + hook vào window
         */
        startMonitoring() {
            // Check ngay
            if (!this.checkSession()) {
                console.warn('Session invalid — redirect login');
                const isInAdmin = location.pathname.includes('admin.html');
                const isInLogin = location.pathname.includes('dang-nhap') || location.pathname.includes('dang-ky');
                if (!isInLogin && !isInAdmin) {
                    // Không tự redirect ở trang chủ vì user có thể đăng nhập trên tab khác
                }
                if (isInAdmin) {
                    // Trang admin thì redirect
                    window.location.href = 'dang-nhap.html';
                }
                return false;
            }

            // Check định kỳ
            setInterval(() => {
                if (!this.checkSession()) {
                    console.warn('Session hết hạn — auto logout');
                    const isInAdmin = location.pathname.includes('admin.html');
                    if (isInAdmin) {
                        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                        this.clearSession();
                        window.location.href = 'dang-nhap.html';
                    }
                } else if (this.needsWarning()) {
                    this.showExpiryWarning();
                }
            }, 30000); // mỗi 30s

            return true;
        },

        safeParse: safeParse
    };

    global.SessionSecurity = SessionSecurity;
})(window);