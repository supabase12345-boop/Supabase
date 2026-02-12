// ===================================
// ملف تهيئة Supabase - الإصدار النهائي
// ===================================

const SUPABASE_URL = 'https://wabyirjjhndrwxvcrdvn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYnlpcmpqaG5kcnd4dmNyZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTM0OTAsImV4cCI6MjA4NjQ2OTQ5MH0.AWDpHfWQLBto-Jn8_9fO0UmPS5Da9pgX611Bl6Q6u2w'

// إنشاء اتصال Supabase
let supabase = null

// تحميل مكتبة Supabase
async function loadSupabase() {
    if (typeof window.supabase === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
        })
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    })
    
    console.log('✅ Supabase connected successfully')
    return supabase
}

// ========== دوال المصادقة ==========
const SupabaseAuth = {
    // تسجيل الدخول
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, error: error.message }
        }
    },

    // تسجيل الخروج
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('Logout error:', error)
            return { success: false, error: error.message }
        }
    },

    // الحصول على المستخدم الحالي
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error
            return { success: true, user }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // التحقق من صلاحية المشرف
    async checkAdminAccess() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return { success: false, error: 'غير مصرح' }
            
            const { data, error } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', parseInt(user.id))
                .single()
                
            if (error) throw error
            return { success: true, isAdmin: data?.is_admin || false }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال المستخدمين ==========
const SupabaseUsers = {
    // الحصول على جميع المستخدمين
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('Error fetching users:', error)
            return { success: false, error: error.message }
        }
    },

    // الحصول على مستخدم حسب ID
    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // إنشاء مستخدم جديد
    async create(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    id: Date.now(),
                    ...userData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // تحديث مستخدم
    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // حذف مستخدم
    async delete(id) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)
            if (error) throw error
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // تحديث حالة المستخدم
    async updateStatus(id, status, reason = '') {
        return await this.update(id, { 
            status, 
            status_reason: reason,
            status_updated_at: new Date().toISOString()
        })
    },

    // إضافة رصيد
    async addBalance(id, amount, reason) {
        const { data: user } = await this.getById(id)
        if (!user.success) return user
        
        const newBalance = (user.data.balance || 0) + amount
        
        const result = await this.update(id, { balance: newBalance })
        if (result.success) {
            await SupabaseTransactions.create({
                user_id: id,
                type: amount > 0 ? 'إضافة رصيد' : 'خصم رصيد',
                amount: Math.abs(amount),
                description: reason,
                admin: true,
                date: new Date().toISOString()
            })
        }
        
        return result
    }
}

