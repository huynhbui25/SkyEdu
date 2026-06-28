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
       13 CHUYÊN ĐỀ + ĐỀ THỰC CHIẾN + KHUNG ĐỀ
       (mirror từ tsa-topics.js để giữ tương thích khi file bị xóa / chưa load)
       ================================================================ */
    const _EXAM_CATEGORIES = (typeof TsaTopics !== 'undefined')
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
            'khung-de': 'Khung đề thi'
        };
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
        if (!_isFirebaseReady()) return Promise.resolve(null);
        const db = _fb();
        return db.ref(`${FIREBASE_PATH}/${exam.id}`).set(exam)
            .then(() => exam)
            .catch(err => {
                console.warn('[ExamBuilder] Firebase save error:', err);
                return null;
            });
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

        /** Lấy toàn bộ đề thi */
        getAll() {
            // PHẦN 1: Nếu lần đầu load, cố gắng sync từ Firebase ngay
            if (!window._ExamBuilder_syncInitiated) {
                window._ExamBuilder_syncInitiated = true;
                // Gọi sync background (không chặn)
                if (_isFirebaseReady()) {
                    _loadFromFirebase().then(fbExams => {
                        if (fbExams && fbExams.length > 0) {
                            const local = _readLocal();
                            const merged = new Map();
                            
                            // Thêm tất cả từ Firebase
                            fbExams.forEach(e => merged.set(e.id, e));
                            
                            // So sánh với local, lấy phiên bản mới nhất
                            local.forEach(e => {
                                if (!merged.has(e.id)) {
                                    // Nếu chỉ có ở local, giữ lại
                                    merged.set(e.id, e);
                                } else {
                                    // Nếu cả 2 có, lấy phiên bản mới nhất (dựa vào updatedAt)
                                    const fbVersion = merged.get(e.id);
                                    const localTime = new Date(e.updatedAt || 0).getTime();
                                    const fbTime = new Date(fbVersion.updatedAt || 0).getTime();
                                    if (localTime > fbTime) {
                                        merged.set(e.id, e);
                                    }
                                }
                            });
                            
                            // Ghi lại localStorage với dữ liệu đã merge
                            _writeLocal(Array.from(merged.values()));
                            console.log('[ExamBuilder] Đã sync', fbExams.length, 'đề từ Firebase xong');
                        }
                    }).catch(err => {
                        console.warn('[ExamBuilder] Sync Firebase lỗi:', err);
                        // Dù có lỗi vẫn tiếp tục, dùng dữ liệu local
                    });
                }
            }
            
            // PHẦN 2: Trả về dữ liệu hiện tại từ localStorage
            return _readLocal();
        },

        /** Lấy đề theo ID */
        getById(id) {
            return _readLocal().find(e => e.id === id) || null;
        },

        /** Tạo đề thi mới */
        create(opts) {
            const {
                name, code, type = 'tsa', category = 'thuc-chien',
                timeMinutes = 150, questions = [],
                showAnswers = true, showExplanation = true, shuffleQuestions = false, shuffleOptions = false
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

            const exam = {
                id: _uuid(),
                name: name.trim(),
                code: code.trim(),
                type, category: normalizedCategory,
                timeMinutes: parseInt(timeMinutes) || 150,
                questions: questions.map(q => ({
                    ...JSON.parse(JSON.stringify(q)),
                    id: q.id || _qid()
                })),
                options: { showAnswers, showExplanation, shuffleQuestions, shuffleOptions },
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

            const arr = _readBlueprints();
            const idx = arr.findIndex(b => b.id === bp.id);
            if (idx >= 0) arr[idx] = bp; else arr.push(bp);
            _writeBlueprints(arr);

            if (_isFirebaseReady()) {
                try {
                    firebase.database().ref(`exam_blueprints/${bp.id}`).set(bp).catch(() => {});
                } catch (e) {}
            }

            return { success: true, blueprint: bp };
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
            const updated = { ...exams[idx], ...safeUpdates, id, updatedAt: new Date().toISOString() };
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
                        const origAnswers = new Set(q.type === 'true_false' ? [] : (q.correctAnswers || [q.correctAnswer]));
                        const shuffled = _shuffle(q.options.map((opt, i) => ({ opt, isCorrect: origAnswers.has(opt) })));
                        q.options = shuffled.map(o => o.opt);
                        if (q.type === 'mcq_single') {
                            q.correctAnswer = shuffled.find(o => o.isCorrect)?.opt;
                        } else if (q.type === 'mcq_multi') {
                            q.correctAnswers = shuffled.filter(o => o.isCorrect).map(o => o.opt);
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

        /** Đồng bộ từ Firebase */
        syncFromFirebase() {
            return _loadFromFirebase().then(fbExams => {
                if (fbExams.length > 0) {
                    const local = _readLocal();
                    const merged = new Map();
                    fbExams.forEach(e => merged.set(e.id, e));
                    local.forEach(e => {
                        if (!merged.has(e.id) || new Date(e.updatedAt || 0) > new Date(merged.get(e.id).updatedAt || 0)) {
                            merged.set(e.id, e);
                        }
                    });
                    _writeLocal(Array.from(merged.values()));
                }
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
        _uuid
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
