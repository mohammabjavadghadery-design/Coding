// =============================================
// سیستم ویرایشگر کد پیشرفته - نسخه نهایی
// =============================================

// 🚀 متغیرهای جهانی و پیکربندی سیستم
const APP_CONFIG = {
    VERSION: '3.0.0',
    BUILD_DATE: '2024',
    MAX_HISTORY_SIZE: 100,
    AUTO_SAVE_INTERVAL: 30000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ZOOM_MIN: 0.25,
    ZOOM_MAX: 5,
    ZOOM_STEP: 0.25,
    LIVE_UPDATE_DELAYS: {
        INSTANT: 100,
        FAST: 250,
        NORMAL: 500,
        SLOW: 1000,
        VERY_SLOW: 2000
    }
};

// 🎯 وضعیت برنامه
const AppState = {
    // ویرایشگرها
    editors: {
        html: null,
        css: null,
        js: null
    },
    
    // تنظیمات
    settings: {
        theme: 'dracula',
        fontSize: 14,
        lineHeight: 1.5,
        liveUpdate: true,
        liveUpdateDelay: 250,
        autoRefresh: true,
        defaultZoom: 1,
        enableSyntaxHighlighting: true,
        enableAutoComplete: true,
        enableLineNumbers: true,
        enableWordWrap: false
    },
    
    // پروژه
    project: {
        name: 'پروژه-جدید',
        files: {},
        currentFile: 'index.html',
        lastSaved: null,
        modified: false
    },
    
    // تاریخچه
    history: {
        versions: [],
        currentIndex: -1,
        maxSize: APP_CONFIG.MAX_HISTORY_SIZE
    },
    
    // پیش‌نمایش
    preview: {
        zoom: 1,
        device: 'desktop',
        isFullscreen: false,
        isRunning: false,
        lastExecutionTime: 0,
        fps: 60,
        memoryUsage: 0
    },
    
    // وضعیت UI
    ui: {
        loading: true,
        panels: {
            fileManager: false,
            components: false,
            console: true,
            errors: false,
            history: false,
            performance: false,
            assets: false
        },
        activeTab: 'html',
        activePanel: 'console'
    },
    
    // کامپوننت‌ها
    components: {},
    
    // فایل‌های آپلود شده
    assets: [],
    
    // Web Worker برای اجرای کدهای سنگین
    codeWorker: null,
    
    // WebSocket برای همکاری
    collaborationSocket: null,
    
    // تایمرها
    timers: {
        autoSave: null,
        liveUpdate: null,
        fpsCounter: null,
        executionTimer: null
    },
    
    // آمار
    stats: {
        executions: 0,
        errors: 0,
        warnings: 0,
        totalLines: 0,
        totalChars: 0
    }
};

// 🎨 سیستم اطلاع‌رسانی
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.queue = [];
        this.isShowing = false;
    }

    show(type, title, message, duration = 5000) {
        const id = 'notification-' + Date.now();
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="app.notifications.dismiss('${id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.queue.push({ element: notification, duration });
        this.processQueue();
    }

    processQueue() {
        if (this.isShowing || this.queue.length === 0) return;
        
        this.isShowing = true;
        const { element, duration } = this.queue.shift();
        
        this.container.appendChild(element);
        
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.isShowing = false;
                this.processQueue();
            }, 300);
        }, duration);
    }

    dismiss(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.isShowing = false;
                this.processQueue();
            }, 300);
        }
    }

    success(title, message) {
        this.show('success', title, message);
    }

    error(title, message) {
        this.show('error', title, message);
    }

    warning(title, message) {
        this.show('warning', title, message);
    }

    info(title, message) {
        this.show('info', title, message);
    }
}

// 📁 سیستم مدیریت فایل
class FileSystem {
    constructor() {
        this.tree = {
            name: 'پروژه اصلی',
            type: 'folder',
            children: [
                {
                    name: 'index.html',
                    type: 'file',
                    content: '',
                    language: 'html',
                    icon: 'fab fa-html5'
                },
                {
                    name: 'style.css',
                    type: 'file',
                    content: '',
                    language: 'css',
                    icon: 'fab fa-css3-alt'
                },
                {
                    name: 'script.js',
                    type: 'file',
                    content: '',
                    language: 'javascript',
                    icon: 'fab fa-js-square'
                },
                {
                    name: 'assets',
                    type: 'folder',
                    children: [],
                    icon: 'fas fa-folder'
                }
            ]
        };
    }

    createFile(parentPath, name, content = '', language = 'text') {
        const parent = this.getNodeByPath(parentPath);
        if (!parent || parent.type !== 'folder') return false;

        const newFile = {
            name,
            type: 'file',
            content,
            language,
            icon: this.getFileIcon(name),
            path: parentPath ? `${parentPath}/${name}` : name
        };

        parent.children = parent.children || [];
        parent.children.push(newFile);
        this.saveToStorage();
        return newFile;
    }

    createFolder(parentPath, name) {
        const parent = this.getNodeByPath(parentPath);
        if (!parent || parent.type !== 'folder') return false;

        const newFolder = {
            name,
            type: 'folder',
            children: [],
            icon: 'fas fa-folder',
            path: parentPath ? `${parentPath}/${name}` : name
        };

        parent.children = parent.children || [];
        parent.children.push(newFolder);
        this.saveToStorage();
        return newFolder;
    }

    deleteNode(path) {
        const parts = path.split('/');
        const name = parts.pop();
        const parentPath = parts.join('/');
        const parent = this.getNodeByPath(parentPath);

        if (!parent || parent.type !== 'folder') return false;

        parent.children = parent.children.filter(child => child.name !== name);
        this.saveToStorage();
        return true;
    }

    renameNode(path, newName) {
        const node = this.getNodeByPath(path);
        if (!node) return false;

        node.name = newName;
        node.icon = node.type === 'file' ? this.getFileIcon(newName) : node.icon;
        this.saveToStorage();
        return true;
    }

    getNodeByPath(path) {
        if (!path) return this.tree;
        
        const parts = path.split('/');
        let currentNode = this.tree;
        
        for (const part of parts) {
            if (currentNode.type !== 'folder') return null;
            const found = currentNode.children?.find(child => child.name === part);
            if (!found) return null;
            currentNode = found;
        }
        
        return currentNode;
    }

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const icons = {
            html: 'fab fa-html5',
            htm: 'fab fa-html5',
            css: 'fab fa-css3-alt',
            js: 'fab fa-js-square',
            json: 'fas fa-code',
            md: 'fas fa-file-alt',
            txt: 'fas fa-file-alt',
            jpg: 'fas fa-file-image',
            jpeg: 'fas fa-file-image',
            png: 'fas fa-file-image',
            gif: 'fas fa-file-image',
            svg: 'fas fa-file-image',
            ico: 'fas fa-file-image',
            pdf: 'fas fa-file-pdf',
            doc: 'fas fa-file-word',
            docx: 'fas fa-file-word',
            xls: 'fas fa-file-excel',
            xlsx: 'fas fa-file-excel',
            zip: 'fas fa-file-archive',
            rar: 'fas fa-file-archive',
            mp3: 'fas fa-file-audio',
            mp4: 'fas fa-file-video',
            avi: 'fas fa-file-video',
            mov: 'fas fa-file-video'
        };
        
        return icons[extension] || 'fas fa-file';
    }

    saveToStorage() {
        localStorage.setItem('fileSystem', JSON.stringify(this.tree));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('fileSystem');
        if (saved) {
            this.tree = JSON.parse(saved);
        }
    }

    exportProject() {
        const project = {
            name: AppState.project.name,
            files: this.getAllFiles(),
            settings: AppState.settings,
            version: APP_CONFIG.VERSION,
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(project, null, 2);
    }

    getAllFiles() {
        const files = {};
        
        const traverse = (node, path = '') => {
            if (node.type === 'file') {
                files[path ? `${path}/${node.name}` : node.name] = node.content;
            } else if (node.type === 'folder' && node.children) {
                node.children.forEach(child => traverse(child, path ? `${path}/${node.name}` : node.name));
            }
        };
        
        traverse(this.tree);
        return files;
    }

    importProject(projectData) {
        try {
            const project = JSON.parse(projectData);
            
            // بازسازی ساختار فایل‌ها
            this.tree = {
                name: project.name || 'پروژه وارد شده',
                type: 'folder',
                children: []
            };
            
            Object.entries(project.files || {}).forEach(([path, content]) => {
                const parts = path.split('/');
                const filename = parts.pop();
                let currentFolder = this.tree;
                
                // ایجاد پوشه‌ها
                for (const part of parts) {
                    let folder = currentFolder.children?.find(child => child.name === part);
                    if (!folder) {
                        folder = {
                            name: part,
                            type: 'folder',
                            children: [],
                            icon: 'fas fa-folder'
                        };
                        currentFolder.children = currentFolder.children || [];
                        currentFolder.children.push(folder);
                    }
                    currentFolder = folder;
                }
                
                // ایجاد فایل
                const file = {
                    name: filename,
                    type: 'file',
                    content: content,
                    language: this.getFileLanguage(filename),
                    icon: this.getFileIcon(filename)
                };
                
                currentFolder.children = currentFolder.children || [];
                currentFolder.children.push(file);
            });
            
            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('خطا در وارد کردن پروژه:', error);
            return false;
        }
    }

    getFileLanguage(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const languages = {
            html: 'html',
            htm: 'html',
            css: 'css',
            js: 'javascript',
            json: 'json',
            md: 'markdown',
            txt: 'text'
        };
        
        return languages[extension] || 'text';
    }
}

