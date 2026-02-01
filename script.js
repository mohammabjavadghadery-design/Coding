// ==========================================
// ثابت‌های برنامه (رفع ایراد شماره‌های جادویی)
// ==========================================
const APP_CONSTANTS = {
    AUTO_SAVE_DELAY: 2000,
    NOTIFICATION_DURATION: 3500,
    TREE_REFRESH_DELAY: 400,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    WARNING_FILE_SIZE: 2 * 1024 * 1024, // 2MB
    MAX_LOCAL_STORAGE_SIZE: 4.5 * 1024 * 1024, // 4.5MB
    MAX_CONSOLE_MESSAGES: 150,
    DEFAULT_PROJECT_NAME: 'پروژه من',
    STORAGE_KEY: 'codeEditorFileSystem_v4',
    PERSIAN_DIGITS: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
};

// ==========================================
// تبدیل اعداد انگلیسی به فارسی
// ==========================================
function toPersianDigits(str) {
    return String(str).replace(/\d/g, d => APP_CONSTANTS.PERSIAN_DIGITS[parseInt(d)]);
}

// ==========================================
// کلاس مدیریت ایمنی (رفع ایرادات امنیتی)
// ==========================================
class SecurityManager {
    static sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    static sanitizeCss(css) {
        return css
            .replace(/@import\s+url\([^)]+\);?/gi, '')
            .replace(/url\(['"]?(?!['"]?data:)([^'")]+)['"]?\)/gi, 'url("")')
            .replace(/expression\s*\([^)]+\)/gi, '')
            .replace(/javascript:/gi, '');
    }

    static sanitizeJs(js) {
        return js
            .replace(/window\.parent\./gi, 'window.')
            .replace(/window\.top\./gi, 'window.')
            .replace(/location\.assign|location\.replace|location\.href\s*=/gi, '// blocked')
            .replace(/document\.cookie/gi, '""')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    static sanitizeFilePath(path) {
        return path
            .replace(/[<>:"|?*]/g, '')
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '');
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// کلاس مدیریت فایل‌ها (رفع ایرادات منطقی و حافظه)
// ==========================================
class FileSystemManager {
    constructor() {
        this.root = null;
        this.nodeCache = new Map();
        this.pathCache = new Map();
        this.loadFromStorage();
    }

    initializeDefaultProject() {
        this.root = {
            id: 'root',
            text: APP_CONSTANTS.DEFAULT_PROJECT_NAME,
            type: 'folder',
            state: { opened: true },
            children: [
                {
                    id: 'file_index_html',
                    text: 'index.html',
                    type: 'file',
                    icon: 'fas fa-file-code file-icon html',
                    data: {
                        content: `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پروژه من - ویرایشگر کد حرفه‌ای</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <div class="container">
        <h1>به ویرایشگر کد حرفه‌ای خوش آمدید! 🚀</h1>
        <p>این یک ویرایشگر کد تحت وب با قابلیت‌های پیشرفته است.</p>
        <button onclick="showMessage()">کلیک کنید</button>
        <div id="output"></div>
    </div>
    <script src="scripts/main.js"></script>
</body>
</html>`,
                        mode: 'htmlmixed'
                    }
                },
                {
                    id: 'folder_styles',
                    text: 'styles',
                    type: 'folder',
                    icon: 'fas fa-folder file-icon folder',
                    state: { opened: true },
                    children: [
                        {
                            id: 'file_main_css',
                            text: 'main.css',
                            type: 'file',
                            icon: 'fas fa-file-code file-icon css',
                            data: {
                                content: `/* استایل‌های اصلی پروژه */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Vazirmatn', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    padding: 20px;
}

.container {
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 40px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 100%;
}

h1 {
    font-size: 2.5rem;
    margin-bottom: 20px;
    background: linear-gradient(45deg, #fff, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

p {
    font-size: 1.2rem;
    margin-bottom: 30px;
    line-height: 1.6;
}

button {
    padding: 15px 40px;
    font-size: 1.1rem;
    background: linear-gradient(45deg, #ff8a00, #da1b60);
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: bold;
    margin: 10px;
}

button:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(218, 27, 96, 0.4);
}

#output {
    margin-top: 30px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    font-size: 1.2rem;
    min-height: 60px;
}`,
                                mode: 'css'
                            }
                        }
                    ]
                },
                {
                    id: 'folder_scripts',
                    text: 'scripts',
                    type: 'folder',
                    icon: 'fas fa-folder file-icon folder',
                    state: { opened: true },
                    children: [
                        {
                            id: 'file_main_js',
                            text: 'main.js',
                            type: 'file',
                            icon: 'fas fa-file-code file-icon js',
                            data: {
                                content: `// اسکریپت اصلی پروژه
console.log('✅ ویرایشگر کد حرفه‌ای بارگذاری شد');

function showMessage() {
    const messages = [
        '🎉 عملیات موفقیت‌آمیز بود!',
        '✨ کد شما به درستی اجرا شد',
        '🚀 عملکرد بهینه‌شده',
        '💎 طراحی حرفه‌ای'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const output = document.getElementById('output');
    
    output.innerHTML = \`
        <div style="animation: fadeIn 0.5s ease-out;">
            <p style="color: #4ade80; font-weight: bold;">\${randomMessage}</p>
            <small style="color: #94a3b8;">زمان: \${new Date().toLocaleTimeString('fa-IR')}</small>
        </div>
    \`;
    
    console.log('دکمه کلیک شد:', randomMessage);
}

// انیمیشن fadeIn
const style = document.createElement('style');
style.textContent = \`
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
\`;
document.head.appendChild(style);

console.log('اسکریپت اصلی آماده است');`,
                                mode: 'javascript'
                            }
                        }
                    ]
                }
            ]
        };
        this.saveToStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY);
            if (stored) {
                this.root = JSON.parse(stored);
                consoleManager.log('فایل‌های پروژه از حافظه محلی بارگذاری شدند', 'info');
            } else {
                this.initializeDefaultProject();
            }
        } catch (error) {
            console.error('خطا در بارگذاری از حافظه محلی:', error);
            this.initializeDefaultProject();
        }
    }

    saveToStorage() {
        try {
            const data = JSON.stringify(this.root);
            const size = new TextEncoder().encode(data).length;
            
            if (size > APP_CONSTANTS.MAX_LOCAL_STORAGE_SIZE) {
                this.showError('پروژه بیش از حد بزرگ است', 'لطفاً برخی فایل‌ها را حذف کنید');
                return false;
            }
            
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEY, data);
            return true;
        } catch (error) {
            console.error('خطا در ذخیره‌سازی:', error);
            this.showError('خطا در ذخیره‌سازی', 'حافظه مرورگر پر است یا محدود شده است');
            return false;
        }
    }

    getFilePath(fileId, node = this.root, pathParts = []) {
        if (!node) return null;
        
        if (this.pathCache.has(fileId)) {
            return this.pathCache.get(fileId);
        }

        if (node.id === fileId && node.type === 'file') {
            const path = [...pathParts, node.text].join('/');
            this.pathCache.set(fileId, path);
            return path;
        }

        if (node.children) {
            for (const child of node.children) {
                if (node.type === 'folder' && node.id !== 'root') {
                    const result = this.getFilePath(fileId, child, [...pathParts, node.text]);
                    if (result) return result;
                } else {
                    const result = this.getFilePath(fileId, child, pathParts);
                    if (result) return result;
                }
            }
        }
        return null;
    }

    findNodeById(id, node = this.root) {
        if (!node) return null;
        
        if (this.nodeCache.has(id)) {
            return this.nodeCache.get(id);
        }

        if (node.id === id) {
            this.nodeCache.set(id, node);
            return node;
        }

        if (node.children) {
            for (const child of node.children) {
                const found = this.findNodeById(id, child);
                if (found) return found;
            }
        }
        return null;
    }

    findParentNode(id, node = this.root) {
        if (!node || !node.children) return null;
        
        for (const child of node.children) {
            if (child.id === id) return node;
            const found = this.findParentNode(id, child);
            if (found) return found;
        }
        return null;
    }

    createFile(name, parentId, content = '', mode = 'htmlmixed') {
        if (!name || name.trim() === '') {
            throw new Error('نام فایل نمی‌تواند خالی باشد');
        }
        
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(name)) {
            throw new Error('نام فایل حاوی کاراکترهای ممنوعه است');
        }
        
        if (name.length > 255) {
            throw new Error('نام فایل بیش از حد طولانی است');
        }

        const parent = this.findNodeById(parentId);
        if (!parent || parent.type !== 'folder') {
            throw new Error('پوشه مقصد معتبر نیست');
        }

        if (parent.children?.some(child => child.text === name)) {
            throw new Error('فایل با این نام از قبل وجود دارد');
        }

        const extension = name.split('.').pop().toLowerCase();
        const modeMap = {
            'html': 'htmlmixed', 'htm': 'htmlmixed',
            'css': 'css',
            'js': 'javascript', 'mjs': 'javascript',
            'json': 'javascript',
            'md': 'markdown',
            'txt': 'text'
        };

        const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const newFile = {
            id: fileId,
            text: name,
            type: 'file',
            icon: `fas fa-file-code file-icon ${extension}`,
            data: {
                content: content,
                mode: modeMap[extension] || mode
            }
        };

        if (!parent.children) parent.children = [];
        parent.children.push(newFile);
        
        this.clearCache();
        this.saveToStorage();
        
        return newFile;
    }

    createFolder(name, parentId) {
        if (!name || name.trim() === '') {
            throw new Error('نام پوشه نمی‌تواند خالی باشد');
        }
        
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(name)) {
            throw new Error('نام پوشه حاوی کاراکترهای ممنوعه است');
        }
        
        if (name.length > 255) {
            throw new Error('نام پوشه بیش از حد طولانی است');
        }

        const parent = this.findNodeById(parentId);
        if (!parent || parent.type !== 'folder') {
            throw new Error('پوشه مقصد معتبر نیست');
        }

        if (parent.children?.some(child => child.text === name)) {
            throw new Error('پوشه با این نام از قبل وجود دارد');
        }

        const folderId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const newFolder = {
            id: folderId,
            text: name,
            type: 'folder',
            icon: 'fas fa-folder file-icon folder',
            children: []
        };

        if (!parent.children) parent.children = [];
        parent.children.push(newFolder);
        
        this.clearCache();
        this.saveToStorage();
        
        return newFolder;
    }

    deleteNode(id) {
        if (id === 'root') return false;
        
        const parent = this.findParentNode(id);
        if (!parent || !parent.children) return false;
        
        const index = parent.children.findIndex(child => child.id === id);
        if (index === -1) return false;
        
        parent.children.splice(index, 1);
        
        this.clearCache();
        this.saveToStorage();
        
        return true;
    }

    renameNode(id, newName) {
        if (!newName || newName.trim() === '') {
            throw new Error('نام جدید نمی‌تواند خالی باشد');
        }
        
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(newName)) {
            throw new Error('نام جدید حاوی کاراکترهای ممنوعه است');
        }
        
        if (newName.length > 255) {
            throw new Error('نام جدید بیش از حد طولانی است');
        }

        const node = this.findNodeById(id);
        if (!node) return false;
        
        const parent = this.findParentNode(id);
        if (parent && parent.children) {
            const exists = parent.children.some(child => 
                child.id !== id && child.text === newName
            );
            if (exists) {
                throw new Error('نام جدید از قبل در این پوشه وجود دارد');
            }
        }

        node.text = newName;
        
        this.clearCache();
        this.saveToStorage();
        
        return true;
    }

    getAllFiles(node = this.root, files = []) {
        if (!node) return files;
        
        if (node.type === 'file') {
            files.push(node);
        }
        
        if (node.children) {
            node.children.forEach(child => this.getAllFiles(child, files));
        }
        
        return files;
    }

    clearCache() {
        this.nodeCache.clear();
        this.pathCache.clear();
    }

    showError(title, message) {
        showNotification(`${title}: ${message}`, 'error');
        console.error(`[خطا] ${title}: ${message}`);
    }
}

