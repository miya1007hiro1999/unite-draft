import { getSupabaseClient } from './supabase'
import type { DraftState, Team } from '../types/draft'
import { matchToIndex } from '../types/draft'
import { getBanSequenceByMatch, BAN_PHASE_TOTAL_TURNS } from '../utils/draftLogic'

/**
 * Team ('A' | 'B') を DB の team カラム ('orange' | 'purple') に変換
 */
function toDbTeam(team: Team): 'orange' | 'purple' {
  return team === 'A' ? 'orange' : 'purple'
}

/**
 * PICK操作を確定する
 *
 * 動作:
 * 1. draft_actions に INSERT
 * 2. drafts.state を UPDATE
 * 3. setState は呼ばない（Realtime経由で更新される）
 */
export async function confirmPick(
  draftId: string,
  team: Team,
  pokemonId: string,
  orderIndex: number,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    console.log('[confirmPick] Starting...', { team, pokemonId, orderIndex })

    // 1. draft_actions に INSERT
    const { error: actionError } = await supabase.from('draft_actions').insert({
      draft_id: draftId,
      action_type: 'pick',
      team: toDbTeam(team), // 'A' | 'B' → 'orange' | 'purple'
      pokemon_id: pokemonId,
      order_index: orderIndex,
      created_by: null, // MVP: ログイン機能なし
    })

    if (actionError) {
      console.error('[confirmPick] Failed to insert action:', actionError)
      return false
    }

    console.log('[confirmPick] Action inserted')

    // 2. drafts.state を UPDATE
    const { currentMatch } = currentState
    const idx = matchToIndex(currentMatch)
    const newPicks = [...currentState.picks]

    // 現在の試合のピックを更新
    if (newPicks[idx]) {
      newPicks[idx] = {
        ...newPicks[idx],
        [team]: [...newPicks[idx][team], pokemonId],
      }
    }

    const updatedState: DraftState = {
      ...currentState,
      picks: newPicks,
      currentTurn: currentState.currentTurn + 1,
      updatedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[confirmPick] Failed to update draft state:', updateError)
      return false
    }

    console.log('[confirmPick] Draft state updated')
    return true
  } catch (error) {
    console.error('[confirmPick] Unexpected error:', error)
    return false
  }
}

/**
 * BAN操作を確定する（ABABAB turn制）
 *
 * 動作:
 * 1. currentTurn から担当チームを自動決定
 * 2. draft_actions に INSERT
 * 3. drafts.state を UPDATE（currentTurn++、必要に応じてPICKフェーズへ自動遷移）
 *
 * @param draftId - ドラフトID
 * @param pokemonId - ポケモンID（null = スキップ）
 * @param currentState - 現在のDraftState
 */
export async function confirmBan(
  draftId: string,
  pokemonId: string | null,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    const { currentMatch, currentTurn, firstPickByMatch } = currentState
    const idx = matchToIndex(currentMatch)

    // currentTurn から担当チームを自動決定
    const banSequence = getBanSequenceByMatch(idx, firstPickByMatch)
    const team = banSequence[currentTurn]

    if (!team) {
      console.error('[confirmBan] Invalid currentTurn:', currentTurn)
      return false
    }

    const orderIndex = currentTurn

    console.log('[confirmBan] Starting...', { team, pokemonId, orderIndex, currentTurn })

    // 1. draft_actions に INSERT
    const { error: actionError } = await supabase.from('draft_actions').insert({
      draft_id: draftId,
      action_type: 'ban',
      team: toDbTeam(team),
      pokemon_id: pokemonId ?? '__skip__', // null の場合はスキップを示す特殊値
      order_index: orderIndex,
      created_by: null,
    })

    if (actionError) {
      console.error('[confirmBan] Failed to insert action:', actionError)
      return false
    }

    console.log('[confirmBan] Action inserted')

    // 2. drafts.state を UPDATE
    const newBans = [...currentState.bans]

    // 現在の試合のBANを更新
    if (newBans[idx]) {
      newBans[idx] = {
        ...newBans[idx],
        [team]: [...newBans[idx][team], pokemonId], // pokemonId は string | null
      }
    }

    // 次のターンを計算
    const nextTurn = currentTurn + 1

    // BANフェーズ完了判定：6ターン完了でPICKフェーズへ自動遷移
    const isBanPhaseComplete = nextTurn >= BAN_PHASE_TOTAL_TURNS

    const updatedState: DraftState = {
      ...currentState,
      bans: newBans,
      currentTurn: isBanPhaseComplete ? 0 : nextTurn, // PICK開始時は0にリセット
      phase: isBanPhaseComplete ? 'pick' : 'ban',
      updatedAt: new Date().toISOString(),
    }

    if (isBanPhaseComplete) {
      console.log('[confirmBan] BAN phase complete, transitioning to PICK phase')
    }

    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[confirmBan] Failed to update draft state:', updateError)
      return false
    }

    console.log('[confirmBan] Draft state updated', { nextTurn, phase: updatedState.phase })
    return true
  } catch (error) {
    console.error('[confirmBan] Unexpected error:', error)
    return false
  }
}

/**
 * 次の試合へ遷移する
 *
 * 動作:
 * 1. currentMatch を +1
 * 2. phase を 'ban' にリセット
 * 3. currentTurn を 0 にリセット
 * 4. drafts.state を UPDATE
 */
export async function goToNextMatch(
  draftId: string,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    const { currentMatch, series, firstPickByMatch } = currentState
    const maxMatches = series.maxMatches

    console.log('[goToNextMatch] Starting...', { currentMatch, maxMatches })

    // 最終試合終了後は遷移しない
    if (currentMatch >= maxMatches) {
      console.warn(`[goToNextMatch] Already at match ${maxMatches}`)
      return false
    }

    // 次の試合へ
    const nextMatch = currentMatch + 1
    const nextIdx = matchToIndex(nextMatch)

    // 次の試合の先行チームを取得（ログ用）
    const firstTeam = firstPickByMatch[nextIdx]

    const updatedState: DraftState = {
      ...currentState,
      currentMatch: nextMatch,
      currentTurn: 0,
      phase: 'ban',
      updatedAt: new Date().toISOString(),
    }

    console.log(
      `[goToNextMatch] Transitioning to Match ${nextMatch} (BAN phase, Team ${firstTeam} starts)`
    )

    // drafts.state を UPDATE
    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[goToNextMatch] Failed to update draft state:', updateError)
      return false
    }

    console.log('[goToNextMatch] Match transition completed')
    return true
  } catch (error) {
    console.error('[goToNextMatch] Unexpected error:', error)
    return false
  }
}