// ⏳ سیستم تاریخچه
class HistorySystem {
    constructor() {
        this.versions = [];
        this.currentIndex = -1;
        this.maxSize = APP_CONFIG.MAX_HISTORY_SIZE;
    }

    saveVersion(html, css, js, message = 'تغییرات') {
        const version = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message,
            data: {
                html,
                css,
                js
            },
            preview: null // می‌توانیم اسکرین‌شات از پیش‌نمایش ذخیره کنیم
        };

        // اگر در وسط تاریخچه هستیم، نسخه‌های بعدی را حذف می‌کنیم
        if (this.currentIndex < this.versions.length - 1) {
            this.versions = this.versions.slice(0, this.currentIndex + 1);
        }

        this.versions.push(version);
        this.currentIndex = this.versions.length - 1;

        // محدود کردن تعداد نسخه‌ها
        if (this.versions.length > this.maxSize) {
            this.versions.shift();
            this.currentIndex = this.maxSize - 1;
        }

        this.saveToStorage();
        this.updateHistoryUI();
        
        AppState.project.modified = true;
        return version;
    }

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.versions[this.currentIndex];
        }
        return null;
    }

    redo() {
        if (this.currentIndex < this.versions.length - 1) {
            this.currentIndex++;
            return this.versions[this.currentIndex];
        }
        return null;
    }

    getCurrentVersion() {
        if (this.currentIndex >= 0 && this.currentIndex < this.versions.length) {
            return this.versions[this.currentIndex];
        }
        return null;
    }

    clear() {
        this.versions = [];
        this.currentIndex = -1;
        localStorage.removeItem('codeHistory');
    }

    saveToStorage() {
        const historyData = {
            versions: this.versions.slice(-50), // فقط 50 نسخه آخر را ذخیره می‌کنیم
            currentIndex: this.currentIndex
        };
        
        try {
            localStorage.setItem('codeHistory', JSON.stringify(historyData));
        } catch (e) {
            console.warn('خطا در ذخیره تاریخچه:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('codeHistory');
            if (saved) {
                const historyData = JSON.parse(saved);
                this.versions = historyData.versions || [];
                this.currentIndex = historyData.currentIndex || -1;
                
                if (this.versions.length > 0 && this.currentIndex >= this.versions.length) {
                    this.currentIndex = this.versions.length - 1;
                }
            }
        } catch (e) {
            console.warn('خطا در بارگذاری تاریخچه:', e);
            this.clear();
        }
    }

    updateHistoryUI() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = '';
        
        this.versions.forEach((version, index) => {
            const item = document.createElement('div');
            item.className = `history-item ${index === this.currentIndex ? 'active' : ''}`;
            item.dataset.index = index;
            
            const time = new Date(version.timestamp);
            const timeString = time.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            item.innerHTML = `
                <div class="history-icon">
                    <i class="fas fa-code-commit"></i>
                </div>
                <div class="history-content">
                    <div class="history-title">${version.message}</div>
                    <div class="history-time">${timeString}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.restoreVersion(index);
            });
            
            historyList.appendChild(item);
        });
    }

    restoreVersion(index) {
        if (index >= 0 && index < this.versions.length) {
            const version = this.versions[index];
            
            // بازگردانی کدها
            if (AppState.editors.html && version.data.html !== undefined) {
                AppState.editors.html.setValue(version.data.html);
            }
            
            if (AppState.editors.css && version.data.css !== undefined) {
                AppState.editors.css.setValue(version.data.css);
            }
            
            if (AppState.editors.js && version.data.js !== undefined) {
                AppState.editors.js.setValue(version.data.js);
            }
            
            this.currentIndex = index;
            this.updateHistoryUI();
            
            // اجرای کد
            app.codeExecutor.execute();
            
            app.notifications.info('تاریخچه', `نسخه ${index + 1} بازیابی شد`);
        }
    }
}

// ⚡ سیستم اجرای کد
class CodeExecutor {
    constructor() {
        this.isRunning = false;
        this.startTime = 0;
        this.executionTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 60;
        this.performanceChart = null;
        this.performanceData = {
            fps: [],
            memory: [],
            executionTime: []
        };
        
        // Web Worker برای اجرای کدهای سنگین
        this.initWorker();
    }

    initWorker() {
        if (window.Worker) {
            try {
                const workerCode = `
                    self.onmessage = function(e) {
                        const { code, type } = e.data;
                        
                        try {
                            switch(type) {
                                case 'css':
                                    // اعتبارسنجی CSS
                                    postMessage({ type: 'css-valid', valid: true });
                                    break;
                                    
                                case 'js':
                                    // اجرای JavaScript در محیط امن
                                    const result = eval(code);
                                    postMessage({ type: 'js-result', result });
                                    break;
                                    
                                default:
                                    postMessage({ type: 'error', message: 'نوع کد نامعتبر است' });
                            }
                        } catch (error) {
                            postMessage({ type: 'error', message: error.message });
                        }
                    };
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                this.worker = new Worker(URL.createObjectURL(blob));
                
                this.worker.onmessage = (e) => {
                    this.handleWorkerMessage(e.data);
                };
                
                this.worker.onerror = (error) => {
                    console.error('خطا در Web Worker:', error);
                    app.notifications.error('خطای سیستم', 'خطا در اجرای کد سنگین');
                };
            } catch (error) {
                console.warn('Web Worker قابل استفاده نیست:', error);
                this.worker = null;
            }
        }
    }

    handleWorkerMessage(data) {
        switch(data.type) {
            case 'css-valid':
                if (!data.valid) {
                    app.notifications.warning('اعتبارسنجی CSS', 'مشکلاتی در کد CSS یافت شد');
                }
                break;
                
            case 'js-result':
                console.log('نتیجه اجرای کد در Worker:', data.result);
                break;
                
            case 'error':
                app.errorSystem.addError({
                    type: 'worker-error',
                    message: data.message,
                    timestamp: new Date()
                });
                break;
        }
    }

    execute() {
        if (this.isRunning) {
            this.stop();
            return;
        }

        this.startTime = performance.now();
        this.isRunning = true;
        AppState.preview.isRunning = true;
        
        // به‌روزرسانی UI
        document.getElementById('btn-run').innerHTML = '<i class="fas fa-stop"></i><span>توقف</span>';
        
        try {
            // جمع‌آوری کدها
            const html = AppState.editors.html ? AppState.editors.html.getValue() : '';
            const css = AppState.editors.css ? AppState.editors.css.getValue() : '';
            const js = AppState.editors.js ? AppState.editors.js.getValue() : '';
            
            // ایجاد کد کامل
            const fullCode = this.generateFullCode(html, css, js);
            
            // اجرای کد در iframe
            this.executeInIframe(fullCode);
            
            // ذخیره در تاریخچه
            app.historySystem.saveVersion(html, css, js, 'اجرای کد');
            
            // آمار
            AppState.stats.executions++;
            this.updateStats();
            
        } catch (error) {
            console.error('خطا در اجرای کد:', error);
            app.errorSystem.addError({
                type: 'execution-error',
                message: error.message,
                timestamp: new Date()
            });
            
            this.stop();
        }
    }

    generateFullCode(html, css, js) {
        // ایجاد یک محیط امن برای اجرای JavaScript
        const safeJS = `
            <script>
                // بازنویسی console برای رهگیری
                const originalConsole = {
                    log: console.log,
                    error: console.error,
                    warn: console.warn,
                    info: console.info
                };
                
                // تابع برای ارسال خطاها به والد
                function sendToParent(type, args) {
                    try {
                        window.parent.postMessage({
                            type: 'console',
                            data: {
                                type: type,
                                args: Array.from(args).map(arg => {
                                    if (typeof arg === 'object') {
                                        return JSON.stringify(arg, null, 2);
                                    }
                                    return String(arg);
                                }),
                                timestamp: new Date().toISOString()
                            }
                        }, '*');
                    } catch (e) {
                        console.warn('خطا در ارسال به والد:', e);
                    }
                }
                
                // بازنویسی console methods
                console.log = function(...args) {
                    originalConsole.log.apply(console, args);
                    sendToParent('log', args);
                };
                
                console.error = function(...args) {
                    originalConsole.error.apply(console, args);
                    sendToParent('error', args);
                };
                
                console.warn = function(...args) {
                    originalConsole.warn.apply(console, args);
                    sendToParent('warn', args);
                };
                
                console.info = function(...args) {
                    originalConsole.info.apply(console, args);
                    sendToParent('info', args);
                };
                
                // مدیریت خطاهای جهانی
                window.onerror = function(message, source, lineno, colno, error) {
                    window.parent.postMessage({
                        type: 'global-error',
                        data: {
                            message: message,
                            source: source,
                            line: lineno,
                            column: colno,
                            error: error ? error.stack : null,
                            timestamp: new Date().toISOString()
                        }
                    }, '*');
                    return false;
                };
                
                // مدیریت promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                    window.parent.postMessage({
                        type: 'promise-error',
                        data: {
                            reason: event.reason,
                            timestamp: new Date().toISOString()
                        }
                    }, '*');
                });
                
                // اجرای کد اصلی کاربر
                try {
                    ${js}
                } catch (error) {
                    window.parent.postMessage({
                        type: 'execution-error',
                        data: {
                            message: error.message,
                            stack: error.stack,
                            timestamp: new Date().toISOString()
                        }
                    }, '*');
                }
            <\/script>
        `;

        return `
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>پیش‌نمایش کد</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: 'Vazirmatn', sans-serif;
                    }
                    ${css}
                </style>
            </head>
            <body>
                ${html}
                ${safeJS}
            </body>
            </html>
        `;
    }

    executeInIframe(code) {
        const iframe = document.getElementById('preview-frame');
        if (!iframe) return;

        // پاکسازی iframe قبلی
        iframe.srcdoc = '';
        
        // نوشتن کد جدید
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(code);
        iframeDoc.close();
        
        // تنظیم رویداد پیام
        iframe.contentWindow.addEventListener('message', (event) => {
            this.handleIframeMessage(event.data);
        });
        
        // شروع اندازه‌گیری کارایی
        this.startPerformanceMonitoring();
    }

    handleIframeMessage(data) {
        if (!data || !data.type) return;
        
        switch(data.type) {
            case 'console':
                app.consoleSystem.addLog(data.data);
                break;
                
            case 'global-error':
            case 'promise-error':
            case 'execution-error':
                app.errorSystem.addError(data.data);
                break;
        }
    }

    startPerformanceMonitoring() {
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        const monitor = () => {
            if (!this.isRunning) return;
            
            this.frameCount++;
            const now = performance.now();
            const delta = now - this.lastFpsUpdate;
            
            if (delta >= 1000) { // هر ثانیه
                this.currentFps = Math.round((this.frameCount * 1000) / delta);
                this.frameCount = 0;
                this.lastFpsUpdate = now;
                
                // به‌روزرسانی UI
                this.updatePerformanceUI();
                
                // ذخیره داده‌ها برای نمودار
                this.performanceData.fps.push(this.currentFps);
                if (this.performanceData.fps.length > 60) {
                    this.performanceData.fps.shift();
                }
                
                // به‌روزرسانی نمودار
                this.updatePerformanceChart();
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }

    updatePerformanceUI() {
        const fpsElement = document.getElementById('metric-fps');
        const timeElement = document.getElementById('metric-execution-time');
        
        if (fpsElement) {
            fpsElement.textContent = this.currentFps;
            fpsElement.style.color = this.currentFps > 30 ? '#10b981' : 
                                   this.currentFps > 15 ? '#f59e0b' : '#ef4444';
        }
        
        if (timeElement) {
            this.executionTime = performance.now() - this.startTime;
            timeElement.textContent = `${this.executionTime.toFixed(2)}ms`;
        }
        
        // به‌روزرسانی FPS در هدر
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
            fpsCounter.querySelector('span').textContent = `${this.currentFps} FPS`;
        }
    }

    updatePerformanceChart() {
        if (!this.performanceChart) {
            const ctx = document.getElementById('performance-chart');
            if (!ctx) return;
            
            this.performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 60}, (_, i) => i + 1),
                    datasets: [
                        {
                            label: 'FPS',
                            data: this.performanceData.fps,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            beginAtZero: true,
                            max: 120,
                            ticks: {
                                color: '#94a3b8'
                            },
                            grid: {
                                color: 'rgba(148, 163, 184, 0.1)'
                            }
                        }
                    }
                }
            });
        } else {
            this.performanceChart.data.datasets[0].data = this.performanceData.fps;
            this.performanceChart.update('none');
        }
    }

    stop() {
        this.isRunning = false;
        AppState.preview.isRunning = false;
        
        // به‌روزرسانی UI
        document.getElementById('btn-run').innerHTML = '<i class="fas fa-play"></i><span>اجرا</span>';
        
        // توقف monitoring
        this.executionTime = performance.now() - this.startTime;
        
        // نمایش زمان اجرا
        const timerElement = document.getElementById('execution-timer');
        if (timerElement) {
            timerElement.querySelector('span').textContent = `${this.executionTime.toFixed(2)}s`;
        }
    }

    updateStats() {
        const html = AppState.editors.html ? AppState.editors.html.getValue() : '';
        const css = AppState.editors.css ? AppState.editors.css.getValue() : '';
        const js = AppState.editors.js ? AppState.editors.js.getValue() : '';
        
        AppState.stats.totalLines = 
            html.split('\n').length + 
            css.split('\n').length + 
            js.split('\n').length;
            
        AppState.stats.totalChars = 
            html.length + css.length + js.length;
        
        // به‌روزرسانی UI
        document.getElementById('metric-code-size').textContent = 
            `${(AppState.stats.totalChars / 1024).toFixed(2)}KB`;
    }
}