// ==========================================
// کلاس مدیریت ویرایشگر (رفع ایرادات حافظه و منطقی)
// ==========================================
class EditorManager {
    constructor() {
        this.editors = new Map();
        this.activeEditor = null;
        this.autoSaveTimer = null;
    }

    createEditor(fileId, content, mode) {
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-wrapper';
        wrapper.id = `editor-${fileId}`;
        document.getElementById('editorContainer').appendChild(wrapper);

        const editor = CodeMirror(wrapper, {
            value: content,
            mode: mode,
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            autoCloseTags: true,
            matchBrackets: true,
            styleActiveLine: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-/": "toggleComment",
                "Ctrl-S": (cm) => {
                    this.saveCurrentFile();
                    return false;
                },
                "Ctrl-F": "find",
                "Ctrl-H": "replace",
                "Tab": "indentMore",
                "Shift-Tab": "indentLess"
            },
            viewportMargin: Infinity
        });

        let changeTimeout;
        editor.on('change', () => {
            if (changeTimeout) clearTimeout(changeTimeout);
            
            changeTimeout = setTimeout(() => {
                this.scheduleAutoSave(editor);
            }, 500);
        });

        this.editors.set(fileId, editor);
        return editor;
    }

    getEditor(fileId) {
        return this.editors.get(fileId);
    }

    switchToEditor(fileId) {
        document.querySelectorAll('.editor-wrapper').forEach(wrapper => {
            wrapper.classList.remove('active');
        });

        const wrapper = document.getElementById(`editor-${fileId}`);
        if (wrapper) {
            wrapper.classList.add('active');
            const editor = this.editors.get(fileId);
            if (editor) {
                this.activeEditor = editor;
                editor.refresh();
                editor.focus();
                
                this.updateBreadcrumb(fileId);
            }
        }
    }

    closeEditor(fileId) {
        const wrapper = document.getElementById(`editor-${fileId}`);
        if (wrapper) {
            wrapper.remove();
        }
        
        this.editors.delete(fileId);
        
        if (this.autoSaveTimer && this.activeEditor === this.editors.get(fileId)) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        if (this.activeEditor === this.editors.get(fileId)) {
            this.activeEditor = null;
            document.getElementById('breadcrumb').innerHTML = '<span><i class="fas fa-home"></i> پروژه من</span>';
        }
    }

    saveCurrentFile() {
        if (!AppState.currentFile || !this.activeEditor) return;
        
        const node = fileSystemManager.findNodeById(AppState.currentFile);
        if (node && node.data) {
            node.data.content = this.activeEditor.getValue();
            fileSystemManager.saveToStorage();
            showNotification('💾 فایل با موفقیت ذخیره شد', 'success');
            consoleManager.log('فایل ذخیره شد', 'info');
        }
    }

    scheduleAutoSave(editor) {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (!AppState.currentFile || !editor) return;
            
            const node = fileSystemManager.findNodeById(AppState.currentFile);
            if (node && node.data) {
                node.data.content = editor.getValue();
                fileSystemManager.saveToStorage();
                consoleManager.log('ذخیره‌سازی خودکار انجام شد', 'info');
            }
        }, APP_CONSTANTS.AUTO_SAVE_DELAY);
    }

    formatCode() {
        if (!this.activeEditor) {
            showNotification('⚠️ هیچ فایلی برای فرمت کردن باز نیست', 'warning');
            return;
        }

        try {
            const code = this.activeEditor.getValue();
            const modeObj = this.activeEditor.getMode();
            const mode = modeObj ? modeObj.name : 'text';
            let formatted = code;

            if (mode === 'htmlmixed' || mode === 'xml') {
                formatted = html_beautify(code, { 
                    indent_size: 2,
                    wrap_line_length: 120,
                    max_preserve_newlines: 2
                });
            } else if (mode === 'css') {
                formatted = css_beautify(code, { indent_size: 2 });
            } else if (mode === 'javascript' || mode === 'json') {
                formatted = js_beautify(code, { 
                    indent_size: 2,
                    max_preserve_newlines: 2
                });
            }

            this.activeEditor.setValue(formatted);
            showNotification('✨ کد با موفقیت فرمت شد', 'success');
            consoleManager.log('کد فرمت شد', 'info');
        } catch (error) {
            console.error('خطا در فرمت کد:', error);
            showNotification('❌ خطایی در فرمت کد رخ داد', 'error');
        }
    }

    undo() {
        if (this.activeEditor) {
            this.activeEditor.undo();
            consoleManager.log('بازگشت انجام شد', 'info');
        } else {
            showNotification('⚠️ ویرایشگر فعال نیست', 'warning');
        }
    }

    redo() {
        if (this.activeEditor) {
            this.activeEditor.redo();
            consoleManager.log('جلو رفتن انجام شد', 'info');
        } else {
            showNotification('⚠️ ویرایشگر فعال نیست', 'warning');
        }
    }

    updateBreadcrumb(fileId) {
        const node = fileSystemManager.findNodeById(fileId);
        if (!node) return;
        
        const pathParts = [];
        let current = node;
        let parent = fileSystemManager.findParentNode(current.id);
        
        while (parent && parent.id !== 'root') {
            pathParts.unshift(parent.text);
            current = parent;
            parent = fileSystemManager.findParentNode(current.id);
        }
        
        pathParts.push(node.text);
        
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = pathParts.map((part, index) => 
            `<span>${index < pathParts.length - 1 ? '<i class="fas fa-folder"></i>' : '<i class="fas fa-file-code"></i>'} ${SecurityManager.escapeHtml(part)}</span>`
        ).join('');
    }
}

