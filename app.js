/**
 * Elite Investors - التطبيق الرئيسي
 * نسخة متطورة مع دعم نظام الإحالة (50$ + 20$) وإدارة المستخدمين
 */

class InvestmentApp {
    constructor() {
        this.user = null;
        this.version = '2.0.0';
        this.apiBase = '';
        this.debug = true;
        this.init();
    }
    
    /**
     * تهيئة التطبيق
     */
    init() {
        this.log('🚀 بدء تشغيل التطبيق v' + this.version);
        this.checkAuth();
        this.setupEventListeners();
        this.loadUserData();
        this.initAnimations();
        this.initServiceWorker();
        this.checkUrlReferral();
    }
    
    /**
     * التحقق من صلاحية المستخدم
     */
    checkAuth() {
        try {
            const userData = localStorage.getItem('current_user');
            if (userData) {
                this.user = JSON.parse(userData);
                
                // التحقق من حالة المستخدم
                if (this.user.status === 'banned') {
                    this.log('⚠️ مستخدم محظور: ' + this.user.email);
                    this.showNotification('❌ حسابك محظور. يرجى التواصل مع الدعم الفني.', 'error');
                    this.logout(true);
                    return;
                }
                
                this.log('👤 مستخدم نشط: ' + (this.user.name || this.user.email));
                this.updateAuthUI();
            }
        } catch (e) {
            console.error('خطأ في التحقق من المصادقة:', e);
            this.logout(true);
        }
    }
    
    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // مستمع لتحديثات البيانات
        window.addEventListener('data-updated', (event) => {
            this.log('📡 تحديث: ' + event.detail.type);
            this.handleDataUpdate(event.detail.type);
        });
        
        // مستمع لحفظ البيانات قبل إغلاق الصفحة
        window.addEventListener('beforeunload', () => {
            if (this.user) {
                this.saveUserData();
            }
        });
        
