/**
 * FIREBASE CONFIGURATION - SKY EDU (TEMPLATE)
 * -----------------------------------------------
 * Đây là file TEMPLATE — an toàn để commit lên GitHub.
 *
 * Hướng dẫn:
 *   1. Copy file này thành `firebase-config.js` ở cùng thư mục:
 *        cp firebase-config.example.js firebase-config.js
 *   2. Mở `firebase-config.js` và điền thông tin Firebase project của bạn.
 *   3. KHÔNG BAO GIỜ commit `firebase-config.js` (đã có trong .gitignore).
 *
 * Lấy thông tin tại: Firebase Console > Project Settings > General > Your apps
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDD0TO5ZNkZI6RyiIZp5GyyxB947aQ6XSo",
  authDomain: "skyedu-b80a1.firebaseapp.com",
  projectId: "skyedu-b80a1",
  storageBucket: "skyedu-b80a1.firebasestorage.app",
  messagingSenderId: "173791675462",
  appId: "1:173791675462:web:855c4e79ddd6576ff0f647",
  measurementId: "G-BEJLXG9G8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Allowed domains cho security check.
// Thêm domain hosting thật của bạn vào đây.
const ALLOWED_DOMAINS = [
    'sky-edu-8be67.web.app',
    'sky-edu-8be67.firebaseapp.com',
    'huynhbui25.github.io',  // GitHub Pages
    'localhost',
    '127.0.0.1',
    ''                         // File protocol (mở file:// trực tiếp)
];

// Rate limiting cho login attempts
const LOGIN_RATE_LIMIT = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 phút
    attempts: {}
};

// Initialize Firebase
let app, auth, database;
let firebaseInitialized = false;
let firebaseInitializationAttempts = 0;

// Security: Validate domain
function validateDomain() {
    const currentHost = window.location.hostname;
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '';

    if (isLocalhost) return true;

    const isAllowed = ALLOWED_DOMAINS.some(domain =>
        currentHost === domain || currentHost.endsWith('.' + domain)
    );

    if (!isAllowed) {
        console.error('Domain không được phép:', currentHost);
        return false;
    }
    return true;
}

// Security: Hash session token
function hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + token.length;
}

// Security: Generate secure session token
function generateSecureToken(uid) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    const rawToken = `${uid}_${timestamp}_${random}_${random2}`;
    return {
        raw: rawToken,
        hashed: hashToken(rawToken)
    };
}

// Security: Check rate limit
function checkRateLimit(identifier) {
    const now = Date.now();
    const record = LOGIN_RATE_LIMIT.attempts[identifier];

    if (!record) {
        LOGIN_RATE_LIMIT.attempts[identifier] = {
            count: 1,
            firstAttempt: now,
            blockedUntil: null
        };
        return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts - 1 };
    }

    if (now - record.firstAttempt > LOGIN_RATE_LIMIT.windowMs) {
        LOGIN_RATE_LIMIT.attempts[identifier] = {
            count: 1,
            firstAttempt: now,
            blockedUntil: null
        };
        return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts - 1 };
    }

    if (record.blockedUntil && now < record.blockedUntil) {
        const remainingTime = Math.ceil((record.blockedUntil - now) / 1000 / 60);
        return {
            allowed: false,
            blocked: true,
            remainingTime: remainingTime,
            message: `Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${remainingTime} phút.`
        };
    }

    record.count++;

    if (record.count > LOGIN_RATE_LIMIT.maxAttempts) {
        record.blockedUntil = now + LOGIN_RATE_LIMIT.windowMs;
        return {
            allowed: false,
            blocked: true,
            remainingTime: 15,
            message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
        };
    }

    return {
        allowed: true,
        remaining: LOGIN_RATE_LIMIT.maxAttempts - record.count
    };
}

function resetRateLimit(identifier) {
    delete LOGIN_RATE_LIMIT.attempts[identifier];
}

// Hàm khởi tạo Firebase với error handling tốt hơn
async function initializeFirebase() {
    if (firebaseInitialized) return true;

    // Kiểm tra Firebase SDK đã load chưa
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK chưa được load. Kiểm tra kết nối mạng.');
        if (typeof showFirebaseError === 'function') {
            showFirebaseError('Không thể kết nối. Vui lòng kiểm tra kết nối internet.');
        }
        return false;
    }

    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        database = firebase.database();

        // Test connection
        await database.ref('.info/connected').once('value');

        firebaseInitialized = true;
        window.firebaseInitialized = true;
        window.dispatchEvent(new Event('firebaseReady'));
        console.log('Firebase kết nối thành công');
        return true;
    } catch (e) {
        console.error('Firebase init lỗi:', e);
        // Nếu là lỗi network, retry sau 3s
        if (e.code === 'unavailable' || (e.message && e.message.includes('network'))) {
            setTimeout(() => initializeFirebase(), 3000);
        }
        return false;
    }
}

// Auto-initialize Firebase
(function initFirebase() {
    function tryInit() {
        if (typeof firebase === 'undefined') {
            setTimeout(tryInit, 100);
            return;
        }
        initializeFirebase();
    }
    tryInit();
})();

/**
 * FIREBASE API WRAPPER
 */