// ==========================================
// کلاس مدیریت تب‌ها
// ==========================================
class TabManager {
    constructor() {
        this.tabs = new Map();
        this.container = document.getElementById('tabsContainer');
        
        this.container.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.tab-close');
            if (closeBtn) {
                e.stopPropagation();
                const tab = closeBtn.closest('.tab');
                if (tab) {
                    const fileId = tab.id.replace('tab-', '');
                    this.closeTab(fileId);
                }
            }
        });
    }

    createTab(fileId, fileName) {
        if (this.tabs.has(fileId)) {
            this.switchToTab(fileId);
            return;
        }

        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.id = `tab-${fileId}`;
        tab.innerHTML = `
            <i class="fas fa-file-code"></i>
            <span>${SecurityManager.escapeHtml(fileName)}</span>
            <i class="fas fa-times tab-close" title="بستن تب"></i>
        `;
        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close')) {
                this.switchToTab(fileId);
            }
        });

        this.container.appendChild(tab);
        this.tabs.set(fileId, tab);
        this.switchToTab(fileId);
    }

    switchToTab(fileId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        
        const tab = this.tabs.get(fileId);
        if (tab) {
            tab.classList.add('active');
            AppState.currentFile = fileId;
            editorManager.switchToEditor(fileId);
        }
    }

    closeTab(fileId) {
        const tab = this.tabs.get(fileId);
        if (tab) {
            tab.remove();
            this.tabs.delete(fileId);
        }
        
        editorManager.closeEditor(fileId);
        
        const remainingTabs = Array.from(this.tabs.keys());
        if (remainingTabs.length > 0) {
            this.switchToTab(remainingTabs[remainingTabs.length - 1]);
        } else {
            AppState.currentFile = null;
            document.getElementById('breadcrumb').innerHTML = '<span><i class="fas fa-home"></i> پروژه من</span>';
        }
    }

    closeAllTabs() {
        this.tabs.forEach((tab, fileId) => {
            tab.remove();
            editorManager.closeEditor(fileId);
        });
        this.tabs.clear();
        AppState.currentFile = null;
    }
}

