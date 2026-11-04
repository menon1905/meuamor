/**
 * Main Application Orchestrator — Mobile First & iPad First
 * Controls UI, Library, Bookmarks Drawer, Settings Action Sheet, Sound, Downloads, and Gestures
 */

class App {
    constructor() {
        this.books = [
            {
                id: 'nao-e-como-nos-filmes',
                title: 'Não é como nos Filmes',
                author: 'Lynn Painter',
                pages: 480,
                year: '2024',
                genre: 'Comédia Romântica / Young Adult',
                publisher: 'Editora Intrínseca',
                description: 'A aguardada sequência do sucesso "Melhor do que nos filmes". Liz Buxbaum e Wes Bennet enfrentam novas reviravoltas na faculdade. Entre segredos, encontros e desencontros, será que o amor deles resistirá à vida real quando ela não é como nos filmes?',
                fileUrl: 'books/nao-e-como-nos-filmes.pdf',
                isDefault: true
            }
        ];

        this.currentBook = null;
        this.currentTheme = localStorage.getItem('reader_theme') || 'theme-obsidian';
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
        this.renderLibrary();

        // Load default book automatically
        const defaultBook = this.books[0];
        this.openBook(defaultBook);
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('btn-prev').addEventListener('click', () => window.bookReader.prevPage());
        document.getElementById('btn-next').addEventListener('click', () => window.bookReader.nextPage());
        
        const edgePrev = document.getElementById('edge-prev');
        if (edgePrev) edgePrev.addEventListener('click', () => window.bookReader.prevPage());
        const edgeNext = document.getElementById('edge-next');
        if (edgeNext) edgeNext.addEventListener('click', () => window.bookReader.nextPage());

        document.getElementById('btn-first').addEventListener('click', () => window.bookReader.firstPage());
        document.getElementById('btn-last').addEventListener('click', () => window.bookReader.lastPage());

        // Progress slider
        const slider = document.getElementById('page-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                window.bookReader.goToPage(val);
            });
        }

        // Page Counter Badge: opens Mobile Page Jump Modal
        const pageTrigger = document.getElementById('page-counter-trigger');
        if (pageTrigger) {
            pageTrigger.addEventListener('click', () => {
                const jumpInput = document.getElementById('page-jump-input');
                if (jumpInput) {
                    jumpInput.value = window.bookReader.currentPage;
                    jumpInput.max = window.bookReader.totalPages;
                }
                this.toggleModal('page-jump-modal', true);
                setTimeout(() => { if (jumpInput) jumpInput.focus(); }, 150);
            });
        }

        // Page Jump Modal controls
        const btnSubmitJump = document.getElementById('btn-submit-jump');
        if (btnSubmitJump) {
            btnSubmitJump.addEventListener('click', () => this.executePageJump());
        }

        const jumpInput = document.getElementById('page-jump-input');
        if (jumpInput) {
            jumpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.executePageJump();
                }
            });
        }

        document.getElementById('btn-close-jump').addEventListener('click', () => {
            this.toggleModal('page-jump-modal', false);
        });

        // Quick jump chips
        document.querySelectorAll('[data-jump]').forEach(chip => {
            chip.addEventListener('click', () => {
                const target = parseInt(chip.getAttribute('data-jump'), 10);
                window.bookReader.goToPage(target);
                this.toggleModal('page-jump-modal', false);
            });
        });

        // Zoom buttons
        const btnZoomIn = document.getElementById('btn-zoom-in');
        if (btnZoomIn) btnZoomIn.addEventListener('click', () => window.bookReader.zoomIn());
        const btnZoomOut = document.getElementById('btn-zoom-out');
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => window.bookReader.zoomOut());

        // Fullscreen Controls (Header, Bottom Toolbar, and Floating Pill)
        const toggleFS = () => window.bookReader.toggleFullscreen();
        
        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFS);
        
        const headerFsBtn = document.getElementById('btn-header-fullscreen');
        if (headerFsBtn) headerFsBtn.addEventListener('click', toggleFS);
        
        const floatingFsBtn = document.getElementById('btn-floating-fs');
        if (floatingFsBtn) floatingFsBtn.addEventListener('click', toggleFS);

        const exitFsBtn = document.getElementById('btn-exit-fs');
        if (exitFsBtn) exitFsBtn.addEventListener('click', toggleFS);

        // Synchronize Fullscreen UI state
        const updateFsUI = () => {
            const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
            document.body.classList.toggle('in-fullscreen', isFS);
            
            const fsLabel = document.getElementById('header-fs-label');
            if (fsLabel) fsLabel.textContent = isFS ? 'Sair' : 'Tela Cheia';
            
            if (headerFsBtn) {
                const icon = headerFsBtn.querySelector('.icon-fs');
                if (icon) icon.textContent = isFS ? '🗗' : '⛶';
                headerFsBtn.title = isFS ? 'Sair do Modo Tela Cheia' : 'Entrar em Tela Cheia';
            }

            // Re-build DOM and re-initialize so the page renders correctly after fullscreen toggle
            setTimeout(async () => {
                const reader = window.bookReader;
                if (reader && reader.pdfDoc) {
                    const currentPage = reader.currentPage;
                    reader.destroyPageFlip();
                    await reader.buildBookDOM();
                    reader.initPageFlip(currentPage);
                }
            }, 150);
        };

        document.addEventListener('fullscreenchange', updateFsUI);
        document.addEventListener('webkitfullscreenchange', updateFsUI);

        // Mobile Settings Action Sheet Trigger
        const btnOpenSettings = document.getElementById('btn-open-settings');
        const settingsOverlay = document.getElementById('settings-sheet-overlay');
        const btnCloseSettings = document.getElementById('btn-close-settings');

        if (btnOpenSettings) {
            btnOpenSettings.addEventListener('click', () => {
                settingsOverlay.classList.add('active');
                this.syncSettingsUI();
            });
        }

        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', () => {
                settingsOverlay.classList.remove('active');
            });
        }

        if (settingsOverlay) {
            settingsOverlay.addEventListener('click', (e) => {
                if (e.target === settingsOverlay) {
                    settingsOverlay.classList.remove('active');
                }
            });
        }

        // Animation Mode Segment Buttons (Clean Tablet vs 3D Physical)
        const segTablet = document.getElementById('segment-tablet-mode');
        const seg3D = document.getElementById('segment-3d-mode');

        if (segTablet && seg3D) {
            segTablet.addEventListener('click', () => {
                window.bookReader.setTabletMode(true);
                segTablet.classList.add('active');
                seg3D.classList.remove('active');
                this.showNotification('Modo Tablet Clean ativado: rápida e sem vai-e-vem!');
            });

            seg3D.addEventListener('click', () => {
                window.bookReader.setTabletMode(false);
                seg3D.classList.add('active');
                segTablet.classList.remove('active');
                this.showNotification('Modo 3D Físico ativado: cantos arrastáveis com o mouse.');
            });
        }

        // Spread Mode Segment Buttons
        document.querySelectorAll('#spread-segmented-control [data-spread]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#spread-segmented-control [data-spread]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.getAttribute('data-spread');
                window.bookReader.setSpreadMode(mode);
                this.showNotification(`Visualização: ${btn.textContent.trim()}`);
            });
        });

        // Theme Cards
        document.querySelectorAll('[data-set-theme]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-set-theme]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const theme = btn.getAttribute('data-set-theme');
                this.applyTheme(theme);
            });
        });

        // Sheet Sound Toggle
        const soundSwitch = document.getElementById('btn-sheet-sound');
        if (soundSwitch) {
            soundSwitch.addEventListener('click', () => {
                const enabled = window.pageSound.toggle();
                soundSwitch.classList.toggle('active', enabled);
                this.showNotification(enabled ? 'Som ativado 🔊' : 'Som silenciado 🔇');
            });
        }

        // Library open/close
        document.getElementById('btn-library').addEventListener('click', () => this.toggleModal('library-modal', true));
        document.getElementById('btn-close-library').addEventListener('click', () => this.toggleModal('library-modal', false));

        // Outline / TOC drawer
        document.getElementById('btn-toc').addEventListener('click', () => this.toggleDrawer('toc-drawer'));
        document.getElementById('btn-close-toc').addEventListener('click', () => this.toggleDrawer('toc-drawer', false));

        // Zen mode toggle
        const zenBtn = document.getElementById('btn-zen-mode');
        if (zenBtn) {
            zenBtn.addEventListener('click', () => this.toggleZenMode());
        }

        // Downloads
        document.getElementById('download-original-pdf').addEventListener('click', () => {
            this.downloadOriginalPDF();
            if (settingsOverlay) settingsOverlay.classList.remove('active');
        });
        document.getElementById('download-3d-offline').addEventListener('click', () => {
            this.download3DOfflineHTML();
            if (settingsOverlay) settingsOverlay.classList.remove('active');
        });

        // Upload custom PDF
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type === 'application/pdf') {
                    if (settingsOverlay) settingsOverlay.classList.remove('active');
                    this.handleUploadedPDF(file);
                }
            });
        }

        // Drag and drop PDF anywhere on window
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.body.classList.add('drag-active');
        });
        window.addEventListener('dragleave', (e) => {
            if (e.relatedTarget === null) {
                document.body.classList.remove('drag-active');
            }
        });
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            document.body.classList.remove('drag-active');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.toLowerCase().endsWith('.pdf')) {
                    this.handleUploadedPDF(file);
                } else {
                    this.showNotification('Por favor, solte um arquivo PDF válido.', 'warning');
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            switch (e.key) {
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    window.bookReader.nextPage();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    window.bookReader.prevPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    window.bookReader.firstPage();
                    break;
                case 'End':
                    e.preventDefault();
                    window.bookReader.lastPage();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    window.bookReader.toggleFullscreen();
                    break;
                case 'z':
                case 'Z':
                    e.preventDefault();
                    this.toggleZenMode();
                    break;
                case 'Escape':
                    this.toggleModal('library-modal', false);
                    this.toggleModal('page-jump-modal', false);
                    this.toggleDrawer('toc-drawer', false);
                    if (settingsOverlay) settingsOverlay.classList.remove('active');
                    document.body.classList.remove('zen-active');
                    break;
            }
        });

        // Window resize & orientation change
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(async () => {
                const reader = window.bookReader;
                if (reader && reader.pdfDoc) {
                    const currentPage = reader.currentPage;
                    reader.destroyPageFlip();
                    await reader.buildBookDOM();
                    reader.initPageFlip(currentPage);
                }
            }, 250);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleResize);
        }
    }

    executePageJump() {
        const jumpInput = document.getElementById('page-jump-input');
        if (!jumpInput) return;
        const val = parseInt(jumpInput.value, 10);
        if (!isNaN(val) && val >= 1 && val <= window.bookReader.totalPages) {
            window.bookReader.goToPage(val);
            this.toggleModal('page-jump-modal', false);
        } else {
            this.showNotification(`Digite um número de 1 a ${window.bookReader.totalPages}`, 'warning');
        }
    }

    syncSettingsUI() {
        const isClean = window.bookReader.cleanTabletMode;
        const segTablet = document.getElementById('segment-tablet-mode');
        const seg3D = document.getElementById('segment-3d-mode');
        if (segTablet && seg3D) {
            segTablet.classList.toggle('active', isClean);
            seg3D.classList.toggle('active', !isClean);
        }

        const soundSwitch = document.getElementById('btn-sheet-sound');
        if (soundSwitch && window.pageSound) {
            soundSwitch.classList.toggle('active', window.pageSound.enabled);
        }
    }

    async openBook(book) {
        this.currentBook = book;
        this.toggleModal('library-modal', false);

        document.getElementById('current-book-title').textContent = book.title;
        document.getElementById('current-book-author').textContent = book.author || '';

        const source = book.fileBlob || book.fileUrl;
        await window.bookReader.loadPDF(source, {
            id: book.id,
            title: book.title
        });
    }

    async handleUploadedPDF(file) {
        const id = 'uploaded-' + Date.now();
        const title = file.name.replace(/\.pdf$/i, '');
        const newBook = {
            id: id,
            title: title,
            author: 'PDF Carregado',
            pages: '...',
            year: new Date().getFullYear().toString(),
            genre: 'Documento / Livro Pessoal',
            publisher: 'Arquivo Local',
            description: `Arquivo PDF importado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB). Todas as páginas e efeitos 3D preservados.`,
            fileBlob: file,
            isCustom: true
        };

        this.books.unshift(newBook);
        this.renderLibrary();
        await this.openBook(newBook);
        this.showNotification(`Livro "${title}" carregado com sucesso!`, 'success');
    }

    onBookLoaded(data) {
        const totalLabel = document.getElementById('total-pages-label');
        if (totalLabel) totalLabel.textContent = data.totalPages;

        const slider = document.getElementById('page-slider');
        if (slider) slider.max = data.totalPages;

        const jumpInput = document.getElementById('page-jump-input');
        if (jumpInput) jumpInput.max = data.totalPages;

        this.onPageChanged(data.currentPage, data.totalPages);
        this.renderTableOfContents(data.outline);
    }

    onPageChanged(page, total) {
        const counterCurr = document.getElementById('counter-curr-label');
        if (counterCurr) counterCurr.textContent = page;

        const slider = document.getElementById('page-slider');
        if (slider) slider.value = page;
        
        const pct = Math.round((page / total) * 100);
        const progressEl = document.getElementById('reading-progress-pct');
        if (progressEl) progressEl.textContent = `${pct}%`;

        // Highlight active TOC item
        document.querySelectorAll('.toc-item').forEach(item => {
            const itemPage = parseInt(item.getAttribute('data-page'), 10);
            item.classList.toggle('active', itemPage === page);
        });
    }

    onZoomChanged(level) {
        const pct = Math.round(level * 100);
        const zoomLabel = document.getElementById('zoom-level-label');
        if (zoomLabel) zoomLabel.textContent = `${pct}%`;
    }

    onOrientationChanged(orientation) {
        const stage = document.getElementById('book-stage');
        if (stage) {
            stage.setAttribute('data-orientation', orientation);
        }
    }

    renderTableOfContents(outline) {
        const list = document.getElementById('toc-list');
        list.innerHTML = '';

        if (!outline || outline.length === 0) {
            list.innerHTML = '<li class="toc-empty">Nenhum sumário encontrado no PDF.</li>';
            return;
        }

        outline.forEach(item => {
            const li = document.createElement('li');
            li.className = 'toc-item touch-target';
            li.setAttribute('data-page', item.page);
            li.innerHTML = `
                <span class="toc-title">${this.escapeHTML(item.title)}</span>
                <span class="toc-page-badge">Pág. ${item.page}</span>
            `;
            li.addEventListener('click', () => {
                window.bookReader.goToPage(item.page);
                this.toggleDrawer('toc-drawer', false);
            });
            list.appendChild(li);
        });
    }

    renderLibrary() {
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '';

        this.books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            const savedPage = window.bookReader.getSavedPage ? localStorage.getItem(`read_pos_${book.id}`) : null;
            const progressBadge = savedPage ? `<span class="badge-progress">Pág. ${savedPage}</span>` : '';

            card.innerHTML = `
                <div class="book-card-cover">
                    <div class="cover-art-placeholder">
                        <div class="cover-title-group">
                            <span class="cover-subtitle">${this.escapeHTML(book.author || 'Autor')}</span>
                            <h4 class="cover-book-title">${this.escapeHTML(book.title)}</h4>
                            <span class="cover-edition">${this.escapeHTML(book.publisher || '')}</span>
                        </div>
                    </div>
                    ${progressBadge}
                </div>
                <div class="book-card-info">
                    <h3 class="book-info-title">${this.escapeHTML(book.title)}</h3>
                    <p class="book-info-author">por <strong>${this.escapeHTML(book.author || 'Desconhecido')}</strong></p>
                    <p class="book-info-synopsis">${this.escapeHTML(book.description || '')}</p>
                    <div class="book-info-meta">
                        <span>📖 ${book.pages} págs</span>
                        <span>🏷️ ${this.escapeHTML(book.genre || '')}</span>
                    </div>
                    <button class="btn-read-book touch-target">
                        <span class="icon">📖</span> Abrir Leitor 3D
                    </button>
                </div>
            `;

            card.querySelector('.btn-read-book').addEventListener('click', () => {
                this.openBook(book);
            });

            grid.appendChild(card);
        });
    }

    /**
     * Helper to show or hide the Download Progress Modal
     */
    showDownloadProgress(show, title = null, subtitle = null, status = null, pct = 0) {
        const modal = document.getElementById('download-progress-modal');
        if (!modal) return;

        modal.classList.toggle('active', show);
        if (!show) return;

        const titleEl = document.getElementById('dl-modal-title');
        const subEl = document.getElementById('dl-modal-subtitle');
        const statusEl = document.getElementById('dl-progress-status');
        const fillEl = document.getElementById('dl-progress-fill');
        const pctEl = document.getElementById('dl-progress-pct');

        if (title && titleEl) titleEl.textContent = title;
        if (subtitle && subEl) subEl.textContent = subtitle;
        if (status && statusEl) statusEl.textContent = status;
        const clampedPct = Math.min(100, Math.max(0, Math.round(pct)));
        if (fillEl) fillEl.style.width = `${clampedPct}%`;
        if (pctEl) pctEl.textContent = `${clampedPct}%`;
    }

    /**
     * Download a URL with streaming progress tracking
     */
    async fetchWithProgress(url, onProgress) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Falha no download (${response.status} ${response.statusText})`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
            const blob = await response.blob();
            if (onProgress) onProgress(100, blob.size, blob.size);
            return blob;
        }

        const reader = response.body.getReader();
        let receivedLength = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            if (onProgress) {
                const percent = total > 0 ? Math.min(Math.round((receivedLength / total) * 100), 99) : 0;
                onProgress(percent, receivedLength, total);
            }
        }

        const blob = new Blob(chunks, { type: 'application/pdf' });
        if (onProgress) onProgress(100, receivedLength, receivedLength);
        return blob;
    }

    /**
     * Download the original, untouched, multi-page PDF document
     */
    async downloadOriginalPDF() {
        const title = (this.currentBook && this.currentBook.title) ? this.currentBook.title : 'Livro';
        const filename = `${title.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`;

        try {
            this.showDownloadProgress(true, 'Baixar PDF Original', 'Transferindo arquivo original do livro...', 'Preparando download...', 10);

            let blob = window.bookReader.currentBookPdfBlob;
            if (!blob && this.currentBook && this.currentBook.fileUrl) {
                blob = await this.fetchWithProgress(this.currentBook.fileUrl, (pct, received, total) => {
                    const mbRec = (received / (1024 * 1024)).toFixed(1);
                    const mbTot = total ? (total / (1024 * 1024)).toFixed(1) : null;
                    const status = mbTot ? `Baixando do servidor: ${mbRec} MB de ${mbTot} MB` : `Baixando: ${mbRec} MB...`;
                    this.showDownloadProgress(true, null, null, status, pct);
                });
                window.bookReader.currentBookPdfBlob = blob;
            }

            if (!blob) {
                throw new Error('Arquivo PDF não disponível para download.');
            }

            this.showDownloadProgress(true, null, null, 'Iniciando download no dispositivo...', 100);

            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

            setTimeout(() => {
                this.showDownloadProgress(false);
                this.showNotification('Download do PDF original concluído!', 'success');
            }, 600);
        } catch (err) {
            console.error('Erro no download:', err);
            this.showDownloadProgress(false);
            this.showNotification('Erro ao baixar o PDF: ' + err.message, 'error');
        }
    }

    /**
     * Download 3D Interactive Flipbook (Portable Offline HTML)
     */
    async download3DOfflineHTML() {
        const bookTitle = this.currentBook ? this.currentBook.title : 'Livro 3D';
        const bookAuthor = this.currentBook ? this.currentBook.author : '';
        const filename = `${bookTitle.replace(/[\/\\:*?"<>|]/g, '_')} - Livro 3D Interativo.html`;

        try {
            this.showDownloadProgress(true, 'Baixar Livro 3D Interativo', 'Gerando arquivo portátil com efeito 3D...', 'Conectando ao servidor...', 5);

            let blob = window.bookReader.currentBookPdfBlob;
            if (!blob && this.currentBook && this.currentBook.fileUrl) {
                blob = await this.fetchWithProgress(this.currentBook.fileUrl, (pct, received, total) => {
                    const mbRec = (received / (1024 * 1024)).toFixed(1);
                    const mbTot = total ? (total / (1024 * 1024)).toFixed(1) : null;
                    const status = mbTot ? `Baixando dados: ${mbRec} MB de ${mbTot} MB` : `Baixando: ${mbRec} MB...`;
                    // Scale download to 0% - 65% of overall process
                    const scaled = Math.round(pct * 0.65);
                    this.showDownloadProgress(true, null, null, status, scaled);
                });
                window.bookReader.currentBookPdfBlob = blob;
            }

            if (!blob) {
                throw new Error('Não foi possível ler os dados do PDF para empacotamento.');
            }

            this.showDownloadProgress(true, null, null, 'Processando e compactando páginas...', 75);

            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Falha ao converter dados do arquivo.'));
                reader.readAsDataURL(blob);
            });

            this.showDownloadProgress(true, null, null, 'Empacotando aplicativo 3D autônomo...', 88);

            const offlineHtml = this.generateStandaloneHTML(bookTitle, bookAuthor, base64Data);
            const htmlBlob = new Blob([offlineHtml], { type: 'text/html;charset=utf-8' });

            this.showDownloadProgress(true, null, null, 'Arquivo pronto! Salvando...', 100);

            const downloadUrl = URL.createObjectURL(htmlBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

            setTimeout(() => {
                this.showDownloadProgress(false);
                this.showNotification('Livro 3D Interativo baixado! Abra no celular ou iPad.', 'success');
            }, 600);
        } catch (err) {
            console.error('Erro ao gerar HTML 3D:', err);
            this.showDownloadProgress(false);
            this.showNotification('Erro ao gerar o Livro 3D: ' + err.message, 'error');
        }
    }

    generateStandaloneHTML(title, author, base64Pdf) {
        const esc = (s) => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : '';
        const t = esc(title);
        const dl = esc(title);

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>${t} — Leitor 3D</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js"><\/script>
    <style>
        :root{--bg:#0b0d11;--accent:#d4af37;--text:#f0f3f8;--muted:#8b9bb4;--border:rgba(255,255,255,0.08);--safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);--safe-left:env(safe-area-inset-left,0px);--safe-right:env(safe-area-inset-right,0px);}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body{height:100%;overflow:hidden;}
        body{background:radial-gradient(circle at 50% 20%,#161b26 0%,#08090d 100%);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;flex-direction:column;user-select:none;touch-action:manipulation;}
        header{height:calc(52px + var(--safe-top));padding-top:var(--safe-top);padding-left:max(16px,var(--safe-left));padding-right:max(16px,var(--safe-right));background:rgba(14,18,26,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:100;}
        .h-title{font-family:'Cinzel',serif;font-size:0.9rem;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55vw;}
        .h-btns{display:flex;gap:8px;flex-shrink:0;}
        .stage{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:visible;perspective:2500px;-webkit-perspective:2500px;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;touch-action:pan-y;}
        #bw{position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.75),0 0 30px rgba(212,175,55,0.08);border-radius:4px;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;}
        .page{background:#fbf9f4;overflow:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;}
        .page canvas{width:100%;height:100%;display:block;}
        footer{height:calc(56px + var(--safe-bottom));padding-bottom:var(--safe-bottom);padding-left:max(16px,var(--safe-left));padding-right:max(16px,var(--safe-right));background:rgba(14,18,26,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:100;}
        .btn{min-height:44px;min-width:44px;background:rgba(26,32,44,0.9);color:var(--text);border:1px solid var(--border);padding:8px 16px;border-radius:10px;font-family:inherit;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background .15s,color .15s;}
        .btn:active{background:var(--accent);color:#000;}
        .btn-a{background:var(--accent);color:#000;border:none;}
        .btn-a:active{background:#c09a28;}
        .pinfo{font-size:0.88rem;font-weight:700;color:var(--accent);}
        .loader{position:fixed;inset:0;background:#0b0d11;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;gap:16px;padding:20px;}
        .ltitle{font-family:'Cinzel',serif;color:var(--accent);font-size:1.05rem;text-align:center;padding:0 20px;max-width:90vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .spinner{width:40px;height:40px;border:3px solid rgba(212,175,55,0.2);border-top-color:var(--accent);border-radius:50%;animation:spin .9s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
        
        .lbar-box{width:min(280px,85vw);display:flex;flex-direction:column;gap:8px;}
        .lbar-track{width:100%;height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);}
        .lbar-fill{height:100%;width:0%;background:linear-gradient(90deg,#d4af37,#fceda6);border-radius:999px;transition:width .25s ease;}
        .lbar-meta{display:flex;justify-content:space-between;align-items:center;font-size:0.76rem;color:var(--muted);}
        #lpct{color:var(--accent);font-weight:700;font-family:monospace;}
        
        .lerr-box{display:none;flex-direction:column;align-items:center;gap:12px;margin-top:8px;max-width:320px;text-align:center;}
        .lerr-text{color:#f87171;font-size:0.8rem;line-height:1.4;}

        .fs-exit{position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));width:40px;height:40px;border-radius:50%;background:rgba(14,18,26,0.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.8);font-size:1.1rem;cursor:pointer;z-index:1000;display:none;align-items:center;justify-content:center;}
        body.in-fs .fs-exit{display:flex;}
        body.in-fs header,body.in-fs footer{display:none!important;}
        body.in-fs .stage{height:100dvh;height:100vh;}
        @media(max-width:1024px){.btn{min-height:44px;min-width:44px;}}
    </style>
</head>
<body>
    <header id="hdr">
        <span class="h-title">${t}</span>
        <div class="h-btns">
            <button class="btn" id="btn-dl">📄 PDF</button>
            <button class="btn btn-a" id="btn-fs">⛶ Tela Cheia</button>
        </div>
    </header>
    <div class="stage" id="stage"><div id="bw"></div></div>
    <footer>
        <button class="btn" id="btn-p">◀</button>
        <span class="pinfo" id="pi">...</span>
        <button class="btn" id="btn-n">▶</button>
    </footer>
    <button class="fs-exit" id="btn-fsx">✕</button>
    
    <div class="loader" id="ldr">
        <div class="ltitle">${t}</div>
        <div class="spinner" id="lspin"></div>
        <div class="lbar-box">
            <div class="lbar-track">
                <div class="lbar-fill" id="lbar"></div>
            </div>
            <div class="lbar-meta">
                <span id="lmsg">Carregando livro 3D...</span>
                <span id="lpct">0%</span>
            </div>
        </div>
        <div class="lerr-box" id="lerr">
            <div class="lerr-text" id="lerrmsg">O visualizador 3D demorou para iniciar neste aplicativo.</div>
            <button class="btn btn-a" id="btn-fallback-open">Abrir PDF Diretamente</button>
        </div>
    </div>

    <script>
    (function(){
        const B64="${base64Pdf}";
        let pdf=null,flip=null,tot=0,cur=1;
        const done=new Set();
        const hasTouch=('ontouchstart' in window||navigator.maxTouchPoints>0);
        const isPhone=hasTouch&&window.innerWidth<=768;
        const isTablet=hasTouch&&window.innerWidth>768&&window.innerWidth<=1366;
        const clean=isPhone||isTablet;

        function setProg(pct, msg) {
            const bar = document.getElementById('lbar');
            const p = document.getElementById('lpct');
            const m = document.getElementById('lmsg');
            if (bar) bar.style.width = pct + '%';
            if (p) p.textContent = pct + '%';
            if (m && msg) m.textContent = msg;
        }

        function triggerDownloadPdf() {
            const a = document.createElement('a');
            a.href = B64;
            a.download = '${dl}.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        window.triggerDownloadPdf = triggerDownloadPdf;

        function showError(msg) {
            const spin = document.getElementById('lspin');
            if (spin) spin.style.display = 'none';
            const errBox = document.getElementById('lerr');
            const errMsg = document.getElementById('lerrmsg');
            const lmsg = document.getElementById('lmsg');
            if (lmsg) lmsg.textContent = 'Aviso de visualização';
            if (errMsg && msg) errMsg.textContent = msg;
            if (errBox) errBox.style.display = 'flex';
            const btn = document.getElementById('btn-fallback-open');
            if (btn) btn.onclick = triggerDownloadPdf;
        }

        // Watchdog timeout: if loader is still active after 10s, offer PDF fallback
        setTimeout(function(){
            const ldr = document.getElementById('ldr');
            if (ldr && ldr.parentNode) {
                showError('Este visualizador de arquivos bloqueou a execução de scripts externos. Você pode abrir o PDF original.');
            }
        }, 10000);

        async function init(){
            try {
                setProg(15, 'Inicializando leitor...');

                // Ensure libraries are present
                for (let i = 0; i < 25 && (typeof pdfjsLib === 'undefined' || typeof St === 'undefined'); i++) {
                    await new Promise(r => setTimeout(r, 100));
                }

                if (typeof pdfjsLib === 'undefined') {
                    throw new Error('A biblioteca PDF não pôde ser executada neste leitor.');
                }

                // CRUCIAL: Clear external workerSrc to avoid CORS/null-origin SecurityError in mobile webviews & file://
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                } catch (_) {}

                setProg(35, 'Decodificando dados...');
                let raw = B64;
                const commaIdx = raw.indexOf(',');
                if (commaIdx !== -1) raw = raw.slice(commaIdx + 1);

                const bin = atob(raw);
                const len = bin.length;
                const u8 = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    u8[i] = bin.charCodeAt(i);
                }

                setProg(55, 'Carregando páginas do livro...');
                pdf = await pdfjsLib.getDocument({
                    data: u8,
                    isEvalSupported: false,
                    useSystemFonts: true
                }).promise;
                tot = pdf.numPages;

                setProg(75, 'Construindo livro 3D...');
                buildDOM();

                setProg(85, 'Configurando efeito 3D...');
                await setupFlip();
                bindCtrl();
                bindTouch();
                info();

                setProg(95, 'Renderizando páginas iniciais...');
                renderWin();

                setProg(100, 'Pronto!');
                setTimeout(() => {
                    const ldr = document.getElementById('ldr');
                    if (ldr) ldr.remove();
                }, 250);

            } catch (err) {
                console.error('Erro na inicialização do livro 3D:', err);
                showError(err.message || 'Não foi possível carregar a visualização 3D nesta tela.');
            }
        }

        function buildDOM(){
            const w=document.getElementById('bw');
            w.innerHTML='';
            for(let i=1;i<=tot;i++){
                const d=document.createElement('div');
                d.className='page';
                d.setAttribute('data-density',(i===1||i===tot)?'hard':'soft');
                d.innerHTML='<div id="pw'+i+'" style="height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:0.85rem;">'+i+'</div>';
                w.appendChild(d);
            }
        }

        async function setupFlip(){
            if (typeof St === 'undefined' || !St.PageFlip) {
                throw new Error('O módulo de páginas 3D não pôde ser carregado.');
            }

            const w=document.getElementById('bw');
            const p1=await pdf.getPage(1);
            const v1=p1.getViewport({scale:1});
            const asp=(v1.width > 0 && v1.height > 0) ? (v1.width / v1.height) : 0.7;
            const avH=Math.max(window.innerHeight - (clean ? 108 : 108), 280);
            const avW=Math.max(window.innerWidth - 16, 200);
            let h=Math.min(avH,900), pw=h*asp;
            if(pw>avW){pw=avW;h=pw/asp;}
            pw = Math.max(Math.round(pw), 180);
            h = Math.max(Math.round(h), 240);

            if(flip){try{flip.destroy();}catch(e){}}
            flip=new St.PageFlip(w,{
                width:pw,height:h,
                size:'fixed',showCover:false,usePortrait:true,
                drawShadow:!clean,maxShadowOpacity:clean?0.3:0.75,
                flippingTime:clean?320:520,
                useMouseEvents:!clean,
                swipeDistance:9999,
                mobileScrollSupport:false
            });
            flip.loadFromHTML(w.querySelectorAll('.page'));
            flip.on('flip',e=>{cur=e.data+1;info();renderWin();try{navigator.vibrate(10);}catch(_){}});
        }

        function bindCtrl(){
            document.getElementById('btn-p').onclick=()=>flip.flipPrev('top');
            document.getElementById('btn-n').onclick=()=>flip.flipNext('top');
            const tFS=async()=>{
                if(!document.fullscreenElement&&!document.webkitFullscreenElement){
                    const el=document.documentElement;
                    if(el.requestFullscreen)await el.requestFullscreen().catch(()=>{});
                    else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
                }else{
                    if(document.exitFullscreen)await document.exitFullscreen().catch(()=>{});
                    else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
                }
            };
            document.getElementById('btn-fs').onclick=tFS;
            document.getElementById('btn-fsx').onclick=tFS;
            const onFS=async()=>{
                const isFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
                document.body.classList.toggle('in-fs',isFS);
                await new Promise(r=>setTimeout(r,180));
                done.clear();buildDOM();await setupFlip();info();renderWin();
            };
            document.addEventListener('fullscreenchange',onFS);
            document.addEventListener('webkitfullscreenchange',onFS);
            let rt;
            window.addEventListener('resize',()=>{
                clearTimeout(rt);
                rt=setTimeout(async()=>{done.clear();buildDOM();await setupFlip();info();renderWin();},300);
            });
            document.getElementById('btn-dl').onclick=triggerDownloadPdf;
        }

        function bindTouch(){
            const stage=document.getElementById('stage');
            let sx=0,sy=0,st=0,lastT=0,ltx=0,lty=0,multi=false;
            stage.addEventListener('touchstart',e=>{
                multi=e.touches.length>1;
                if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();}
            },{passive:true});
            stage.addEventListener('touchmove',e=>{if(e.touches.length>1)multi=true;},{passive:true});
            stage.addEventListener('touchend',e=>{
                if(multi){multi=false;return;}
                if(e.changedTouches.length!==1)return;
                const ex=e.changedTouches[0].clientX,ey=e.changedTouches[0].clientY;
                const dx=ex-sx,dy=ey-sy,dt=Date.now()-st;
                const adx=Math.abs(dx),ady=Math.abs(dy);
                const now=Date.now();
                if(adx<20&&ady<20&&dt<300){
                    if(now-lastT<350&&Math.abs(ex-ltx)<40&&Math.abs(ey-lty)<40){document.getElementById('btn-fs').click();lastT=0;return;}
                    lastT=now;ltx=ex;lty=ey;
                }else{lastT=0;}
                if(adx>40&&adx>ady*1.4&&dt<500){dx<0?flip.flipNext('top'):flip.flipPrev('top');return;}
                if(adx<15&&ady<15&&dt<250){
                    if(e.target.closest('button,input,a'))return;
                    const sw=window.innerWidth;
                    if(ex<sw*0.25)flip.flipPrev('top');
                    else if(ex>sw*0.75)flip.flipNext('top');
                    else{
                        const h=document.getElementById('hdr'),f=document.querySelector('footer');
                        const hidden=h.style.visibility==='hidden';
                        h.style.visibility=hidden?'':'hidden';
                        f.style.visibility=hidden?'':'hidden';
                    }
                }
            },{passive:true});
        }

        function info(){document.getElementById('pi').textContent=cur+' / '+tot;}

        async function renderPage(n){
            if(n<1||n>tot||done.has(n))return;
            done.add(n);
            const w=document.getElementById('pw'+n);
            if(!w)return;
            try{
                const page=await pdf.getPage(n);
                const dpr=Math.min(window.devicePixelRatio||1,2.5);
                const bv=page.getViewport({scale:1});
                const sc=Math.max((w.clientWidth||400)/bv.width,1.2)*dpr;
                const vp=page.getViewport({scale:sc});
                const cv=document.createElement('canvas');
                cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
                cv.style.width='100%';cv.style.height='100%';
                const ctx=cv.getContext('2d',{alpha:false});
                ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
                await page.render({canvasContext:ctx,viewport:vp}).promise;
                w.innerHTML='';w.appendChild(cv);
            }catch(e){done.delete(n);}
        }

        function renderWin(){for(let i=-3;i<=4;i++)renderPage(cur+i);}

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(init, 50);
        } else {
            document.addEventListener('DOMContentLoaded', init, { once: true });
            window.addEventListener('load', init, { once: true });
        }
    })();
    <\/script>
</body>
</html>`;
    }

    applyTheme(theme) {
        document.body.classList.remove('theme-obsidian', 'theme-sepia', 'theme-midnight');
        document.body.classList.add(theme);
        this.currentTheme = theme;
        try { localStorage.setItem('reader_theme', theme); } catch (e) {}
    }

    toggleZenMode() {
        document.body.classList.toggle('zen-active');
        const isZen = document.body.classList.contains('zen-active');
        this.showNotification(isZen ? 'Modo Foco Ativado (Toque no centro para reexibir)' : 'Modo Normal');
    }

    toggleModal(id, open) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.toggle('active', open);
        }
    }

    toggleDrawer(id, force) {
        const drawer = document.getElementById(id);
        if (drawer) {
            if (typeof force === 'boolean') {
                drawer.classList.toggle('active', force);
            } else {
                drawer.classList.toggle('active');
            }
        }
    }

    showNotification(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        }, 2800);
    }

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.app = new App();
window.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