// 🐛 سیستم مدیریت خطا
class ErrorSystem {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    addError(errorData) {
        const error = {
            id: Date.now(),
            type: errorData.type || 'error',
            message: errorData.message || 'خطای ناشناخته',
            source: errorData.source,
            line: errorData.line,
            column: errorData.column,
            stack: errorData.stack,
            timestamp: errorData.timestamp || new Date().toISOString()
        };
        
        this.errors.unshift(error);
        AppState.stats.errors++;
        
        // محدود کردن تعداد خطاها
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }
        
        this.updateErrorUI();
        this.updateErrorCount();
        
        // نمایش نوتیفیکیشن برای خطاهای مهم
        if (error.type === 'global-error' || error.type === 'execution-error') {
            app.notifications.error('خطای اجرا', error.message);
        }
        
        return error;
    }

    addWarning(message, source = null) {
        const warning = {
            id: Date.now(),
            type: 'warning',
            message,
            source,
            timestamp: new Date().toISOString()
        };
        
        this.errors.unshift(warning);
        AppState.stats.warnings++;
        
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }
        
        this.updateErrorUI();
        this.updateErrorCount();
        
        return warning;
    }

    clearErrors() {
        this.errors = [];
        this.updateErrorUI();
        this.updateErrorCount();
    }

    updateErrorUI() {
        const errorsList = document.getElementById('errors-list');
        if (!errorsList) return;
        
        errorsList.innerHTML = '';
        
        this.errors.forEach(error => {
            const item = document.createElement('div');
            item.className = `error-item ${error.type}`;
            
            const time = new Date(error.timestamp);
            const timeString = time.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const icon = error.type === 'warning' ? 
                'fas fa-exclamation-triangle' : 
                'fas fa-exclamation-circle';
            
            let location = '';
            if (error.line && error.column) {
                location = `خط ${error.line}, ستون ${error.column}`;
                if (error.source) {
                    location += ` در ${error.source}`;
                }
            }
            
            item.innerHTML = `
                <div class="error-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="error-content">
                    <div class="error-header">
                        <div class="error-title">${error.type === 'warning' ? 'هشدار' : 'خطا'}</div>
                        <div class="error-time">${timeString}</div>
                    </div>
                    <div class="error-message">${this.escapeHtml(error.message)}</div>
                    ${location ? `<div class="error-location">${location}</div>` : ''}
                    ${error.stack ? `<div class="error-location">${this.escapeHtml(error.stack)}</div>` : ''}
                </div>
            `;
            
            errorsList.appendChild(item);
        });
    }

    updateErrorCount() {
        const errorCount = document.getElementById('error-count');
        if (errorCount) {
            const count = this.errors.filter(e => e.type !== 'warning').length;
            errorCount.textContent = count;
            errorCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 💬 سیستم کنسول
class ConsoleSystem {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }

    addLog(logData) {
        const log = {
            id: Date.now(),
            type: logData.type || 'log',
            args: logData.args || [],
            timestamp: logData.timestamp || new Date().toISOString(),
            source: 'preview'
        };
        
        this.logs.unshift(log);
        
        // محدود کردن تعداد لاگ‌ها
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        
        this.updateConsoleUI();
        return log;
    }

    executeCommand(command) {
        if (!command.trim()) return;
        
        // ذخیره دستور در تاریخچه
        this.addLog({
            type: 'command',
            args: [command],
            timestamp: new Date().toISOString(),
            source: 'user'
        });
        
        try {
            // اجرای دستور در محیط ویرایشگر
            const result = eval(command);
            
            // نمایش نتیجه
            this.addLog({
                type: 'result',
                args: [result],
                timestamp: new Date().toISOString(),
                source: 'system'
            });
            
        } catch (error) {
            this.addLog({
                type: 'error',
                args: [error.message],
                timestamp: new Date().toISOString(),
                source: 'system'
            });
        }
    }

    clear() {
        this.logs = [];
        this.updateConsoleUI();
    }

    updateConsoleUI() {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;
        
        consoleOutput.innerHTML = '';
        
        this.logs.forEach(log => {
            const line = document.createElement('div');
            line.className = `console-line console-${log.type}`;
            
            const time = new Date(log.timestamp);
            const timeString = time.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const prefix = log.source === 'user' ? '> ' : 
                          log.source === 'system' ? '← ' : '';
            
            const content = log.args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            
            line.innerHTML = `
                <span class="console-time">[${timeString}]</span>
                <span class="console-prefix">${prefix}</span>
                <span class="console-content">${this.escapeHtml(content)}</span>
            `;
            
            consoleOutput.appendChild(line);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 🔧 سیستم بزرگنمایی
class ZoomSystem {
    constructor() {
        this.currentZoom = 1;
        this.minZoom = APP_CONFIG.ZOOM_MIN;
        this.maxZoom = APP_CONFIG.ZOOM_MAX;
        this.step = APP_CONFIG.ZOOM_STEP;
    }

    zoomIn() {
        this.setZoom(this.currentZoom + this.step);
    }

    zoomOut() {
        this.setZoom(this.currentZoom - this.step);
    }

    setZoom(zoomLevel) {
        // محدود کردن zoom level
        zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
        zoomLevel = Math.round(zoomLevel * 100) / 100; // گرد کردن به ۲ رقم اعشار
        
        this.currentZoom = zoomLevel;
        AppState.preview.zoom = zoomLevel;
        
        // اعمال zoom به iframe
        const iframe = document.getElementById('preview-frame');
        if (iframe) {
            iframe.style.transform = `scale(${zoomLevel})`;
            iframe.style.transformOrigin = 'center center';
        }
        
        // به‌روزرسانی UI
        this.updateZoomUI();
        
        // ذخیره تنظیمات
        app.settingsManager.save();
    }

    resetZoom() {
        this.setZoom(1);
    }

    updateZoomUI() {
        const zoomLevelElement = document.getElementById('zoom-level');
        const previewZoomLevel = document.getElementById('preview-zoom-level');
        
        const zoomPercent = Math.round(this.currentZoom * 100);
        
        if (zoomLevelElement) {
            zoomLevelElement.textContent = `${zoomPercent}%`;
        }
        
        if (previewZoomLevel) {
            previewZoomLevel.textContent = `${zoomPercent}%`;
        }
    }
}

// ⚙️ سیستم تنظیمات
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            theme: 'dracula',
            fontSize: 14,
            lineHeight: 1.5,
            liveUpdate: true,
            liveUpdateDelay: 250,
            autoRefresh: true,
            defaultZoom: 1,
            enableSyntaxHighlighting: true,
            enableAutoComplete: true,
            enableLineNumbers: true,
            enableWordWrap: false,
            autoSave: true,
            showLineNumbers: true,
            showActiveLine: true,
            showPrintMargin: false,
            highlightSelectedWord: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true
        };
    }

    load() {
        try {
            const saved = localStorage.getItem('editorSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                AppState.settings = { ...this.defaultSettings, ...settings };
                this.applySettings();
            } else {
                AppState.settings = { ...this.defaultSettings };
            }
        } catch (error) {
            console.warn('خطا در بارگذاری تنظیمات:', error);
            AppState.settings = { ...this.defaultSettings };
            this.applySettings();
        }
    }

    save() {
        try {
            localStorage.setItem('editorSettings', JSON.stringify(AppState.settings));
            return true;
        } catch (error) {
            console.error('خطا در ذخیره تنظیمات:', error);
            app.notifications.error('خطا', 'ذخیره تنظیمات با خطا مواجه شد');
            return false;
        }
    }

    applySettings() {
        // اعمال تنظیمات تم
        this.applyTheme();
        
        // اعمال تنظیمات فونت
        this.applyFontSettings();
        
        // اعمال تنظیمات ویرایشگر
        this.applyEditorSettings();
        
        // به‌روزرسانی UI
        this.updateSettingsUI();
    }

    applyTheme() {
        document.body.className = AppState.settings.theme === 'light' ? 'light-theme' : '';
        
        // اعمال تم به CodeMirror
        Object.values(AppState.editors).forEach(editor => {
            if (editor) {
                editor.setOption('theme', AppState.settings.theme === 'light' ? 'default' : 'dracula');
            }
        });
    }

    applyFontSettings() {
        Object.values(AppState.editors).forEach(editor => {
            if (editor) {
                editor.setOption('fontSize', `${AppState.settings.fontSize}px`);
                editor.setOption('lineHeight', AppState.settings.lineHeight);
            }
        });
        
        // به‌روزرسانی نمایشگر فونت
        const fontSizeValue = document.getElementById('font-size-value');
        if (fontSizeValue) {
            fontSizeValue.textContent = `${AppState.settings.fontSize}px`;
        }
        
        const lineHeightValue = document.getElementById('line-height-value');
        if (lineHeightValue) {
            lineHeightValue.textContent = AppState.settings.lineHeight;
        }
    }

    applyEditorSettings() {
        Object.values(AppState.editors).forEach(editor => {
            if (editor) {
                editor.setOption('lineNumbers', AppState.settings.enableLineNumbers);
                editor.setOption('wrap', AppState.settings.enableWordWrap);
                editor.setOption('highlightActiveLine', AppState.settings.showActiveLine);
                editor.setOption('showPrintMargin', AppState.settings.showPrintMargin);
                editor.setOption('highlightSelectedWord', AppState.settings.highlightSelectedWord);
                
                // تنظیمات auto-completion
                editor.setOption('enableBasicAutocompletion', AppState.settings.enableBasicAutocompletion);
                editor.setOption('enableLiveAutocompletion', AppState.settings.enableLiveAutocompletion);
                editor.setOption('enableSnippets', AppState.settings.enableSnippets);
            }
        });
    }

    updateSettingsUI() {
        // به‌روزرسانی toggle ها
        const liveUpdateToggle = document.getElementById('live-update-toggle');
        if (liveUpdateToggle) {
            liveUpdateToggle.checked = AppState.settings.liveUpdate;
        }
        
        const liveUpdateDelay = document.getElementById('live-update-delay');
        if (liveUpdateDelay) {
            liveUpdateDelay.value = AppState.settings.liveUpdateDelay;
        }
        
        // به‌روزرسانی select ها
        const editorTheme = document.getElementById('setting-editor-theme');
        if (editorTheme) {
            editorTheme.value = AppState.settings.theme;
        }
        
        const fontSize = document.getElementById('setting-font-size');
        if (fontSize) {
            fontSize.value = AppState.settings.fontSize;
        }
        
        const lineHeight = document.getElementById('setting-line-height');
        if (lineHeight) {
            lineHeight.value = AppState.settings.lineHeight;
        }
        
        const defaultZoom = document.getElementById('setting-default-zoom');
        if (defaultZoom) {
            defaultZoom.value = AppState.settings.defaultZoom * 100;
        }
        
        const autoRefresh = document.getElementById('setting-auto-refresh');
        if (autoRefresh) {
            autoRefresh.checked = AppState.settings.autoRefresh;
        }
        
        const refreshDelay = document.getElementById('setting-refresh-delay');
        if (refreshDelay) {
            refreshDelay.value = AppState.settings.liveUpdateDelay;
        }
        
        const refreshDelayValue = document.getElementById('refresh-delay-value');
        if (refreshDelayValue) {
            refreshDelayValue.textContent = `${AppState.settings.liveUpdateDelay}ms`;
        }
    }

    updateSetting(key, value) {
        AppState.settings[key] = value;
        this.applySettings();
        this.save();
        
        app.notifications.success('تنظیمات', 'تغییرات ذخیره شد');
    }
}

// 🎮 سیستم UI و رویدادها
class UIManager {
    constructor() {
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        this.dragElement = null;
    }

    initialize() {
        this.setupEventListeners();
        this.initializeCodeEditors();
        this.setupDragAndDrop();
        this.loadInitialContent();
        this.updateUI();
    }

    setupEventListeners() {
        // دکمه اجرا
        document.getElementById('btn-run').addEventListener('click', () => {
            app.codeExecutor.execute();
        });
        
        // دکمه توقف
        document.getElementById('btn-stop').addEventListener('click', () => {
            app.codeExecutor.stop();
        });
        
        // دکمه ذخیره
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveProject();
        });
        
        // دکمه اشتراک
        document.getElementById('btn-share').addEventListener('click', () => {
            this.shareProject();
        });
        
        // دکمه مدیر فایل
        document.getElementById('btn-file-manager').addEventListener('click', () => {
            this.togglePanel('file-manager');
        });
        
        // دکمه کامپوننت‌ها
        document.getElementById('btn-components').addEventListener('click', () => {
            this.togglePanel('components');
        });
        
        // تب‌های ویرایشگر
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchEditorTab(tabName);
            });
        });
        
        // بستن تب‌ها
        document.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // جلوگیری از بستن تب‌های اصلی
                app.notifications.info('سیستم', 'تب‌های اصلی قابل بستن نیستند');
            });
        });
        
        // افزودن تب جدید
        document.querySelector('.tab-add').addEventListener('click', () => {
            this.addNewTab();
        });
        
        // کنترل‌های بزرگنمایی
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            app.zoomSystem.zoomIn();
        });
        
        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            app.zoomSystem.zoomOut();
        });
        
        document.getElementById('btn-zoom-reset').addEventListener('click', () => {
            app.zoomSystem.resetZoom();
        });
        
        document.getElementById('btn-preview-zoom-in').addEventListener('click', () => {
            app.zoomSystem.zoomIn();
        });
        
        document.getElementById('btn-preview-zoom-out').addEventListener('click', () => {
            app.zoomSystem.zoomOut();
        });
        
        document.getElementById('btn-preview-zoom-reset').addEventListener('click', () => {
            app.zoomSystem.resetZoom();
        });
        
        // حالت نمایش دستگاه‌ها
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeDevice(e.currentTarget.dataset.device);
            });
        });
        
        // رفرش پیش‌نمایش
        document.getElementById('btn-refresh-preview').addEventListener('click', () => {
            app.codeExecutor.execute();
        });
        
        // تنظیمات پیش‌نمایش
        document.getElementById('btn-preview-settings').addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // تب‌های پنل پایینی
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const panelName = e.currentTarget.dataset.panel;
                this.switchPanel(panelName);
            });
        });
        
        // ورودی کنسول
        document.getElementById('console-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = e.target.value.trim();
                if (command) {
                    app.consoleSystem.executeCommand(command);
                    e.target.value = '';
                }
            }
        });
        
        // پاک کردن کنسول
        document.getElementById('btn-clear-console').addEventListener('click', () => {
            app.consoleSystem.clear();
        });
        
        // تاریخچه - بازگردانی
        document.getElementById('btn-history-back').addEventListener('click', () => {
            const version = app.historySystem.undo();
            if (version) {
                this.restoreFromHistory(version);
            }
        });
        
        // تاریخچه - تکرار
        document.getElementById('btn-history-forward').addEventListener('click', () => {
            const version = app.historySystem.redo();
            if (version) {
                this.restoreFromHistory(version);
            }
        });
        
        // جستجو در تاریخچه
        document.getElementById('history-search').addEventListener('input', (e) => {
            this.searchHistory(e.target.value);
        });
        
        // آپلود فایل
        document.getElementById('btn-upload-asset').addEventListener('click', () => {
            this.openFileUpload();
        });
        
        // حالت تمام صفحه
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // تنظیمات live update
        document.getElementById('live-update-toggle').addEventListener('change', (e) => {
            app.settingsManager.updateSetting('liveUpdate', e.target.checked);
        });
        
        document.getElementById('live-update-delay').addEventListener('change', (e) => {
            app.settingsManager.updateSetting('liveUpdateDelay', parseInt(e.target.value));
        });
        
        // تنظیمات در مودال
        document.getElementById('setting-font-size').addEventListener('input', (e) => {
            app.settingsManager.updateSetting('fontSize', parseInt(e.target.value));
        });
        
        document.getElementById('setting-line-height').addEventListener('input', (e) => {
            app.settingsManager.updateSetting('lineHeight', parseFloat(e.target.value));
        });
        
        document.getElementById('setting-editor-theme').addEventListener('change', (e) => {
            app.settingsManager.updateSetting('theme', e.target.value);
        });
        
        document.getElementById('setting-default-zoom').addEventListener('change', (e) => {
            app.settingsManager.updateSetting('defaultZoom', parseInt(e.target.value) / 100);
        });
        
        document.getElementById('setting-auto-refresh').addEventListener('change', (e) => {
            app.settingsManager.updateSetting('autoRefresh', e.target.checked);
        });
        
        document.getElementById('setting-refresh-delay').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            app.settingsManager.updateSetting('liveUpdateDelay', value);
            document.getElementById('refresh-delay-value').textContent = `${value}ms`;
        });
        
        // ذخیره تنظیمات
        document.getElementById('btn-save-settings').addEventListener('click', () => {
            app.settingsManager.save();
            this.hideModal('settings');
            app.notifications.success('تنظیمات', 'تنظیمات با موفقیت ذخیره شد');
        });
        
        // بستن مودال‌ها
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.currentTarget.dataset.modal;
                this.hideModal(modal);
            });
        });
        
        // بستن پنل‌های جانبی
        document.querySelectorAll('.btn-close-sidebar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.currentTarget.dataset.panel;
                this.togglePanel(panel);
            });
        });
        
        // تغییر نام پروژه
        document.getElementById('project-name').addEventListener('change', (e) => {
            AppState.project.name = e.target.value;
            this.saveProject();
        });
        
        // رویدادهای صفحه کلید
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // تغییر اندازه پنجره
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    initializeCodeEditors() {
        // ویرایشگر HTML
        AppState.editors.html = CodeMirror.fromTextArea(document.getElementById('html-code'), {
            mode: 'htmlmixed',
            theme: AppState.settings.theme === 'light' ? 'default' : 'dracula',
            lineNumbers: AppState.settings.enableLineNumbers,
            lineWrapping: AppState.settings.enableWordWrap,
            autoCloseTags: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-/": "toggleComment",
                "Cmd-/": "toggleComment"
            },
            fontSize: `${AppState.settings.fontSize}px`,
            lineHeight: AppState.settings.lineHeight
        });
        
        // ویرایشگر CSS
        AppState.editors.css = CodeMirror.fromTextArea(document.getElementById('css-code'), {
            mode: 'css',
            theme: AppState.settings.theme === 'light' ? 'default' : 'dracula',
            lineNumbers: AppState.settings.enableLineNumbers,
            lineWrapping: AppState.settings.enableWordWrap,
            autoCloseBrackets: true,
            matchBrackets: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-/": "toggleComment",
                "Cmd-/": "toggleComment"
            },
            fontSize: `${AppState.settings.fontSize}px`,
            lineHeight: AppState.settings.lineHeight
        });
        
        // ویرایشگر JavaScript
        AppState.editors.js = CodeMirror.fromTextArea(document.getElementById('js-code'), {
            mode: 'javascript',
            theme: AppState.settings.theme === 'light' ? 'default' : 'dracula',
            lineNumbers: AppState.settings.enableLineNumbers,
            lineWrapping: AppState.settings.enableWordWrap,
            autoCloseBrackets: true,
            matchBrackets: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-/": "toggleComment",
                "Cmd-/": "toggleComment"
            },
            fontSize: `${AppState.settings.fontSize}px`,
            lineHeight: AppState.settings.lineHeight
        });
        
        // رویداد تغییر کد
        Object.values(AppState.editors).forEach(editor => {
            editor.on('change', () => {
                this.handleCodeChange();
                this.updateEditorStats();
            });
        });
        
        // بارگذاری محتوای پیش‌فرض
        this.loadDefaultContent();
    }

    loadDefaultContent() {
        const defaultHTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پروژه من</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Vazirmatn', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        h1 { color: white; font-size: 3rem; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .subtitle { color: rgba(255,255,255,0.8); font-size: 1.2rem; }
        .features { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 40px; }
        .feature-card { flex: 1; min-width: 250px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); }
        .feature-icon { font-size: 3rem; color: #fff; margin-bottom: 20px; }
        .feature-title { color: white; font-size: 1.5rem; margin-bottom: 10px; }
        .feature-desc { color: rgba(255,255,255,0.8); line-height: 1.6; }
        .btn { display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin-top: 30px; transition: all 0.3s; }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        .live-preview { margin-top: 40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ویرایشگر کد پیشرفته 🚀</h1>
            <p class="subtitle">کدهای HTML، CSS و JavaScript خود را به صورت زنده ویرایش و اجرا کنید</p>
            <a href="#" class="btn" onclick="showMessage()">کلیک برای تست</a>
        </div>
        
        <div class="features">
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-bolt"></i>
                </div>
                <h3 class="feature-title">سریع و کارآمد</h3>
                <p class="feature-desc">اجرای کد در کسری از ثانیه با بهینه‌سازی پیشرفته</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <h3 class="feature-title">واکنش‌گرا</h3>
                <p class="feature-desc">طراحی کاملاً واکنش‌گرا برای همه دستگاه‌ها</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-code"></i>
                </div>
                <h3 class="feature-title">کدنویسی هوشمند</h3>
                <p class="feature-desc">تکمیل خودکار کد و هایلایت سینتکس پیشرفته</p>
            </div>
        </div>
        
        <div class="live-preview">
            <h3 style="color: white; margin-bottom: 20px;">خروجی زنده:</h3>
            <div id="output" style="color: white; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                خروجی اینجا نمایش داده می‌شود...
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn" onclick="changeColor()">تغییر رنگ</button>
                <button class="btn" onclick="addElement()">افزودن المان</button>
                <button class="btn" onclick="clearOutput()">پاک کردن</button>
            </div>
        </div>
    </div>

    <script>
        function showMessage() {
            const output = document.getElementById('output');
            output.innerHTML = '<p>🎉 دکمه با موفقیت کلیک شد!</p><p>زمان: ' + new Date().toLocaleTimeString('fa-IR') + '</p>';
            output.style.color = '#4ade80';
        }
        
        function changeColor() {
            const colors = ['#4ade80', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.getElementById('output').style.color = randomColor;
        }
        
        function addElement() {
            const output = document.getElementById('output');
            const newElement = document.createElement('div');
            newElement.innerHTML = '<p>✅ المان جدید اضافه شد: ' + new Date().toLocaleTimeString('fa-IR') + '</p>';
            output.appendChild(newElement);
        }
        
        function clearOutput() {
            document.getElementById('output').innerHTML = 'خروجی پاک شد.';
        }
        
        // انیمیشن برای کارت‌ها
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.feature-card');
            cards.forEach((card, index) => {
                card.style.animationDelay = (index * 0.2) + 's';
                card.style.animation = 'fadeInUp 0.5s ease forwards';
            });
        });
    </script>
</body>
</html>`;

        const defaultCSS = `/* استایل‌های اضافی */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}

