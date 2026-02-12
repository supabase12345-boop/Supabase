// ===================================
// نظام البيانات المشتركة بين الصفحات - النسخة المتكاملة مع Supabase
// ===================================

// ========== نظام الباقات ==========
let SHARED_PACKAGES = [
    {
        id: 1,
        name: "الباقة الفضية",
        price: 500,
        profit: 2.5,
        dailyProfit: 12.5,
        tasks: 5,
        duration: 30,
        status: "active",
        description: "الباقة المثالية للمبتدئين",
        category: "standard",
        users: 0,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 2,
        name: "الباقة الذهبية",
        price: 1000,
        profit: 2.5,
        dailyProfit: 25,
        tasks: 5,
        duration: 30,
        status: "active",
        description: "الباقة الأكثر طلباً",
        category: "premium",
        users: 0,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 3,
        name: "الباقة الماسية",
        price: 5000,
        profit: 2.5,
        dailyProfit: 125,
        tasks: 5,
        duration: 30,
        status: "active",
        description: "للحصول على أفضل العوائد",
        category: "vip",
        users: 0,
        createdAt: "2024-01-01T00:00:00.000Z"
    }
];

// ========== نظام المهام ==========
let SHARED_TASKS = [
    {
        id: 1,
        title: "مشاهدة فيديو تعليمي",
        description: "شاهد فيديو لمدة 2 دقيقة عن أساسيات الاستثمار",
        reward: 2.5,
        type: "daily",
        status: "active",
        completions: 0,
        availableFor: "all",
        packageCategories: ["standard", "premium", "vip"],
        difficulty: "easy",
        timeRequired: 2,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 2,
        title: "مشاركة رابط الإحالة",
        description: "شارك رابط الإحالة الخاص بك مع صديق واحد على الأقل",
        reward: 5,
        type: "daily",
        status: "active",
        completions: 0,
        availableFor: "all",
        packageCategories: ["premium", "vip"],
        difficulty: "medium",
        timeRequired: 3,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 3,
        title: "تقييم المنصة",
        description: "أكمل استبيان تقييم المنصة (5 أسئلة)",
        reward: 4,
        type: "daily",
        status: "active",
        completions: 0,
        availableFor: "premium",
        packageCategories: ["premium", "vip"],
        difficulty: "easy",
        timeRequired: 4,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 4,
        title: "تحليل السوق اليومي",
        description: "اقرأ تحليل السوق اليومي وأجب على سؤال واحد",
        reward: 6,
        type: "daily",
        status: "active",
        completions: 0,
        availableFor: "vip",
        packageCategories: ["vip"],
        difficulty: "hard",
        timeRequired: 5,
        createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
        id: 5,
        title: "مهمة حصرية VIP",
        description: "مهمة خاصة لمستخدمي VIP فقط - استشارة استثمارية",
        reward: 10,
        type: "daily",
        status: "active",
        completions: 0,
        availableFor: "vip",
        packageCategories: ["vip"],
        difficulty: "hard",
        timeRequired: 8,
        createdAt: "2024-01-01T00:00:00.000Z"
    }
];

// ========== نظام كود الإحالة ==========
const REFERRAL_SETTINGS = {
    referrerReward: 50,
    refereeReward: 20,
    minPackageForReward: 0,
    maxReferralLevels: 1,
    enableReferralSystem: true
};