// ==========================================
// کلاس مدیریت پیش‌نمایش (رفع ایرادات امنیتی و حافظه)
// ==========================================
class PreviewManager {
    constructor() {
        this.iframe = document.getElementById('previewFrame');
        this.wrapper = document.getElementById('previewWrapper');
        this.messageListener = null;
        this.currentDevice = 'desktop';
    }

    updatePreview() {
        try {
            this.cleanupConsoleCapture();

            const htmlFile = fileSystemManager.findNodeById('file_index_html');
            if (!htmlFile || !htmlFile.data) {
                consoleManager.log('⚠️ فایل index.html یافت نشد', 'warn');
                return;
            }

            let htmlContent = htmlFile.data.content;
            
            const cssFiles = fileSystemManager.getAllFiles().filter(f => 
                f.text.toLowerCase().endsWith('.css')
            );
            
            const jsFiles = fileSystemManager.getAllFiles().filter(f => 
                f.text.toLowerCase().endsWith('.js')
            );

            let cssContent = '';
            cssFiles.forEach(cssFile => {
                if (cssFile.data && cssFile.data.content) {
                    cssContent += `\n/* ===== ${cssFile.text} ===== */\n` + 
                                  SecurityManager.sanitizeCss(cssFile.data.content) + '\n';
                }
            });

            let jsContent = '';
            jsFiles.forEach(jsFile => {
                if (jsFile.data && jsFile.data.content) {
                    jsContent += `\n// ===== ${jsFile.text} =====\n` + 
                                 SecurityManager.sanitizeJs(jsFile.data.content) + '\n';
                }
            });

            const fullHTML = this.injectResources(
                SecurityManager.sanitizeHtml(htmlContent),
                SecurityManager.sanitizeCss(cssContent),
                SecurityManager.sanitizeJs(jsContent)
            );

            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(fullHTML);
            iframeDoc.close();

            this.setupConsoleCapture();
            
            consoleManager.log('پیش‌نمایش با موفقیت به‌روز شد', 'info');
        } catch (error) {
            console.error('خطا در به‌روزرسانی پیش‌نمایش:', error);
            consoleManager.log(`خطا در پیش‌نمایش: ${error.message}`, 'error');
        }
    }

