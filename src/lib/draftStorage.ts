import { getSupabaseClient, isSupabaseConfigured } from './supabase'
import type { DraftState } from '../types/draft'

/**
 * 現在のドラフトIDを保存するためのキー
 * LocalStorageに保存して、セッション間でドラフトを追跡
 */
const CURRENT_DRAFT_ID_KEY = 'current_draft_id'

/**
 * UUID形式の検証（RFC 4122準拠）
 * @param value - 検証する文字列
 * @returns UUID形式であればtrue
 */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

/**
 * Supabaseから最新のDraftStateを取得
 *
 * @returns DraftStateまたはnull（存在しない場合）
 */
export async function loadDraftState(): Promise<DraftState | null> {
  try {
    console.log('[loadDraftState] Starting...')

    // Supabase未設定の場合はnullを返す
    if (!isSupabaseConfigured()) {
      console.warn('[loadDraftState] ⚠️ Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
      return null
    }

    const supabase = getSupabaseClient()

    // LocalStorageから現在のドラフトIDを取得
    const currentDraftId = localStorage.getItem(CURRENT_DRAFT_ID_KEY)
    console.log('[loadDraftState] Current draft ID from localStorage:', currentDraftId)

    // UUID形式でない場合は削除
    if (currentDraftId && !isValidUUID(currentDraftId)) {
      console.warn('[loadDraftState] ⚠️ Invalid UUID format detected, removing:', currentDraftId)
      localStorage.removeItem(CURRENT_DRAFT_ID_KEY)
      return null
    }

    if (currentDraftId) {
      // 既存のドラフトを取得
      const { data, error } = await supabase
        .from('drafts')
        .select('state')
        .eq('id', currentDraftId)
        .single()

      if (error) {
        console.error('[loadDraftState] Failed to load draft by ID:', error)
        // IDが無効な場合はLocalStorageをクリア
        localStorage.removeItem(CURRENT_DRAFT_ID_KEY)
        return null
      }

      console.log('[loadDraftState] Successfully loaded draft by ID')
      return data.state as DraftState
    }

    // IDがない場合は最新のドラフトを取得
    const { data, error } = await supabase
      .from('drafts')
      .select('id, state')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // データが存在しない
        console.log('[loadDraftState] No existing draft found in database')
        return null
      }
      console.error('[loadDraftState] Failed to load draft:', error)
      return null
    }

    // IDをLocalStorageに保存
    localStorage.setItem(CURRENT_DRAFT_ID_KEY, data.id)
    console.log('[loadDraftState] Successfully loaded latest draft, ID:', data.id)

    return data.state as DraftState
  } catch (error) {
    console.error('[loadDraftState] Error loading draft state:', error)
    return null
  }
}

/**
 * DraftStateをSupabaseに保存（新規作成または更新）
 *
 * @param state - 保存するDraftState
 * @returns 成功時は draft ID（新規作成時）または true（更新時）、失敗時は null
 */