@keyframes gradientBG {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

/* بهبود استایل‌های موجود */
body {
    animation: gradientBG 15s ease infinite;
    background-size: 400% 400%;
}

.feature-card {
    transition: all 0.3s ease;
    cursor: pointer;
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    background: rgba(255,255,255,0.15);
}

.btn {
    animation: pulse 2s infinite;
    position: relative;
    overflow: hidden;
}

.btn::after {
    content: '';
    position: absolute;
    top: 0;
    right: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: 0.5s;
}

.btn:hover::after {
    right: 100%;
}

/* استایل‌های واکنش‌گرا */
@media (max-width: 768px) {
    h1 {
        font-size: 2rem;
    }
    
    .subtitle {
        font-size: 1rem;
    }
    
    .features {
        flex-direction: column;
    }
    
    .feature-card {
        min-width: 100%;
    }
}

@media (max-width: 480px) {
    .container {
        padding: 20px 10px;
    }
    
    h1 {
        font-size: 1.5rem;
    }
    
    .btn {
        width: 100%;
        text-align: center;
    }
}

/* کلاس‌های کمکی */
.text-center {
    text-align: center;
}

.mt-20 {
    margin-top: 20px;
}

.mb-20 {
    margin-bottom: 20px;
}

.p-20 {
    padding: 20px;
}

.rounded {
    border-radius: 10px;
}

.shadow {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}`;

        const defaultJS = `// کدهای JavaScript پیشرفته

// شمارنده کلیک
let clickCount = 0;

function showMessage() {
    clickCount++;
    const output = document.getElementById('output');
    output.innerHTML = \`
        <div class="alert alert-success">
            <h4>🎉 عملیات موفق!</h4>
            <p>دکمه کلیک شماره \${clickCount}</p>
            <p>زمان دقیق: \${new Date().toLocaleTimeString('fa-IR')}</p>
            <p>تاریخ: \${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
    \`;
    
    // ایجاد انیمیشن
    output.style.animation = 'none';
    setTimeout(() => {
        output.style.animation = 'pulse 0.5s ease';
    }, 10);
    
    updateStats();
}

// تغییر رنگ دینامیک
function changeColor() {
    const colors = [
        '#10b981', // سبز
        '#3b82f6', // آبی
        '#8b5cf6', // بنفش
        '#f59e0b', // نارنجی
        '#ef4444', // قرمز
        '#06b6d4', // فیروزه‌ای
        '#f97316'  // نارنجی تیره
    ];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const output = document.getElementById('output');
    
    // تغییر تدریجی رنگ
    output.style.transition = 'color 0.5s ease';
    output.style.color = randomColor;
    
    // تغییر پس‌زمینه
    document.body.style.background = \`linear-gradient(135deg, \${randomColor} 0%, #764ba2 100%)\`;
    
    // نمایش نام رنگ
    const colorNames = {
        '#10b981': 'سبز',
        '#3b82f6': 'آبی',
        '#8b5cf6': 'بنفش',
        '#f59e0b': 'نارنجی',
        '#ef4444': 'قرمز',
        '#06b6d4': 'فیروزه‌ای',
        '#f97316': 'نارنجی تیره'
    };
    
    output.innerHTML = \`<p>رنگ تغییر کرد به: <strong>\${colorNames[randomColor]}</strong></p>\`;
}

// افزودن المان پویا
function addElement() {
    const output = document.getElementById('output');
    const elementTypes = ['div', 'p', 'span', 'button', 'input'];
    const elementType = elementTypes[Math.floor(Math.random() * elementTypes.length)];
    
    const newElement = document.createElement(elementType);
    newElement.className = 'dynamic-element';
    newElement.innerHTML = \`
        <p>✅ المان \${elementType.toUpperCase()} اضافه شد</p>
        <small>تاریخ ایجاد: \${new Date().toLocaleString('fa-IR')}</small>
    \`;
    
    // استایل‌دهی پویا
    newElement.style.padding = '15px';
    newElement.style.margin = '10px 0';
    newElement.style.background = 'rgba(255,255,255,0.1)';
    newElement.style.borderRadius = '8px';
    newElement.style.border = '1px solid rgba(255,255,255,0.2)';
    newElement.style.color = 'white';
    
    // انیمیشن
    newElement.style.animation = 'fadeInUp 0.5s ease';
    
    output.appendChild(newElement);
    updateStats();
}

// پاک کردن خروجی
function clearOutput() {
    const output = document.getElementById('output');
    output.innerHTML = '<p class="text-center">✨ خروجی پاک شد. آماده برای کد جدید!</p>';
    output.style.color = 'white';
    output.style.animation = 'pulse 0.5s ease';
    
    // بازنشانی شمارنده
    clickCount = 0;
    updateStats();
}

// به‌روزرسانی آمار
function updateStats() {
    const statsElement = document.getElementById('output-stats') || createStatsElement();
    
    statsElement.innerHTML = \`
        <div style="display: flex; gap: 20px; margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
            <div>
                <strong>تعداد کلیک:</strong>
                <span style="color: #4ade80"> \${clickCount}</span>
            </div>
            <div>
                <strong>تاریخ:</strong>
                <span> \${new Date().toLocaleDateString('fa-IR')}</span>
            </div>
            <div>
                <strong>زمان:</strong>
                <span> \${new Date().toLocaleTimeString('fa-IR')}</span>
            </div>
        </div>
    \`;
}

function createStatsElement() {
    const output = document.getElementById('output');
    const statsElement = document.createElement('div');
    statsElement.id = 'output-stats';
    output.appendChild(statsElement);
    return statsElement;
}

// تابع پیشرفته برای انیمیشن المان‌ها
function animateElements() {
    const elements = document.querySelectorAll('.dynamic-element');
    elements.forEach((element, index) => {
        element.style.animationDelay = (index * 0.1) + 's';
        element.style.animation = 'pulse 1s ease infinite';
    });
}

// رویدادهای صفحه کلید
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'r':
                event.preventDefault();
                changeColor();
                break;
            case 'a':
                event.preventDefault();
                addElement();
                break;
            case 'c':
                event.preventDefault();
                clearOutput();
                break;
        }
    }
});

// تابع برای تست کارایی
function performanceTest() {
    console.time('performanceTest');
    
    // انجام عملیات سنگین
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i) * Math.random();
    }
    
    console.timeEnd('performanceTest');
    console.log('نتیجه تست کارایی:', result);
    
    return result;
}

// مدیریت خطا
window.onerror = function(message, source, lineno, colno, error) {
    console.error('خطای جهانی:', { message, source, lineno, colno, error });
    return true;
};

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', function() {
    console.log('صفحه با موفقیت بارگذاری شد!');
    console.log('ویرایشگر کد پیشرفته آماده است.');
    
    // انیمیشن اولیه
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = (index * 0.2) + 's';
        card.style.animation = 'fadeInUp 0.5s ease forwards';
    });
    
    // ایجاد عنصر آمار
    createStatsElement();
    updateStats();
    
    // تست اولیه
    console.log('🚀 سیستم آماده اجرای کد است!');
});`;

        // تنظیم کدهای پیش‌فرض
        AppState.editors.html.setValue(defaultHTML);
        AppState.editors.css.setValue(defaultCSS);
        AppState.editors.js.setValue(defaultJS);
        
        // ذخیره در تاریخچه
        app.historySystem.saveVersion(defaultHTML, defaultCSS, defaultJS, 'پروژه اولیه');
        
        // به‌روزرسانی آمار
        this.updateEditorStats();
    }

    handleCodeChange() {
        AppState.project.modified = true;
        
        // اجرای زنده
        if (AppState.settings.liveUpdate) {
            clearTimeout(AppState.timers.liveUpdate);
            AppState.timers.liveUpdate = setTimeout(() => {
                app.codeExecutor.execute();
            }, AppState.settings.liveUpdateDelay);
        }
    }

    updateEditorStats() {
        const updateStats = (editor, linesId, charsId) => {
            if (editor) {
                const content = editor.getValue();
                const lines = content.split('\n').length;
                const chars = content.length;
                
                document.getElementById(linesId).textContent = lines.toLocaleString('fa-IR');
                document.getElementById(charsId).textContent = chars.toLocaleString('fa-IR');
            }
        };
        
        updateStats(AppState.editors.html, 'html-lines', 'html-chars');
        updateStats(AppState.editors.css, 'css-lines', 'css-chars');
        updateStats(AppState.editors.js, 'js-lines', 'js-chars');
    }

    switchEditorTab(tabName) {
        AppState.ui.activeTab = tabName;
        
        // به‌روزرسانی تب‌ها
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // نمایش ویرایشگر مربوطه
        document.querySelectorAll('.editor-container').forEach(container => {
            container.classList.toggle('active', container.id === `editor-${tabName}`);
        });
        
        // به‌روزرسانی دکمه‌های موبایل
        document.querySelectorAll('.mobile-btn').forEach(btn => {
            btn.classList.toggle('active', 
                (tabName === 'html' && btn.querySelector('.fa-html5')) ||
                (tabName === 'css' && btn.querySelector('.fa-css3-alt')) ||
                (tabName === 'js' && btn.querySelector('.fa-js-square'))
            );
        });
    }

    addNewTab() {
        app.notifications.info('سیستم', 'افزودن تب جدید در نسخه‌های آینده اضافه خواهد شد');
    }

    changeDevice(device) {
        AppState.preview.device = device;
        
        // به‌روزرسانی دکمه‌ها
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.device === device);
        });
        
        // اعمال اندازه دستگاه
        const iframe = document.getElementById('preview-frame');
        if (!iframe) return;
        
        const wrapper = document.getElementById('preview-wrapper');
        
        switch(device) {
            case 'mobile':
                iframe.style.width = '375px';
                iframe.style.height = '667px';
                wrapper.style.justifyContent = 'center';
                break;
                
            case 'tablet':
                iframe.style.width = '768px';
                iframe.style.height = '1024px';
                wrapper.style.justifyContent = 'center';
                break;
                
            case 'desktop':
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                wrapper.style.justifyContent = 'flex-start';
                break;
                
            case 'responsive':
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                wrapper.style.justifyContent = 'flex-start';
                break;
        }
    }

    togglePanel(panelName) {
        AppState.ui.panels[panelName] = !AppState.ui.panels[panelName];
        
        const panel = document.getElementById(`${panelName}-panel`);
        if (panel) {
            panel.classList.toggle('open', AppState.ui.panels[panelName]);
        }
        
        // بستن سایر پنل‌ها
        if (AppState.ui.panels[panelName]) {
            Object.keys(AppState.ui.panels).forEach(key => {
                if (key !== panelName && AppState.ui.panels[key]) {
                    AppState.ui.panels[key] = false;
                    const otherPanel = document.getElementById(`${key}-panel`);
                    if (otherPanel) {
                        otherPanel.classList.remove('open');
                    }
                }
            });
        }
    }

    switchPanel(panelName) {
        AppState.ui.activePanel = panelName;
        
        // به‌روزرسانی تب‌ها
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelName);
        });
        
        // نمایش پنل مربوطه
        document.querySelectorAll('.panel-section').forEach(section => {
            section.classList.toggle('active', section.id === `panel-${panelName}`);
        });
    }

    showSettingsModal() {
        document.getElementById('settings-modal').classList.add('open');
    }

    hideModal(modalName) {
        document.getElementById(`${modalName}-modal`).classList.remove('open');
    }

    setupDragAndDrop() {
        // کامپوننت‌ها
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.component);
                e.target.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
        
        // ویرایشگر HTML
        const htmlEditor = AppState.editors.html;
        if (htmlEditor) {
            const editorElement = htmlEditor.getWrapperElement();
            
            editorElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                editorElement.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
            });
            
            editorElement.addEventListener('dragleave', () => {
                editorElement.style.backgroundColor = '';
            });
            
            editorElement.addEventListener('drop', (e) => {
                e.preventDefault();
                editorElement.style.backgroundColor = '';
                
                const componentType = e.dataTransfer.getData('text/plain');
                this.insertComponent(componentType);
            });
        }
    }

    insertComponent(componentType) {
        const components = {
            navbar: `
<!-- ناوبری -->
<nav class="navbar">
    <div class="nav-container">
        <div class="logo">
            <i class="fas fa-code"></i>
            <span>برند من</span>
        </div>
        <ul class="nav-menu">
            <li><a href="#home">خانه</a></li>
            <li><a href="#about">درباره ما</a></li>
            <li><a href="#services">خدمات</a></li>
            <li><a href="#contact">تماس</a></li>
        </ul>
        <button class="nav-toggle">
            <i class="fas fa-bars"></i>
        </button>
    </div>
</nav>

<style>
    .navbar {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 1rem 2rem;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
    }
    .nav-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
    }
    .logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
    }
    .nav-menu {
        display: flex;
        gap: 2rem;
        list-style: none;
    }
    .nav-menu a {
        color: white;
        text-decoration: none;
        transition: color 0.3s;
    }
    .nav-menu a:hover {
        color: #60a5fa;
    }
    .nav-toggle {
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    }
</style>`,
            
            hero: `
<!-- بخش قهرمان -->
<section class="hero">
    <div class="hero-content">
        <h1>به وبسایت ما خوش آمدید</h1>
        <p>اینجا می‌توانید خلاقیت خود را به نمایش بگذارید و ایده‌هایتان را پیاده کنید</p>
        <div class="hero-buttons">
            <button class="btn btn-primary">شروع کنید</button>
            <button class="btn btn-secondary">بیشتر بدانید</button>
        </div>
    </div>
    <div class="hero-image">
        <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c" alt="Hero Image">
    </div>
</section>

<style>
    .hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6rem 2rem;
        max-width: 1200px;
        margin: 0 auto;
        gap: 4rem;
    }
    .hero-content {
        flex: 1;
    }
    .hero h1 {
        font-size: 3.5rem;
        color: white;
        margin-bottom: 1.5rem;
        line-height: 1.2;
    }
    .hero p {
        font-size: 1.25rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 2rem;
        line-height: 1.6;
    }
    .hero-buttons {
        display: flex;
        gap: 1rem;
    }
    .btn {
        padding: 1rem 2rem;
        border-radius: 50px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        border: none;
    }
    .btn-primary {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
    }
    .btn-secondary {
        background: transparent;
        color: white;
        border: 2px solid white;
    }
    .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    .hero-image {
        flex: 1;
    }
    .hero-image img {
        width: 100%;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
</style>`
        };
        
        if (components[componentType]) {
            const editor = AppState.editors.html;
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            const indent = line.match(/^\s*/)[0];
            
            editor.replaceRange(indent + components[componentType], cursor);
            app.notifications.success('کامپوننت', `کامپوننت ${componentType} اضافه شد`);
        }
    }

    handleKeyboardShortcuts(event) {
        // Ctrl+S - ذخیره
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.saveProject();
        }
        
        // Ctrl+Z - بازگردانی
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            const version = app.historySystem.undo();
            if (version) {
                this.restoreFromHistory(version);
            }
        }
        
        // Ctrl+Shift+Z یا Ctrl+Y - تکرار
        if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') || 
            ((event.ctrlKey || event.metaKey) && event.key === 'y')) {
            event.preventDefault();
            const version = app.historySystem.redo();
            if (version) {
                this.restoreFromHistory(version);
            }
        }
        
        // F5 - اجرای کد
        if (event.key === 'F5') {
            event.preventDefault();
            app.codeExecutor.execute();
        }
        
        // F11 - تمام صفحه
        if (event.key === 'F11') {
            event.preventDefault();
            this.toggleFullscreen();
        }
        
        // Ctrl+Enter - اجرای سریع
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            app.codeExecutor.execute();
        }
        
        // Ctrl+/ - کامنت کردن
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            const editor = AppState.editors[AppState.ui.activeTab];
            if (editor) {
                editor.execCommand('toggleComment');
            }
        }
    }

    saveProject() {
        try {
            const project = {
                name: AppState.project.name,
                html: AppState.editors.html.getValue(),
                css: AppState.editors.css.getValue(),
                js: AppState.editors.js.getValue(),
                settings: AppState.settings,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('currentProject', JSON.stringify(project));
            AppState.project.lastSaved = new Date();
            AppState.project.modified = false;
            
            app.notifications.success('ذخیره پروژه', 'پروژه با موفقیت ذخیره شد');
            
            // ذخیره در تاریخچه
            app.historySystem.saveVersion(project.html, project.css, project.js, 'ذخیره دستی');
            
            return true;
        } catch (error) {
            console.error('خطا در ذخیره پروژه:', error);
            app.notifications.error('خطا', 'ذخیره پروژه با خطا مواجه شد');
            return false;
        }
    }

    loadProject() {
        try {
            const saved = localStorage.getItem('currentProject');
            if (saved) {
                const project = JSON.parse(saved);
                
                AppState.project.name = project.name;
                document.getElementById('project-name').value = project.name;
                
                if (AppState.editors.html && project.html !== undefined) {
                    AppState.editors.html.setValue(project.html);
                }
                
                if (AppState.editors.css && project.css !== undefined) {
                    AppState.editors.css.setValue(project.css);
                }
                
                if (AppState.editors.js && project.js !== undefined) {
                    AppState.editors.js.setValue(project.js);
                }
                
                if (project.settings) {
                    AppState.settings = { ...AppState.settings, ...project.settings };
                    app.settingsManager.applySettings();
                }
                
                AppState.project.lastSaved = new Date(project.timestamp);
                AppState.project.modified = false;
                
                app.notifications.success('بارگذاری پروژه', 'پروژه با موفقیت بارگذاری شد');
                return true;
            }
        } catch (error) {
            console.error('خطا در بارگذاری پروژه:', error);
            app.notifications.error('خطا', 'بارگذاری پروژه با خطا مواجه شد');
        }
        return false;
    }

    shareProject() {
        const project = {
            name: AppState.project.name,
            html: AppState.editors.html.getValue(),
            css: AppState.editors.css.getValue(),
            js: AppState.editors.js.getValue(),
            version: APP_CONFIG.VERSION
        };
        
        const encoded = btoa(JSON.stringify(project));
        const url = `${window.location.origin}${window.location.pathname}?project=${encoded}`;
        
        // کپی به کلیپ‌بورد
        navigator.clipboard.writeText(url).then(() => {
            app.notifications.success('اشتراک‌گذاری', 'لینک پروژه در کلیپ‌بورد کپی شد');
        }).catch(() => {
            prompt('لینک پروژه:', url);
        });
    }

    restoreFromHistory(version) {
        if (AppState.editors.html && version.data.html !== undefined) {
            AppState.editors.html.setValue(version.data.html);
        }
        
        if (AppState.editors.css && version.data.css !== undefined) {
            AppState.editors.css.setValue(version.data.css);
        }
        
        if (AppState.editors.js && version.data.js !== undefined) {
            AppState.editors.js.setValue(version.data.js);
        }
        
        app.codeExecutor.execute();
    }

    searchHistory(query) {
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => {
            const title = item.querySelector('.history-title').textContent;
            const time = item.querySelector('.history-time').textContent;
            
            const matches = title.includes(query) || time.includes(query);
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    openFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,.pdf,.zip,.txt,.html,.css,.js';
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                this.handleFileUpload(file);
            });
        };
        
        input.click();
    }

    handleFileUpload(file) {
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            app.notifications.error('آپلود فایل', 'حجم فایل بیش از حد مجاز است');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const asset = {
                id: Date.now(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                uploadDate: new Date().toISOString()
            };
            
            AppState.assets.push(asset);
            this.updateAssetsUI();
            
            app.notifications.success('آپلود فایل', `${file.name} با موفقیت آپلود شد`);
        };
        
        reader.onerror = () => {
            app.notifications.error('آپلود فایل', 'خطا در خواندن فایل');
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    }

    updateAssetsUI() {
        const assetsList = document.getElementById('assets-list');
        if (!assetsList) return;
        
        assetsList.innerHTML = '';
        
        AppState.assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'asset-item';
            item.dataset.id = asset.id;
            
            let icon = 'fas fa-file';
            if (asset.type.startsWith('image/')) icon = 'fas fa-file-image';
            else if (asset.type.includes('pdf')) icon = 'fas fa-file-pdf';
            else if (asset.type.includes('zip')) icon = 'fas fa-file-archive';
            
            const size = this.formatFileSize(asset.size);
            
            item.innerHTML = `
                <div class="asset-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="asset-name">${asset.name}</div>
                <div class="asset-size">${size}</div>
            `;
            
            item.addEventListener('click', () => {
                this.useAsset(asset);
            });
            
            assetsList.appendChild(item);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    useAsset(asset) {
        if (asset.type.startsWith('image/')) {
            const imgTag = `<img src="${asset.data}" alt="${asset.name}" style="max-width: 100%;">`;
            this.insertIntoEditor(imgTag);
            app.notifications.info('فایل', `تصویر ${asset.name} وارد شد`);
        } else if (asset.type.includes('text')) {
            this.insertIntoEditor(asset.data);
            app.notifications.info('فایل', `محتویات ${asset.name} وارد شد`);
        }
    }

    insertIntoEditor(content) {
        const editor = AppState.editors[AppState.ui.activeTab];
        if (editor) {
            const cursor = editor.getCursor();
            editor.replaceRange(content, cursor);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.body.classList.add('fullscreen');
            AppState.preview.isFullscreen = true;
        } else {
            document.exitFullscreen();
            document.body.classList.remove('fullscreen');
            AppState.preview.isFullscreen = false;
        }
    }

    handleResize() {
        // به‌روزرسانی layout در صورت تغییر اندازه پنجره
        this.updateUI();
    }

    updateUI() {
        // به‌روزرسانی وضعیت آنلاین/آفلاین
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            const isOnline = navigator.onLine;
            statusIndicator.classList.toggle('online', isOnline);
            statusIndicator.classList.toggle('offline', !isOnline);
            statusIndicator.querySelector('span').textContent = isOnline ? 'آنلاین' : 'آفلاین';
        }
        
        // به‌روزرسانی تاریخ و زمان
        this.updateDateTime();
        
        // به‌روزرسانی آمار
        this.updateEditorStats();
    }

    updateDateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const dateString = now.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // می‌توانید این اطلاعات را در جایی از UI نمایش دهید
    }

    loadInitialContent() {
        // بارگذاری پروژه ذخیره شده
        this.loadProject();
        
        // اگر پروژه‌ای ذخیره نشده بود، محتوای پیش‌فرض را بارگذاری کن
        if (!localStorage.getItem('currentProject')) {
            this.loadDefaultContent();
        }
    }
}

