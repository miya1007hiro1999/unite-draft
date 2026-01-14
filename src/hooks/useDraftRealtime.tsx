import { useEffect, useState, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'
import type { DraftState } from '../types/draft'

// draft_actions テーブルの型定義
export type DraftAction = {
  id: string
  draft_id: string
  action_type: 'pick' | 'ban'
  team: 'A' | 'B'
  pokemon_id: string
  order_index: number
  created_by: string | null
  created_at: string
}

type UseDraftRealtimeProps = {
  draftId: string | undefined
  enabled: boolean
}

type UseDraftRealtimeReturn = {
  draftState: DraftState | null
  confirmedActions: DraftAction[]
  isLoading: boolean
  error: string | null
}

/**
 * Supabase Realtime を使ってドラフト状態をリアルタイム同期する
 *
 * 動作原理:
 * 1. 初回fetch（1回のみ）: drafts + draft_actions
 * 2. Realtime購読: drafts UPDATE / draft_actions INSERT
 * 3. イベント受信時に state を即上書き（自分の操作も含む）
 */
export function useDraftRealtime({
  draftId,
  enabled,
}: UseDraftRealtimeProps): UseDraftRealtimeReturn {
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [confirmedActions, setConfirmedActions] = useState<DraftAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Realtime channel の参照
  const channelRef = useRef<RealtimeChannel | null>(null)
  // 初期化済みフラグ（React StrictMode 対策）
  const isInitialized = useRef(false)

  useEffect(() => {
    // Supabase未設定 or 無効化されている場合は何もしない
    if (!isSupabaseConfigured() || !enabled || !draftId) {
      setIsLoading(false)
      return
    }

    // 既に初期化済みの場合は何もしない
    if (isInitialized.current) {
      return
    }

    isInitialized.current = true

    const supabase = getSupabaseClient()

    // 初回fetch
    const initialize = async () => {
      try {
        console.log('[useDraftRealtime] Initializing...')

        // drafts テーブルから現在状態を取得
        const { data: draftData, error: draftError } = await supabase
          .from('drafts')
          .select('state')
          .eq('id', draftId)
          .single()

        if (draftError) {
          throw new Error(`Failed to fetch draft: ${draftError.message}`)
        }

        if (!draftData) {
          throw new Error('Draft not found')
        }

        setDraftState(draftData.state as DraftState)
        console.log('[useDraftRealtime] Draft state loaded')

        // draft_actions テーブルから確定ログを取得
        const { data: actionsData, error: actionsError } = await supabase
          .from('draft_actions')
          .select('*')
          .eq('draft_id', draftId)
          .order('order_index', { ascending: true })

        if (actionsError) {
          throw new Error(`Failed to fetch actions: ${actionsError.message}`)
        }

        setConfirmedActions((actionsData as DraftAction[]) || [])
        console.log('[useDraftRealtime] Actions loaded:', actionsData?.length || 0)

        setIsLoading(false)
      } catch (err) {
        console.error('[useDraftRealtime] Initialization error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsLoading(false)
      }
    }

    // Realtime購読を開始
    const subscribe = () => {
      console.log('[useDraftRealtime] Starting Realtime subscription...')

      const channel = supabase
        .channel(`draft-${draftId}`)
        // drafts テーブルの UPDATE を購読
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'drafts',
            filter: `id=eq.${draftId}`,
          },
          (payload) => {
            console.log('[useDraftRealtime] Drafts UPDATE received:', payload)
            // DB の最新状態で即上書き
            setDraftState(payload.new.state as DraftState)
          }
        )
        // draft_actions テーブルの INSERT を購読
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'draft_actions',
            filter: `draft_id=eq.${draftId}`,
          },
          (payload) => {
            console.log('[useDraftRealtime] Draft action INSERT received:', payload)
            const newAction = payload.new as DraftAction

            // 重複防止 + order_index でソート
            setConfirmedActions((prev) => {
              // 既に存在する場合は追加しない
              if (prev.some((a) => a.id === newAction.id)) {
                return prev
              }

              // 追加してソート
              const updated = [...prev, newAction]
              updated.sort((a, b) => a.order_index - b.order_index)
              return updated
            })
          }
        )
        .subscribe((status) => {
          console.log('[useDraftRealtime] Subscription status:', status)
        })

      channelRef.current = channel
    }

    // 初期化 → 購読開始
    initialize().then(() => {
      subscribe()
    })

    // クリーンアップ: アンサブスクライブ
    return () => {
      if (channelRef.current) {
        console.log('[useDraftRealtime] Unsubscribing...')
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [draftId, enabled])

  return {
    draftState,
    confirmedActions,
    isLoading,
    error,
  }
}
