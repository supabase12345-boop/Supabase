// ===================================
// supabase.js - Elite Capital (نسخة مستقرة)
// ===================================

const SUPABASE_URL = 'https://aiorcrtfvhjpwjdsebzp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb3JjcnRmdmhqcHdqZHNlYnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODg3MDEsImV4cCI6MjA4NjU2NDcwMX0.drqTeWdeOzA24K68hSM88JHNGft_kH571_te7KwUETA';

let supabaseClient = null;

// ========== تهيئة الاتصال ==========
function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('❌ مكتبة Supabase غير محملة');
        return null;
    }
    
    try {
        // تنظيف أي جلسات قديمة
        localStorage.removeItem('sb-aiorcrftvhjpwjdsebzpauth-token');
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: 'elite_capital_auth' // تغيير اسم المفتاح لمنع التعارض
            }
        });
        
        console.log('✅ تم الاتصال بـ Supabase');
        return supabaseClient;
    } catch (error) {
        console.error('❌ فشل الاتصال:', error);
        return null;
    }
}

// ========== دوال المساعدة ==========
function generateReferralCode(username) {
    if (!username) username = 'USER';
    const cleanUsername = username.toString().toUpperCase().replace(/\s/g, '').substring(0, 5);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanUsername}${random}${timestamp}`.substring(0, 12);
}

// ========== المستخدمين ==========
async function registerUser(userData) {
    try {
        console.log('بدء تسجيل مستخدم جديد:', userData.email);
        
        const { data: existing, error: checkError } = await supabaseClient
            .from('users')
            .select('id')
            .or(`email.eq.${userData.email},username.eq.${userData.username}`)
            .maybeSingle();
        
        if (existing) {
            throw new Error('البريد الإلكتروني أو اسم المستخدم مستخدم مسبقاً');
        }
        
        const referralCode = generateReferralCode(userData.username);
        
        let referredBy = null;
        if (userData.referralCode) {
            const { data: referrer } = await supabaseClient
                .from('users')
                .select('referral_code')
                .eq('referral_code', userData.referralCode)
                .maybeSingle();
            
            if (referrer) {
                referredBy = userData.referralCode;
            }
        }
        
        const newUserData = {
            name: userData.name,
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            referral_code: referralCode,
            referred_by: referredBy,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            status: 'active',
            is_admin: false,
            joined_date: new Date().toISOString(),
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
            wallet_address: ''
        };
        
        const { data: newUser, error } = await supabaseClient
            .from('users')
            .insert([newUserData])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data: newUser };
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(usernameOrEmail, password) {
    try {
        console.log('محاولة تسجيل دخول:', usernameOrEmail);
        
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .or(`email.eq.${usernameOrEmail},username.eq.${usernameOrEmail}`)
            .maybeSingle();
        
        if (error) throw error;
        if (!user) throw new Error('المستخدم غير موجود');
        if (user.password !== password) throw new Error('كلمة المرور غير صحيحة');
        if (user.status === 'banned') throw new Error('حسابك محظور');
        
        await supabaseClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        return { success: true, data: user };
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return { success: false, error: error.message };
    }
}

async function getUserById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب المستخدم:', error);
        return { success: false, error: error.message };
    }
}

async function updateUser(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في تحديث المستخدم:', error);
        return { success: false, error: error.message };
    }
}

async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        return { success: false, error: error.message };
    }
}

async function updateUserStatus(id, status) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث حالة المستخدم:', error);
        return { success: false, error: error.message };
    }
}

// ========== الباقات ==========
async function getAllPackages() {
    try {
        const { data, error } = await supabaseClient
            .from('packages')
            .select('*')
            .eq('status', 'active')
            .order('price', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب الباقات:', error);
        return { success: false, error: error.message };
    }
}

async function getPackageById(id) {
    try {
        const { data, error } = await supabaseClient
            .from('packages')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب الباقة:', error);
        return { success: false, error: error.message };
    }
}

async function createPackage(packageData) {
    try {
        const profitPercentage = (packageData.dailyProfit / packageData.price) * 100;
        
        const { data, error } = await supabaseClient
            .from('packages')
            .insert([{
                name: packageData.name,
                price: packageData.price,
                daily_profit: packageData.dailyProfit,
                profit_percentage: profitPercentage,
                duration: packageData.duration || 30,
                duration_type: packageData.durationType || 'day',
                category: packageData.category || 'standard',
                description: packageData.description || '',
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إنشاء الباقة:', error);
        return { success: false, error: error.message };
    }
}

async function updatePackage(id, updates) {
    try {
        const { error } = await supabaseClient
            .from('packages')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('خطأ في تحديث الباقة:', error);
        return { success: false, error: error.message };
    }
}

async function deletePackage(id) {
    try {
        const { error } = await supabaseClient
            .from('packages')
            .update({ status: 'deleted' })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('خطأ في حذف الباقة:', error);
        return { success: false, error: error.message };
    }
}

// ========== طلبات الاشتراك ==========
async function createPendingPackage(pendingData) {
    try {
        if (!pendingData.userId) throw new Error('معرف المستخدم مطلوب');
        if (!pendingData.packageId) throw new Error('معرف الباقة مطلوب');
        if (!pendingData.amount) throw new Error('المبلغ مطلوب');
        
        const { data: user } = await supabaseClient
            .from('users')
            .select('id, name, referred_by')
            .eq('id', pendingData.userId)
            .single();
        
        const { data: pkg } = await supabaseClient
            .from('packages')
            .select('id, name, price')
            .eq('id', pendingData.packageId)
            .single();
        
        const insertData = {
            user_id: user.id,
            user_name: user.name || 'مستخدم',
            package_name: pkg.name || 'باقة',
            amount: pkg.price,
            wallet_address: pendingData.walletAddress || 'TYmk60K9JvCqS7Fqy6BpWpZp8hLpVHw7D',
            referred_by: user.referred_by || null,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('pending_packages')
            .insert([insertData])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ خطأ في إنشاء طلب الاشتراك:', error);
        return { success: false, error: error.message };
    }
}

async function getPendingPackages() {
    try {
        const { data, error } = await supabaseClient
            .from('pending_packages')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب الطلبات:', error);
        return { success: false, error: error.message };
    }
}

async function approvePendingPackage(id, adminId) {
    try {
        const { data: pending } = await supabaseClient
            .from('pending_packages')
            .select('*')
            .eq('id', id)
            .single();
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        await supabaseClient
            .from('pending_packages')
            .update({ 
                status: 'approved',
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .insert([{
                user_id: pending.user_id,
                package_name: pending.package_name,
                amount: pending.amount,
                daily_profit: pending.amount * 0.025,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        await supabaseClient
            .from('users')
            .update({ 
                has_active_subscription: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', pending.user_id);
        
        return { success: true, data: subscription };
    } catch (error) {
        console.error('خطأ في قبول الطلب:', error);
        return { success: false, error: error.message };
    }
}

async function rejectPendingPackage(id, reason, adminId) {
    try {
        const { error } = await supabaseClient
            .from('pending_packages')
            .update({ 
                status: 'rejected',
                rejection_reason: reason,
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('خطأ في رفض الطلب:', error);
        return { success: false, error: error.message };
    }
}

// ========== الاشتراكات ==========
async function getUserSubscription(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب الاشتراك:', error);
        return { success: false, error: error.message };
    }
}

// ========== طلبات السحب ==========
async function createWithdrawal(withdrawalData) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', withdrawalData.userId)
            .single();
        
        const totalAmount = withdrawalData.amount + withdrawalData.fee;
        if (user.balance < totalAmount) {
            throw new Error('الرصيد غير كافي');
        }
        
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .insert([{
                user_id: withdrawalData.userId,
                amount: withdrawalData.amount,
                wallet: withdrawalData.wallet,
                network: withdrawalData.network,
                fee: withdrawalData.fee,
                total: totalAmount,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        await supabaseClient
            .from('users')
            .update({ 
                balance: user.balance - totalAmount
            })
            .eq('id', withdrawalData.userId);
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إنشاء طلب سحب:', error);
        return { success: false, error: error.message };
    }
}

async function getUserWithdrawals(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب طلبات السحب:', error);
        return { success: false, error: error.message };
    }
}

async function getAllWithdrawals() {
    try {
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .select('*, users(name, email)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب جميع طلبات السحب:', error);
        return { success: false, error: error.message };
    }
}

async function updateWithdrawalStatus(id, status, adminId, txHash = null) {
    try {
        const updates = { 
            status: status,
            processed_by: adminId,
            processed_at: new Date().toISOString()
        };
        
        if (txHash) updates.transaction_hash = txHash;
        
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        if (status === 'rejected') {
            const { data: user } = await supabaseClient
                .from('users')
                .select('balance')
                .eq('id', data.user_id)
                .single();
            
            await supabaseClient
                .from('users')
                .update({ balance: user.balance + data.total })
                .eq('id', data.user_id);
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في تحديث حالة السحب:', error);
        return { success: false, error: error.message };
    }
}

// ========== المعاملات ==========
async function getUserTransactions(userId, limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في جلب المعاملات:', error);
        return { success: false, error: error.message };
    }
}

// ========== إحصائيات لوحة التحكم ==========
async function getDashboardStats() {
    try {
        const [
            usersRes,
            packagesRes,
            pendingPackagesRes,
            subscriptionsRes,
            withdrawalsRes
        ] = await Promise.all([
            supabaseClient.from('users').select('*', { count: 'exact', head: false }),
            supabaseClient.from('packages').select('*').eq('status', 'active'),
            supabaseClient.from('pending_packages').select('*').eq('status', 'pending'),
            supabaseClient.from('subscriptions').select('*').eq('status', 'active'),
            supabaseClient.from('withdrawals').select('*')
        ]);
        
        const users = usersRes.data || [];
        const packages = packagesRes.data || [];
        const pendingPackages = pendingPackagesRes.data || [];
        const subscriptions = subscriptionsRes.data || [];
        const withdrawals = withdrawalsRes.data || [];
        
        const totalDeposits = users.reduce((sum, u) => sum + (u.total_earned || 0), 0);
        const totalWithdrawals = withdrawals
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
        
        return {
            success: true,
            data: {
                totalUsers: users.length,
                totalDeposits,
                totalWithdrawals,
                activeSubscriptions: subscriptions.length,
                pendingPackages: pendingPackages.length,
                pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
                packagesCount: packages.length
            }
        };
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        return { success: false, error: error.message };
    }
}

// ========== الإحالة ==========
async function getReferralStats(userId) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        const { data: referredUsers } = await supabaseClient
            .from('users')
            .select('id, name, joined_date, has_active_subscription')
            .eq('referred_by', user.referral_code);
        
        return {
            success: true,
            data: {
                referralCode: user.referral_code,
                totalReferrals: referredUsers?.length || 0,
                activeReferrals: referredUsers?.filter(u => u.has_active_subscription).length || 0,
                referredUsers: referredUsers || []
            }
        };
    } catch (error) {
        console.error('خطأ في جلب إحصائيات الإحالة:', error);
        return { success: false, error: error.message };
    }
}

// ========== الدردشة الجماعية (مبسطة) ==========
async function getGroupChatMessages(limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('group_chat_messages')
            .select(`
                *,
                users:user_id (
                    id,
                    name,
                    is_admin,
                    has_active_subscription
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('خطأ في جلب رسائل المجموعة:', error);
        return { success: false, error: error.message };
    }
}