// 🚀 شیء اصلی برنامه
const app = {
    notifications: null,
    fileSystem: null,
    historySystem: null,
    codeExecutor: null,
    errorSystem: null,
    consoleSystem: null,
    zoomSystem: null,
    settingsManager: null,
    uiManager: null,
    
    initialize() {
        console.log('🚀 راه‌اندازی ویرایشگر کد پیشرفته...');
        
        // نمایش صفحه بارگذاری
        this.showLoadingScreen();
        
        // مقداردهی اولیه سیستم‌ها
        this.notifications = new NotificationSystem();
        this.fileSystem = new FileSystem();
        this.historySystem = new HistorySystem();
        this.codeExecutor = new CodeExecutor();
        this.errorSystem = new ErrorSystem();
        this.consoleSystem = new ConsoleSystem();
        this.zoomSystem = new ZoomSystem();
        this.settingsManager = new SettingsManager();
        this.uiManager = new UIManager();
        
        // بارگذاری داده‌ها
        this.loadData();
        
        // راه‌اندازی UI
        this.uiManager.initialize();
        
        // اعمال تنظیمات
        this.settingsManager.load();
        
        // بارگذاری تاریخچه
        this.historySystem.loadFromStorage();
        this.historySystem.updateHistoryUI();
        
        // راه‌اندازی auto-save
        this.setupAutoSave();
        
        // مخفی کردن صفحه بارگذاری
        setTimeout(() => {
            this.hideLoadingScreen();
            this.notifications.success('خوش آمدید', 'ویرایشگر کد پیشرفته آماده است!');
            
            // اجرای اولیه کد
            this.codeExecutor.execute();
        }, 1500);
    },
    
    showLoadingScreen() {
        const progressBar = document.getElementById('loading-progress');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }, 100);
    },
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }
    },
    
    loadData() {
        // بارگذاری داده‌ها از localStorage
        this.fileSystem.loadFromStorage();
        
        // بارگذاری تنظیمات
        this.settingsManager.load();
    },
    
    setupAutoSave() {
        if (AppState.settings.autoSave) {
            AppState.timers.autoSave = setInterval(() => {
                if (AppState.project.modified) {
                    this.uiManager.saveProject();
                }
            }, APP_CONFIG.AUTO_SAVE_INTERVAL);
        }
    }
};