const FirebaseAPI = {

    isReady: function() {
        return firebaseInitialized && !!auth && !!database;
    },

    // ==================== USERS ====================
    createUser: async function(email, password, fullname, username) {
        if (!this.isReady()) {
            return { success: false, error: 'Firebase chưa sẵn sàng. Vui lòng đợi...' };
        }

        try {
            if (!email || !email.includes('@')) {
                return { success: false, error: 'Email không hợp lệ!' };
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,}$/;
            if (!passwordRegex.test(password)) {
                return { success: false, error: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt!' };
            }

            const userIP = await this.getUserIP();
            const ipExists = await this.checkIPExists(userIP);
            if (ipExists) {
                return {
                    success: false,
                    error: 'IP này đã được sử dụng để đăng ký tài khoản. Mỗi IP chỉ được đăng ký 1 tài khoản.'
                };
            }

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            await database.ref('users/' + uid).set({
                fullname: this.sanitizeString(fullname),
                username: this.sanitizeString(username),
                email: this.sanitizeString(email),
                role: 'user',
                banned: false,
                registeredIP: userIP,
                allowedIP: userIP,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                enrollments: [],
                emailVerified: userCredential.user.emailVerified
            });

            await database.ref('ipRecords/' + userIP.replace(/\./g, '_')).set({
                uid,
                username: this.sanitizeString(username),
                registeredAt: firebase.database.ServerValue.TIMESTAMP
            });

            return { success: true, uid };
        } catch (error) {
            console.error('Lỗi tạo user:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    loginUser: async function(email, password) {
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) {
            return {
                success: false,
                error: rateCheck.message,
                rateLimited: true,
                remainingTime: rateCheck.remainingTime
            };
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            const snapshot = await database.ref('users/' + uid).once('value');
            const userData = snapshot.val();

            if (!userData) {
                await auth.signOut();
                return { success: false, error: 'Không tìm thấy thông tin tài khoản!' };
            }

            if (userData.banned) {
                await auth.signOut();
                return { success: false, error: 'Tài khoản đã bị khóa! Vui lòng liên hệ hỗ trợ.' };
            }

            const currentIP = await this.getUserIP();

            if (userData.allowedIP && userData.allowedIP !== currentIP) {
                await auth.signOut();
                return {
                    success: false,
                    needIPConfirm: true,
                    userData: { uid, ...userData },
                    oldIP: userData.allowedIP,
                    newIP: currentIP
                };
            }

            const tokenData = generateSecureToken(uid);

            await database.ref('users/' + uid).update({
                sessionToken: tokenData.hashed,
                lastLoginIP: currentIP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            resetRateLimit(email);

            return {
                success: true,
                sessionToken: tokenData.raw,
                userData: { uid, ...userData, sessionToken: tokenData.raw }
            };
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            return {
                success: false,
                error: this.getErrorMessage(error.code),
                attemptsRemaining: rateCheck.remaining - 1
            };
        }
    },

    confirmIPUpdate: async function(uid, newIP) {
        try {
            await database.ref('users/' + uid).update({
                allowedIP: newIP,
                lastIPChange: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            console.error('Lỗi cập nhật IP:', error);
            return { success: false, error: error.message };
        }
    },

    validateSession: async function(uid, token) {
        try {
            const snapshot = await database.ref('users/' + uid).once('value');
            const userData = snapshot.val();

            if (!userData) return false;
            if (userData.banned) return false;

            const hashedInput = hashToken(token);
            if (userData.sessionToken !== hashedInput) return false;

            return true;
        } catch (error) {
            console.error('Lỗi kiểm tra session:', error);
            return false;
        }
    },

    validateSessionToken: async function(uid, token) {
        return this.validateSession(uid, token);
    },

    logoutUser: async function(uid) {
        try {
            await database.ref('users/' + uid).update({
                sessionToken: null
            });
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            return { success: false, error: error.message };
        }
    },

    getUserIP: async function() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('Không lấy được IP thật, dùng fingerprint');
            return `local_${navigator.userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
        }
    },

    checkIPExists: async function(ip) {
        try {
            const snapshot = await database.ref('ipRecords/' + ip.replace(/\./g, '_')).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Lỗi kiểm tra IP:', error);
            return false;
        }
    },

    getAllUsers: async function() {
        try {
            const snapshot = await database.ref('users').once('value');
            const data = snapshot.val();
            return data ? Object.entries(data).map(([id, user]) => ({ id, ...user })) : [];
        } catch (error) {
            console.error('Lỗi lấy users:', error);
            return [];
        }
    },

    getUserByUsername: async function(username) {
        try {
            const sanitized = this.sanitizeString(username);
            const snapshot = await database.ref('users')
                .orderByChild('username')
                .equalTo(sanitized)
                .once('value');
            const data = snapshot.val();
            if (data) {
                const entries = Object.entries(data);
                return { id: entries[0][0], ...entries[0][1] };
            }
            return null;
        } catch (error) {
            console.error('Lỗi lấy user:', error);
            return null;
        }
    },

    updateUser: async function(userId, updates) {
        try {
            const sanitizedUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (typeof value === 'string') {
                    sanitizedUpdates[key] = this.sanitizeString(value);
                } else {
                    sanitizedUpdates[key] = value;
                }
            }
            await database.ref('users/' + userId).update(sanitizedUpdates);
            return { success: true };
        } catch (error) {
            console.error('Lỗi cập nhật user:', error);
            return { success: false, error: error.message };
        }
    },

    toggleBanUser: async function(userId, banned) {
        try {
            await database.ref('users/' + userId).update({ banned });
            return { success: true };
        } catch (error) {
            console.error('Lỗi ban user:', error);
            return { success: false, error: error.message };
        }
    },

    deleteUser: async function(userId) {
        try {
            const snapshot = await database.ref('users/' + userId).once('value');
            const userData = snapshot.val();

            if (!userData) {
                return { success: false, error: 'User không tồn tại!' };
            }

            if (userData.registeredIP) {
                await database.ref('ipRecords/' + userData.registeredIP.replace(/\./g, '_')).remove();
            }

            await database.ref('users/' + userId).remove();

            return {
                success: true,
                message: 'User đã được xóa khỏi database. IP đã được giải phóng.'
            };
        } catch (error) {
            console.error('Lỗi xóa user:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== UTILITY ====================
    sanitizeString: function(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    },

    getErrorMessage: function(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Email đã được sử dụng bởi tài khoản khác!',
            'auth/invalid-email': 'Email không hợp lệ!',
            'auth/operation-not-allowed': 'Đăng nhập bằng email/mật khẩu chưa được kích hoạt!',
            'auth/weak-password': 'Mật khẩu quá yếu!',
            'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa!',
            'auth/user-not-found': 'Không tìm thấy tài khoản!',
            'auth/wrong-password': 'Mật khẩu không đúng!',
            'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau!',
            'auth/network-request-failed': 'Lỗi kết nối mạng. Vui lòng kiểm tra internet!',
            'auth/invalid-credential': 'Thông tin đăng nhập không hợp lệ!',
            'auth/invalid-api-key': 'Lỗi cấu hình Firebase. Vui lòng liên hệ quản trị viên!',
            'auth/app-not-authorized': 'Ứng dụng không được phép truy cập Firebase!',
            'PERMISSION_DENIED': 'Không có quyền truy cập. Kiểm tra Firebase Rules.',
            'default': 'Đã xảy ra lỗi. Vui lòng thử lại sau!'
        };

        return errorMessages[errorCode] || errorMessages['default'];
    },

    // ==================== EXAMS ====================
    saveExam: async function(examId, examData) {
        try {
            await database.ref('exams/' + examId).set({
                ...examData,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            console.error('Lỗi lưu đề thi:', error);
            return { success: false, error: error.message };
        }
    },

    getAllExams: async function() {
        try {
            const snapshot = await database.ref('exams').once('value');
            const data = snapshot.val();
            return data ? Object.entries(data).map(([id, exam]) => ({ id, ...exam })) : [];
        } catch (error) {
            console.error('Lỗi lấy đề thi:', error);
            return [];
        }
    },

    deleteExam: async function(examId) {
        try {
            await database.ref('exams/' + examId).remove();
            return { success: true };
        } catch (error) {
            console.error('Lỗi xóa đề thi:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== COURSES ====================
    saveCourse: async function(courseId, courseData) {
        try {
            await database.ref('courses/' + courseId).set({
                ...courseData,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            console.error('Lỗi lưu khóa học:', error);
            return { success: false, error: error.message };
        }
    },

    getAllCourses: async function() {
        try {
            const snapshot = await database.ref('courses').once('value');
            const data = snapshot.val();
            return data ? Object.entries(data).map(([id, course]) => ({ id, ...course })) : [];
        } catch (error) {
            console.error('Lỗi lấy khóa học:', error);
            return [];
        }
    },

    // ==================== ENROLLMENTS ====================
    enrollUser: async function(userId, courseId) {
        try {
            const enrollmentId = `${userId}_${courseId}`;
            await database.ref('enrollments/' + enrollmentId).set({
                userId,
                courseId,
                enrolledAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            console.error('Lỗi gán khóa học:', error);
            return { success: false, error: error.message };
        }
    },

    unenrollUser: async function(userId, courseId) {
        try {
            const enrollmentId = `${userId}_${courseId}`;
            await database.ref('enrollments/' + enrollmentId).remove();
            return { success: true };
        } catch (error) {
            console.error('Lỗi hủy gán khóa học:', error);
            return { success: false, error: error.message };
        }
    },

    getUserCourses: async function(userId) {
        try {
            const snapshot = await database.ref('enrollments')
                .orderByChild('userId')
                .equalTo(userId)
                .once('value');
            const data = snapshot.val();
            return data ? Object.values(data).map(e => e.courseId) : [];
        } catch (error) {
            console.error('Lỗi lấy khóa học của user:', error);
            return [];
        }
    },

    // ==================== ADMIN OPERATIONS ====================
    createDefaultAdmin: async function() {
        try {
            const adminUser = await this.getUserByUsername('admin');
            if (adminUser) {
                return { success: true, exists: true };
            }

            const adminEmail = 'admin@skyedu.id.vn';
            const adminPassword = 'Bh25052k8@';
            const adminUsername = 'admin';
            const adminFullname = 'Administrator';

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
                const uid = userCredential.user.uid;

                const userIP = await this.getUserIP();

                await database.ref('users/' + uid).set({
                    fullname: adminFullname,
                    username: adminUsername,
                    email: adminEmail,
                    role: 'admin',
                    banned: false,
                    ip: userIP,
                    lastIPChange: firebase.database.ServerValue.TIMESTAMP,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    enrollments: []
                });

                await database.ref('ipRecords/' + userIP.replace(/\./g, '_')).set({
                    uid,
                    username: adminUsername,
                    registeredAt: firebase.database.ServerValue.TIMESTAMP
                });

                return { success: true };
            } catch (authError) {
                if (authError.code === 'auth/email-already-in-use') {
                    return { success: true, exists: true };
                }
                throw authError;
            }
        } catch (error) {
            console.error('Lỗi tạo admin:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== REAL-TIME LISTENERS ====================
    listenToUsers: function(callback) {
        database.ref('users').on('value', (snapshot) => {
            const data = snapshot.val();
            const users = data ? Object.entries(data).map(([id, user]) => ({ id, ...user })) : [];
            callback(users);
        });
    },

    stopListening: function(path) {
        database.ref(path).off();
    }
};

window.initializeFirebase = initializeFirebase;
window.FirebaseAPI = FirebaseAPI;
window.firebaseInitialized = firebaseInitialized;

console.log('Firebase config loaded');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseAPI;
}

// Tự động tạo admin khi load lần đầu
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        setTimeout(() => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                setTimeout(() => {
                    if (FirebaseAPI.isReady()) {
                        FirebaseAPI.createDefaultAdmin().catch(err => {
                            console.warn('Không thể tạo admin tự động:', err.message);
                        });
                    }
                }, 2000);
            }
        }, 500);
    });
}