// ========== دوال كود الإحالة (مع دعم Supabase) ==========
function generateReferralCode(username) {
    if (!username) username = 'USER';
    const cleanUsername = username.toString().toUpperCase().replace(/\s/g, '').substring(0, 5);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanUsername}${random}${timestamp}`.substring(0, 12);
}

// دالة مزامنة مع Supabase
async function syncWithSupabase() {
    if (window.SupabaseClient) {
        try {
            // مزامنة الباقات
            const packagesResult = await window.SupabaseClient.packages.getAll()
            if (packagesResult.success && packagesResult.data) {
                SHARED_PACKAGES = packagesResult.data
                localStorage.setItem('website_packages', JSON.stringify(SHARED_PACKAGES))
            }
            
            // مزامنة المهام
            const tasksResult = await window.SupabaseClient.tasks.getAll()
            if (tasksResult.success && tasksResult.data) {
                SHARED_TASKS = tasksResult.data
                localStorage.setItem('website_tasks', JSON.stringify(SHARED_TASKS))
            }
            
            console.log('✅ تمت المزامنة مع Supabase')
        } catch (error) {
            console.error('❌ فشل المزامنة مع Supabase:', error)
        }
    }
}

// دالة الحصول على إحصائيات الإحالة (مع دعم Supabase)
async function getReferralStats(userId) {
    // محاولة استخدام Supabase أولاً
    if (window.SupabaseClient) {
        const result = await window.SupabaseClient.referrals.getStats(userId)
        if (result) return result
    }
    
    // الرجوع إلى localStorage
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const currentUser = users.find(u => u.id === userId);
    
    if (!currentUser) return null;
    
    if (!currentUser.referralCode) {
        currentUser.referralCode = generateReferralCode(currentUser.username || `USER${userId}`);
        saveUsersToStorage(users);
    }
    
    const referredUsers = users.filter(u => u.referredBy === currentUser.referralCode);
    const activeReferrals = referredUsers.filter(u => u.package && u.package.status === 'نشط');
    
    return {
        referralCode: currentUser.referralCode || '',
        referredCount: referredUsers.length,
        activeReferrals: activeReferrals.length,
        pendingReferrals: referredUsers.filter(u => u.pendingPackage && !u.package).length,
        totalEarned: currentUser.referralEarnings || 0,
        pendingCommission: referredUsers.filter(u => u.package && !u.referralRewardPaid).length * 50,
        referredUsers: referredUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            joinedDate: u.joinedDate,
            hasPackage: !!u.package,
            packageName: u.package ? u.package.name : 'لا يوجد',
            rewardPaid: u.referralRewardPaid || false
        }))
    };
}

// دالة معالجة مكافآت الإحالة (مع دعم Supabase)
async function processReferralRewardsOnApproval(userId, packageAmount) {
    // محاولة استخدام Supabase أولاً
    if (window.SupabaseClient) {
        const result = await window.SupabaseClient.referrals.processReward(userId, packageAmount)
        if (result.success) return result
    }
    
    // الرجوع إلى localStorage
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const newUser = users.find(u => u.id === userId);
    
    if (!newUser || !newUser.referredBy) return false;
    
    const referrer = users.find(u => u.referralCode === newUser.referredBy);
    if (!referrer) return false;
    
    if (newUser.referralRewardPaid) return false;
    
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    
    newUser.balance = (newUser.balance || 0) + REFERRAL_SETTINGS.refereeReward;
    newUser.referralRewardPaid = true;
    newUser.referralRewardDate = new Date().toISOString();
    
    referrer.balance = (referrer.balance || 0) + REFERRAL_SETTINGS.referrerReward;
    referrer.referralEarnings = (referrer.referralEarnings || 0) + REFERRAL_SETTINGS.referrerReward;
    
    addUserTransaction(newUser.id, {
        type: 'مكافأة إحالة',
        amount: REFERRAL_SETTINGS.refereeReward,
        description: `🎁 مكافأة تسجيل عن طريق كود الإحالة من ${referrer.name}`,
        date: new Date().toLocaleString('ar-SA'),
        referralCode: newUser.referredBy
    });
    
    addUserTransaction(referrer.id, {
        type: 'مكافأة إحالة',
        amount: REFERRAL_SETTINGS.referrerReward,
        description: `💰 مكافأة إحالة: ${newUser.name}`,
        date: new Date().toLocaleString('ar-SA'),
        referredUser: newUser.id
    });
    
    localStorage.setItem('elite_users', JSON.stringify(users));
    
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser) {
        if (currentUser.id === newUser.id) {
            currentUser.balance = newUser.balance;
            currentUser.referralRewardPaid = true;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
        if (currentUser.id === referrer.id) {
            currentUser.balance = referrer.balance;
            currentUser.referralEarnings = referrer.referralEarnings;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
    }
    
    broadcastUpdate('referrals');
    broadcastUpdate('users');
    
    return {
        referrer: { id: referrer.id, name: referrer.name, reward: REFERRAL_SETTINGS.referrerReward },
        referee: { id: newUser.id, name: newUser.name, reward: REFERRAL_SETTINGS.refereeReward }
    };
}

// ========== دوال الباقات (مع دعم Supabase) ==========
function loadPackagesFromStorage() {
    try {
        const saved = localStorage.getItem('website_packages');
        if (saved) {
            SHARED_PACKAGES = JSON.parse(saved);
        }
    } catch (e) {
        console.error('خطأ في تحميل الباقات:', e);
    }
    return SHARED_PACKAGES;
}

function savePackagesToStorage() {
    try {
        localStorage.setItem('website_packages', JSON.stringify(SHARED_PACKAGES));
        return true;
    } catch (e) {
        console.error('خطأ في حفظ الباقات:', e);
        return false;
    }
}

async function getAllPackages() {
    // محاولة استخدام Supabase أولاً
    if (window.SupabaseClient) {
        const result = await window.SupabaseClient.packages.getAll()
        if (result.success && result.data) {
            SHARED_PACKAGES = result.data
            localStorage.setItem('website_packages', JSON.stringify(SHARED_PACKAGES))
            return SHARED_PACKAGES
        }
    }
    // الرجوع إلى localStorage
    return SHARED_PACKAGES.filter(pkg => pkg.status === "active");
}

function getPackageById(id) {
    return SHARED_PACKAGES.find(pkg => pkg.id === id);
}

// ========== دوال المهام (مع دعم Supabase) ==========
function loadTasksFromStorage() {
    try {
        const saved = localStorage.getItem('website_tasks');
        if (saved) {
            SHARED_TASKS = JSON.parse(saved);
        }
    } catch (e) {
        console.error('خطأ في تحميل المهام:', e);
    }
    return SHARED_TASKS;
}

function saveTasksToStorage() {
    try {
        localStorage.setItem('website_tasks', JSON.stringify(SHARED_TASKS));
        return true;
    } catch (e) {
        console.error('خطأ في حفظ المهام:', e);
        return false;
    }
}

async function getAllTasks() {
    // محاولة استخدام Supabase أولاً
    if (window.SupabaseClient) {
        const result = await window.SupabaseClient.tasks.getAll()
        if (result.success && result.data) {
            SHARED_TASKS = result.data
            localStorage.setItem('website_tasks', JSON.stringify(SHARED_TASKS))
            return SHARED_TASKS
        }
    }
    // الرجوع إلى localStorage
    return SHARED_TASKS.filter(task => task.status === "active");
}

function getUserTasks(userPackage) {
    const allTasks = SHARED_TASKS.filter(task => task.status === "active");
    
    if (!userPackage) return [];
    
    const userCategory = userPackage.category;
    
    return allTasks.filter(task => {
        if (task.status !== 'active') return false;
        if (!task.packageCategories) return false;
        return task.packageCategories.includes(userCategory);
    });
}

function canUserCompleteTask(taskId, userPackage) {
    if (!userPackage) return false;
    const task = SHARED_TASKS.find(t => t.id === taskId);
    if (!task) return false;
    return task.packageCategories && task.packageCategories.includes(userPackage.category);
}

function incrementTaskCompletion(taskId) {
    const task = SHARED_TASKS.find(t => t.id === taskId);
    if (task) {
        task.completions = (task.completions || 0) + 1;
        saveTasksToStorage();
    }
    return 0;
}

// ========== دوال المستخدمين ==========
function saveUsersToStorage(users) {
    localStorage.setItem('elite_users', JSON.stringify(users));
}

function addUserTransaction(userId, transaction) {
    const transactions = JSON.parse(localStorage.getItem(`user_transactions_${userId}`)) || [];
    transactions.unshift({
        ...transaction,
        id: transaction.id || Date.now() + Math.random()
    });
    localStorage.setItem(`user_transactions_${userId}`, JSON.stringify(transactions.slice(0, 200)));
}

// ========== دوال الإحصائيات ==========
function getUserManagementStats() {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const pendingPackages = JSON.parse(localStorage.getItem('pending_packages')) || [];
    
    let totalBalance = 0;
    let totalEarned = 0;
    let activeWithPackage = 0;
    
    users.forEach(user => {
        totalBalance += user.balance || 0;
        totalEarned += user.totalEarned || 0;
        if (user.package && user.package.status === 'نشط') activeWithPackage++;
    });
    
    return {
        total: users.length,
        active: users.filter(u => u.status === 'active' || !u.status).length,
        suspended: users.filter(u => u.status === 'suspended').length,
        banned: users.filter(u => u.status === 'banned').length,
        withPackage: activeWithPackage,
        pendingPackages: pendingPackages.length,
        totalBalance: totalBalance,
        totalEarned: totalEarned
    };
}

function getUserDetails(userId) {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    
    const withdrawals = JSON.parse(localStorage.getItem(`user_withdrawals_${userId}`)) || [];
    const totalWithdrawn = withdrawals
        .filter(w => w.status === 'مكتمل')
        .reduce((sum, w) => sum + w.amount, 0);
    
    const transactions = JSON.parse(localStorage.getItem(`user_transactions_${userId}`)) || [];
    const todayEarnings = transactions
        .filter(t => {
            const tDate = new Date(t.date).toDateString();
            return tDate === new Date().toDateString() && 
                   (t.type === 'ربح' || t.type === 'مكافأة' || t.type === 'مكافأة إحالة');
        })
        .reduce((sum, t) => sum + t.amount, 0);
    
    return {
        ...user,
        totalWithdrawn,
        todayEarnings,
        tasksCompleted: user.tasksCompleted || 0,
        referralStats: getReferralStats(userId)
    };
}

function updateUserStatus(userId, status, reason = '') {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    
    users[userIndex].status = status;
    users[userIndex].statusReason = reason;
    users[userIndex].statusUpdatedAt = new Date().toISOString();
    
    localStorage.setItem('elite_users', JSON.stringify(users));
    
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser && currentUser.id === userId) {
        currentUser.status = status;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    }
    
    broadcastUpdate('users');
    return true;
}

function addUserBalance(userId, amount, reason = 'إضافة رصيد') {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1 || amount <= 0) return false;
    
    users[userIndex].balance = (users[userIndex].balance || 0) + amount;
    localStorage.setItem('elite_users', JSON.stringify(users));
    
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser && currentUser.id === userId) {
        currentUser.balance = users[userIndex].balance;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    }
    
    addUserTransaction(userId, {
        type: 'إضافة رصيد',
        amount: amount,
        description: reason,
        date: new Date().toLocaleString('ar-SA'),
        admin: true
    });
    
    broadcastUpdate('users');
    return true;
}

function getAllWithdrawals() {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    let allWithdrawals = [];
    
    users.forEach(user => {
        const userWithdrawals = JSON.parse(localStorage.getItem(`user_withdrawals_${user.id}`)) || [];
        userWithdrawals.forEach(w => {
            allWithdrawals.push({
                ...w,
                userName: user.name,
                userEmail: user.email,
                userId: user.id
            });
        });
    });
    
    return allWithdrawals.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getDashboardStats() {
    const users = JSON.parse(localStorage.getItem('elite_users')) || [];
    const pendingPackages = JSON.parse(localStorage.getItem('pending_packages')) || [];
    const tasks = SHARED_TASKS.filter(t => t.status === "active");
    const withdrawals = getAllWithdrawals();
    
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalProfits = 0;
    let activeSubscriptions = 0;
    let pendingWithdrawals = 0;
    let totalReferralEarnings = 0;
    let totalReferrals = 0;
    let suspendedUsers = 0;
    let bannedUsers = 0;
    let activeUsers = 0;
    
    users.forEach(user => {
        if (user.package && user.package.status === 'نشط') {
            totalDeposits += user.package.amount || 0;
            activeSubscriptions++;
        }
        totalProfits += user.totalEarned || 0;
        totalReferralEarnings += user.referralEarnings || 0;
        totalReferrals += user.referralCount || 0;
        
        if (user.status === 'active' || !user.status) activeUsers++;
        if (user.status === 'suspended') suspendedUsers++;
        if (user.status === 'banned') bannedUsers++;
    });
    
    withdrawals.forEach(w => {
        if (w.status === 'مكتمل') totalWithdrawals += w.amount;
        if (w.status === 'معلق') pendingWithdrawals++;
    });
    
    const totalCompletions = tasks.reduce((sum, task) => sum + (task.completions || 0), 0);
    const totalTasksReward = tasks.reduce((sum, task) => sum + (task.reward * (task.completions || 0)), 0);
    
    return {
        totalUsers: users.length,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        totalDeposits,
        totalWithdrawals,
        totalProfits,
        activeSubscriptions,
        pendingPackages: pendingPackages.length,
        pendingWithdrawals,
        totalTasks: tasks.length,
        totalCompletions,
        totalTasksReward,
        totalReferralEarnings,
        totalReferrals,
        packagesCount: SHARED_PACKAGES.length
    };
}

function calculateDaysLeft(purchaseDate, duration = 30) {
    if (!purchaseDate) return 0;
    const purchase = new Date(purchaseDate);
    const endDate = new Date(purchase);
    endDate.setDate(endDate.getDate() + duration);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
}

// ========== بث التحديثات ==========
function broadcastUpdate(type) {
    const event = new CustomEvent('data-updated', { 
        detail: { 
            type: type,
            timestamp: new Date().toISOString()
        }
    });
    window.dispatchEvent(event);
}

// ========== التهيئة ==========
async function initializeSharedData() {
    console.log('🚀 تهيئة نظام البيانات المشتركة...');
    
    // تحميل البيانات من localStorage
    loadPackagesFromStorage();
    loadTasksFromStorage();
    
    // محاولة المزامنة مع Supabase
    if (window.SupabaseClient) {
        await syncWithSupabase();
    }
    
    console.log(`✅ تم تحميل ${SHARED_PACKAGES.length} باقة و ${SHARED_TASKS.length} مهمة`);
    console.log(`💰 نظام الإحالة: ${REFERRAL_SETTINGS.referrerReward}$ للمحيل، ${REFERRAL_SETTINGS.refereeReward}$ للمحال`);
}

// ========== التصدير ==========
const SharedData = {
    // الباقات
    packages: SHARED_PACKAGES,
    savePackages: savePackagesToStorage,
    loadPackages: loadPackagesFromStorage,
    getAllPackages: getAllPackages,
    getPackageById: getPackageById,
    
    // المهام
    tasks: SHARED_TASKS,
    saveTasks: saveTasksToStorage,
    loadTasks: loadTasksFromStorage,
    getAllTasks: getAllTasks,
    getUserTasks: getUserTasks,
    incrementTaskCompletion: incrementTaskCompletion,
    canUserCompleteTask: canUserCompleteTask,
    
    // نظام الإحالة
    REFERRAL_SETTINGS: REFERRAL_SETTINGS,
    generateReferralCode: generateReferralCode,
    getReferralStats: getReferralStats,
    processReferralRewardsOnApproval: processReferralRewardsOnApproval,
    
    // إدارة المستخدمين
    getUserManagementStats: getUserManagementStats,
    getUserDetails: getUserDetails,
    updateUserStatus: updateUserStatus,
    addUserBalance: addUserBalance,
    
    // الإحصائيات
    getDashboardStats: getDashboardStats,
    getAllWithdrawals: getAllWithdrawals,
    
    // دوال مساعدة
    calculateDaysLeft: calculateDaysLeft,
    
    // البث
    broadcastUpdate: broadcastUpdate,
    
    // مزامنة
    syncWithSupabase: syncWithSupabase,
    
    // تهيئة
    init: initializeSharedData
};

window.sharedData = SharedData;

if (typeof window !== 'undefined') {
    SharedData.init();
}