// ========== دوال الباقات ==========
const SupabasePackages = {
    // الحصول على جميع الباقات النشطة
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .eq('status', 'active')
                .order('price', { ascending: true })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // إضافة باقة جديدة
    async create(packageData) {
        try {
            const dailyProfit = (packageData.price * (packageData.profit || 2.5) / 100).toFixed(2)
            
            const { data, error } = await supabase
                .from('packages')
                .insert([{
                    id: Date.now(),
                    ...packageData,
                    daily_profit: parseFloat(dailyProfit),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // تحديث باقة
    async update(id, updates) {
        try {
            if (updates.price || updates.profit) {
                const { data: pkg } = await supabase
                    .from('packages')
                    .select('price, profit')
                    .eq('id', id)
                    .single()
                    
                const price = updates.price || pkg.price
                const profit = updates.profit || pkg.profit
                updates.daily_profit = parseFloat((price * profit / 100).toFixed(2))
            }
            
            const { data, error } = await supabase
                .from('packages')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // حذف باقة (تعطيل)
    async delete(id) {
        return await this.update(id, { status: 'deleted' })
    }
}

// ========== دوال المهام ==========
const SupabaseTasks = {
    // الحصول على جميع المهام
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'active')
                .order('reward', { ascending: true })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // إضافة مهمة
    async create(taskData) {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert([{
                    id: Date.now(),
                    ...taskData,
                    completions: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // تحديث مهمة
    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // حذف مهمة
    async delete(id) {
        return await this.update(id, { status: 'deleted' })
    },

    // زيادة عدد الإكمالات
    async incrementCompletion(taskId) {
        try {
            const { data: task } = await supabase
                .from('tasks')
                .select('completions')
                .eq('id', taskId)
                .single()
                
            const { data, error } = await supabase
                .from('tasks')
                .update({ 
                    completions: (task.completions || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال الطلبات المعلقة ==========
const SupabasePending = {
    // الحصول على جميع الطلبات المعلقة
    async getPackages() {
        try {
            const { data, error } = await supabase
                .from('pending_packages')
                .select('*')
                .eq('status', 'بانتظار المراجعة')
                .order('created_at', { ascending: false })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // قبول طلب
    async approve(id, adminId, notes = '') {
        try {
            const { data, error } = await supabase
                .from('pending_packages')
                .update({
                    status: 'مقبول',
                    processed_by: adminId,
                    processed_date: new Date().toISOString(),
                    notes: notes
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // رفض طلب
    async reject(id, adminId, notes = '') {
        try {
            const { data, error } = await supabase
                .from('pending_packages')
                .update({
                    status: 'مرفوض',
                    processed_by: adminId,
                    processed_date: new Date().toISOString(),
                    notes: notes
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال طلبات السحب ==========
const SupabaseWithdrawals = {
    // الحصول على جميع طلبات السحب
    async getAll(status = null) {
        try {
            let query = supabase
                .from('withdrawals')
                .select(`
                    *,
                    users:user_id (name, email)
                `)
                .order('created_at', { ascending: false })
                
            if (status) {
                query = query.eq('status', status)
            }
            
            const { data, error } = await query
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // إنشاء طلب سحب
    async create(userId, amount, wallet, network) {
        try {
            const fee = { TRC20: 5, ERC20: 15, BEP20: 3 }[network] || 5
            const total = amount + fee
            
            const { data, error } = await supabase
                .from('withdrawals')
                .insert([{
                    user_id: userId,
                    amount,
                    wallet_address: wallet,
                    network,
                    fee,
                    total,
                    status: 'معلق',
                    date: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }])
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // معالجة طلب سحب
    async process(id, status, txHash = '', notes = '') {
        try {
            const { data, error } = await supabase
                .from('withdrawals')
                .update({
                    status,
                    tx_hash: txHash,
                    processor_notes: notes,
                    processed_date: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال الإحالة ==========
const SupabaseReferrals = {
    // إنشاء كود إحالة
    async generateCode(userId, username) {
        const code = `${username.toUpperCase().replace(/\s/g, '').substring(0, 5)}${Math.random().toString(36).substring(2, 7).toUpperCase()}${Date.now().toString().slice(-4)}`.substring(0, 12)
        
        return await SupabaseUsers.update(userId, { referral_code: code })
    },

    // الحصول على إحصائيات الإحالة
    async getStats(userId) {
        try {
            const { data: user } = await SupabaseUsers.getById(userId)
            if (!user.success) return null
            
            const { data: referrals } = await supabase
                .from('users')
                .select('*')
                .eq('referred_by', user.data.referral_code)
                
            const referredUsers = referrals || []
            const activeReferrals = referredUsers.filter(u => u.package && u.package.status === 'نشط')
            
            return {
                referralCode: user.data.referral_code,
                referredCount: referredUsers.length,
                activeReferrals: activeReferrals.length,
                pendingReferrals: referredUsers.filter(u => u.pending_package && !u.package).length,
                totalEarned: user.data.referral_earnings || 0,
                referredUsers: referredUsers.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    joinedDate: u.joined_date,
                    hasPackage: !!u.package,
                    packageName: u.package?.name,
                    rewardPaid: u.referral_reward_paid || false
                }))
            }
        } catch (error) {
            console.error('Error getting referral stats:', error)
            return null
        }
    },

    // معالجة مكافأة الإحالة
    async processReward(newUserId, packageAmount) {
        try {
            const { data: newUser } = await SupabaseUsers.getById(newUserId)
            if (!newUser.success || !newUser.data.referred_by) {
                return { success: false, error: 'لا يوجد كود إحالة' }
            }
            
            const { data: referrer } = await supabase
                .from('users')
                .select('*')
                .eq('referral_code', newUser.data.referred_by)
                .single()
                
            if (!referrer) {
                return { success: false, error: 'لم يتم العثور على صاحب الكود' }
            }
            
            const REFERRER_REWARD = 50
            const REFEREE_REWARD = 20
            
            // مكافأة المحال
            await SupabaseUsers.addBalance(newUserId, REFEREE_REWARD, 'مكافأة تسجيل عن طريق كود الإحالة')
            
            // مكافأة المحيل
            await SupabaseUsers.addBalance(referrer.id, REFERRER_REWARD, `مكافأة إحالة: ${newUser.data.name}`)
            
            // تحديث إحصائيات المحيل
            await SupabaseUsers.update(referrer.id, {
                referral_count: (referrer.referral_count || 0) + 1,
                referral_earnings: (referrer.referral_earnings || 0) + REFERRER_REWARD
            })
            
            // تحديث حالة مكافأة المحال
            await SupabaseUsers.update(newUserId, {
                referral_reward_paid: true,
                referral_reward_amount: REFEREE_REWARD,
                referral_reward_date: new Date().toISOString()
            })
            
            // تسجيل الإحالة
            await supabase
                .from('referrals')
                .insert([{
                    referrer_id: referrer.id,
                    referred_id: newUserId,
                    referral_code: newUser.data.referred_by,
                    package_amount: packageAmount,
                    commission_paid: true,
                    commission_amount: REFERRER_REWARD,
                    paid_date: new Date().toISOString()
                }])
            
            return { 
                success: true,
                referrer: { id: referrer.id, name: referrer.name, reward: REFERRER_REWARD },
                referee: { id: newUserId, name: newUser.data.name, reward: REFEREE_REWARD }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال المعاملات ==========
const SupabaseTransactions = {
    // إنشاء معاملة
    async create(transaction) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    ...transaction,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single()
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    },

    // الحصول على معاملات المستخدم
    async getUserTransactions(userId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(limit)
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دوال الإحصائيات ==========
const SupabaseStats = {
    // إحصائيات لوحة التحكم
    async getDashboardStats() {
        try {
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                
            const { count: activeSubscriptions } = await supabase
                .from('user_packages')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'نشط')
                
            const { count: pendingPackages } = await supabase
                .from('pending_packages')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'بانتظار المراجعة')
                
            const { count: pendingWithdrawals } = await supabase
                .from('withdrawals')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'معلق')
                
            const { data: deposits } = await supabase
                .from('user_packages')
                .select('amount')
                
            const totalDeposits = deposits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
            
            return {
                success: true,
                data: {
                    totalUsers: totalUsers || 0,
                    activeSubscriptions: activeSubscriptions || 0,
                    pendingPackages: pendingPackages || 0,
                    pendingWithdrawals: pendingWithdrawals || 0,
                    totalDeposits
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// ========== دالة التهيئة ==========
async function initSupabase() {
    await loadSupabase()
    
    // التحقق من الاتصال
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1)
        if (error) throw error
        console.log('✅ Supabase connection verified')
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message)
    }
    
    return supabase
}

// تصدير للاستخدام العام
window.SupabaseClient = {
    init: initSupabase,
    auth: SupabaseAuth,
    users: SupabaseUsers,
    packages: SupabasePackages,
    tasks: SupabaseTasks,
    pending: SupabasePending,
    withdrawals: SupabaseWithdrawals,
    referrals: SupabaseReferrals,
    transactions: SupabaseTransactions,
    stats: SupabaseStats
}

// تهيئة تلقائية
if (typeof window !== 'undefined') {
    window.SupabaseClient.init()
}