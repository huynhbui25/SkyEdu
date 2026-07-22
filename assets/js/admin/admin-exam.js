/**
 * admin-exam.js - Module quản lý Exam List trong Admin Panel
 * Tách ra từ admin.html để giảm dung lượng và tránh lỗi
 */
(function(global) {
    'use strict';

    // Kiểm tra đã load ExamBuilder chưa
    function waitForExamBuilder(callback, maxRetries = 20) {
        let retries = 0;
        var check = function() {
            retries++;
            if (typeof ExamBuilder !== 'undefined') {
                callback();
            } else if (retries < maxRetries) {
                setTimeout(check, 250);
            } else {
                console.error('[AdminExam] ExamBuilder không load được sau ' + maxRetries + ' lần thử');
            }
        };
        check();
    }

    // [BUG 4 FIX] Subscribe to ExamBuilder sync events để re-render khi data thay đổi
    function setupExamSyncListener() {
        if (setupExamSyncListener._bound) return;
        setupExamSyncListener._bound = true;

        // Listen to custom event từ ExamBuilder
        window.addEventListener('examsSynced', function(e) {
            var activePage = window._activePage || '';
            // Chỉ re-render nếu đang ở trang exam-list
            if (activePage === 'exam-list') {
                console.log('[AdminExam] examsSynced event received, re-rendering...');
                renderExamList();
            }
        });

        // Listen to examUpdated event (dispatched when exam is edited)
        window.addEventListener('examUpdated', function(e) {
            var activePage = window._activePage || '';
            if (activePage === 'exam-list') {
                console.log('[AdminExam] examUpdated event received, re-rendering...');
                renderExamList();
            }
        });

        // Also subscribe via ExamBuilder.onSyncComplete
        if (typeof ExamBuilder !== 'undefined' && ExamBuilder.onSyncComplete) {
            ExamBuilder.onSyncComplete(function(data, source) {
                var activePage = window._activePage || '';
                if (activePage === 'exam-list') {
                    console.log('[AdminExam] ExamBuilder sync complete (' + source + '), re-rendering...');
                    renderExamList();
                }
            });
        }
    }

    // Helper an toàn cho escapeHtml
    function safeEscape(s) {
        if (typeof QuestionTypes !== 'undefined' && typeof QuestionTypes.escapeHtml === 'function') {
            return QuestionTypes.escapeHtml(s);
        }
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // [FIX not-responding] Inner HTML for one exam card. Uses data-* attributes
    // (no inline onclick closures) — clicks are handled via delegation on #examList.
    function examCardInner(exam) {
        var typeLabel = exam.type === 'tsa' ? 'TSA' : 'HSA';
        var role = exam.targetRole || 'all';
        var tier = exam.tier || 'free';
        var room = exam.room || (typeof ExamBuilder !== 'undefined' && ExamBuilder._inferRoomFromLegacy
            ? ExamBuilder._inferRoomFromLegacy(exam) : (exam.type === 'hsa' ? 'practice-hsa' : 'practice-tsa'));

        var roleBadge = '';
        if (role === 'TSA') {
            roleBadge = '<span class="badge" style="background: rgba(0,212,255,0.15); color: var(--primary);">Role: TSA</span>';
        } else if (role === 'HSA') {
            roleBadge = '<span class="badge" style="background: rgba(139,92,246,0.15); color: var(--purple);">Role: HSA</span>';
        } else {
            roleBadge = '<span class="badge" style="background: rgba(100,116,139,0.15); color: var(--text-muted);">Role: Tất cả</span>';
        }

        var tierBadge = tier === 'TSA01' ? '<span class="badge" style="background: rgba(6,182,212,0.15); color: var(--info);">TSA01</span>'
            : tier === 'TSA02' ? '<span class="badge" style="background: rgba(16,185,129,0.15); color: var(--success);">TSA02</span>'
            : tier === 'TSA03' ? '<span class="badge" style="background: rgba(236,72,153,0.15); color: var(--pink);">TSA03</span>'
            : '<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">Free</span>';

        var roomBadge = room === 'practice-tsa'
            ? '<span class="badge" style="background: rgba(59,130,246,0.15); color: #3B82F6;">Phòng luyện TSA</span>'
            : room === 'practice-hsa'
                ? '<span class="badge" style="background: rgba(139,92,246,0.15); color: #8B5CF6;">Phòng luyện HSA</span>'
                : room === 'mock-exam'
                    ? '<span class="badge" style="background: rgba(245,158,11,0.15); color: #F59E0B;">Thi thử</span>'
                    : '<span class="badge" style="background: rgba(100,116,139,0.15); color: var(--text-muted);">—</span>';

        var attemptsBadge = (exam.attempts && exam.attempts > 0)
            ? '<span class="badge" style="background: rgba(16,185,129,0.15); color: var(--success);">' + exam.attempts + ' lượt</span>'
            : '<span class="badge" style="background: rgba(100,116,139,0.15); color: var(--text-muted);">∞ lượt</span>';

        return '<div class="exam-card-header">' +
                '<label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; flex: 1;">' +
                    '<input type="checkbox" class="exam-card-checkbox" data-exam-checkbox value="' + safeEscape(exam.id) + '" style="width: 18px; height: 18px; margin-top: 4px; cursor: pointer; flex-shrink: 0;">' +
                    '<div style="flex: 1; min-width: 0;">' +
                        '<div class="exam-card-title">' + safeEscape(exam.name) + '</div>' +
                        '<div class="exam-card-code">' + safeEscape(exam.code) + '</div>' +
                    '</div>' +
                '</label>' +
                '<span class="badge" style="background: ' + (exam.type === 'tsa' ? '#DBEAFE' : '#FCE7F3') + '; color: ' + (exam.type === 'tsa' ? '#1E40AF' : '#9F1239') + ';">' + typeLabel + '</span>' +
            '</div>' +
            '<div class="exam-card-meta">' +
                '<span>📝 ' + (exam.questionCount || 0) + ' câu</span>' +
                '<span>⏱️ ' + (exam.timeMinutes || 150) + ' phút</span>' +
                '<span>💯 ' + (exam.totalPoints || 0) + ' điểm</span>' +
                '<span>🔄 ' + ((exam.attempts && exam.attempts > 0) ? exam.attempts + ' lượt' : '∞ lượt') + '</span>' +
                '<span>📅 ' + (exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : 'N/A') + '</span>' +
            '</div>' +
            '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; padding-top: 8px; border-top: 1px dashed var(--card-border);">' +
                roomBadge + roleBadge + tierBadge + attemptsBadge +
            '</div>' +
            '<div class="exam-card-actions">' +
                '<button class="btn btn-primary btn-sm" data-exam-action="preview" data-exam-id="' + safeEscape(exam.id) + '">👁️ Xem</button>' +
                '<button class="btn btn-info btn-sm" data-exam-action="results" data-exam-id="' + safeEscape(exam.id) + '">📊 Kết quả</button>' +
                '<button class="btn btn-warning btn-sm" data-exam-action="edit" data-exam-id="' + safeEscape(exam.id) + '">✏️ Chỉnh sửa</button>' +
                '<button class="btn btn-secondary btn-sm" data-exam-action="duplicate" data-exam-id="' + safeEscape(exam.id) + '">📋 Sao chép</button>' +
                '<button class="btn btn-danger btn-sm" data-exam-action="delete" data-exam-id="' + safeEscape(exam.id) + '">🗑️ Xóa</button>' +
            '</div>';
    }

    // Render exam list
    function renderExamList() {
        try {
            // Guard against re-entry loops
            if (global._renderingExamList) return;
            global._renderingExamList = true;
            setTimeout(function() { global._renderingExamList = false; }, 500);

            if (typeof ExamBuilder === 'undefined') {
                var container = document.getElementById('examList');
                if (container) container.innerHTML = '<div class="empty-state"><p>Đang tải ExamBuilder...</p></div>';
                return;
            }

            // [FIX not-responding] Build lightweight summaries. Loading full
            // exam data (questions[]) for every card caused ~5s "Page
            // Unresponsive" when 18+ exams were present — each exam carries
            // dozens-hundreds of question objects. We now render summaries
            // (no questions[]) and lazy-load the full exam only when the user
            // actually opens one (previewExam / duplicateExam already call
            // ExamBuilder.getById() which re-reads from localStorage).
            var exams = [];
            try {
                var allExams = ExamBuilder.getAll() || [];
                exams = allExams.map(function(e) {
                    return {
                        id: e.id,
                        name: e.name,
                        code: e.code,
                        type: e.type,
                        category: e.category,
                        targetRole: e.targetRole,
                        tier: e.tier,
                        room: e.room || (ExamBuilder._inferRoomFromLegacy ? ExamBuilder._inferRoomFromLegacy(e) : null),
                        timeMinutes: e.timeMinutes,
                        totalPoints: e.totalPoints,
                        createdAt: e.createdAt,
                        questionCount: (e.questions && e.questions.length) || 0,
                        attempts: e.attempts || 0
                    };
                });
            } catch (e) {
                console.error('[AdminExam] ExamBuilder.getAll() lỗi:', e);
            }

            // Lọc theo dropdown "Phòng" ở toolbar (#adminRoomFilter)
            try {
                var filterEl = document.getElementById('adminRoomFilter');
                if (filterEl && filterEl.value && filterEl.value !== 'all') {
                    var wanted = filterEl.value;
                    exams = exams.filter(function(e) {
                        var r = e.room || (ExamBuilder._inferRoomFromLegacy ? ExamBuilder._inferRoomFromLegacy(e) : null);
                        return r === wanted;
                    });
                }
            } catch (e) { /* ignore filter */ }

            var container = document.getElementById('examList');
            if (!container) {
                console.warn('[AdminExam] examList container not found');
                return;
            }

            if (exams.length === 0) {
                container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><div class="icon">📝</div><h3>Chưa có đề thi nào</h3><p>Tạo đề thi đầu tiên</p><button class="btn btn-primary" onclick="App.navigateTo(\'create-exam\')">➕ Tạo đề thi</button></div>';
                var toolbar = document.getElementById('examListToolbar');
                if (toolbar) toolbar.style.display = 'none';
                return;
            }

            // [FIX not-responding] Build DOM via DocumentFragment instead of one
            // giant innerHTML string. With 18+ cards the old code spent ~500ms+
            // just binding N*3 inline onclick closures. DocumentFragment lets us
            // assemble the tree without triggering layout, then we do a single
            // appendChild at the end (one reflow instead of N+3 incremental).
            var frag = document.createDocumentFragment();
            for (var i = 0; i < exams.length; i++) {
                var card = document.createElement('div');
                card.className = 'exam-card';
                card.setAttribute('data-exam-id', exams[i].id);
                card.innerHTML = examCardInner(exams[i]);
                frag.appendChild(card);
            }

            container.innerHTML = '';
            container.appendChild(frag);

            // Reset selection state
            if (global.App && global.App._selectedExams) {
                global.App._selectedExams = new Set();
            }
            if (global.App && global.App.updateExamSelectionUI) {
                global.App.updateExamSelectionUI();
            }
        } catch (e) {
            console.error('[AdminExam] renderExamList error:', e);
        }
    }

    // [FIX not-responding] Event delegation for exam list — replaces N*3 inline
    // onclick handlers with a single click listener on #examList. Persists across
    // innerHTML rebuilds so renderExamList() doesn't need to re-bind per card.
    function setupExamListEventDelegation() {
        if (setupExamListEventDelegation._bound) return;
        setupExamListEventDelegation._bound = true;

        var container = document.getElementById('examList');
        if (!container) return;

        container.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-exam-action]');
            if (!btn || !container.contains(btn)) return;
            var action = btn.dataset.examAction;
            var id = btn.dataset.examId;
            if (!id || !global.App) return;
            try {
                if (action === 'preview' && typeof global.App.previewExam === 'function') {
                    global.App.previewExam(id);
                } else if (action === 'edit' && typeof global.App.editExam === 'function') {
                    global.App.editExam(id);
                } else if (action === 'duplicate' && typeof global.App.duplicateExam === 'function') {
                    global.App.duplicateExam(id);
                } else if (action === 'delete' && typeof global.App.deleteExam === 'function') {
                    global.App.deleteExam(id);
                } else if (action === 'results' && typeof global.App.showExamResults === 'function') {
                    global.App.showExamResults(id);
                }
            } catch (err) {
                console.warn('[AdminExam] delegated action failed:', action, err);
            }
        });

        // Also delegate checkbox change to App.onExamCheckboxChange
        container.addEventListener('change', function(e) {
            var cb = e.target.closest('[data-exam-checkbox]');
            if (!cb || !container.contains(cb)) return;
            if (global.App && typeof global.App.onExamCheckboxChange === 'function') {
                try { global.App.onExamCheckboxChange(); } catch (err) {
                    console.warn('[AdminExam] onExamCheckboxChange failed:', err);
                }
            }
        });
    }

    // Export
    global.AdminExam = {
        renderExamList: renderExamList,
        waitForExamBuilder: waitForExamBuilder,
        setupExamListEventDelegation: setupExamListEventDelegation,
        setupExamSyncListener: setupExamSyncListener
    };

})(typeof window !== 'undefined' ? window : globalThis);