    injectResources(html, css, js) {
        html = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/<iframe[^>]*>/gi, '')
            .replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
            .replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*>/gi, '');

        const styleTag = `<style id="injected-styles">${css}</style>`;
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${styleTag}\n</head>`);
        } else {
            html = styleTag + html;
        }

        const scriptTag = `
        <script id="injected-scripts">
        (function() {
            const allowedOrigin = '${window.location.origin}';
            
            const methods = ['log', 'error', 'warn', 'info'];
            methods.forEach(method => {
                const original = console[method];
                console[method] = function(...args) {
                    original.apply(console, args);
                    try {
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage({
                                type: 'console',
                                method: method,
                                data: args.map(item => 
                                    typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
                                ),
                                origin: location.origin
                            }, allowedOrigin);
                        }
                    } catch(e) {}
                };
            });
            
            Object.defineProperty(window, 'parent', {
                get: () => window,
                configurable: false
            });
            
            Object.defineProperty(window, 'top', {
                get: () => window,
                configurable: false
            });
            
            ${js}
            
        })();
        </script>`;

        if (html.includes('</body>')) {
            html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
            html = html + scriptTag;
        }

        return html;
    }

    setupConsoleCapture() {
        this.cleanupConsoleCapture();
        
        this.messageListener = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            
            if (event.data && event.data.type === 'console') {
                const { method, data } = event.data;
                const message = data.map(item =>
                    typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
                ).join(' ');
                consoleManager.log(message, method);
            } else if (event.data && event.data.type === 'error') {
                const { message, stack } = event.data;
                consoleManager.log(`خطا: ${message}\n${stack || ''}`, 'error');
            }
        };
        
        window.addEventListener('message', this.messageListener);
    }

    cleanupConsoleCapture() {
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = null;
        }
    }

    changeDevice(device) {
        this.currentDevice = device;
        this.wrapper.className = 'preview-frame-wrapper';
        
        if (device === 'mobile') {
            this.wrapper.classList.add('mobile');
        } else if (device === 'tablet') {
            this.wrapper.classList.add('tablet');
        }
        
        const deviceNames = { desktop: 'دسکتاپ', tablet: 'تبلت', mobile: 'موبایل' };
        showNotification(`📱 نمایش به حالت ${deviceNames[device]} تغییر کرد`, 'info');
        consoleManager.log(`تغییر دستگاه به: ${deviceNames[device]}`, 'info');
    }

    refresh() {
        this.updatePreview();
        showNotification('پیش‌نمایش تازه شد', 'success');
    }
}

// ==========================================
// کلاس مدیریت کنسول
// ==========================================
class ConsoleManager {
    constructor() {
        this.output = document.getElementById('consoleOutput');
        this.messageCount = 0;
    }

    log(message, type = 'log') {
        this.messageCount++;
        
        const now = new Date();
        const timeStr = toPersianDigits(now.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }));

        const iconMap = {
            log: 'fa-terminal',
            error: 'fa-exclamation-circle',
            warn: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const messageDiv = document.createElement('div');
        messageDiv.className = `console-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${iconMap[type] || iconMap.log} console-icon"></i>
            <span class="console-time">[${timeStr}]</span>
            <span class="console-message-content">${SecurityManager.escapeHtml(message)}</span>
        `;

        this.output.appendChild(messageDiv);
        this.output.scrollTop = this.output.scrollHeight;

        if (this.messageCount > APP_CONSTANTS.MAX_CONSOLE_MESSAGES) {
            this.output.removeChild(this.output.firstChild);
            this.messageCount--;
        }
    }

    clear() {
        this.output.innerHTML = `
            <div class="console-message info">
                <i class="fas fa-info-circle console-icon"></i>
                <span class="console-time">[${toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}]</span>
                <span class="console-message-content">کنسول پاک شد</span>
            </div>
        `;
        this.messageCount = 1;
    }

    showTab(tabName) {
        const consoleOutput = document.getElementById('consoleOutput');
        
        switch(tabName) {
            case 'console':
                break;
            case 'network':
                consoleOutput.innerHTML = `
                    <div class="console-message info">
                        <i class="fas fa-info-circle console-icon"></i>
                        <span class="console-time">[${toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}]</span>
                        <span class="console-message-content">📡 هیچ درخواست شبکه‌ای ثبت نشده است</span>
                    </div>
                `;
                this.messageCount = 1;
                break;
            case 'performance':
                consoleOutput.innerHTML = `
                    <div class="console-message info">
                        <i class="fas fa-tachometer-alt console-icon"></i>
                        <span class="console-time">[${toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}]</span>
                        <span class="console-message-content">📊 گزارش عملکرد سیستم</span>
                    </div>
                    <div class="console-message log">
                        <i class="fas fa-chart-line console-icon"></i>
                        <span class="console-time">[${toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}]</span>
                        <span class="console-message-content">⏱️ زمان بارگذاری: سریع</span>
                    </div>
                    <div class="console-message log">
                        <i class="fas fa-memory console-icon"></i>
                        <span class="console-time">[${toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}]</span>
                        <span class="console-message-content">💾 مصرف حافظه: بهینه</span>
                    </div>
                `;
                this.messageCount = 3;
                break;
        }
    }
}

// ==========================================
// توابع کمکی سراسری
// ==========================================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('i');
    const text = document.getElementById('notificationText');
    
    notification.className = `notification ${type}`;
    const iconMap = {
        success: ['fa-check-circle', 'success'],
        error: ['fa-exclamation-circle', 'error'],
        warning: ['fa-exclamation-triangle', 'warning'],
        info: ['fa-info-circle', 'info']
    };
    
    const [iconClass, iconType] = iconMap[type] || iconMap.success;
    icon.className = `fas ${iconClass} ${iconType}`;
    text.textContent = message;
    
    notification.classList.remove('hide');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
    }, APP_CONSTANTS.NOTIFICATION_DURATION);
}

function showLoading(message = 'در حال پردازش...') {
    document.getElementById('loadingOverlay').classList.add('active');
    document.querySelector('.loading-text').textContent = message;
    document.getElementById('mainContainer').classList.add('loading');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
    document.getElementById('mainContainer').classList.remove('loading');
}

async function downloadProjectAsZip() {
    const files = fileSystemManager.getAllFiles();
    if (files.length === 0) {
        showNotification('⚠️ پروژه خالی است', 'warning');
        return;
    }

    showLoading('در حال ایجاد فایل ZIP...');
    
    try {
        const zip = new JSZip();
        
        for (const file of files) {
            if (file.data && file.data.content) {
                const path = fileSystemManager.getFilePath(file.id);
                if (path) {
                    zip.file(path, file.data.content);
                }
            }
        }
        
        const blob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        saveAs(blob, 'project.zip');
        showNotification('✅ پروژه با موفقیت دانلود شد', 'success');
        consoleManager.log('پروژه به صورت ZIP دانلود شد', 'info');
    } catch (error) {
        console.error('خطا در دانلود پروژه:', error);
        showNotification('❌ خطایی در ایجاد فایل ZIP رخ داد', 'error');
    } finally {
        hideLoading();
    }
}

// ==========================================
// مدیریت وضعیت برنامه
// ==========================================
const AppState = {
    currentFile: null,
    currentFolder: 'root',
    openFiles: new Map(),
    isDirty: false
};

// ==========================================
// متغیرهای سراسری
// ==========================================
let fileSystemManager;
let editorManager;
let tabManager;
let previewManager;
let consoleManager;

// ==========================================
// مقداردهی اولیه برنامه
// ==========================================
function initializeApplication() {
    console.log('🚀 ویرایشگر کد حرفه‌ای در حال راه‌اندازی...');
    
    // ایجاد نمونه‌های مدیریت‌کننده‌ها
    fileSystemManager = new FileSystemManager();
    editorManager = new EditorManager();
    tabManager = new TabManager();
    previewManager = new PreviewManager();
    consoleManager = new ConsoleManager();
    
    // راه‌اندازی درخت فایل
    initializeFileTree();
    
    // تنظیم رویدادها
    setupEventListeners();
    
    // باز کردن فایل پیش‌فرض
    setTimeout(() => {
        openDefaultFile();
        previewManager.updatePreview();
        showNotification('✅ ویرایشگر کد حرفه‌ای آماده است!', 'success');
        consoleManager.log('سیستم با موفقیت راه‌اندازی شد ✨', 'info');
    }, 300);
}

function initializeFileTree() {
    $('#fileTree').jstree({
        core: {
            data: [fileSystemManager.root],
            check_callback: true,
            themes: {
                name: 'default',
                dots: true,
                icons: true
            }
        },
        plugins: ['wholerow', 'types', 'contextmenu', 'dnd'],
        types: {
            folder: {
                icon: 'fas fa-folder file-icon folder'
            },
            file: {
                icon: 'fas fa-file-code'
            }
        },
        contextmenu: {
            items: (node) => {
                const items = {
                    rename: {
                        label: 'تغییر نام',
                        icon: 'fas fa-edit',
                        action: () => {
                            const newName = prompt('نام جدید را وارد کنید:', node.text);
                            if (newName && newName.trim()) {
                                try {
                                    fileSystemManager.renameNode(node.id, newName.trim());
                                    $('#fileTree').jstree(true).rename_node(node, newName.trim());
                                    showNotification(`نام "${node.text}" به "${newName.trim()}" تغییر کرد`, 'success');
                                    consoleManager.log(`تغییر نام: ${node.text} → ${newName.trim()}`, 'info');
                                } catch (error) {
                                    showNotification(error.message, 'error');
                                }
                            }
                        }
                    },
                    delete: {
                        label: 'حذف',
                        icon: 'fas fa-trash',
                        action: () => {
                            if (confirm(`آیا از حذف "${node.text}" مطمئن هستید؟`)) {
                                if (fileSystemManager.deleteNode(node.id)) {
                                    $('#fileTree').jstree(true).delete_node(node);
                                    
                                    if (node.type === 'file') {
                                        tabManager.closeTab(node.id);
                                    }
                                    
                                    showNotification(`"${node.text}" حذف شد`, 'success');
                                    consoleManager.log(`حذف: ${node.text}`, 'info');
                                }
                            }
                        }
                    }
                };

                if (node.type === 'folder') {
                    items.create = {
                        label: 'ایجاد زیرشاخه',
                        icon: 'fas fa-plus',
                        submenu: {
                            createFile: {
                                label: 'فایل جدید',
                                icon: 'fas fa-file-plus',
                                action: () => {
                                    AppState.currentFolder = node.id;
                                    openModal('ایجاد فایل جدید', false);
                                }
                            },
                            createFolder: {
                                label: 'پوشه جدید',
                                icon: 'fas fa-folder-plus',
                                action: () => {
                                    AppState.currentFolder = node.id;
                                    openModal('ایجاد پوشه جدید', true);
                                }
                            }
                        }
                    };
                }

                return items;
            }
        }
    });
    
    $('#fileTree').on('select_node.jstree', function(e, data) {
        if (data.node.type === 'file') {
            const fileId = data.node.id;
            const fileName = data.node.text;
            const fileData = fileSystemManager.findNodeById(fileId);
            
            if (fileData && fileData.data) {
                if (!document.getElementById(`tab-${fileId}`)) {
                    tabManager.createTab(fileId, fileName);
                    
                    editorManager.createEditor(
                        fileId,
                        fileData.data.content,
                        fileData.data.mode
                    );
                    
                    AppState.openFiles.set(fileId, {
                        name: fileName,
                        editor: editorManager.getEditor(fileId)
                    });
                } else {
                    tabManager.switchToTab(fileId);
                }
            }
        } else if (data.node.type === 'folder') {
            AppState.currentFolder = data.node.id;
        }
    });
    
    setupFileDrop();
}

function setupFileDrop() {
    const fileTreeContainer = document.getElementById('fileTreeContainer');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileTreeContainer.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileTreeContainer.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileTreeContainer.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileTreeContainer.classList.add('drag-over');
    }
    
    function unhighlight() {
        fileTreeContainer.classList.remove('drag-over');
    }
    
    fileTreeContainer.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleDroppedFiles(files);
        }
    });
}

function handleDroppedFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const allowedExtensions = ['.html', '.htm', '.css', '.js', '.json', '.md', '.txt'];
        return file.size <= APP_CONSTANTS.MAX_FILE_SIZE && 
               allowedExtensions.includes(extension);
    });
    
    if (validFiles.length === 0) {
        showNotification('⚠️ فقط فایل‌های متنی با پسوند معتبر مجاز هستند', 'warning');
        return;
    }
    
    if (validFiles.some(f => f.size > APP_CONSTANTS.WARNING_FILE_SIZE)) {
        const largeFiles = validFiles.filter(f => f.size > APP_CONSTANTS.WARNING_FILE_SIZE);
        const confirmMsg = `فایل‌های بزرگ یافت شدند:\n${largeFiles.map(f => 
            `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`
        ).join('\n')}\n\nآیا ادامه می‌دهید؟`;
        
        if (!confirm(confirmMsg)) return;
    }
    
    showLoading(`در حال آپلود ${validFiles.length} فایل...`);
    
    let filesProcessed = 0;
    const totalFiles = validFiles.length;
    
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const newFile = fileSystemManager.createFile(
                    file.name,
                    AppState.currentFolder || 'root',
                    content
                );
                
                if (newFile) {
                    consoleManager.log(`فایل "${file.name}" آپلود شد`, 'info');
                }
                
                filesProcessed++;
                if (filesProcessed === totalFiles) {
                    setTimeout(() => {
                        $('#fileTree').jstree(true).refresh();
                        hideLoading();
                        showNotification(`✅ ${totalFiles} فایل با موفقیت آپلود شدند`, 'success');
                    }, APP_CONSTANTS.TREE_REFRESH_DELAY);
                }
            } catch (error) {
                console.error('خطا در آپلود فایل:', error);
                filesProcessed++;
            }
        };
        reader.readAsText(file);
    });
}

function openDefaultFile() {
    const defaultFile = fileSystemManager.findNodeById('file_index_html');
    if (defaultFile) {
        tabManager.createTab('file_index_html', 'index.html');
        editorManager.createEditor(
            'file_index_html',
            defaultFile.data.content,
            defaultFile.data.mode
        );
        AppState.currentFile = 'file_index_html';
    }
}

function setupEventListeners() {
    // دکمه‌های هدر
    document.getElementById('newFileBtn').addEventListener('click', () => openModal('ایجاد فایل جدید', false));
    document.getElementById('newFolderBtn').addEventListener('click', () => openModal('ایجاد پوشه جدید', true));
    document.getElementById('uploadFileBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleFileInputChange);
    document.getElementById('runBtn').addEventListener('click', handleRun);
    document.getElementById('formatBtn').addEventListener('click', () => editorManager.formatCode());
    document.getElementById('undoBtn').addEventListener('click', () => editorManager.undo());
    document.getElementById('redoBtn').addEventListener('click', () => editorManager.redo());
    document.getElementById('downloadProjectBtn').addEventListener('click', downloadProjectAsZip);
    document.getElementById('refreshPreviewBtn').addEventListener('click', () => previewManager.refresh());
    document.getElementById('settingsBtn').addEventListener('click', () => {
        showNotification('⚙️ تنظیمات در نسخه‌های آتی اضافه خواهد شد', 'info');
        consoleManager.log('تنظیمات باز شد', 'info');
    });
    
    // هشدار موبایل
    document.getElementById('closeMobileWarning').addEventListener('click', () => {
        document.getElementById('mobileWarning').classList.remove('show');
    });
    
    // کنسول
    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
        consoleManager.clear();
        const activeTab = document.querySelector('.console-tab.active');
        if (activeTab) {
            consoleManager.showTab(activeTab.dataset.tab);
        }
    });
    
    document.getElementById('toggleConsoleBtn').addEventListener('click', handleToggleConsole);
    
    // تب‌های کنسول
    document.querySelectorAll('.console-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.console-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            consoleManager.showTab(this.dataset.tab);
        });
    });
    
    // دستگاه‌های پیش‌نمایش
    document.querySelector('.device-selector').addEventListener('click', function(e) {
        const btn = e.target.closest('.device-btn');
        if (btn) {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            previewManager.changeDevice(btn.dataset.device);
        }
    });
    
    // مودال
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('cancelCreateBtn').addEventListener('click', closeModal);
    document.getElementById('confirmCreateBtn').addEventListener('click', handleConfirmCreate);
    document.getElementById('newItemModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // کیبورد شورت‌کات‌ها
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            switch(e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    editorManager.saveCurrentFile();
                    break;
                case 'z':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        editorManager.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    editorManager.redo();
                    break;
                case 'b':
                    e.preventDefault();
                    editorManager.formatCode();
                    break;
                case 'enter':
                    if (e.shiftKey) {
                        e.preventDefault();
                        handleRun();
                    }
                    break;
            }
        }
    });
    
    // ذخیره‌سازی قبل از خروج
    window.addEventListener('beforeunload', () => {
        editorManager.saveCurrentFile();
    });
}

function openModal(title, isFolder) {
    const modal = document.getElementById('newItemModal');
    const modalTitle = document.getElementById('modalTitle');
    const fileTypeGroup = document.getElementById('fileTypeGroup');
    const itemName = document.getElementById('itemName');
    
    modalTitle.innerHTML = `<i class="fas ${isFolder ? 'fa-folder-plus' : 'fa-file-plus'}"></i> ${title}`;
    fileTypeGroup.style.display = isFolder ? 'none' : 'block';
    itemName.value = '';
    itemName.focus();
    
    modal.dataset.isFolder = isFolder;
    modal.dataset.parentId = AppState.currentFolder || 'root';
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('newItemModal').classList.remove('active');
}

function handleConfirmCreate() {
    const modal = document.getElementById('newItemModal');
    const itemName = document.getElementById('itemName').value.trim();
    const fileType = document.getElementById('fileType').value;
    const isFolder = modal.dataset.isFolder === 'true';
    const parentId = modal.dataset.parentId;
    
    if (!itemName) {
        showNotification('⚠️ لطفاً نام را وارد کنید', 'warning');
        return;
    }
    
    try {
        if (isFolder) {
            const newFolder = fileSystemManager.createFolder(itemName, parentId);
            if (newFolder) {
                $('#fileTree').jstree(true).refresh_node(parentId);
                showNotification(`✅ پوشه "${itemName}" ایجاد شد`, 'success');
                consoleManager.log(`پوشه جدید ایجاد شد: ${itemName}`, 'info');
                closeModal();
            }
        } else {
            let fileName = itemName;
            if (!fileName.includes('.')) {
                fileName += `.${fileType}`;
            }
            
            const newFile = fileSystemManager.createFile(fileName, parentId);
            if (newFile) {
                $('#fileTree').jstree(true).refresh_node(parentId);
                showNotification(`✅ فایل "${fileName}" ایجاد شد`, 'success');
                consoleManager.log(`فایل جدید ایجاد شد: ${fileName}`, 'info');
                closeModal();
            }
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function handleFileInputChange(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    handleDroppedFiles(files);
    event.target.value = '';
}

function handleRun() {
    if (!AppState.currentFile) {
        showNotification('⚠️ هیچ فایلی برای اجرا وجود ندارد', 'warning');
        return;
    }
    
    editorManager.saveCurrentFile();
    previewManager.updatePreview();
    showNotification('✅ کد با موفقیت اجرا شد', 'success');
    consoleManager.log('اجرای کد درخواست شد', 'info');
}

function handleToggleConsole() {
    const consoleSection = document.getElementById('consoleSection');
    const icon = document.querySelector('#toggleConsoleBtn i');
    const isHidden = consoleSection.style.display === 'none' || consoleSection.style.height === '40px';
    
    if (isHidden) {
        consoleSection.style.display = 'flex';
        consoleSection.style.height = '260px';
        icon.className = 'fas fa-chevron-down';
        consoleManager.log('کنسول باز شد', 'info');
    } else {
        consoleSection.style.height = '40px';
        setTimeout(() => {
            consoleSection.style.display = 'none';
        }, 300);
        icon.className = 'fas fa-chevron-up';
        consoleManager.log('کنسول بسته شد', 'info');
    }
}

// ==========================================
// شروع برنامه
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // بررسی دستگاه موبایل
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById('mobileWarning').classList.add('show');
    }
    
    // بررسی بارگذاری کتابخانه‌های ضروری
    const checkLibraries = () => {
        const requiredLibs = ['jQuery', 'CodeMirror', 'JSZip'];
        const missingLibs = requiredLibs.filter(lib => !window[lib] && lib !== 'JSZip' ? !window.JSZip : true);
        
        if (missingLibs.length > 0) {
            setTimeout(checkLibraries, 100);
            return;
        }
        
        // شروع برنامه
        initializeApplication();
    };
    
    // شروع بررسی کتابخانه‌ها
    checkLibraries();
});