// 🎬 اجرای برنامه
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
    
    // بررسی اگر پروژه‌ای از طریق URL آمده
    const urlParams = new URLSearchParams(window.location.search);
    const projectData = urlParams.get('project');
    
    if (projectData) {
        try {
            const project = JSON.parse(atob(projectData));
            
            if (AppState.editors.html && project.html !== undefined) {
                AppState.editors.html.setValue(project.html);
            }
            
            if (AppState.editors.css && project.css !== undefined) {
                AppState.editors.css.setValue(project.css);
            }
            
            if (AppState.editors.js && project.js !== undefined) {
                AppState.editors.js.setValue(project.js);
            }
            
            if (project.name) {
                AppState.project.name = project.name;
                document.getElementById('project-name').value = project.name;
            }
            
            app.notifications.success('پروژه وارد شده', 'پروژه از لینک با موفقیت بارگذاری شد');
            app.codeExecutor.execute();
        } catch (error) {
            console.error('خطا در بارگذاری پروژه از URL:', error);
            app.notifications.error('خطا', 'بارگذاری پروژه از لینک با خطا مواجه شد');
        }
    }
});

// 🌍 مدیریت وضعیت آنلاین/آفلاین
window.addEventListener('online', () => {
    app.notifications.success('اتصال', 'اتصال اینترنت برقرار شد');
    document.getElementById('status-indicator').classList.replace('offline', 'online');
});

