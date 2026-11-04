/**
 * PDF 3D Flipbook Reader Engine
 * Integrates PDF.js with StPageFlip (St.PageFlip) with high-DPI rendering,
 * sliding-window memory management, zoom, pan, and bookmark navigation.
 */

class PDFBookReader {
    constructor() {
        this.pdfDoc = null;
        this.pageFlip = null;
        this.totalPages = 0;
        this.currentPage = 1;
        this.currentBookId = 'nao-e-como-nos-filmes';
        this.currentBookTitle = 'Não é como nos Filmes';
        this.currentBookPdfBlob = null;
        this.renderedPages = new Map(); // pageNum -> { canvas, renderingPromise }
        this.renderQueue = [];
        this.isRendering = false;
        this.zoomLevel = 1.0;
        this.spreadMode = 'auto'; // 'auto', 'double', 'single'
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };
        this.outline = [];

        // Touch device detection
        // Mobile phones (≤768px): always clean swipe, no corner-drag
        // Tablets/iPad (769-1024px touch): also clean by default, user can enable 3D in settings
        // Desktop (mouse): 3D drag enabled by default
        const hasTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        const isMobile = hasTouch && window.innerWidth <= 768;
        const isTablet = hasTouch && window.innerWidth > 768 && window.innerWidth <= 1366;
        this.isMobile = isMobile;
        this.isTablet = isTablet;

        // Default: clean mode for all touch devices; desktop defaults to 3D drag
        const savedMode = localStorage.getItem('reader_tablet_mode');
        this.cleanTabletMode = savedMode !== null
            ? (savedMode === 'true')
            : (isMobile || isTablet);