export async function saveDraftState(state: DraftState): Promise<string | boolean> {
  try {
    console.log('[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[saveDraftState] Starting save...')
    console.log('[saveDraftState] Payload preview:', {
      tournamentName: state.tournamentName,
      currentMatch: state.currentMatch,
      currentTurn: state.currentTurn,
      teamAPicksCount: state.picks.match1.A.length,
      teamBPicksCount: state.picks.match1.B.length,
    })

    // Supabase未設定の場合は保存できない
    if (!isSupabaseConfigured()) {
      console.warn('[saveDraftState] ⚠️ Supabase is not configured. Cannot save draft state.')
      console.warn('[saveDraftState] ⚠️ To enable persistence, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
      console.warn('[saveDraftState] ⚠️ Current env:', {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      })
      return false
    }

    const supabase = getSupabaseClient()
    const currentDraftId = localStorage.getItem(CURRENT_DRAFT_ID_KEY)

    // UUID形式でない場合は削除して新規作成扱い
    if (currentDraftId && !isValidUUID(currentDraftId)) {
      console.warn('[saveDraftState] ⚠️ Invalid UUID format detected, removing:', currentDraftId)
      localStorage.removeItem(CURRENT_DRAFT_ID_KEY)
      // currentDraftIdをnullにして、INSERT処理に進む
    }

    if (currentDraftId && isValidUUID(currentDraftId)) {
      // 既存のドラフトを更新
      console.log('[saveDraftState] 📝 UPDATE mode')
      console.log('[saveDraftState] Updating existing draft, ID:', currentDraftId)
      console.log('[saveDraftState] Payload size:', JSON.stringify(state).length, 'bytes')

      console.log('[saveDraftState] ⏳ Executing UPDATE query...')
      const { data, error } = await supabase
        .from('drafts')
        .update({ state })
        .eq('id', currentDraftId)
        .select()

      console.log('[saveDraftState] 📥 UPDATE response received')
      console.log('[saveDraftState] Response data:', data)
      console.log('[saveDraftState] Response error:', error)

      if (error) {
        console.error('[saveDraftState] ❌ Failed to update draft')
        console.error('[saveDraftState] Error code:', error.code)
        console.error('[saveDraftState] Error message:', error.message)
        console.error('[saveDraftState] Error details:', error.details)
        console.error('[saveDraftState] Error hint:', error.hint)
        return false
      }

      console.log('[saveDraftState] ✅ Successfully updated draft')
      console.log('[saveDraftState] Updated rows:', data?.length || 0)
      return true
    } else {
      // 新規ドラフトを作成
      console.log('[saveDraftState] 📝 INSERT mode')
      console.log('[saveDraftState] Creating new draft...')
      console.log('[saveDraftState] Payload size:', JSON.stringify(state).length, 'bytes')

      console.log('[saveDraftState] ⏳ Executing INSERT query...')
      const { data, error } = await supabase
        .from('drafts')
        .insert({ state })
        .select('id')
        .single()

      console.log('[saveDraftState] 📥 INSERT response received')
      console.log('[saveDraftState] Response data:', data)
      console.log('[saveDraftState] Response error:', error)

      if (error) {
        console.error('[saveDraftState] ❌ Failed to create draft')
        console.error('[saveDraftState] Error code:', error.code)
        console.error('[saveDraftState] Error message:', error.message)
        console.error('[saveDraftState] Error details:', error.details)
        console.error('[saveDraftState] Error hint:', error.hint)
        return false
      }

      if (!data || !data.id) {
        console.error('[saveDraftState] ❌ INSERT succeeded but no ID returned')
        console.error('[saveDraftState] Response data:', data)
        return false
      }

      // 新しいIDをLocalStorageに保存
      localStorage.setItem(CURRENT_DRAFT_ID_KEY, data.id)
      console.log('[saveDraftState] ✅ Successfully created new draft')
      console.log('[saveDraftState] New draft ID:', data.id)
      console.log('[saveDraftState] Saved to localStorage:', CURRENT_DRAFT_ID_KEY)

      return data.id
    }
  } catch (error) {
    console.error('[saveDraftState] ❌ Unexpected error')
    console.error('[saveDraftState] Error type:', typeof error)
    console.error('[saveDraftState] Error:', error)
    if (error instanceof Error) {
      console.error('[saveDraftState] Error name:', error.name)
      console.error('[saveDraftState] Error message:', error.message)
      console.error('[saveDraftState] Error stack:', error.stack)
    }
    return false
  } finally {
    console.log('[saveDraftState] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

/**
 * 指定されたIDのドラフトを読み込む（観戦用・運営用共通）
 *
 * @param draftId - 読み込むドラフトのID
 * @returns DraftStateまたはnull（存在しない場合）
 */
export async function loadDraftStateById(
  draftId: string
): Promise<DraftState | null> {
  try {
    console.log('[loadDraftStateById] Loading draft by ID:', draftId)

    // Supabase未設定の場合はnullを返す
    if (!isSupabaseConfigured()) {
      console.warn(
        '[loadDraftStateById] ⚠️ Supabase is not configured. Cannot load draft by ID.'
      )
      return null
    }

    const supabase = getSupabaseClient()

    // 指定されたIDのドラフトを取得
    const { data, error } = await supabase
      .from('drafts')
      .select('state')
      .eq('id', draftId)
      .single()

    if (error) {
      console.error('[loadDraftStateById] Failed to load draft:', error)
      return null
    }

    console.log('[loadDraftStateById] ✅ Successfully loaded draft')
    return data.state as DraftState
  } catch (error) {
    console.error('[loadDraftStateById] Error loading draft state:', error)
    return null
  }
}

/**
 * 新しいドラフトを開始（現在のドラフトIDをクリア）
 * Setup画面から新しいドラフトを開始する際に使用
 */
export function startNewDraft(): void {
  localStorage.removeItem(CURRENT_DRAFT_ID_KEY)
}

/**
 * 現在のドラフトIDを取得
 * URL生成用（運営・観戦リンクの生成）
 */
export function getCurrentDraftId(): string | null {
  return localStorage.getItem(CURRENT_DRAFT_ID_KEY)
}
