import { Bell, Search, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp }  from '@/contexts/AppContext'
import { supabase } from '@/lib/supabase'

export default function TopBar({ title, actions }) {
  const { userId, isBDRep } = useAuth()
  const { t, isRTL }        = useApp()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setUnread(count ?? 0))

    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => setUnread(prev => prev + 1))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  return (
    <header className="topbar">
      <h1 className="text-base font-semibold t1 flex-1">{title}</h1>

      <div className="hidden md:flex items-center gap-2 bg-[var(--bg-input)] border b1 rounded px-3 h-8 w-56">
        <Search size={13} className="t3" />
        <input
          type="text"
          placeholder={t('misc.search_placeholder')}
          className="bg-transparent outline-none text-sm t1 w-full placeholder:t3"
        />
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {isBDRep && (
        <button className="btn btn-primary btn-sm hidden md:flex">
          <Plus size={13} />
          {t('bd.add_lead')}
        </button>
      )}

      <button className="btn btn-ghost btn-icon relative">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-brand-green text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </header>
  )
}