        // Configure PDF.js worker
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/libs/pdf.worker.min.js';
        }
    }

    /**
     * Load a PDF document from a URL or ArrayBuffer/Blob
     */
    async loadPDF(source, bookMeta = {}) {
        this.showLoading(true, 'Carregando livro...');
        this.currentBookId = bookMeta.id || 'custom-book-' + Date.now();
        this.currentBookTitle = bookMeta.title || 'Livro em PDF';

        try {
            // Cleanup previous instance
            this.destroy();

            let loadingTask;
            if (typeof source === 'string') {
                loadingTask = window.pdfjsLib.getDocument(source);
                // Also fetch blob for original download if it's a URL
                fetch(source)
                    .then(res => res.blob())
                    .then(blob => { this.currentBookPdfBlob = blob; })
                    .catch(err => console.warn('Could not cache PDF blob:', err));
            } else if (source instanceof Blob || source instanceof File) {
                this.currentBookPdfBlob = source;
                const buffer = await source.arrayBuffer();
                loadingTask = window.pdfjsLib.getDocument({ data: buffer });
            } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
                this.currentBookPdfBlob = new Blob([source], { type: 'application/pdf' });
                loadingTask = window.pdfjsLib.getDocument({ data: source });
            }

            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;

            // Load outline / bookmarks
            await this.loadBookmarks();

            // Retrieve saved page from localStorage
            const savedPage = this.getSavedPage();
            const initialPage = (savedPage && savedPage <= this.totalPages) ? savedPage : 1;

            // Build DOM pages
            await this.buildBookDOM();

            // Initialize PageFlip
            this.initPageFlip(initialPage);

            this.showLoading(false);

            // Update UI
            if (window.app) {
                window.app.onBookLoaded({
                    title: this.currentBookTitle,
                    totalPages: this.totalPages,
                    currentPage: this.currentPage,
                    outline: this.outline
                });
            }

            return true;
        } catch (error) {
            console.error('Erro ao carregar PDF:', error);
            this.showLoading(false);
            if (window.app) {
                window.app.showNotification('Erro ao abrir o PDF. Verifique se o arquivo é válido.', 'error');
            }
            throw error;
        }
    }

    /**
     * Extract or generate table of contents
     */
    async loadBookmarks() {
        this.outline = [];
        try {
            const rawOutline = await this.pdfDoc.getOutline();
            if (rawOutline && rawOutline.length > 0) {
                for (const item of rawOutline) {
                    let pageNum = null;
                    if (item.dest) {
                        let dest = item.dest;
                        if (typeof dest === 'string') {
                            dest = await this.pdfDoc.getDestination(dest);
                        }
                        if (Array.isArray(dest)) {
                            const ref = dest[0];
                            const pageIndex = await this.pdfDoc.getPageIndex(ref);
                            pageNum = pageIndex + 1;
                        }
                    }
                    this.outline.push({
                        title: item.title,
                        page: pageNum || 1
                    });
                }
            }
        } catch (err) {
            console.warn('Could not read PDF outline:', err);
        }

        // If no outline found, scan first 40 pages for Chapter patterns
        if (this.outline.length === 0) {
            this.generateFallbackOutline();
        }
    }

    generateFallbackOutline() {
        // Create intuitive chapter markers
        this.outline.push({ title: 'Capa & Início', page: 1 });
        if (this.totalPages > 10) {
            const step = Math.max(15, Math.floor(this.totalPages / 15));
            for (let p = step; p < this.totalPages; p += step) {
                this.outline.push({
                    title: `Seção — Página ${p}`,
                    page: p
                });
            }
        }
        if (this.totalPages > 1) {
            this.outline.push({ title: 'Páginas Finais', page: this.totalPages });
        }
    }

    /**
     * Build DOM structure for all pages
     */
    async buildBookDOM() {
        const bookContainer = document.getElementById('book-container');
        bookContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.id = 'flipbook-wrapper';
        wrapper.className = 'flipbook-wrapper';

        // Pre-determine page dimensions from page 1
        const page1 = await this.pdfDoc.getPage(1);
        const viewport = page1.getViewport({ scale: 1 });
        this.pageAspect = viewport.width / viewport.height;

        for (let i = 1; i <= this.totalPages; i++) {
            const isFirst = (i === 1);
            const isLast = (i === this.totalPages);
            const isCover = isFirst || isLast;

            const pageDiv = document.createElement('div');
            pageDiv.className = `page ${isCover ? 'page-cover' : 'page-inner-sheet'}`;
            pageDiv.setAttribute('data-page-num', i);
            pageDiv.setAttribute('data-density', isCover ? 'hard' : 'soft');

            pageDiv.innerHTML = `
                <div class="page-content ${isFirst ? 'cover-front' : (isLast ? 'cover-back' : '')}">
                    <div class="page-paper-texture"></div>
                    <div class="page-canvas-wrapper" id="page-wrapper-${i}">
                        <div class="page-skeleton">
                            <div class="skeleton-glow"></div>
                            <span class="skeleton-num">${i}</span>
                        </div>
                    </div>
                    <div class="page-shading"></div>
                    ${!isCover ? `<div class="page-corner-fold" title="Clique ou arraste para virar"></div>` : ''}
                    <div class="page-footer">
                        <span class="page-number-label">${i}</span>
                    </div>
                </div>
            `;
            wrapper.appendChild(pageDiv);
        }

        bookContainer.appendChild(wrapper);
    }

    /**
     * Initialize StPageFlip
     */
    initPageFlip(initialPage = 1) {
        const wrapper = document.getElementById('flipbook-wrapper');
        const container = document.getElementById('book-viewport');

        // Calculate dimensions: ONE SINGLE PAGE ONLY
        const dims = this.calculateOptimalDimensions();

        if (wrapper) {
            wrapper.style.width = dims.pageWidth + 'px';
            wrapper.style.height = dims.pageHeight + 'px';
        }

        // On mobile: disable PageFlip's own mouse/touch events entirely.
        // We handle navigation ourselves via clean swipe gestures (no buggy corner-drag).
        // On desktop/tablet-3D-mode: enable full 3D mouse drag.
        const useMouseEvts = !this.cleanTabletMode;

        this.pageFlip = new St.PageFlip(wrapper, {
            width: dims.pageWidth,
            height: dims.pageHeight,
            size: 'fixed',
            minWidth: 150,
            maxWidth: 1600,
            minHeight: 250,
            maxHeight: 2400,
            maxShadowOpacity: this.cleanTabletMode ? 0.4 : 0.8,
            showCover: false,
            usePortrait: true,
            mobileScrollSupport: false,
            startPage: Math.max(0, initialPage - 1),
            drawShadow: !this.cleanTabletMode, // no shadow on mobile = faster + cleaner
            flippingTime: this.cleanTabletMode ? 350 : 550, // faster flip on mobile
            useMouseEvents: useMouseEvts,
            swipeDistance: 999, // disable PageFlip's own swipe — we handle it ourselves
            clickEventForward: false
        });

        this.pageFlip.loadFromHTML(wrapper.querySelectorAll('.page'));

        // Bind touch gestures for mobile & tablet
        this.initTouchGestures();

        // Event: Page flipped
        this.pageFlip.on('flip', (e) => {
            const pageIndex = e.data; // 0-based
            this.currentPage = pageIndex + 1;
            this.saveCurrentPage(this.currentPage);

            if (window.pageSound) {
                window.pageSound.playFlipSound();
            }

            // Haptic vibration feedback on touch devices
            if (navigator.vibrate) {
                try { navigator.vibrate(10); } catch (err) {}
            }

            if (window.app) {
                window.app.onPageChanged(this.currentPage, this.totalPages);
            }

            this.updateRenderWindow();
        });

        // Event: State change
        this.pageFlip.on('changeState', (e) => {
            const stage = document.getElementById('book-stage');
            if (e.data === 'flipping') {
                stage.classList.add('is-flipping');
            } else {
                stage.classList.remove('is-flipping');
            }
        });

        // Event: Orientation change (portrait / landscape)
        this.pageFlip.on('changeOrientation', (e) => {
            if (window.app) {
                window.app.onOrientationChanged(e.data);
            }
        });

        // Initial render window
        this.currentPage = initialPage;
        this.updateRenderWindow();
    }

    calculateOptimalDimensions() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('in-fullscreen'));
        
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // In fullscreen: use maximum screen area with minimal margin
        // In normal mode: account for header & toolbar
        const padX = isFS ? 8 : (window.innerWidth < 640 ? 10 : 20);
        const padY = isFS ? 8 : (window.innerWidth < 640 ? 10 : 18);

        const availW = Math.max(260, vw - padX * 2);
        const availH = Math.max(340, vh - (isFS ? padY * 2 : (padY * 2 + 115)));

        let aspect = this.pageAspect || (550 / 800);

        // ONE SINGLE PAGE ONLY:
        let pageHeight = availH;
        let pageWidth = pageHeight * aspect;

        if (pageWidth > availW) {
            pageWidth = availW;
            pageHeight = pageWidth / aspect;
        }

        return {
            pageWidth: Math.round(pageWidth),
            pageHeight: Math.round(pageHeight)
        };
    }

    /**
     * Sliding window rendering: renders active and adjacent pages, unloads far pages
     */
    updateRenderWindow() {
        if (!this.pdfDoc || !this.pageFlip) return;

        const current = this.currentPage;
        const windowRadius = 4; // Pre-render 4 pages ahead and 3 pages behind
        const minPage = Math.max(1, current - 3);
        const maxPage = Math.min(this.totalPages, current + windowRadius);

        // Active range to keep in memory
        const activePages = new Set();
        for (let p = minPage; p <= maxPage; p++) {
            activePages.add(p);
        }

        // 1. Immediately render visible pages first (highest priority)
        this.renderPageCanvas(current, true);
        if (current + 1 <= this.totalPages) {
            this.renderPageCanvas(current + 1, true);
        }
        if (current - 1 >= 1) {
            this.renderPageCanvas(current - 1, false);
        }

        // 2. Pre-render surrounding pages
        for (let p = minPage; p <= maxPage; p++) {
            if (p !== current && p !== current + 1 && p !== current - 1) {
                this.renderPageCanvas(p, false);
            }
        }

        // 3. Unload pages outside window to free GPU & RAM memory
        for (const [pageNum, item] of this.renderedPages.entries()) {
            if (!activePages.has(pageNum)) {
                if (item.canvas && item.canvas.parentNode) {
                    item.canvas.width = 0;
                    item.canvas.height = 0;
                    item.canvas.parentNode.removeChild(item.canvas);
                }
                this.renderedPages.delete(pageNum);
            }
        }
    }

    /**
     * Render an individual page to high-DPI canvas
     */
    async renderPageCanvas(pageNum, priority = false) {
        if (pageNum < 1 || pageNum > this.totalPages) return;

        const existing = this.renderedPages.get(pageNum);
        if (existing && existing.rendered) return; // already rendered
        if (existing && existing.isRendering) return; // currently rendering

        const wrapper = document.getElementById(`page-wrapper-${pageNum}`);
        if (!wrapper) return;

        const renderRecord = {
            canvas: null,
            rendered: false,
            isRendering: true
        };
        this.renderedPages.set(pageNum, renderRecord);

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            
            // Calculate scale based on container width & devicePixelRatio for crisp text
            const containerWidth = wrapper.clientWidth || 500;
            const initialViewport = page.getViewport({ scale: 1.0 });
            const baseScale = containerWidth / initialViewport.width;
            
            // High DPI crispness (up to 2x/3x for Retina)
            const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            const scale = Math.max(baseScale, 1.2) * dpr;
            
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'page-canvas';
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Page rendered successfully: mount to DOM
            renderRecord.canvas = canvas;
            renderRecord.rendered = true;
            renderRecord.isRendering = false;

            // Remove skeleton loader and append canvas
            const skeleton = wrapper.querySelector('.page-skeleton');
            if (skeleton) {
                skeleton.style.opacity = '0';
                setTimeout(() => { if (skeleton.parentNode) skeleton.remove(); }, 200);
            }

            // Remove any old canvas
            const oldCanvas = wrapper.querySelector('.page-canvas');
            if (oldCanvas) oldCanvas.remove();

            wrapper.appendChild(canvas);
        } catch (err) {
            console.warn(`Render error on page ${pageNum}:`, err);
            renderRecord.isRendering = false;
        }
    }

    /**
     * Navigation controls
     */
    nextPage() {
        if (!this.pageFlip) return;
        this.pageFlip.flipNext('top');
    }

    prevPage() {
        if (!this.pageFlip) return;
        this.pageFlip.flipPrev('top');
    }

    goToPage(pageNum) {
        if (!this.pageFlip) return;
        const target = Math.max(1, Math.min(pageNum, this.totalPages));
        const zeroIndex = target - 1;
        this.pageFlip.turnToPage(zeroIndex);
    }

    firstPage() {
        this.goToPage(1);
    }

    lastPage() {
        this.goToPage(this.totalPages);
    }

    /**
     * Zoom controls
     */
    setZoom(level) {
        this.zoomLevel = Math.max(0.8, Math.min(level, 2.5));
        const viewport = document.getElementById('book-viewport');
        const stage = document.getElementById('book-stage');

        if (stage) {
            stage.style.transform = `scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
        }

        if (viewport) {
            if (this.zoomLevel > 1.0) {
                viewport.classList.add('is-zoomed');
            } else {
                viewport.classList.remove('is-zoomed');
                this.panOffset = { x: 0, y: 0 };
                if (stage) stage.style.transform = `scale(1)`;
            }
        }

        if (window.app) {
            window.app.onZoomChanged(this.zoomLevel);
        }
    }

    zoomIn() {
        this.setZoom(this.zoomLevel + 0.2);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel - 0.2);
    }

    resetZoom() {
        this.panOffset = { x: 0, y: 0 };
        this.setZoom(1.0);
    }

    /**
     * Spread mode toggle (Double vs Single page)
     */
    setSpreadMode(mode) {
        this.spreadMode = mode;
        if (this.pageFlip) {
            // Reinitialize with new spread preference
            const currentPage = this.currentPage;
            this.destroyPageFlip();
            this.initPageFlip(currentPage);
        }
    }

    /**
     * Fullscreen toggle
     */
    toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => console.warn(err));
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.warn(err));
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    /**
     * Clean Touch Gestures for Mobile & Tablet
     * - Swipe left/right anywhere → next/prev page (clean, no corner-drag jank)
     * - Tap left 25% → prev page
     * - Tap right 25% → next page
     * - Double-tap → toggle fullscreen
     * - Single tap center → toggle UI bars (zen mode)
     * No interference with PageFlip's own drag (disabled on mobile).
     */
    initTouchGestures() {
        const stage = document.getElementById('reading-stage');
        if (!stage || this.touchGesturesBound) return;
        this.touchGesturesBound = true;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;
        let isMultiTouch = false;

        stage.addEventListener('touchstart', (e) => {
            isMultiTouch = e.touches.length > 1;
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
            }
        }, { passive: true });

        stage.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) isMultiTouch = true;
        }, { passive: true });

        stage.addEventListener('touchend', (e) => {
            if (isMultiTouch) { isMultiTouch = false; return; }
            if (e.changedTouches.length !== 1) return;

            const ex = e.changedTouches[0].clientX;
            const ey = e.changedTouches[0].clientY;
            const dx = ex - touchStartX;
            const dy = ey - touchStartY;
            const dt = Date.now() - touchStartTime;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // ── Double-tap → fullscreen ──────────────────────────────────────
            const now = Date.now();
            const isQuickTap = absDx < 20 && absDy < 20 && dt < 300;
            if (isQuickTap) {
                const sinceLastTap = now - lastTapTime;
                const nearLastTap = Math.abs(ex - lastTapX) < 40 && Math.abs(ey - lastTapY) < 40;
                if (sinceLastTap < 350 && nearLastTap) {
                    this.toggleFullscreen();
                    lastTapTime = 0;
                    return;
                }
                lastTapTime = now;
                lastTapX = ex;
                lastTapY = ey;
            } else {
                lastTapTime = 0;
            }

            // ── Swipe horizontal → page turn ─────────────────────────────────
            // Must be more horizontal than vertical and fast enough
            if (absDx > 40 && absDx > absDy * 1.4 && dt < 500) {
                if (dx < 0) {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
                return;
            }

            // ── Single tap → zone-based navigation ───────────────────────────
            if (absDx < 15 && absDy < 15 && dt < 250) {
                // Skip if tapped on a UI element
                if (e.target.closest('button, input, select, a, .dropdown-menu, .modal-dialog, .toc-drawer, .sheet-modal, .settings-sheet-overlay')) {
                    return;
                }
                const sw = window.innerWidth;
                if (ex < sw * 0.25) {
                    // Left zone → prev page
                    this.prevPage();
                } else if (ex > sw * 0.75) {
                    // Right zone → next page
                    this.nextPage();
                } else {
                    // Center zone → toggle UI bars
                    document.body.classList.toggle('zen-active');
                }
            }
        }, { passive: true });
    }

    /**
     * Toggle Clean Tablet mode vs Full Physical 3D
     */
    setTabletMode(enabled) {
        this.cleanTabletMode = enabled;
        try {
            localStorage.setItem('reader_tablet_mode', enabled.toString());
        } catch (e) {}
        if (this.pdfDoc) {
            const currentPage = this.currentPage;
            this.destroyPageFlip();
            this.buildBookDOM().then(() => {
                this.initPageFlip(currentPage);
            });
        }
    }

    /**
     * Reading progress storage
     */
    getSavedPage() {
        try {
            const val = localStorage.getItem(`read_pos_${this.currentBookId}`);
            return val ? parseInt(val, 10) : 1;
        } catch (e) {
            return 1;
        }
    }

    saveCurrentPage(page) {
        try {
            localStorage.setItem(`read_pos_${this.currentBookId}`, page.toString());
        } catch (e) {}
    }

    showLoading(show, message = 'Carregando...') {
        const loader = document.getElementById('global-loader');
        const loaderMsg = document.getElementById('loader-message');
        if (loader) {
            loader.classList.toggle('active', show);
            if (loaderMsg && message) loaderMsg.textContent = message;
        }
    }

    destroyPageFlip() {
        if (this.pageFlip) {
            try {
                this.pageFlip.destroy();
            } catch (e) {}
            this.pageFlip = null;
        }
        this.renderedPages.clear();
    }

    destroy() {
        this.destroyPageFlip();
        if (this.pdfDoc) {
            try {
                this.pdfDoc.destroy();
            } catch (e) {}
            this.pdfDoc = null;
        }
    }
}

window.bookReader = new PDFBookReader();