window.addEventListener('offline', () => {
    app.notifications.warning('اتصال', 'اتصال اینترنت قطع شد');
    document.getElementById('status-indicator').classList.replace('online', 'offline');
});

// 📝 پشتیبانی از Service Worker (برای حالت آفلاین)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(error => {
            console.log('ثبت Service Worker با خطا مواجه شد:', error);
        });
    });
}

// 🎯 تنظیمات پیشرفته برای توسعه‌دهندگان
window.app = app; // در دسترس قرار دادن app در کنسول برای دیباگ

console.log(`
╔══════════════════════════════════════════════════════╗
║   🚀 ویرایشگر کد پیشرفته v${APP_CONFIG.VERSION}          ║
║   📅 ${APP_CONFIG.BUILD_DATE}                                   ║
║   🔧 توسط تیم توسعه نهایی                           ║
╚══════════════════════════════════════════════════════╝

دستورات مفید در کنسول:
• app.codeExecutor.execute() - اجرای کد
• app.uiManager.saveProject() - ذخیره پروژه
• app.historySystem.clear() - پاک کردن تاریخچه
• app.settingsManager.save() - ذخیره تنظیمات

کلیدهای میانبر:
• Ctrl+S: ذخیره پروژه
• Ctrl+Z: بازگردانی
• Ctrl+Shift+Z/Ctrl+Y: تکرار
• F5: اجرای کد
• F11: حالت تمام صفحه
• Ctrl+Enter: اجرای سریع
`);

// 🛡️ مدیریت خطاهای بحرانی
window.addEventListener('error', (event) => {
    console.error('خطای بحرانی:', event.error);
    app.errorSystem.addError({
        type: 'critical-error',
        message: event.error.message,
        stack: event.error.stack,
        timestamp: new Date().toISOString()
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejection مدیریت نشده:', event.reason);
    app.errorSystem.addError({
        type: 'unhandled-rejection',
        message: event.reason?.message || 'Promise rejection مدیریت نشده',
        timestamp: new Date().toISOString()
    });
});
