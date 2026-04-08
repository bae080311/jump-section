"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrollManager = void 0;
var ScrollManager = /** @class */ (function () {
    function ScrollManager(options) {
        if (options === void 0) { options = {}; }
        var _a;
        this.sections = new Map();
        this.disabledSections = new Set();
        this.observer = null;
        this.resizeObserver = null;
        this.activeId = null;
        this.previousId = null;
        this.lastScrollY = 0;
        this.scrollDirection = null;
        this.listeners = new Set();
        this.progressListeners = new Map();
        this.keyboardHandler = null;
        this.scrollHandler = null;
        this.popstateHandler = null;
        this.notifyScheduled = false;
        this.debugElements = new Map();
        this.handleIntersection = function (entries) {
            var _a, _b, _c;
            if (_this.options.debug) {
                _this.updateDebugOverlays(entries);
            }
            var visibleEntries = entries.filter(function (e) { return e.isIntersecting; });
            if (visibleEntries.length === 0) {
                // 모든 섹션이 뷰포트 밖으로 벗어났을 때 비활성 상태로 전환
                if (_this.activeId !== null) {
                    _this.previousId = _this.activeId;
                    _this.activeId = null;
                    _this.scheduleNotify();
                }
                return;
            }
            var best = visibleEntries.reduce(function (prev, current) {
                return prev.intersectionRatio > current.intersectionRatio ? prev : current;
            });
            var id;
            for (var _i = 0, _d = _this.sections.entries(); _i < _d.length; _i++) {
                var _e = _d[_i], sectionId = _e[0], el = _e[1];
                if (el === best.target) {
                    id = sectionId;
                    break;
                }
            }
            id = id !== null && id !== void 0 ? id : best.target.id;
            if (!id || id === _this.activeId || _this.disabledSections.has(id))
                return;
            _this.previousId = _this.activeId;
            _this.activeId = id;
            _this.scheduleNotify();
            if (_this.options.hash) {
                history.replaceState(null, '', "#".concat(id));
            }
        };
        var _this = this;
        this.options = __assign({
            offset: 0,
            behavior: 'smooth',
            hash: false,
            root: null,
            keyboard: false,
            debug: false,
            rootMargin: '-20% 0px -60% 0px',
        }, options);
        this.initObserver();
        this.initScrollListener();
        if (this.options.hash) {
            this.initHashSync();
        }
        if (this.options.keyboard) {
            this.initKeyboard();
        }
    }
    Object.defineProperty(ScrollManager.prototype, "scrollRoot", {
        get: function () {
            var _a;
            return (_a = this.options.root) !== null && _a !== void 0 ? _a : window;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ScrollManager.prototype, "currentScrollTop", {
        get: function () {
            if (this.options.root) {
                return this.options.root.scrollTop;
            }
            return window.scrollY;
        },
        enumerable: false,
        configurable: true
    });
    ScrollManager.prototype.initObserver = function () {
        var _this = this;
        if (typeof window === 'undefined')
            return;
        this.observer = new IntersectionObserver(this.handleIntersection, {
            root: this.options.root !== null && this.options.root !== void 0 ? this.options.root : null,
            rootMargin: this.options.rootMargin,
            threshold: [0, 0.1, 0.5, 1],
        });
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(function () {
                var _a;
                // 섹션 크기 변경 시 observer 재연결로 rootMargin 재계산
                _this.sections.forEach(function (element) {
                    var _a;
                    (_a = _this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(element);
                    (_this.observer) === null || _this.observer === void 0 ? void 0 : _this.observer.observe(element);
                });
            });
        }
    };
    ScrollManager.prototype.initScrollListener = function () {
        var _this = this;
        if (typeof window === 'undefined')
            return;
        this.scrollHandler = function () {
            var current = _this.currentScrollTop;
            if (current !== _this.lastScrollY) {
                _this.scrollDirection = current > _this.lastScrollY ? 'down' : 'up';
                _this.lastScrollY = current;
            }
            _this.updateProgress();
        };
        this.scrollRoot.addEventListener('scroll', this.scrollHandler, { passive: true });
    };
    ScrollManager.prototype.initHashSync = function () {
        var _this = this;
        if (typeof window === 'undefined')
            return;
        this.popstateHandler = function () {
            var id = window.location.hash.slice(1);
            if (id && _this.sections.has(id)) {
                _this.scrollTo(id);
            }
        };
        window.addEventListener('popstate', this.popstateHandler);
    };
    ScrollManager.prototype.initKeyboard = function () {
        var _this = this;
        if (typeof window === 'undefined')
            return;
        this.keyboardHandler = function (e) {
            if (!e.altKey)
                return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                _this.scrollToNext();
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                _this.scrollToPrev();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    };
    ScrollManager.prototype.scheduleNotify = function () {
        var _this = this;
        if (this.notifyScheduled)
            return;
        this.notifyScheduled = true;
        queueMicrotask(function () {
            _this.notifyScheduled = false;
            _this.notifyListeners();
            if (_this.options.debug) {
                _this.updateDebugActiveState();
            }
        });
    };
    ScrollManager.prototype.updateProgress = function () {
        var _this = this;
        if (this.progressListeners.size === 0)
            return;
        var scrollTop = this.currentScrollTop;
        var viewportHeight = this.options.root ? this.options.root.clientHeight : window.innerHeight;
        this.progressListeners.forEach(function (callbacks, id) {
            var _a, _b;
            if (callbacks.size === 0)
                return;
            var element = _this.sections.get(id);
            if (!element)
                return;
            var rect = element.getBoundingClientRect();
            var sectionTop = _this.options.root
                ? rect.top - ((_a = _this.options.root) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect().top) + ((_b = _this.options.root) === null || _b === void 0 ? void 0 : _b.scrollTop)
                : rect.top + scrollTop;
            var sectionHeight = element.offsetHeight || rect.height;
            if (sectionHeight === 0)
                return;
            var rawProgress = (scrollTop - sectionTop + viewportHeight * 0.2) / sectionHeight;
            var progress = Math.max(0, Math.min(1, rawProgress));
            callbacks.forEach(function (cb) { return cb(progress); });
        });
    };
    ScrollManager.prototype.createDebugOverlay = function (id, element) {
        var overlay = document.createElement('div');
        overlay.id = "jump-section-debug-".concat(id);
        overlay.style.cssText = " \n      position: absolute; \n      top: 0; \n      left: 0; \n      width: 100%; \n      height: 100%; \n      pointer-events: none; \n      box-sizing: border-box; \n      border: 2px solid rgba(0, 100, 255, 0.5); \n      background: rgba(0, 100, 255, 0.1); \n      z-index: 9999; \n      display: flex; \n      align-items: center; \n      justify-content: center; \n      font-family: monospace; \n      font-size: 12px; \n      color: white; \n      text-shadow: 1px 1px 2px rgba(0,0,0,0.8); \n      overflow: hidden; \n    ";
        element.style.position =
            element.style.position === 'static' ? 'relative' : element.style.position;
        var label = document.createElement('span');
        label.style.cssText = " \n      padding: 2px 5px; \n      background: rgba(0, 100, 255, 0.7); \n      border-radius: 3px; \n    ";
        label.textContent = "ID: ".concat(id);
        overlay.appendChild(label);
        return overlay;
    };
    ScrollManager.prototype.updateDebugOverlays = function (entries) {
        var _this = this;
        entries.forEach(function (entry) {
            var _a, _b;
            var element = entry.target;
            var id = ((_b = (_a = _this.sections.entries().find(function (_a) {
                var el = _a[1];
                return el === element;
            })) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : element.id);
            if (!id)
                return;
            var overlay = _this.debugElements.get(id);
            if (!overlay) {
                overlay = _this.createDebugOverlay(id, element);
                element.appendChild(overlay);
                _this.debugElements.set(id, overlay);
            }
            var ratio = Math.round(entry.intersectionRatio * 100);
            var isActive = id === _this.activeId;
            overlay.style.borderColor = isActive
                ? 'rgba(0, 255, 0, 0.8)'
                : entry.isIntersecting
                    ? 'rgba(255, 165, 0, 0.8)'
                    : 'rgba(0, 100, 255, 0.5)';
            overlay.style.background = isActive
                ? 'rgba(0, 255, 0, 0.1)'
                : entry.isIntersecting
                    ? 'rgba(255, 165, 0, 0.1)'
                    : 'rgba(0, 100, 255, 0.1)';
            var label = overlay.querySelector('span');
            if (label) {
                label.textContent = "ID: ".concat(id, " | Ratio: ").concat(ratio, "% ").concat(isActive ? '| ACTIVE' : '');
                label.style.background = isActive
                    ? 'rgba(0, 255, 0, 0.7)'
                    : entry.isIntersecting
                        ? 'rgba(255, 165, 0, 0.7)'
                        : 'rgba(0, 100, 255, 0.7)';
            }
        });
    };
    ScrollManager.prototype.updateDebugActiveState = function () {
        var _this = this;
        this.debugElements.forEach(function (overlay, id) {
            var _a;
            var isActive = id === _this.activeId;
            var label = overlay.querySelector('span');
            var currentText = (label.textContent || '');
            var newText = isActive
                ? currentText.includes('| ACTIVE')
                    ? currentText
                    : "".concat(currentText, " | ACTIVE")
                : currentText.replace(' | ACTIVE', '');
            if (label) {
                label.textContent = newText;
                label.style.background = isActive ? 'rgba(0, 255, 0, 0.7)' : 'rgba(0, 100, 255, 0.7)';
            }
            overlay.style.borderColor = isActive ? 'rgba(0, 255, 0, 0.8)' : 'rgba(0, 100, 255, 0.5)';
            overlay.style.background = isActive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 100, 255, 0.1)';
        });
    };
    ScrollManager.prototype.removeDebugOverlay = function (id) {
        var overlay = this.debugElements.get(id);
        if (overlay) {
            overlay.remove();
            this.debugElements.delete(id);
        }
    };
    /**
     * 섹션을 등록하고 IntersectionObserver로 감시합니다.
     * @note `debug: true` 옵션 활성화 시, 오버레이 표시를 위해 `position` 스타일이 `relative`로 변경될 수 있습니다.
     */
    ScrollManager.prototype.registerSection = function (id, element) {
        var _a, _b;
        if (typeof window === 'undefined')
            return;
        if (!element)
            return;
        this.sections.set(id, element);
        if (!element.id) {
            element.id = id;
        }
        (_a = this.observer) === null || _a === void 0 ? void 0 : _a.observe(element);
        (_b = this.resizeObserver) === null || _b === void 0 ? void 0 : _b.observe(element);
        if (this.options.debug) {
            var overlay = this.createDebugOverlay(id, element);
            element.appendChild(overlay);
            this.debugElements.set(id, overlay);
        }
        // hash 옵션: 현재 URL hash와 일치하면 해당 섹션으로 스크롤
        if (this.options.hash && window.location.hash === "#".concat(id)) {
            setTimeout(function () { return _this.scrollTo(id); }, 0);
        }
    };
    /** 섹션 등록을 해제하고 감시를 중지합니다 */
    ScrollManager.prototype.unregisterSection = function (id) {
        var _a, _b;
        var element = this.sections.get(id);
        if (element) {
            (_a = this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(element);
            (_b = this.resizeObserver) === null || _b === void 0 ? void 0 : _b.unobserve(element);
        }
        this.sections.delete(id);
        this.disabledSections.delete(id);
        this.progressListeners.delete(id);
        if (this.options.debug) {
            this.removeDebugOverlay(id);
        }
        if (this.activeId === id) {
            this.previousId = this.activeId;
            this.activeId = null;
            this.scheduleNotify();
        }
    };
    /** 특정 섹션을 활성 감지에서 일시적으로 제외합니다 */
    ScrollManager.prototype.disableSection = function (id) {
        var _a;
        this.disabledSections.add(id);
        if (this.options.debug) {
            var overlay = this.debugElements.get(id);
            if (overlay) {
                overlay.style.borderStyle = 'dashed';
                var label = overlay.querySelector('span');
                if (label && !((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.includes('| DISABLED'))) {
                    label.textContent += ' | DISABLED';
                }
            }
        }
        if (this.activeId === id) {
            this.previousId = this.activeId;
            this.activeId = null;
            this.scheduleNotify();
        }
    };
    /** 비활성화된 섹션을 다시 활성 감지에 포함시킵니다 */
    ScrollManager.prototype.enableSection = function (id) {
        var _a;
        this.disabledSections.delete(id);
        if (this.options.debug) {
            var overlay = this.debugElements.get(id);
            if (overlay) {
                overlay.style.borderStyle = 'solid';
                var label = overlay.querySelector('span');
                if (label) {
                    label.textContent = ((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.replace(' | DISABLED', '')) || '';
                }
            }
        }
    };
    /** 실제 DOM 위치 기준으로 정렬된 섹션 ID 목록을 반환합니다 */
    ScrollManager.prototype.getSections = function () {
        var _this = this;
        return __spreadArray([], this.sections.entries(), true)
            .filter(function (_a) {
            var id = _a[0];
            return !_this.disabledSections.has(id);
        })
            .sort(function (_a, _b) {
            var a = _a[1], b = _b[1];
            var aTop = a.getBoundingClientRect().top;
            var bTop = b.getBoundingClientRect().top;
            return aTop - bTop;
        })
            .map(function (_a) {
            var id = _a[0];
            return id;
        });
    };
    /** 현재 활성 섹션 ID를 반환합니다 */
    ScrollManager.prototype.getActiveId = function () {
        return this.activeId;
    };
    /** 지정한 섹션으로 스크롤합니다. 스크롤 완료 시 resolve되는 Promise를 반환합니다 */
    ScrollManager.prototype.scrollTo = function (id) {
        var _this = this;
        var _a;
        if (typeof window === 'undefined')
            return Promise.resolve();
        var element = this.sections.get(id);
        if (!element) {
            console.warn(
            "[ScrollManager] Section with id \"".concat(id, "\" not found. Available sections: ").concat(Array.from(this.sections.keys()).join(', '))));
            return Promise.resolve();
        }
        var elementRect = element.getBoundingClientRect();
        var rootRect = ((_a = this.options.root) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect()) || { top: 0, left: 0 };
        var targetScrollTop =
            elementRect.top + this.currentScrollTop - rootRect.top + this.options.offset;
        var scrollTarget = this.options.root || window;
        return new Promise(function (resolve) {
            var scrollHandler = function () {
                if (Math.abs(_this.currentScrollTop - targetScrollTop) < 1) {
                    scrollTarget.removeEventListener('scroll', scrollHandler);
                    clearTimeout(safetyTimeout);
                    resolve();
                }
            };
            // 스크롤이 완료되지 않는 경우를 대비한 안전 타임아웃
            var safetyTimeout = setTimeout(function () {
                scrollTarget.removeEventListener('scroll', scrollHandler);
                resolve();
            }, 1000);
            if (_this.options.behavior === 'smooth') {
                scrollTarget.addEventListener('scroll', scrollHandler, { passive: true });
            }
            else {
                clearTimeout(safetyTimeout);
                resolve(); // 'auto' or 'instant' behavior resolves immediately
            }
            if (_this.options.root) {
                _this.options.root.scrollTo({
                    top: targetScrollTop,
                    behavior: _this.options.behavior,
                });
            }
            else {
                window.scrollTo({
                    top: targetScrollTop,
                    behavior: _this.options.behavior,
                });
            }
        });
    };
    /** 다음 섹션으로 스크롤합니다 */
    ScrollManager.prototype.scrollToNext = function () {
        var _this = this;
        var sortedSections = this.getSections();
        var currentIndex = this.activeId ? sortedSections.indexOf(this.activeId) : -1;
        var nextIndex = currentIndex + 1;
        if (nextIndex < sortedSections.length) {
            return this.scrollTo(sortedSections[nextIndex]);
        }
        return Promise.resolve();
    };
    /** 이전 섹션으로 스크롤합니다 */
    ScrollManager.prototype.scrollToPrev = function () {
        var _this = this;
        var sortedSections = this.getSections();
        var currentIndex = this.activeId
            ? sortedSections.indexOf(this.activeId)
            : sortedSections.length;
        var prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            return this.scrollTo(sortedSections[prevIndex]);
        }
        return Promise.resolve();
    };
    /** 첫 번째 섹션으로 스크롤합니다 */
    ScrollManager.prototype.scrollToFirst = function () {
        var sortedSections = this.getSections();
        if (sortedSections.length > 0) {
            return this.scrollTo(sortedSections[0]);
        }
        return Promise.resolve();
    };
    /** 마지막 섹션으로 스크롤합니다 */
    ScrollManager.prototype.scrollToLast = function () {
        var sortedSections = this.getSections();
        if (sortedSections.length > 0) {
            return this.scrollTo(sortedSections[sortedSections.length - 1]);
        }
        return Promise.resolve();
    };
    /** 활성 섹션 변경 이벤트를 구독합니다 */
    ScrollManager.prototype.onActiveChange = function (callback) {
        var _this = this;
        this.listeners.add(callback);
        // 즉시 현재 활성 섹션 상태를 전달
        callback(this.activeId, { previous: this.previousId, direction: this.scrollDirection });
        return function () {
            _this.listeners.delete(callback);
        };
    };
    /** 활성 섹션 변경 구독을 해제합니다 */
    ScrollManager.prototype.offActiveChange = function (callback) {
        this.listeners.delete(callback);
    };
    ScrollManager.prototype.notifyListeners = function () {
        var _this = this;
        if (this.activeId === null && this.previousId === null)
            return;
        var meta = { previous: this.previousId, direction: this.scrollDirection };
        this.listeners.forEach(function (listener) { return listener(_this.activeId, meta); });
    };
    /** 특정 섹션의 스크롤 진행률 이벤트를 구독합니다 */
    ScrollManager.prototype.onProgressChange = function (sectionId, callback) {
        var _a;
        var _this = this;
        if (!this.progressListeners.has(sectionId)) {
            this.progressListeners.set(sectionId, new Set());
        }
        (_a = this.progressListeners.get(sectionId)) === null || _a === void 0 ? void 0 : _a.add(callback);
        // 즉시 현재 진행률 상태를 전달
        this.updateProgress();
        return function () {
            var _a;
            (_a = _this.progressListeners.get(sectionId)) === null || _a === void 0 ? void 0 : _a.delete(callback);
        };
    };
    /** 특정 섹션의 스크롤 진행률 구독을 해제합니다 */
    ScrollManager.prototype.offProgressChange = function (sectionId, callback) {
        var _a;
        (_a = this.progressListeners.get(sectionId)) === null || _a === void 0 ? void 0 : _a.delete(callback);
        if (((_b = this.progressListeners.get(sectionId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
            this.progressListeners.delete(sectionId);
        }
    };
    /** 등록된 모든 이벤트 리스너와 Observer를 해제하고 정리합니다 */
    ScrollManager.prototype.destroy = function () {
        var _a, _b;
        this.observer === null || this.observer === void 0 ? void 0 : this.observer.disconnect();
        this.resizeObserver === null || this.resizeObserver === void 0 ? void 0 : this.resizeObserver.disconnect();
        this.sections.forEach(function (element) {
            var _a, _b;
            (_a = _this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(element);
            (_b = _this.resizeObserver) === null || _b === void 0 ? void 0 : _b.unobserve(element);
        });
        this.sections.clear();
        this.disabledSections.clear();
        this.listeners.clear();
        this.progressListeners.clear();
        this.debugElements.forEach(function (overlay) { return overlay.remove(); });
        this.debugElements.clear();
        if (this.scrollHandler) {
            this.scrollRoot.removeEventListener('scroll', this.scrollHandler);
        }
        if (this.popstateHandler) {
            window.removeEventListener('popstate', this.popstateHandler);
        }
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }
    };
    return ScrollManager;
}());
exports.ScrollManager = ScrollManager;
