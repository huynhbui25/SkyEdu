# Huong dan Upload len GitHub (KHONG can Git, KHONG can command line)

## Buoc 1: Tao repo tren GitHub

1. Truy cap: https://github.com/new
2. Dien:
   - **Repository name**: `tsa-sky-main`
   - **Description**: `SKY EDU - Nen tang luyen thi TSA/HSA`
   - **Public** (de dung GitHub Pages mien phi)
   - **KHONG tick** "Add a README file" (da co)
   - **KHONG tick** "Add .gitignore" (da co)
   - **KHONG tick** "Choose a license" (da co)
3. Click **"Create repository"**

## Buoc 2: Upload file

1. Tren trang repo vua tao, click **"uploading an existing file"**
   (link nho phia duoi "...or push an existing repository from the command line")
2. **Giai nen file ZIP** ra mot thu muc tren Desktop truoc
3. Vao thu muc vua giai nen, chon **TAT CA file va folder ben trong**
   (KHONG chon thu muc cha, phai vao trong roi chon)
4. **Keo tha** vao o upload cua GitHub
   - Hoac click **"choose your files"** roi chon file
5. Doi upload xong (co the mat 1-3 phut vi file kha lon)
6. Keo xuong duoi, dien commit message: `feat: SKY EDU v1.0`
7. Click **"Commit changes"**

## Buoc 3: Dien Firebase config that

Sau khi upload xong:

1. Trong repo, click file `firebase-config.js`
2. Click icon ✏️ (Edit this file)
3. Tim doan:
   ```js
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY_HERE",
       ...
   };
   ```
4. Thay tung `YOUR_*` bang gia tri that tu Firebase Console
5. Keo xuong, click **"Commit changes"**

### Lay config Firebase o dau?

1. Truy cap: https://console.firebase.google.com
2. Chon project cua ban
3. Click ⚙️ (Project settings) goc tren ben trai
4. Tab **General** -> keo xuong phan **"Your apps"**
5. Neu chua co app web, click **"</>"** de them
6. Copy doan `firebaseConfig = { ... }`

## Buoc 4: Bat GitHub Pages

1. Vao tab **Settings** cua repo
2. Keo menu ben trai xuong, click **Pages**
3. Phan **Source**: chon **"Deploy from a branch"**
4. Phan **Branch**: chon **main** + **/(root)**
5. Click **Save**
6. Doi 1-3 phut, refresh trang
7. Se thay thong bao: "Your site is live at https://YOUR-USERNAME.github.io/tsa-sky-main/"

## Buoc 5: Them domain vao Firebase

1. Truy cap: https://console.firebase.google.com
2. Chon project -> **Authentication** -> tab **Settings** -> **Authorized Domains**
3. Click **"Add domain"**
4. Nhap: `YOUR-USERNAME.github.io`
5. Click **Add**

## ✅ XONG! Web da chay that.

Truy cap: https://YOUR-USERNAME.github.io/tsa-sky-main/

---

## 🆘 Neu gap loi

### Loi "Firebase: Error (auth/unauthorized-domain)"
-> Lam Buoc 5 o tren

### Loi "Firebase: Error (auth/api-key-not-valid)"
-> `firebase-config.js` chua dien config that. Lam Buoc 3.

### Loi "Cannot read property 'app' of undefined"
-> `firebase-config.js` chua co hoac chua load. Kiem tra console (F12).

### Trang trang / khong load duoc
-> Mo DevTools (F12) -> tab Console xem loi
-> Hoac doi them vai phut, GitHub Pages doi khi cham

### Loi 404 khi vao /account/dang-nhap.html
-> Day la binh thuong, GitHub Pages khong tu phuc vu clean URLs.
-> Truy cap day du: https://YOUR-USERNAME.github.io/tsa-sky-main/account/dang-nhap.html

### Loi khi upload (qua 25MB hoac 100 files)
-> GitHub gioi han 25MB/file va 100 files/1 lan upload.
-> Upload theo tung folder nho:
  - Upload root files truoc (index.html, dashboard.html, ...)
  - Sau do upload tung folder (assets/, account/, phong-luyen-tsa/, ...)
