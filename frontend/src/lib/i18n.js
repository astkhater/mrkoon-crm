/**
 * MRKOON CRM — Translations (EN + AR)
 * Usage: const { t } = useLang()  →  t('nav.leads')
 */

export const translations = {
  en: {
    // Navigation
    'nav.dashboard':    'Dashboard',
    'nav.leads':        'Leads',
    'nav.pipeline':     'Pipeline',
    'nav.accounts':     'Accounts',
    'nav.calendar':     'Calendar',
    'nav.reconnect':    'Reconnect Queue',
    'nav.import':       'Import',
    'nav.settings':     'Settings',
    'nav.ai':           'Ask AI',
    'nav.data_entry':   'Data Entry',
    'nav.merge':        'Merge Leads',

    // Auth
    'auth.signin':      'Sign In',
    'auth.signout':     'Sign Out',
    'auth.email':       'Email address',
    'auth.password':    'Password',
    'auth.signing_in':  'Signing in...',
    'auth.ai_setup':    'AI Setup',
    'auth.company_ai':  'Company AI',
    'auth.personal_ai': 'My Own AI Account',
    'auth.api_key':     'API Key',
    'auth.connect':     'Connect',

    // Stages
    'stage.new_lead':         'New Lead',
    'stage.reaching_out':     'Reaching Out',
    'stage.no_response':      'No Response',
    'stage.meeting_done':     'Meeting Done',
    'stage.negotiation':      'Negotiation',
    'stage.prospect_active':  'Active Prospect',
    'stage.prospect_cold':    'Cold Prospect',
    'stage.reconnect':        'Reconnect',
    'stage.client_active':    'Active Client',
    'stage.client_inactive':  'Inactive Client',
    'stage.client_renewal':   'Renewal Due',
    'stage.lost':             'Lost',
    'stage.unqualified':      'Unqualified',

    // Qualification status
    'qs.qualified':    'Qualified',
    'qs.unqualified':  'Unqualified',
    'qs.no_response':  'No Response',
    'qs.pending':      'Pending',

    // Lead source
    'source.campaign':           'Campaign',
    'source.referral':           'Referral',
    'source.cold_outreach':      'Cold Outreach',
    'source.whatsapp':           'WhatsApp',
    'source.platform_app':       'Platform / App',
    'source.exhibition':         'Exhibition',
    'source.linkedin':           'LinkedIn',
    'source.facebook_instagram': 'Facebook / Instagram',
    'source.unknown':            'Unknown',

    // Contract types
    'contract.yearly':           'Yearly',
    'contract.quarterly':        'Quarterly',
    'contract.monthly':          'Monthly',
    'contract.yearly_on_demand': 'Yearly On-Demand',
    'contract.per_item':         'Per Item',

    // Dashboard — CCO
    'cco.title':              'CCO Overview',
    'cco.total_leads':        'Total Leads',
    'cco.active_pipeline':    'Active Pipeline',
    'cco.weighted_gmv':       'Weighted GMV / Mo',
    'cco.contracted_gmv':     'Contracted GMV / Mo',
    'cco.realized_gmv':       'Realized GMV',
    'cco.sna_breached':       'SNA Breached',
    'cco.rep_grid':           'Rep Performance',
    'cco.pending_handoffs':   'Pending Handoffs',

    // Dashboard — BD Rep
    'bd.title':               'My Pipeline',
    'bd.my_leads':            'My Leads',
    'bd.my_gmv':              'My Weighted GMV',
    'bd.call_queue':          'Today\'s Calls',
    'bd.add_lead':            'Add Lead',

    // Dashboard — AM
    'am.title':               'My Accounts',
    'am.portfolio':           'Portfolio',
    'am.cap':                 'Cap',
    'am.handoff_queue':       'Handoff Queue',
    'am.renewals_due':        'Renewals Due',
    'am.at_risk':             'At Risk',

    // Actions
    'action.add':       'Add',
    'action.edit':      'Edit',
    'action.save':      'Save',
    'action.cancel':    'Cancel',
    'action.confirm':   'Confirm',
    'action.delete':    'Delete',
    'action.archive':   'Archive',
    'action.import':    'Import',
    'action.export':    'Export',
    'action.search':    'Search',
    'action.filter':    'Filter',
    'action.view':      'View',
    'action.accept':    'Accept',
    'action.reassign':  'Reassign',
    'action.snooze':    'Snooze 4h',
    'action.note':      'Add Note',
    'action.log_call':  'Log Call',
    'action.log_meeting': 'Log Meeting',

    // SNA
    'sna.ok':           'On Track',
    'sna.warning':      'SNA Warning',
    'sna.breach':       'SNA BREACHED',
    'sna.item_live':    'Item Live',
    'sna.auction_live': 'Auction Live',
    'sna.first_lift':   'First Lift',

    // Misc
    'misc.loading':     'Loading...',
    'misc.empty':       'Nothing here yet',
    'misc.error':       'Something went wrong',
    'misc.search_placeholder': 'Search companies...',
    'misc.egp':         'EGP',
    'misc.per_month':   '/ mo',
    'misc.days':        'days',
    'misc.hours':       'hrs',
    'misc.probability': 'Probability',
  },

  ar: {
    // Navigation
    'nav.dashboard':    'لوحة التحكم',
    'nav.leads':        'العملاء المحتملون',
    'nav.pipeline':     'خط البيع',
    'nav.accounts':     'الحسابات',
    'nav.calendar':     'التقويم',
    'nav.reconnect':    'قائمة اعادة التواصل',
    'nav.import':       'استيراد',
    'nav.settings':     'الاعدادات',
    'nav.ai':           'اسأل الذكاء الاصطناعي',
    'nav.data_entry':   'إدخال البيانات',
    'nav.merge':        'دمج العملاء',

    // Auth
    'auth.signin':      'تسجيل الدخول',
    'auth.signout':     'تسجيل الخروج',
    'auth.email':       'البريد الالكتروني',
    'auth.password':    'كلمة المرور',
    'auth.signing_in':  'جاري الدخول...',
    'auth.ai_setup':    'اعداد الذكاء الاصطناعي',
    'auth.company_ai':  'الذكاء الاصطناعي للشركة',
    'auth.personal_ai': 'حسابي الشخصي',
    'auth.api_key':     'مفتاح API',
    'auth.connect':     'ربط',

    // Stages
    'stage.new_lead':         'عميل جديد',
    'stage.reaching_out':     'جاري التواصل',
    'stage.no_response':      'لا يرد',
    'stage.meeting_done':     'تم الاجتماع',
    'stage.negotiation':      'مرحلة التفاوض',
    'stage.prospect_active':  'عميل محتمل نشط',
    'stage.prospect_cold':    'عميل محتمل بارد',
    'stage.reconnect':        'اعادة التواصل',
    'stage.client_active':    'عميل نشط',
    'stage.client_inactive':  'عميل غير نشط',
    'stage.client_renewal':   'تجديد العقد',
    'stage.lost':             'خسرنا الصفقة',
    'stage.unqualified':      'غير مؤهل',

    // Qualification status
    'qs.qualified':    'مؤهل',
    'qs.unqualified':  'غير مؤهل',
    'qs.no_response':  'لا يرد',
    'qs.pending':      'قيد المراجعة',

    // Lead source
    'source.campaign':           'حملة تسويقية',
    'source.referral':           'توصية',
    'source.cold_outreach':      'تواصل بارد',
    'source.whatsapp':           'واتساب',
    'source.platform_app':       'المنصة / التطبيق',
    'source.exhibition':         'معرض',
    'source.linkedin':           'لينكد ان',
    'source.facebook_instagram': 'فيسبوك / انستغرام',
    'source.unknown':            'غير معروف',

    // Contract types
    'contract.yearly':           'سنوي',
    'contract.quarterly':        'ربع سنوي',
    'contract.monthly':          'شهري',
    'contract.yearly_on_demand': 'سنوي حسب الطلب',
    'contract.per_item':         'لكل قطعة',

    // Dashboard — CCO
    'cco.title':              'نظرة عامة - CCO',
    'cco.total_leads':        'اجمالي العملاء',
    'cco.active_pipeline':    'خط البيع النشط',
    'cco.weighted_gmv':       'GMV المرجح / شهر',
    'cco.contracted_gmv':     'GMV بالعقود / شهر',
    'cco.realized_gmv':       'GMV المحقق',
    'cco.sna_breached':       'خرق SNA',
    'cco.rep_grid':           'اداء الفريق',
    'cco.pending_handoffs':   'تسليمات معلقة',

    // Dashboard — BD Rep
    'bd.title':               'خط البيع الخاص بي',
    'bd.my_leads':            'عملائي',
    'bd.my_gmv':              'GMV المرجح',
    'bd.call_queue':          'مكالمات اليوم',
    'bd.add_lead':            'اضافة عميل',

    // Dashboard — AM
    'am.title':               'حساباتي',
    'am.portfolio':           'المحفظة',
    'am.cap':                 'الحد الاقصى',
    'am.handoff_queue':       'قائمة الاستلام',
    'am.renewals_due':        'تجديدات مستحقة',
    'am.at_risk':             'في خطر',

    // Actions
    'action.add':       'اضافة',
    'action.edit':      'تعديل',
    'action.save':      'حفظ',
    'action.cancel':    'الغاء',
    'action.confirm':   'تاكيد',
    'action.delete':    'حذف',
    'action.archive':   'ارشفة',
    'action.import':    'استيراد',
    'action.export':    'تصدير',
    'action.search':    'بحث',
    'action.filter':    'تصفية',
    'action.view':      'عرض',
    'action.accept':    'قبول',
    'action.reassign':  'اعادة التعيين',
    'action.snooze':    'تاجيل 4 ساعات',
    'action.note':      'اضافة ملاحظة',
    'action.log_call':  'تسجيل مكالمة',
    'action.log_meeting': 'تسجيل اجتماع',

    // SNA
    'sna.ok':           'في الموعد',
    'sna.warning':      'تحذير SNA',
    'sna.breach':       'خرق SNA',
    'sna.item_live':    'المنتج منشور',
    'sna.auction_live': 'المزاد نشط',
    'sna.first_lift':   'اول رفع',

    // Misc
    'misc.loading':     'جاري التحميل...',
    'misc.empty':       'لا يوجد شيء هنا بعد',
    'misc.error':       'حدث خطأ ما',
    'misc.search_placeholder': 'ابحث عن شركات...',
    'misc.egp':         'ج.م',
    'misc.per_month':   '/ شهر',
    'misc.days':        'ايام',
    'misc.hours':       'ساعات',
    'misc.probability': 'الاحتمالية',
  },
}

/** Format EGP amounts: 1,200,000 → "1.2M" or "1,200,000" */
export function formatEGP(value, compact = true) {
  if (!value) return '-'
  if (compact) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
    if (value >= 1_000)     return (value / 1_000).toFixed(0) + 'K'
  }
  return value.toLocaleString('en-EG')
}

/** Format date for display: ISO string -> "Apr 26" or Arabic equivalent */
export function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric', month: 'short'
  })
}