async function createGroupChat(userId, message, imageFile = null) {
    try {
        let imageUrl = null;
        
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${userId}_${Date.now()}.${fileExt}`;
            const filePath = `chat_images/${fileName}`;
            
            const { error: uploadError } = await supabaseClient.storage
                .from('chat-images')
                .upload(filePath, imageFile);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabaseClient.storage
                .from('chat-images')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        const { data, error } = await supabaseClient
            .from('group_chat_messages')
            .insert([{
                user_id: userId,
                message: message || null,
                image_url: imageUrl,
                created_at: new Date().toISOString()
            }])
            .select(`
                *,
                users:user_id (
                    id,
                    name,
                    is_admin,
                    has_active_subscription
                )
            `)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إرسال رسالة المجموعة:', error);
        return { success: false, error: error.message };
    }
}

// ========== التهيئة ==========
initSupabase();

// ========== تصدير الدوال ==========
window.supabaseClient = supabaseClient;
window.supabaseHelpers = {
    registerUser,
    loginUser,
    getUserById,
    updateUser,
    getAllUsers,
    updateUserStatus,
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    createPendingPackage,
    getPendingPackages,
    approvePendingPackage,
    rejectPendingPackage,
    getUserSubscription,
    createWithdrawal,
    getUserWithdrawals,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getUserTransactions,
    getDashboardStats,
    getReferralStats,
    // دوال الدردشة الجماعية
    getGroupChatMessages,
    createGroupChat
};

console.log('✅ تم تحميل جميع دوال Supabase');
