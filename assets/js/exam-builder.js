/* ================================================================
   EXAM BUILDER - Quản lý tạo đề thi từ kho câu hỏi
   Tác giả: SKY EDU Team
   Phiên bản: 1.0.0
   Mô tả: Module xây dựng đề thi: chọn câu hỏi, tạo đề, lưu trữ,
           xáo trộn câu hỏi/đáp án, hỗ trợ rubric tự luận.
   ================================================================ */

(function (global) {
    'use strict';

    const STORAGE_KEY = 'sky_exams';
    const FIREBASE_PATH = 'exams';

    /* ================================================================
       DATA CHANGE NOTIFICATION SYSTEM
       ================================================================ */
    const _ExamSubscribers = {
        _cbs: [],
        _pending: false,
        subscribe(fn) { this._cbs.push(fn); return () => { this._cbs = this._cbs.filter(cb => cb !== fn); }; },
        _notify(data, source) { this._cbs.forEach(cb => { try { cb(data, source); } catch(e) { console.warn('[ExamSubscribers] callback error:', e); } }); },
        _debouncedNotify(data, source) {
            if (this._pending) return;
            this._pending = true;
            setTimeout(() => { this._pending = false; this._notify(data, source); }, 100);
        }
    };

    /* ================================================================
       13 CHUYÊN ĐỀ + ĐỀ THỰC CHIẾN + KHUNG ĐỀ
       (mirror từ tsa-topics.js để giữ tương thích khi file bị xóa / chưa load)
       ================================================================ */
    const _EXAM_CATEGORIES = (() => {
        const base = (typeof TsaTopics !== 'undefined')
            ? { ...TsaTopics.ALL_CATEGORIES }
            : {
                'bat-pt': 'Bất phương trình và quy hoạch tuyến tính',
                'thong-ke': 'Thống kê',
                'so-hoc': 'Số học',
                'hh-phang': 'Hình học phẳng và 3 đường conic',
                'gioi-han': 'Giới hạn và tính liên tục của hàm số',
                'cap-so': 'Cấp số, dãy số và hệ thức truy hồi',
                'logarit': 'Hàm số logarit, hàm lũy thừa và hàm số mũ',
                'luong-giac': 'Phương trình lượng giác',
                'to-hop': 'Tổ hợp – Xác suất cổ điển – Xác suất có điều kiện',
                'ham-so': 'Hàm số, đồ thị hàm số và đạo hàm',
                'nguyen-ham': 'Nguyên hàm & Tích phân',
                'vector': 'Vector & Hình học không gian có tọa độ',
                'hh-khong-gian': 'Hình học không gian thuần túy',
                'thuc-chien': 'Đề thực chiến',
                'khung-de': 'Đề thi thử'
            };
        // Merge thêm 5 chuyên đề HSA + 2 mục đặc biệt HSA nếu file hsa-topics.js đã load
        if (typeof HsaTopics !== 'undefined') {
            try {
                Object.keys(HsaTopics.ALL_CATEGORIES).forEach(k => {
                    if (!base[k]) base[k] = HsaTopics.ALL_CATEGORIES[k];
                });
            } catch (e) {}
        }
        return base;
    })();
    const _VALID_EXAM_CATEGORIES = new Set(Object.keys(_EXAM_CATEGORIES));

    /* ================================================================
       LOCAL STORAGE HELPERS
       ================================================================ */

    function _readLocal() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('[ExamBuilder] Lỗi đọc localStorage:', e);
            return [];
        }
    }

    function _writeLocal(exams) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
        } catch (e) {
            console.error('[ExamBuilder] Lỗi ghi localStorage:', e);
        }
    }

    /**
     * Mirror exam sang localStorage 'exams' (key phòng luyện TSA/HSA đang đọc)
     * và cả Firebase path 'phongluyen_exams' để đồng bộ giữa các máy.
     * Phòng luyện dùng filter: type === 'hsa' | 'tsa' và category 'basic' | 'advanced' | 'full'.
     */
    function _mirrorToPhongLuyen(exam) {
        if (!exam) return;
        try {
            const KEY = 'exams';
            const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
            const idx = arr.findIndex(e => e.id === exam.id);
            const cloned = JSON.parse(JSON.stringify(exam));
            if (idx >= 0) arr[idx] = cloned; else arr.push(cloned);
            localStorage.setItem(KEY, JSON.stringify(arr));
        } catch (e) {
            console.warn('[ExamBuilder] mirror localStorage failed:', e);
        }
        if (_isFirebaseReady()) {
            try {
                firebase.database().ref(`phongluyen_exams/${exam.id}`).set(exam).catch(err =>
                    console.warn('[ExamBuilder] mirror Firebase failed:', err));
            } catch (e) { /* ignore */ }
        }
    }

    function _removeFromPhongLuyen(examId) {
        try {
            const KEY = 'exams';
            const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
            const next = arr.filter(e => e.id !== examId);
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch (e) { /* ignore */ }
        if (_isFirebaseReady()) {
            try {
                firebase.database().ref(`phongluyen_exams/${examId}`).remove().catch(() => {});
            } catch (e) { /* ignore */ }
        }
    }

    /* ================================================================
       FIREBASE HELPERS
       ================================================================ */

    function _isFirebaseReady() {
        return typeof firebase !== 'undefined' && firebase.database && typeof firebase.database === 'function';
    }

    function _fb() {
        return _isFirebaseReady() ? firebase.database() : null;
    }

    function _saveToFirebase(exam) {
        console.log('[ExamBuilder._saveToFirebase] mcq_multi:', (exam.questions || []).filter(q => q.type === 'mcq_multi').map(q => ({ id: q.id, correctAnswers: q.correctAnswers })));
        if (!_isFirebaseReady()) return Promise.resolve(null);
        const db = _fb();
        return db.ref(`${FIREBASE_PATH}/${exam.id}`).set(exam)
            .then(() => { console.log('[ExamBuilder._saveToFirebase] SUCCESS:', exam.id); return exam; })
            .catch(err => { console.warn('[ExamBuilder] Firebase save error:', err); return null; });
    }

    function _deleteFromFirebase(examId) {
        if (!_isFirebaseReady()) return Promise.resolve(null);
        const db = _fb();
        return db.ref(`${FIREBASE_PATH}/${examId}`).remove()
            .catch(err => console.warn('[ExamBuilder] Firebase delete error:', err));
    }

    function _loadFromFirebase() {
        if (!_isFirebaseReady()) return Promise.resolve([]);
        const db = _fb();
        return Promise.all([
            db.ref('exams').once('value').catch(() => null),
            db.ref('phongluyen_exams').once('value').catch(() => null)
        ]).then(([snap1, snap2]) => {
            const merged = new Map();
            if (snap1 && snap1.val()) Object.values(snap1.val()).forEach(e => merged.set(e.id, e));
            if (snap2 && snap2.val()) Object.values(snap2.val()).forEach(e => {
                if (!merged.has(e.id)) merged.set(e.id, e);
            });
            return Array.from(merged.values());
        }).catch(err => {
            console.warn('[ExamBuilder] Firebase load error:', err);
            return [];
        });
    }

    /**
     * [SYNC] Ghi Blueprint lên Firebase với retry
     */
    function _saveBlueprintToFirebase(blueprint, maxRetries = 3) {
        return new Promise((resolve, reject) => {
            if (!_isFirebaseReady()) {
                reject(new Error('Firebase not ready'));
                return;
            }
            
            const db = _fb();
            const ref = db.ref(`exam_blueprints/${blueprint.id}`);
            let attempt = 0;
            
            const attemptWrite = () => {
                attempt++;
                ref.set(blueprint)
                    .then(() => {
                        console.log(`[ExamBuilder] Blueprint Firebase write success (attempt ${attempt}):`, blueprint.id);
                        resolve(blueprint);
                    })
                    .catch((error) => {
                        console.warn(`[ExamBuilder] Blueprint write attempt ${attempt}/${maxRetries} failed:`, error.code);
                        if (attempt < maxRetries) {
                            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                            setTimeout(attemptWrite, delay);
                        } else {
                            reject(error);
                        }
                    });
            };
            
            attemptWrite();
        });
    }

    /**
     * [SYNC] Xóa Blueprint khỏi Firebase
     */
    function _deleteBlueprintFromFirebase(blueprintId) {
        return new Promise((resolve, reject) => {
            if (!_isFirebaseReady()) {
                resolve();
                return;
            }
            
            const db = _fb();
            db.ref(`exam_blueprints/${blueprintId}`).remove()
                .then(() => resolve())
                .catch(reject);
        });
    }

    /* ================================================================
       BLUEPRINT FIREBASE REALTIME SYNC MODULE
       ================================================================ */
    const BlueprintSync = {
        _listeners: [],
        _data: [],
        _dataMap: new Map(),
        _initialized: false,

        init() {
            if (this._initialized) {
                console.log('[BlueprintSync] Already initialized');
                return;
            }
            
            if (!_isFirebaseReady()) {
                console.log('[BlueprintSync] Firebase not ready, will retry...');
                setTimeout(() => this.init(), 1000);
                return;
            }

            console.log('[BlueprintSync] Initializing realtime listener...');
            this._initialized = true;
            
            const db = _fb();
            const ref = db.ref('exam_blueprints');

            const valueHandler = (snapshot) => {
                const data = snapshot.val() || {};
                const blueprints = Object.values(data);
                
                this._dataMap.clear();
                blueprints.forEach(bp => this._dataMap.set(bp.id, bp));
                this._data = blueprints;
                
                _writeBlueprints(blueprints);
                
                console.log('[BlueprintSync] Synced', blueprints.length, 'blueprints from Firebase');
                
                window.dispatchEvent(new CustomEvent('blueprintsUpdated', { 
                    detail: { blueprints, source: 'firebase' } 
                }));
            };

            const childAddedHandler = (snapshot) => {
                const blueprint = snapshot.val();
                if (blueprint && blueprint.id) {
                    console.log('[BlueprintSync] Blueprint added:', blueprint.id);
                    window.dispatchEvent(new CustomEvent('blueprintAdded', { 
                        detail: { blueprint, source: 'firebase' } 
                    }));
                }
            };

            const childChangedHandler = (snapshot) => {
                const blueprint = snapshot.val();
                if (blueprint && blueprint.id) {
                    console.log('[BlueprintSync] Blueprint updated:', blueprint.id);
                    window.dispatchEvent(new CustomEvent('blueprintUpdated', { 
                        detail: { blueprint, source: 'firebase' } 
                    }));
                }
            };

            const childRemovedHandler = (snapshot) => {
                console.log('[BlueprintSync] Blueprint removed:', snapshot.key);
                window.dispatchEvent(new CustomEvent('blueprintRemoved', { 
                    detail: { blueprintId: snapshot.key, source: 'firebase' } 
                }));
            };

            ref.on('value', valueHandler);
            ref.on('child_added', childAddedHandler);
            ref.on('child_changed', childChangedHandler);
            ref.on('child_removed', childRemovedHandler);

            this._listeners = [
                { ref, event: 'value', handler: valueHandler },
                { ref, event: 'child_added', handler: childAddedHandler },
                { ref, event: 'child_changed', handler: childChangedHandler },
                { ref, event: 'child_removed', handler: childRemovedHandler }
            ];

            console.log('[BlueprintSync] Realtime listeners registered');
        },

        destroy() {
            if (!_isFirebaseReady()) return;
            this._listeners.forEach(({ ref, event, handler }) => ref.off(event, handler));
            this._listeners = [];
            this._initialized = false;
        },

        getData() {
            return this._data;
        },

        getById(id) {
            return this._dataMap.get(id) || null;
        },

        isReady() {
            return this._initialized;
        }
    };
    global.BlueprintSync = BlueprintSync;

    /* ================================================================
       EXAM FIREBASE REALTIME SYNC MODULE
       ================================================================ */
    const ExamSync = {
        _listeners: [],
        _data: [],
        _dataMap: new Map(),
        _initialized: false,

        init() {
            if (this._initialized) return;
            if (!_isFirebaseReady()) {
                setTimeout(() => this.init(), 1000);
                return;
            }

            console.log('[ExamSync] Initializing realtime listener...');
            this._initialized = true;
            
            const db = _fb();
            const ref = db.ref(FIREBASE_PATH);

            const valueHandler = (snapshot) => {
                const data = snapshot.val() || {};
                const exams = Object.values(data);
                
                this._dataMap.clear();
                exams.forEach(ex => this._dataMap.set(ex.id, ex));
                this._data = exams;
                
                _writeLocal(exams);
                
                console.log('[ExamSync] Synced', exams.length, 'exams from Firebase');
                
                window.dispatchEvent(new CustomEvent('examsUpdated', { 
                    detail: { exams, source: 'firebase' } 
                }));
            };

            ref.on('value', valueHandler);
            this._listeners = [{ ref, event: 'value', handler: valueHandler }];

            console.log('[ExamSync] Realtime listeners registered');
        },

        destroy() {
            if (!_isFirebaseReady()) return;
            this._listeners.forEach(({ ref, event, handler }) => ref.off(event, handler));
            this._listeners = [];
            this._initialized = false;
        },

        getData() {
            return this._data;
        },

        isReady() {
            return this._initialized;
        }
    };
    global.ExamSync = ExamSync;

    /* ================================================================
       MIGRATION: Đồng bộ blueprints từ local lên Firebase
       ================================================================ */
    async function migrateBlueprintsToFirebase() {
        const MIGRATED_KEY = '_sky_bp_migrated_to_fb';
        
        try {
            if (localStorage.getItem(MIGRATED_KEY) === 'true') {
                return { success: true, skipped: true };
            }
        } catch (e) {}
        
        if (!_isFirebaseReady()) {
            return { success: false, error: 'Firebase not ready' };
        }
        
        try {
            const fbSnap = await _fb().ref('exam_blueprints').once('value');
            const fbData = fbSnap.val() || {};
            
            if (Object.keys(fbData).length > 0) {
                _writeBlueprints(Object.values(fbData));
                localStorage.setItem(MIGRATED_KEY, 'true');
                return { success: true, action: 'synced_from_fb', count: Object.keys(fbData).length };
            }
            
            const localData = _readBlueprints();
            if (localData.length === 0) {
                localStorage.setItem(MIGRATED_KEY, 'true');
                return { success: true, action: 'no_data' };
            }
            
            const writes = localData.map(bp => 
                _fb().ref(`exam_blueprints/${bp.id}`).set(bp)
            );
            
            await Promise.all(writes);
            localStorage.setItem(MIGRATED_KEY, 'true');
            return { success: true, migrated: localData.length };
            
        } catch (error) {
            console.error('[BlueprintSync] Migration failed:', error);
            return { success: false, error: error.message };
        }
    }
    global.migrateBlueprints = migrateBlueprintsToFirebase;

    /* ================================================================
       AUTO-INIT
       ================================================================ */
    if (typeof firebase !== 'undefined' && firebase.database) {
        setTimeout(() => {
            if (!BlueprintSync._initialized && _isFirebaseReady()) {
                console.log('[ExamBuilder] Auto-initializing BlueprintSync...');
                BlueprintSync.init();
                setTimeout(() => migrateBlueprintsToFirebase(), 2000);
            }
            if (!ExamSync._initialized && _isFirebaseReady()) {
                ExamSync.init();
            }
        }, 500);
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('firebaseReady', () => {
            setTimeout(() => {
                if (!BlueprintSync._initialized && _isFirebaseReady()) {
                    BlueprintSync.init();
                    setTimeout(() => migrateBlueprintsToFirebase(), 2000);
                }
                if (!ExamSync._initialized && _isFirebaseReady()) {
                    ExamSync.init();
                }
            }, 500);
        });
    }

    /* ================================================================
       UTILS
       ================================================================ */

    function _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function _uuid() {
        return 'exam-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function _qid() {
        if (typeof QuestionTypes !== 'undefined' && QuestionTypes.generateId) {
            return QuestionTypes.generateId();
        }
        return 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function _validate(q) {
        if (typeof QuestionTypes !== 'undefined' && QuestionTypes.validate) {
            return QuestionTypes.validate(q);
        }
        return null;
    }

    /**
     * Chuẩn hoá category của đề thi:
     *  - 13 chuyên đề TSA + 'thuc-chien' + 'khung-de'  → giữ nguyên
     *  - Legacy 'full' → đổi thành 'thuc-chien'
     *  - 'basic' | 'advanced' | bất kỳ → fallback về 'thuc-chien'
     */
    function _normalizeCategory(category) {
        const c = String(category || '').trim();
        if (_VALID_EXAM_CATEGORIES.has(c)) return c;
        if (c === 'full') return 'thuc-chien';
        return 'thuc-chien';
    }

    /**
     * Danh sách `room` hợp lệ — canonical để phân biệt phòng chứa đề:
     *  - 'practice-tsa'  : Phòng luyện TSA (trả phí)
     *  - 'practice-hsa'  : Phòng luyện HSA (trả phí)
     *  - 'mock-exam'     : Thi thử (miễn phí)
     */
    const _VALID_ROOMS = ['practice-tsa', 'practice-hsa', 'mock-exam'];

    /**
     * Suy ra `room` từ `type` + `category` cho đề thi cũ (chưa có field room).
     * Quy tắc:
     *  - category ∈ {'khung-de', 'hsa-de-thi-thu'}       → 'mock-exam'
     *  - type === 'tsa'                                 → 'practice-tsa'
     *  - type === 'hsa'                                 → 'practice-hsa'
     *  - mặc định theo type
     */
    function _inferRoomFromLegacy(exam) {
        const category = String(exam && exam.category || '').trim();
        if (category === 'khung-de' || category === 'hsa-de-thi-thu') return 'mock-exam';
        const t = (exam && exam.type) || 'tsa';
        return t === 'hsa' ? 'practice-hsa' : 'practice-tsa';
    }

    /**
     * Chuẩn hoá `room` của đề thi:
     *  - Nếu thiếu → suy ra từ type/category (legacy)
     *  - Nếu có nhưng không hợp lệ → fallback theo type
     */
    function _normalizeRoom(exam, providedRoom) {
        const incoming = providedRoom != null ? String(providedRoom).trim() : '';
        if (_VALID_ROOMS.includes(incoming)) return incoming;
        if (exam && _VALID_ROOMS.includes(exam.room)) return exam.room;
        return _inferRoomFromLegacy(exam || {});
    }

    /* ================================================================
       BLUEPRINT (KHUNG ĐỀ) - lưu localStorage
       ================================================================ */
    const BLUEPRINT_STORAGE_KEY = 'sky_exam_blueprints';

    function _readBlueprints() {
        try {
            const raw = localStorage.getItem(BLUEPRINT_STORAGE_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }
    function _writeBlueprints(arr) {
        try { localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(arr)); }
        catch (e) { console.error('[ExamBuilder] Lỗi ghi blueprint:', e); }
    }
    function _readLocalQuestions() {
        try {
            const raw = localStorage.getItem('sky_question_bank');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    /* ================================================================
       PUBLIC API
       ================================================================ */

    const ExamBuilder = {
        STORAGE_KEY,
        FIREBASE_PATH,

        /** Lấy toàn bộ đề thi (optimistic read - return local ngay, sync background)
         *  Subscribe bằng ExamBuilder.onSyncComplete(cb) để nhận thông báo khi sync xong.
         */
        getAll() {
            // Trigger sync background nếu chưa từng sync
            if (!window._ExamBuilder_syncInitiated) {
                window._ExamBuilder_syncInitiated = true;
                if (_isFirebaseReady()) {
                    _loadFromFirebase().then(fbExams => {
                        const merged = new Map();
                        const local = _readLocal();

                        // Firebase làm base
                        (fbExams || []).forEach(e => merged.set(e.id, e));

                        // Local bổ sung những thứ Firebase không có hoặc local mới hơn
                        local.forEach(e => {
                            const existing = merged.get(e.id);
                            if (!existing || new Date(e.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                                merged.set(e.id, e);
                            }
                        });

                        const synced = Array.from(merged.values());
                        _writeLocal(synced);

                        // Notify subscribers để UI re-render nếu cần
                        _ExamSubscribers._debouncedNotify(synced, 'firebase-sync');
                        window.dispatchEvent(new CustomEvent('examsSynced', { detail: synced }));
                    }).catch(err => {
                        console.warn('[ExamBuilder] Sync Firebase lỗi:', err);
                    });
                }
            }

            return _readLocal();
        },

        /** Subscribe callback được gọi mỗi khi exams thay đổi (sau sync Firebase) */
        onSyncComplete(cb) {
            return _ExamSubscribers.subscribe(cb);
        },

        /** Force re-sync từ Firebase (hữu ích khi cần đảm bảo data mới nhất) */
        refresh() {
            if (!_isFirebaseReady()) return Promise.resolve(_readLocal());
            return _loadFromFirebase().then(fbExams => {
                const merged = new Map();
                const local = _readLocal();
                (fbExams || []).forEach(e => merged.set(e.id, e));
                local.forEach(e => {
                    const existing = merged.get(e.id);
                    if (!existing || new Date(e.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                        merged.set(e.id, e);
                    }
                });
                const synced = Array.from(merged.values());
                _writeLocal(synced);
                _ExamSubscribers._debouncedNotify(synced, 'manual-refresh');
                window.dispatchEvent(new CustomEvent('examsSynced', { detail: synced }));
                return synced;
            });
        },

        /** Lấy đề theo ID */
        getById(id) {
            return _readLocal().find(e => e.id === id) || null;
        },

        /** Tạo đề thi mới */
        create(opts) {
            const {
                name, code, type = 'tsa', category = 'thuc-chien',
                targetRole = 'all', tier = 'free', room,
                timeMinutes = 150, questions = [],
                showAnswers = true, showExplanation = true, shuffleQuestions = false, shuffleOptions = false,
                videoUrl = '', exerciseFileUrl = '', exerciseFileName = '',
                answerFileUrl = '', answerFileName = '',
                antiCheat = false,  // Bật/tắt chống gian lận cho từng đề
                attempts = 0  // Số lượt làm: 0 = không giới hạn
            } = opts;

            if (!name || !name.trim()) return { success: false, error: 'Tên đề không được trống' };
            if (!code || !code.trim()) return { success: false, error: 'Mã đề không được trống' };
            if (!Array.isArray(questions) || questions.length === 0)
                return { success: false, error: 'Đề thi phải có ít nhất 1 câu hỏi' };

            // Validate từng câu hỏi
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.type) return { success: false, error: `Câu ${i + 1}: thiếu loại câu hỏi` };
                const err = _validate(q);
                if (err) return { success: false, error: `Câu ${i + 1}: ${err}` };
            }

            // Chuẩn hoá category: chấp nhận 13 chuyên đề + thuc-chien + khung-de + legacy basic/advanced/full
            const normalizedCategory = _normalizeCategory(category);

            // Chuẩn hoá targetRole: 'all' | 'TSA' | 'HSA'
            const allowedRoles = ['all', 'TSA', 'HSA'];
            const normalizedRole = allowedRoles.includes(targetRole) ? targetRole : 'all';

            // Chuẩn hoá tier: 'free' | 'TSA01' | 'TSA02' | 'TSA03'
            const allowedTiers = ['free', 'TSA01', 'TSA02', 'TSA03'];
            const normalizedTier = allowedTiers.includes(tier) ? tier : 'free';

            // Chuẩn hoá room (canonical): 'practice-tsa' | 'practice-hsa' | 'mock-exam'.
            // Mặc định: nếu category gốc là 'khung-de'/'hsa-de-thi-thu' → 'mock-exam'; ngược lại theo type.
            // Lưu ý: dùng `category` gốc (chưa normalize) để tránh trường hợp _normalizeCategory rewrite
            // 'hsa-de-thi-thu' → 'thuc-chien' khi hsa-topics.js chưa load.
            const normalizedRoom = _normalizeRoom({ type, category: category }, room);

            // Chuẩn hoá videoUrl: chỉ giữ nếu là link YouTube hợp lệ
            const cleanedVideoUrl = (typeof videoUrl === 'string' && videoUrl.trim()) ? videoUrl.trim() : '';

            const exam = {
                id: _uuid(),
                name: name.trim(),
                code: code.trim(),
                type, category: normalizedCategory,
                targetRole: normalizedRole,
                tier: normalizedTier,
                room: normalizedRoom,
                timeMinutes: parseInt(timeMinutes) || 150,
                attempts: parseInt(attempts) || 0,  // Số lượt làm: 0 = không giới hạn
                questions: questions.map(q => ({
                    ...JSON.parse(JSON.stringify(q)),
                    id: q.id || _qid()
                })),
                options: { showAnswers, showExplanation, shuffleQuestions, shuffleOptions },
                // === Tài liệu đính kèm (video / file bài tập / file đáp án) ===
                videoUrl: cleanedVideoUrl,
                exerciseFileUrl: (typeof exerciseFileUrl === 'string' && exerciseFileUrl.trim()) ? exerciseFileUrl.trim() : '',
                exerciseFileName: (typeof exerciseFileName === 'string' && exerciseFileName.trim()) ? exerciseFileName.trim() : '',
                answerFileUrl: (typeof answerFileUrl === 'string' && answerFileUrl.trim()) ? answerFileUrl.trim() : '',
                answerFileName: (typeof answerFileName === 'string' && answerFileName.trim()) ? answerFileName.trim() : '',
                antiCheat: !!antiCheat,  // Bật/tắt chống gian lận cho từng đề
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Tính tổng điểm
            exam.totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);

            const exams = _readLocal();
            exams.push(exam);
            _writeLocal(exams);
            _saveToFirebase(exam);
            _mirrorToPhongLuyen(exam);
            return { success: true, exam };
        },

        /** Lưu "khung đề" (blueprint) — không có câu hỏi, chỉ chứa cấu trúc
         *  (số câu theo chuyên đề + độ khó) để tái sử dụng cho việc tạo đề nhanh.
         */
        saveBlueprint(blueprint) {
            if (!blueprint) return { success: false, error: 'Thiếu khung đề' };
            const name = (blueprint.name || '').trim();
            if (!name) return { success: false, error: 'Tên khung đề không được trống' };

            const bp = {
                id: blueprint.id || ('bp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
                name,
                description: (blueprint.description || '').trim(),
                type: blueprint.type || 'tsa',
                timeMinutes: parseInt(blueprint.timeMinutes) || 150,
                /** Mảng cấu trúc: [{ categoryKey, difficulty, count, points }] */
                slots: Array.isArray(blueprint.slots) ? blueprint.slots.map(s => ({
                    categoryKey: s.categoryKey || '',
                    difficulty: s.difficulty || '',
                    count: parseInt(s.count) || 0,
                    points: parseFloat(s.points) || 1
                })).filter(s => s.count > 0) : [],
                createdAt: blueprint.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Cập nhật localStorage NGAY để UI phản hồi nhanh
            const arr = _readBlueprints();
            const idx = arr.findIndex(b => b.id === bp.id);
            if (idx >= 0) arr[idx] = bp; else arr.push(bp);
            _writeBlueprints(arr);

            // [SYNC] Ghi Firebase - FIREBASE LÀ SINGLE SOURCE OF TRUTH
            // PHẢI await và chỉ return success KHI Firebase xác nhận
            if (_isFirebaseReady()) {
                return _saveBlueprintToFirebase(bp).then(() => {
                    console.log('[ExamBuilder] Blueprint saved to Firebase:', bp.id);
                    return { success: true, blueprint: bp };
                }).catch((error) => {
                    // Log đầy đủ lỗi Firebase
                    console.error('[ExamBuilder] Blueprint Firebase save FAILED:', error);
                    console.error('[ExamBuilder] error.code:', error?.code);
                    console.error('[ExamBuilder] error.message:', error?.message);
                    console.error('[ExamBuilder] error.stack:', error?.stack);
                    // Vẫn return success vì đã lưu local, nhưng cảnh báo
                    return { success: true, blueprint: bp, warning: 'Firebase sync failed: ' + (error?.message || String(error)) };
                });
            } else {
                console.warn('[ExamBuilder] Firebase not ready, blueprint saved locally only');
                return { success: true, blueprint: bp, warning: 'Firebase offline - saved locally' };
            }
        },

        /** Lấy danh sách khung đề */
        getBlueprints() {
            return _readBlueprints();
        },

        /** Lấy 1 khung đề theo id */
        getBlueprintById(id) {
            return _readBlueprints().find(b => b.id === id) || null;
        },

        /** Xoá khung đề */
        removeBlueprint(id) {
            const arr = _readBlueprints();
            const next = arr.filter(b => b.id !== id);
            _writeBlueprints(next);
            // Unlink câu hỏi đã gán blueprint này (để chúng quay về "chưa gán")
            try {
                if (typeof QuestionBank !== 'undefined' && QuestionBank.unlinkBlueprint) {
                    QuestionBank.unlinkBlueprint(id);
                }
            } catch (e) {}
            if (_isFirebaseReady()) {
                try { firebase.database().ref(`exam_blueprints/${id}`).remove().catch(() => {}); }
                catch (e) {}
            }
            return { success: true };
        },

        /**
         * Sinh đề thi thực tế từ 1 khung đề (kho câu hỏi).
         * Lấy TẤT CẢ câu hỏi đã được gán `blueprintId` khớp với blueprint này.
         * Mỗi câu chỉ dùng 1 lần; nếu không đủ câu sẽ trả về lỗi để admin biết cần thêm câu.
         */
        generateExamFromBlueprint(blueprintId, extraOpts = {}) {
            const bp = this.getBlueprintById(blueprintId);
            if (!bp) return { success: false, error: 'Không tìm thấy khung đề' };

            const seedQuestions = (typeof QuestionBank !== 'undefined' && QuestionBank.getAll)
                ? QuestionBank.getAll() : _readLocalQuestions();

            // Lấy toàn bộ câu đã gán blueprintId này
            const tagged = seedQuestions.filter(q => q.blueprintId === bp.id);

            if (tagged.length === 0) {
                return { success: false, error: 'Khung đề chưa có câu hỏi nào trong kho. Hãy thêm câu hỏi trước khi sinh đề.' };
            }

            // Shuffle để mỗi lần sinh đề thứ tự câu khác nhau
            const picked = tagged.slice().sort(() => Math.random() - 0.5);

            const opts = Object.assign({
                name: bp.name + ' (sinh tự động)',
                code: 'BP-' + Date.now().toString().slice(-6),
                type: bp.type || 'tsa',
                category: 'thuc-chien',
                timeMinutes: bp.timeMinutes || 150,
                questions: picked,
                _blueprintId: bp.id
            }, extraOpts);

            const r = this.create(opts);
            if (!r.success) return r;
            // Trả thêm report cho admin (không có "thiếu" vì cấu trúc đã bỏ)
            r.slotReport = [];
            r.missing = [];
            r.totalTagged = tagged.length;
            return r;
        },

        /** Cập nhật đề thi */
        update(id, updates) {
            const exams = _readLocal();
            const idx = exams.findIndex(e => e.id === id);
            if (idx < 0) return { success: false, error: 'Không tìm thấy đề thi' };
            const safeUpdates = Object.assign({}, updates);
            if (safeUpdates.category) safeUpdates.category = _normalizeCategory(safeUpdates.category);
            if (Object.prototype.hasOwnProperty.call(safeUpdates, 'room')) {
                safeUpdates.room = _normalizeRoom(
                    Object.assign({}, exams[idx], { room: safeUpdates.room }),
                    safeUpdates.room
                );
            }
            const updated = { ...exams[idx], ...safeUpdates, id, updatedAt: new Date().toISOString() };
            // Đồng bộ options với top-level fields (vì form gửi showAnswers/showExplanation ở top-level)
            if (safeUpdates.showAnswers !== undefined) {
                if (!updated.options) updated.options = {};
                updated.options.showAnswers = !!safeUpdates.showAnswers;
            }
            if (safeUpdates.showExplanation !== undefined) {
                if (!updated.options) updated.options = {};
                updated.options.showExplanation = !!safeUpdates.showExplanation;
            }
            if (safeUpdates.shuffleQuestions !== undefined) {
                if (!updated.options) updated.options = {};
                updated.options.shuffleQuestions = !!safeUpdates.shuffleQuestions;
            }
            if (safeUpdates.shuffleOptions !== undefined) {
                if (!updated.options) updated.options = {};
                updated.options.shuffleOptions = !!safeUpdates.shuffleOptions;
            }
            if (updated.questions) {
                updated.totalPoints = updated.questions.reduce((s, q) => s + (q.points || 1), 0);
            }
            exams[idx] = updated;
            _writeLocal(exams);
            _saveToFirebase(updated);
            _mirrorToPhongLuyen(updated);
            return { success: true, exam: updated };
        },

        /** Xóa đề thi */
        remove(id) {
            const exams = _readLocal();
            const idx = exams.findIndex(e => e.id === id);
            if (idx < 0) return { success: false, error: 'Không tìm thấy đề thi' };
            exams.splice(idx, 1);
            _writeLocal(exams);
            _deleteFromFirebase(id);
            _removeFromPhongLuyen(id);
            return { success: true };
        },

        /** Nhân bản đề thi */
        duplicate(id) {
            const original = this.getById(id);
            if (!original) return { success: false, error: 'Không tìm thấy đề thi' };
            const copy = JSON.parse(JSON.stringify(original));
            copy.id = _uuid();
            copy.name = '[BẢN SAO] ' + copy.name;
            copy.code = copy.code + '-COPY';
            copy.createdAt = new Date().toISOString();
            copy.updatedAt = new Date().toISOString();
            // Cũng nên tạo ID mới cho các câu hỏi
            copy.questions = copy.questions.map(q => ({
                ...q,
                id: _qid()
            }));
            const exams = _readLocal();
            exams.push(copy);
            _writeLocal(exams);
            _saveToFirebase(copy);
            return { success: true, exam: copy };
        },

        /** Xáo trộn câu hỏi trong đề (preview) */
        shufflePreview(exam) {
            const copy = JSON.parse(JSON.stringify(exam));
            if (copy.options && copy.options.shuffleQuestions) {
                copy.questions = _shuffle(copy.questions);
            }
            if (copy.options && copy.options.shuffleOptions) {
                copy.questions = copy.questions.map(q => {
                    if ((q.type === 'mcq_single' || q.type === 'mcq_multi' || q.type === 'true_false') && q.options) {
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        let origAnswers;
                        
                        if (q.type === 'true_false') {
                            origAnswers = new Set();
                        } else if (q.type === 'mcq_single') {
                            // correctAnswer có thể là chữ cái (A/B/C/D - format chuẩn) hoặc text (dữ liệu cũ)
                            const letterIdx = letters.indexOf(q.correctAnswer);
                            const correctText = (letterIdx >= 0 && q.options[letterIdx] !== undefined)
                                ? q.options[letterIdx]
                                : q.correctAnswer;
                            origAnswers = new Set([correctText]);
                        } else {
                            // mcq_multi: correctAnswers có thể là mảng chữ cái hoặc mảng text
                            const orig = q.correctAnswers || [];
                            console.log('[ExamBuilder.shufflePreview] mcq_multi before shuffle:', {
                                qid: q.id,
                                correctAnswers: orig,
                                options: q.options
                            });
                            origAnswers = new Set(orig.map(ans => {
                                const letterIdx = letters.indexOf(ans);
                                return (letterIdx >= 0 && q.options && q.options[letterIdx] !== undefined) 
                                    ? q.options[letterIdx] 
                                    : ans;
                            }));
                            console.log('[ExamBuilder.shufflePreview] mcq_multi origAnswers Set:', Array.from(origAnswers));
                        }
                        
                        const shuffled = _shuffle(q.options.map((opt, i) => ({ opt, isCorrect: origAnswers.has(opt) })));
                        q.options = shuffled.map(o => o.opt);
                        
                        if (q.type === 'mcq_single') {
                            // Gán lại correctAnswer theo CHỮ CÁI ứng với vị trí mới sau khi xáo (vì renderAnswer dùng letter làm value)
                            const newIdx = shuffled.findIndex(o => o.isCorrect);
                            q.correctAnswer = newIdx >= 0 ? letters[newIdx] : q.correctAnswer;
                        } else if (q.type === 'mcq_multi') {
                            // Gán lại correctAnswers theo CHỮ CÁI ứng với vị trí mới
                            const correctIndices = shuffled
                                .map((o, idx) => o.isCorrect ? idx : -1)
                                .filter(idx => idx >= 0);
                            q.correctAnswers = correctIndices.map(idx => letters[idx]);
                            console.log('[ExamBuilder.shufflePreview] mcq_multi after shuffle:', {
                                qid: q.id,
                                correctAnswers: q.correctAnswers,
                                correctIndices: correctIndices,
                                shuffledOptions: q.options,
                                isCorrectFlags: shuffled.map(o => o.isCorrect)
                            });
                        }
                    }
                    return q;
                });
            }
            return copy;
        },

        /** Thống kê */
        getStats() {
            const exams = _readLocal();
            const byType = {};
            exams.forEach(e => {
                byType[e.type] = (byType[e.type] || 0) + 1;
            });
            return { total: exams.length, byType };
        },

        /** Đồng bộ từ Firebase (đọc cả exams/ và phongluyen_exams/) */
        syncFromFirebase() {
            if (!_isFirebaseReady()) return Promise.resolve(_readLocal());
            return Promise.all([
                _loadFromFirebase(), // reads exams/ + phongluyen_exams/
            ]).then(([fbExams]) => {
                if (fbExams && fbExams.length > 0) {
                    const local = _readLocal();
                    const merged = new Map();
                    // Firebase làm base
                    fbExams.forEach(e => merged.set(e.id, e));
                    // Local bổ sung những thứ Firebase không có hoặc local mới hơn
                    local.forEach(e => {
                        const existing = merged.get(e.id);
                        if (!existing || new Date(e.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                            merged.set(e.id, e);
                        }
                    });
                    const synced = Array.from(merged.values());
                    _writeLocal(synced);
                    // Sync ngược lên cả 2 Firebase paths
                    synced.forEach(ex => {
                        _saveToFirebase(ex);
                        _mirrorToPhongLuyen(ex);
                    });
                    _ExamSubscribers._debouncedNotify(synced, 'syncFromFirebase');
                }
                return _readLocal();
            }).catch(err => {
                console.warn('[ExamBuilder] syncFromFirebase lỗi:', err);
                return _readLocal();
            });
        },

        /**
         * Lấy danh sách đề theo category (13 chuyên đề + 'thuc-chien' + 'khung-de').
         * Lọc theo type (mặc định 'tsa').
         */
        getByCategory(category, type = 'tsa') {
            const all = _readLocal();
            const c = _normalizeCategory(category);
            return all.filter(e => (e.category || 'thuc-chien') === c && (e.type || 'tsa') === type);
        },

        /**
         * Lấy danh sách đề theo `room` (canonical: 'practice-tsa' | 'practice-hsa' | 'mock-exam').
         * Không phụ thuộc `category` cũ — dùng cho trang Thi thử và các trang lọc nâng cao.
         */
        getByRoom(room, type = null) {
            const all = _readLocal();
            return all.filter(e => {
                const r = e.room || _inferRoomFromLegacy(e);
                if (r !== room) return false;
                if (type && (e.type || 'tsa') !== type) return false;
                return true;
            });
        },

        /**
         * Migration một lần: gán `room` cho tất cả đề cũ còn thiếu field này.
         * Quy tắc suy ra: category ∈ {khung-de, hsa-de-thi-thu} → 'mock-exam'; ngược lại theo type.
         *
         * Guard bằng localStorage flag `_sky_roomMigrated` để tránh chạy lặp lại.
         * Kết quả: ghi lại `sky_exams` + Firebase `exams/{id}` cho các đề đã thay đổi.
         * KHÔNG ghi `phongluyen_exams` (đã được mirror tự động qua các luồng create/update).
         *
         * Trả về { changed: number, total: number }.
         */
        migrateRoomFlags() {
            const FLAG = '_sky_roomMigrated';
            try {
                if (localStorage.getItem(FLAG) === '1') {
                    return { changed: 0, total: _readLocal().length, skipped: true };
                }
            } catch (e) { /* localStorage không khả dụng — vẫn chạy migration */ }

            const exams = _readLocal();
            let changed = 0;
            const updates = [];
            exams.forEach(e => {
                if (_VALID_ROOMS.includes(e.room)) return;
                const newRoom = _inferRoomFromLegacy(e);
                if (newRoom === e.room) return;
                e.room = newRoom;
                e.updatedAt = e.updatedAt || new Date().toISOString();
                changed++;
                updates.push(e);
            });
            if (changed > 0) {
                _writeLocal(exams);
                // Đẩy lên Firebase `exams/{id}` (không đụng `phongluyen_exams`)
                if (_isFirebaseReady()) {
                    updates.forEach(e => {
                        try {
                            firebase.database().ref(`${FIREBASE_PATH}/${e.id}`).update({ room: e.room });
                        } catch (err) { /* ignore */ }
                    });
                }
            }
            try { localStorage.setItem(FLAG, '1'); } catch (e) { /* ignore */ }
            return { changed, total: exams.length, skipped: false };
        },

        /** Lấy tất cả category hợp lệ của đề (13 chuyên đề + thuc-chien + khung-de) */
        getExamCategories() {
            return _EXAM_CATEGORIES;
        },

        /** Lấy title theo category key */
        getCategoryTitle(key) {
            return _EXAM_CATEGORIES[key] || key || '';
        },

        /** Xuất JSON */
        exportJSON(id) {
            const exam = this.getById(id);
            return exam ? JSON.stringify(exam, null, 2) : null;
        },

        /** Lấy bản dùng thi từ đề gốc (loại bỏ đáp án) */
        buildAttempt(examId) {
            const exam = this.getById(examId);
            if (!exam) return null;
            return this.shufflePreview(exam);
        },

        _shuffle,
        _uuid,
        _VALID_ROOMS,
        _inferRoomFromLegacy,
        _normalizeRoom
    };

    /* ================================================================
       EXPORT
       ================================================================ */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ExamBuilder;
    } else {
        global.ExamBuilder = ExamBuilder;
    }
})(typeof window !== 'undefined' ? window : globalThis);
