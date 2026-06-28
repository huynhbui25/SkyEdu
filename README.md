# 🎓 SKY EDU — Nền tảng luyện thi TSA / HSA

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://yourusername.github.io/tsa-sky-main)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)](https://firebase.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-success)](manifest.json)

Nền tảng luyện thi **TSA** (Đánh giá tư duy) và **HSA** (Đánh giá năng lực) với đầy đủ tính năng:
12 dạng câu hỏi, bảng xếp hạng, gamification, admin panel, dark mode, PWA.

---

## ✨ Tính năng

- 🎯 **12 dạng câu hỏi**: Trắc nghiệm, tự luận, điền khuyết, ghép đôi, kéo thả, sắp xếp, đúng/sai, matrix...
- 🔥 **Firebase Realtime**: Đồng bộ dữ liệu tức thì, không cần server riêng
- 🏆 **Gamification**: Điểm kinh nghiệm, huy hiệu, bảng xếp hạng, cửa hàng Sky Store
- 👨‍💼 **Admin Panel**: Tạo câu hỏi, quản lý đề thi, thống kê người dùng
- 🌙 **Dark Mode**: Giao diện tối/sáng tuỳ chọn, lưu localStorage
- 📱 **PWA**: Cài được trên điện thoại như app thật (manifest.json + service worker)
- 🔒 **Bảo mật**: Anti-cheat, rate limiting, session token hash, IP binding
- 🧮 **LaTeX/KaTeX**: Hỗ trợ render công thức toán trong câu hỏi

---

## 🚀 Cài đặt & Chạy

### 1. Clone repo

```bash
git clone https://github.com/yourusername/tsa-sky-main.git
cd tsa-sky-main
```

### 2. Cấu hình Firebase

```bash
cp firebase-config.example.js firebase-config.js
```

Mở `firebase-config.js`, điền thông tin Firebase project của bạn (lấy tại
Firebase Console → Project Settings → General → Your apps → SDK setup).

Cập nhật `ALLOWED_DOMAINS` trong cùng file cho domain hosting thật của bạn.

### 3. Firebase Security Rules

Vào **Firebase Console → Realtime Database → Rules**, dán:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "examResults": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "leaderboard": {
      ".read": true,
      ".write": false
    },
    "questionBank": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('isAdmin').val() === true)"
    },
    "exams": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('isAdmin').val() === true)"
    }
  }
}
```

### 4. Chạy local

```bash
node start-server.js
# Mở http://localhost:3000
```

Hoặc mở trực tiếp `index.html` bằng trình duyệt (một số tính năng Firebase cần server).

### 5. Deploy

**GitHub Pages:**

```bash
git add .
git commit -m "feat: initial deploy"
git push origin main
```

Vào **Settings → Pages → Source: `main` branch / root**.

**Shared hosting (Apache):**

Upload tất cả file (trừ `node_modules/`, `firebase-config.js`) lên `public_html/`.
File `.htaccess` đã được cấu hình sẵn (bảo mật, cache, gzip).

---

## 📁 Cấu trúc

```
tsa-sky-main/
├── index.html                  # Trang chủ
├── dashboard.html              # Dashboard học tập
├── leaderboard.html            # Bảng xếp hạng
├── quy-doi-diem.html           # Quy đổi điểm TSA → THPT
├── lo-trinh-tsa.html           # Lộ trình ôn thi
├── firebase-config.example.js  # Template config (commit được)
├── firebase-config.js          # Config thật (gitignored)
├── 404.html / 403.html / 500.html
├── manifest.json + sw.js       # PWA
├── package.json                # Dev metadata
├── LICENSE                     # MIT
├── .nojekyll                   # Bypass Jekyll trên GitHub Pages
├── account/                    # Auth + Admin
│   ├── auth.js
│   ├── dang-nhap.html          # Đăng nhập
│   ├── dang-ky.html            # Đăng ký
│   ├── doi-mat-khau.html       # Đổi mật khẩu
│   ├── tai-khoan.html          # Hồ sơ
│   └── admin.html              # Trang quản trị
├── assets/
│   ├── css/                    # style.css + premium-style.css
│   └── js/
│       ├── main.js             # Navbar + session
│       ├── theme.js
│       ├── question-types.js   # 12 dạng câu hỏi
│       ├── question-renderer.js
│       ├── question-bank.js
│       ├── exam-builder.js
│       ├── dashboard.js
│       ├── gamification.js
│       ├── leaderboard.js
│       ├── animations.js
│       ├── performance.js
│       ├── data-validator.js   # XSS sanitize, schema validate
│       └── core/               # achievement, ai-insight, rank, sky-store, ui-kit
├── phong-luyen-tsa/            # Phòng luyện TSA
│   ├── index.html
│   ├── exam.html
│   └── result.html
├── phong-luyen-hsa/            # Phòng luyện HSA
│   ├── index.html
│   ├── exam.html
│   └── result.html
└── khoa-hoc-pages/             # Khóa học
    ├── index.html
    └── detail.html
```

---

## 🔑 Tài khoản Admin

Tài khoản admin mặc định (đã tạo sẵn khi load lần đầu):

- **Username**: `admin`
- **Email nội bộ**: `admin@skyedu.id.vn`
- **Password**: `Bh25052k8@`

> ⚠️ **Quan trọng**: Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

Hoặc cấp quyền admin cho user khác trong **Firebase Console → Realtime Database → `users/{uid}`**:

```json
{
  "role": "admin",
  "isAdmin": true
}
```

---

## ⚠️ Lưu ý bảo mật

- **KHÔNG** commit `firebase-config.js` (đã có trong `.gitignore`).
- Bật HTTPS bắt buộc khi deploy production (Firebase Auth yêu cầu).
- Cập nhật Firebase Security Rules trước khi public.
- Mỗi IP chỉ được đăng ký 1 tài khoản (rate limit 5 lần/15 phút).
- Session token được hash + validate mỗi lần load trang.
- Không hardcode API key/secret vào code (đã tách ra `firebase-config.example.js`).

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 |
| Auth | Firebase Authentication |
| Database | Firebase Realtime Database |
| Hosting | GitHub Pages / Apache shared hosting |
| PWA | Service Worker, Web App Manifest |
| LaTeX | KaTeX |
| Icons | Iconify, Lucide |
| Test | jsdom |

---

## 📞 Liên hệ

- Email: support@sky-edu.com
- Website: https://sky-edu.com
- GitHub Issues: [tsa-sky-main/issues](https://github.com/yourusername/tsa-sky-main/issues)

---

## 📄 License

MIT © 2026 SKY EDU Team. Xem [LICENSE](LICENSE) để biết thêm chi tiết.