        // مستمع لتغيير حالة الاتصال
        window.addEventListener('online', () => {
            this.showNotification('✅ تم استعادة الاتصال بالإنترنت', 'success');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
        });
    }
    
    /**
     * تحميل بيانات المستخدم
     */
    loadUserData() {
        if (this.user) {
            this.updateUserStats();
            this.loadUserReferralStats();
        }
    }
    
    /**
     * تحميل إحصائيات الإحالة للمستخدم
     */
    loadUserReferralStats() {
        if (!this.user) return;
        
        try {
            const stats = window.sharedData?.getReferralStats(this.user.id);
            if (stats) {
                this.user.referralStats = stats;
                
                // إنشاء كود إحالة إذا لم يكن موجوداً
                if (!this.user.referralCode && stats.referralCode) {
                    this.user.referralCode = stats.referralCode;
                    this.saveUserData();
                }
            }
        } catch (e) {
            console.error('خطأ في تحميل إحصائيات الإحالة:', e);
        }
    }
    
    /**
     * التحقق من وجود كود إحالة في الرابط
     */
    checkUrlReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode && !this.user) {
            this.log('📨 كود إحالة في الرابط: ' + refCode);
            
            // تخزين الكود في sessionStorage للاستخدام عند التسجيل
            sessionStorage.setItem('pending_referral', refCode);
            
            // عرض رسالة للمستخدم
            setTimeout(() => {
                this.showNotification('🎁 لديك كود إحالة! سجل الآن واحصل على 20$', 'success');
            }, 1000);
        }
    }
    
    /**
     * معالجة تحديث البيانات
     */
    handleDataUpdate(type) {
        switch(type) {
            case 'users':
                this.refreshUserData();
                break;
            case 'packages':
                this.refreshPackages();
                break;
            case 'tasks':
                this.refreshTasks();
                break;
            case 'referrals':
                this.loadUserReferralStats();
                this.updateReferralUI();
                break;
        }
    }
    
    /**
     * تحديث بيانات المستخدم
     */
    refreshUserData() {
        if (!this.user) return;
        
        try {
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            const updatedUser = users.find(u => u.id === this.user.id);
            
            if (updatedUser) {
                this.user = updatedUser;
                localStorage.setItem('current_user', JSON.stringify(this.user));
                this.updateUserStats();
                this.updateAuthUI();
            }
        } catch (e) {
            console.error('خطأ في تحديث بيانات المستخدم:', e);
        }
    }
    
    /**
     * تحديث الباقات
     */
    refreshPackages() {
        // يمكن تخصيص هذه الدالة حسب الصفحة
        if (typeof loadPackages === 'function') {
            loadPackages();
        }
    }
    
    /**
     * تحديث المهام
     */
    refreshTasks() {
        // يمكن تخصيص هذه الدالة حسب الصفحة
        if (typeof loadUserTasks === 'function') {
            loadUserTasks();
        }
    }
    
    /**
     * تحديث واجهة الإحالة
     */
    updateReferralUI() {
        // يمكن تخصيص هذه الدالة حسب الصفحة
    }
    
    /**
     * تهيئة تأثيرات الحركة
     */
    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated', 'fade-in-up');
                    
                    // إضافة تأثير متدرج للعناصر
                    if (entry.target.classList.contains('stat-card') ||
                        entry.target.classList.contains('package-card') ||
                        entry.target.classList.contains('task-item')) {
                        entry.target.style.animationDelay = Math.random() * 0.3 + 's';
                    }
                }
            });
        }, observerOptions);
        
        // مراقبة العناصر القابلة للحركة
        document.querySelectorAll('.fade-in, .slide-up, .stat-card, .package-card, .task-item, .section').forEach(el => {
            observer.observe(el);
        });
        
        this.log('🎬 تم تهيئة تأثيرات الحركة');
    }
    
    /**
     * تهيئة Service Worker للتخزين المؤقت
     */
    initServiceWorker() {
        if ('serviceWorker' in navigator && location.protocol === 'https:') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(error => {
                    console.log('❌ فشل تسجيل Service Worker:', error);
                });
            });
        }
    }
    
    /**
     * مزامنة البيانات غير المتصلة
     */
    syncOfflineData() {
        const offlineQueue = JSON.parse(localStorage.getItem('offline_queue')) || [];
        
        if (offlineQueue.length > 0) {
            this.log('🔄 مزامنة ' + offlineQueue.length + ' عملية غير متصلة');
            
            offlineQueue.forEach(async (item, index) => {
                try {
                    // معالجة كل عملية حسب نوعها
                    if (item.type === 'complete_task') {
                        // إعادة محاولة إكمال المهمة
                    }
                    
                    // حذف العملية من قائمة الانتظار بعد النجاح
                    offlineQueue.splice(index, 1);
                } catch (e) {
                    console.error('❌ فشل مزامنة العملية:', e);
                }
            });
            
            localStorage.setItem('offline_queue', JSON.stringify(offlineQueue));
        }
    }
    
    /**
     * تحديث واجهة المصادقة
     */
    updateAuthUI() {
        // تحديث أزرار تسجيل الدخول وقائمة المستخدم
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const dropdownName = document.getElementById('dropdownName');
        const dropdownEmail = document.getElementById('dropdownEmail');
        const dropdownPackage = document.getElementById('dropdownPackage');
        
        if (this.user) {
            // إخفاء زر تسجيل الدخول وإظهار قائمة المستخدم
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.classList.add('active');
            
            // تحديث الصورة الرمزية
            if (userAvatar) {
                userAvatar.textContent = this.user.name?.charAt(0).toUpperCase() || 'م';
            }
            
            // تحديث أسماء المستخدم
            if (userName) userName.textContent = this.user.name || 'مستخدم';
            if (userEmail) userEmail.textContent = this.user.email || '';
            if (dropdownName) dropdownName.textContent = this.user.name || 'مستخدم';
            if (dropdownEmail) dropdownEmail.textContent = this.user.email || '';
            
            // تحديث معلومات الباقة في القائمة
            if (dropdownPackage) {
                if (this.user.package) {
                    dropdownPackage.innerHTML = `<span class="badge" style="background: var(--primary);">${this.user.package.name}</span>`;
                } else {
                    dropdownPackage.innerHTML = `<span style="color: #94a3b8;">لا توجد باقة</span>`;
                }
            }
            
            // تحديث حالة المستخدم
            this.updateUserStatusUI();
        } else {
            // إظهار زر تسجيل الدخول وإخفاء قائمة المستخدم
            if (loginBtn) loginBtn.style.display = 'flex';
            if (userMenu) userMenu.classList.remove('active');
        }
    }
    
    /**
     * تحديث واجهة حالة المستخدم
     */
    updateUserStatusUI() {
        if (!this.user) return;
        
        const statusBadge = document.getElementById('userStatusBadge');
        if (!statusBadge) return;
        
        if (this.user.status === 'suspended') {
            statusBadge.className = 'user-status suspended';
            statusBadge.title = 'حساب معلق مؤقتاً';
        } else if (this.user.status === 'banned') {
            statusBadge.className = 'user-status banned';
            statusBadge.title = 'حساب محظور';
        } else {
            statusBadge.className = 'user-status';
            statusBadge.title = 'حساب نشط';
        }
    }
    
    /**
     * تحديث إحصائيات المستخدم
     */
    updateUserStats() {
        if (!this.user) return;
        
        const balanceEl = document.getElementById('user-balance');
        const earnedEl = document.getElementById('total-earned');
        const tasksEl = document.getElementById('tasks-completed');
        const todayProfitEl = document.getElementById('today-profit');
        const withdrawableEl = document.getElementById('withdrawable-balance');
        
        if (balanceEl) balanceEl.textContent = this.formatCurrency(this.user.balance || 0);
        if (earnedEl) earnedEl.textContent = this.formatCurrency(this.user.totalEarned || 0);
        if (tasksEl) tasksEl.textContent = this.user.tasksCompleted || 0;
        if (withdrawableEl) withdrawableEl.textContent = this.formatCurrency(this.user.balance || 0);
        
        // حساب أرباح اليوم
        if (todayProfitEl && this.user.package) {
            const dailyProfit = this.user.package.dailyProfit || 
                (this.user.package.amount * (this.user.package.profit || 2.5) / 100);
            todayProfitEl.textContent = this.formatCurrency(dailyProfit);
        }
    }
    
    /**
     * تسجيل الدخول
     */
    async login(username, password) {
        try {
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            const user = users.find(u => 
                (u.username === username || u.email === username) && 
                u.password === password
            );
            
            if (!user) {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
            
            if (user.status === 'banned') {
                throw new Error('حسابك محظور. يرجى التواصل مع الدعم الفني');
            }
            
            // تحديث آخر تسجيل دخول
            user.lastLogin = new Date().toISOString();
            this.user = user;
            
            // حفظ المستخدم الحالي
            localStorage.setItem('current_user', JSON.stringify(user));
            
            // تحديث قائمة المستخدمين
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex] = user;
                localStorage.setItem('elite_users', JSON.stringify(users));
            }
            
            this.log('✅ تسجيل دخول ناجح: ' + user.email);
            this.updateAuthUI();
            this.updateUserStats();
            
            return { success: true, user };
        } catch (error) {
            this.log('❌ فشل تسجيل الدخول: ' + error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل مستخدم جديد
     */
    async register(userData) {
        try {
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            
            // التحقق من عدم تكرار اسم المستخدم أو البريد
            if (users.some(u => u.username === userData.username)) {
                throw new Error('اسم المستخدم موجود مسبقاً');
            }
            
            if (users.some(u => u.email === userData.email)) {
                throw new Error('البريد الإلكتروني موجود مسبقاً');
            }
            
            if (userData.username.includes(' ')) {
                throw new Error('اسم المستخدم يجب ألا يحتوي على مسافات');
            }
            
            if (userData.password.length < 6) {
                throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            }
            
            if (userData.password !== userData.confirmPassword) {
                throw new Error('كلمتا المرور غير متطابقتين');
            }
            
            // التحقق من صحة كود الإحالة
            let referredBy = null;
            if (userData.referralCode) {
                const referrer = users.find(u => u.referralCode === userData.referralCode);
                if (referrer) {
                    referredBy = userData.referralCode;
                    this.log('✅ تم التحقق من كود الإحالة: ' + userData.referralCode);
                }
            }
            
            // إنشاء مستخدم جديد
            const newUser = {
                id: Date.now(),
                name: userData.name,
                username: userData.username,
                email: userData.email,
                phone: userData.phone,
                password: userData.password,
                referredBy: referredBy,
                referralCode: null,
                balance: 0,
                package: null,
                pendingPackage: null,
                walletAddress: '',
                walletNetwork: 'TRC20',
                tasksCompleted: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
                referralCount: 0,
                referralEarnings: 0,
                referralRewardPaid: false,
                joinedDate: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isAdmin: false,
                status: 'active',
                statusHistory: []
            };
            
            users.push(newUser);
            localStorage.setItem('elite_users', JSON.stringify(users));
            
            // تسجيل الدخول مباشرة
            this.user = newUser;
            localStorage.setItem('current_user', JSON.stringify(newUser));
            
            this.log('✅ تم إنشاء حساب جديد: ' + newUser.email);
            
            return { 
                success: true, 
                user: newUser,
                hasReferral: !!referredBy 
            };
        } catch (error) {
            this.log('❌ فشل إنشاء الحساب: ' + error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل الخروج
     */
    logout(force = false) {
        if (force || confirm('هل تريد تسجيل الخروج؟')) {
            if (this.user) {
                this.user.lastLogout = new Date().toISOString();
                this.saveUserData();
                this.log('👋 تسجيل خروج: ' + this.user.email);
            }
            
            this.user = null;
            localStorage.removeItem('current_user');
            this.updateAuthUI();
            
            this.showNotification('✅ تم تسجيل الخروج بنجاح', 'success');
            
            // إعادة التوجيه إلى الصفحة الرئيسية
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.endsWith('/')) {
                window.location.href = 'index.html';
            }
        }
    }
    
    /**
     * حفظ بيانات المستخدم
     */
    saveUserData() {
        if (!this.user) return;
        
        try {
            const users = JSON.parse(localStorage.getItem('elite_users')) || [];
            const userIndex = users.findIndex(u => u.id === this.user.id);
            
            if (userIndex !== -1) {
                users[userIndex] = this.user;
                localStorage.setItem('elite_users', JSON.stringify(users));
            }
            
            localStorage.setItem('current_user', JSON.stringify(this.user));
            return true;
        } catch (e) {
            console.error('خطأ في حفظ بيانات المستخدم:', e);
            return false;
        }
    }
    
    /**
     * تنسيق العملة
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount).replace('US$', '$').replace('USD', '$');
    }
    
    /**
     * تنسيق التاريخ
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        
        if (format === 'short') {
            return d.toLocaleDateString('ar-SA');
        } else if (format === 'long') {
            return d.toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'time') {
            return d.toLocaleString('ar-SA');
        }
        
        return d.toLocaleDateString('ar-SA');
    }
    
    /**
     * إظهار إشعار
     */
    showNotification(message, type = 'success', duration = 5000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        notification.textContent = `${icon} ${message}`;
        notification.className = 'notification ' + type;
        notification.style.display = 'block';
        
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.style.display = 'none';
        }, duration);
    }
    
    /**
     * تسجيل الأحداث
     */
    log(message, data = null) {
        if (this.debug) {
            const timestamp = new Date().toLocaleTimeString('ar-SA');
            console.log(`[${timestamp}] ${message}`);
            if (data) console.log(data);
        }
    }
    
    /**
     * التحقق من حالة المستخدم
     */
    checkUserAccess() {
        if (!this.user) return false;
        
        if (this.user.status === 'banned') {
            this.showNotification('❌ حسابك محظور. يرجى التواصل مع الدعم الفني.', 'error');
            return false;
        }
        
        if (this.user.status === 'suspended') {
            this.showNotification('⚠️ حسابك معلق مؤقتاً. بعض الخدمات غير متاحة.', 'warning');
            return true;
        }
        
        return true;
    }
    
    /**
     * نسخ نص إلى الحافظة
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('✅ تم النسخ إلى الحافظة', 'success');
            return true;
        } catch (err) {
            console.error('❌ فشل النسخ:', err);
            
            // طريقة بديلة
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            this.showNotification('✅ تم النسخ إلى الحافظة', 'success');
            return true;
        }
    }
}

// ========== دوال مساعدة عامة ==========

/**
 * تبديل عرض الشريط الجانبي
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

/**
 * التمرير إلى قسم معين
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * إظهار إشعار سريع
 */
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

/**
 * تصغير النص الطويل
 */
function truncateText(text, length = 50) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * توليد معرف فريد
 */
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * حفظ البيانات في التخزين المحلي مع انتهاء الصلاحية
 */
function setWithExpiry(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

/**
 * قراءة البيانات مع انتهاء الصلاحية
 */
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
        const item = JSON.parse(itemStr);
        const now = new Date();
        
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    } catch {
        return localStorage.getItem(key);
    }
}

// ========== التهيئة عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء كائن التطبيق العام
    window.app = new InvestmentApp();
    
    // إضافة أنماط CSS إضافية للتأثيرات
    const style = document.createElement('style');
    style.textContent = `
        .animated {
            animation-duration: 0.5s;
            animation-fill-mode: both;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .fade-in-up {
            animation-name: fadeInUp;
        }
        
        .toast-notification {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 9999;
            animation: slideUp 0.3s ease;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            text-align: center;
            font-weight: 500;
        }
        
        .toast-notification.error {
            background: var(--danger);
        }
        
        .toast-notification.warning {
            background: var(--warning);
        }
        
        .toast-notification.info {
            background: var(--secondary);
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(100%);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});

// تصدير للاستخدام العام
window.InvestmentApp = InvestmentApp;
window.toggleSidebar = toggleSidebar;
window.scrollToSection = scrollToSection;
window.showToast = showToast;
window.truncateText = truncateText;
window.generateId = generateId;
window.setWithExpiry = setWithExpiry;
window.getWithExpiry = getWithExpiry;