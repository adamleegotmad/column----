import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/data'
import type { Profile } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 用户变化时拉取其 profile
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    getProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  return { user, profile, loading }
}