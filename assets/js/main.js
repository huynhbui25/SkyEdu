/* ================================================================
   MAIN.JS — SKY EDU
   Navbar, countdown, theme toggle, session validation
   ================================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || 'null');

    // Session validation
    if (currentUser?.uid && currentUser?.sessionToken) {
        try {
            if (typeof FirebaseAPI !== 'undefined' && FirebaseAPI.validateSession) {
                const isValidSession = await FirebaseAPI.validateSession(currentUser.uid, currentUser.sessionToken);
                if (!isValidSession) {
                    localStorage.removeItem("currentUser");
                    if (typeof showNotification === 'function') {
                        showNotification("Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.", "warning");
                    }
                    setTimeout(() => {
                        window.location.href = "/account/dang-nhap.html";
                    }, 2000);
                    return;
                }
            }
        } catch (error) {
            console.warn('Session validation error:', error);
        }
    }

    // Lắng nghe thay đổi auth state từ Firebase (real-time)
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    // User đang đăng nhập — sync từ Firebase về localStorage
                    try {
                        const snapshot = await firebase.database().ref('users/' + user.uid).once('value');
                        const userData = snapshot.val();
                        if (userData) {
                            localStorage.setItem('currentUser', JSON.stringify({
                                uid: user.uid,
                                email: user.email,
                                fullname: userData.fullname || userData.displayName || user.displayName,
                                username: userData.username,
                                role: userData.role || 'user',
                                isAdmin: userData.isAdmin || false,
                                avatar: userData.avatar || null,
                                sessionToken: localStorage.getItem('currentUser')
                                    ? JSON.parse(localStorage.getItem('currentUser')).sessionToken
                                    : null
                            }));
                        }
                    } catch (syncErr) {
                        console.warn('User sync error:', syncErr);
                    }
                } else {
                    // User đăng xuất — giữ localStorage hiện tại nếu có để UX không bị giật,
                    // nhưng chỉ xóa khi người dùng thực sự logout.
                }
            });
        } catch (e) {
            console.warn('Firebase onAuthStateChanged error:', e);
        }
    }

    const guestMenu = document.getElementById("guestMenu");
    const guestRegister = document.getElementById("guestRegister");
    const userMenu = document.getElementById("userMenu");
    const userBtn = document.getElementById("userBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const navUsername = document.getElementById("navUsername");
    const navAvatar = document.getElementById("navAvatar");
    const dropdownAvatar = document.getElementById("dropdownAvatar");
    const dropdownName = document.getElementById("dropdownName");
    const adminLink = document.getElementById("adminLink");
    const dashboardLink = document.getElementById("dashboardLink");
    const leaderboardLink = document.getElementById("leaderboardLink");

    const userFullname = currentUser?.fullname || 'Người dùng';

    if (currentUser) {
        if (guestMenu) guestMenu.style.display = "none";
        if (guestRegister) guestRegister.style.display = "none";
        if (userMenu) userMenu.style.display = "block";

        if (navUsername) {
            navUsername.innerText = userFullname;
        }

        // Show avatar - prioritize uploaded image
        if (currentUser?.avatar) {
            if (navAvatar) {
                navAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
                navAvatar.style.backgroundSize = 'cover';
                navAvatar.style.backgroundPosition = 'center';
                navAvatar.innerText = '';
            }
            if (dropdownAvatar) {
                dropdownAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
            }
        } else {
            const initial = (userFullname || 'U').charAt(0).toUpperCase();
            if (navAvatar) navAvatar.innerText = initial;
            if (dropdownAvatar) dropdownAvatar.innerText = initial;
        }

        if (dropdownName) dropdownName.innerText = userFullname;

        // Show Dashboard and Leaderboard links for logged-in users
        if (dashboardLink) dashboardLink.style.display = "flex";
        if (leaderboardLink) leaderboardLink.style.display = "flex";

        if ((currentUser?.role === "admin" || currentUser?.role === "moderator") && adminLink) {
            adminLink.style.display = "flex";
            if (currentUser?.role === "moderator") {
                adminLink.innerHTML = '⚙️ Quản trị viên';
            }
        }
    } else {
        if (userMenu) userMenu.style.display = "none";
    }

    if (userBtn) {
        userBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (dropdownMenu) dropdownMenu.classList.toggle("show");
        });
    }

    document.addEventListener("click", function (e) {
        if (!e.target.closest("#userMenu")) {
            if (dropdownMenu) dropdownMenu.classList.remove("show");
        }
    });

    // Handle new navbar user state
    const loginBtnNav = document.getElementById("loginBtnNav");
    const registerBtnNav = document.getElementById("registerBtnNav");
    const userMenuNav = document.getElementById("userMenuNav");
    const navUsernameNav = document.getElementById("navUsernameNav");

    if (currentUser) {
        if (loginBtnNav) loginBtnNav.style.display = "none";
        if (registerBtnNav) registerBtnNav.style.display = "none";
        if (userMenuNav) userMenuNav.style.display = "flex";
        if (navUsernameNav) navUsernameNav.textContent = userFullname;
    }

    // Handle mobile menu
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", function () {
            const navCenter = document.querySelector(".nav-center");
            if (navCenter) navCenter.classList.toggle("mobile-open");
        });
    }

    // Theme toggle
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("darkMode", isDark);
            const icon = themeToggle.querySelector("iconify-icon");
            if (icon) {
                icon.setAttribute("icon", isDark ? "ph:sun-fill" : "ph:moon-stars-fill");
            }
        });

        // Load saved theme
        if (localStorage.getItem("darkMode") === "true") {
            document.body.classList.add("dark-mode");
            const icon = themeToggle.querySelector("iconify-icon");
            if (icon) icon.setAttribute("icon", "ph:sun-fill");
        }
    }

    // Countdown Timer - Dynamic Exam Date
    const getExamDate = () => {
        const savedDate = localStorage.getItem('examDate');
        if (savedDate) {
            return new Date(savedDate).getTime();
        }
        return new Date("December 15, 2026 09:00:00").getTime();
    };

    window.setExamDate = (dateString) => {
        localStorage.setItem('examDate', dateString);
        updateCountdown();
    };

    const examDate = getExamDate();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = examDate - now;

        if (distance > 0) {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const daysEl = document.getElementById("days");
            const hoursEl = document.getElementById("hours");
            const minutesEl = document.getElementById("minutes");
            const secondsEl = document.getElementById("seconds");

            if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
            if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
            if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
        }
    }

    if (document.getElementById("days")) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

});

/* ================================================================
   Toast / notification
   ================================================================ */
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.style.animation = 'slideInRight 0.3s ease forwards';

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    // Sanitize message tránh XSS khi render
    const safe = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${safe}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

window.showNotification = showNotification;

function logoutNavbar() {
    localStorage.removeItem("currentUser");

    if (typeof showNotification === 'function') {
        showNotification("Đăng xuất thành công! Hẹn gặp lại 👋", "success");
    }

    setTimeout(() => {
        location.reload();
    }, 1000);
}

window.logoutNavbar = logoutNavbar;

// Countdown Timer - Dynamic Exam Date (chạy độc lập cho phòng luyện nếu có)
const getExamDate = () => {
    const savedDate = localStorage.getItem('examDate');
    if (savedDate) {
        return new Date(savedDate).getTime();
    }
    return new Date("December 15, 2026 09:00:00").getTime();
};

window.setExamDate = (dateString) => {
    localStorage.setItem('examDate', dateString);
    updateCountdown();
};

const examDate = getExamDate();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = examDate - now;

    if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const daysEl = document.getElementById("days");
        const hoursEl = document.getElementById("hours");
        const minutesEl = document.getElementById("minutes");
        const secondsEl = document.getElementById("seconds");

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
}

if (document.getElementById("days")) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}
