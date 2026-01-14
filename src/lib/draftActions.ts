import { getSupabaseClient } from './supabase'
import type { DraftState, Team } from '../types/draft'

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
    const newPicks = { ...currentState.picks }

    if (currentMatch === 1) {
      newPicks.match1 = {
        ...newPicks.match1,
        [team]: [...newPicks.match1[team], pokemonId],
      }
    } else if (currentMatch === 2) {
      newPicks.match2 = {
        ...newPicks.match2,
        [team]: [...newPicks.match2[team], pokemonId],
      }
    } else if (currentMatch === 3) {
      newPicks.match3 = {
        ...newPicks.match3,
        [team]: [...newPicks.match3[team], pokemonId],
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
 * BAN操作を確定する
 */
export async function confirmBan(
  draftId: string,
  team: Team,
  pokemonId: string,
  orderIndex: number,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    console.log('[confirmBan] Starting...', { team, pokemonId, orderIndex })

    // 1. draft_actions に INSERT
    const { error: actionError } = await supabase.from('draft_actions').insert({
      draft_id: draftId,
      action_type: 'ban',
      team: toDbTeam(team), // 'A' | 'B' → 'orange' | 'purple'
      pokemon_id: pokemonId,
      order_index: orderIndex,
      created_by: null,
    })

    if (actionError) {
      console.error('[confirmBan] Failed to insert action:', actionError)
      return false
    }

    console.log('[confirmBan] Action inserted')

    // 2. drafts.state を UPDATE
    const { currentMatch } = currentState
    const newBans = { ...currentState.bans }

    if (currentMatch === 1) {
      newBans.match1 = {
        ...newBans.match1,
        [team]: [...newBans.match1[team], pokemonId],
      }
    } else if (currentMatch === 2) {
      newBans.match2 = {
        ...newBans.match2,
        [team]: [...newBans.match2[team], pokemonId],
      }
    } else if (currentMatch === 3) {
      newBans.match3 = {
        ...newBans.match3,
        [team]: [...newBans.match3[team], pokemonId],
      }
    }

    const updatedState: DraftState = {
      ...currentState,
      bans: newBans,
      updatedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[confirmBan] Failed to update draft state:', updateError)
      return false
    }

    console.log('[confirmBan] Draft state updated')
    return true
  } catch (error) {
    console.error('[confirmBan] Unexpected error:', error)
    return false
  }
}

/**
 * BANフェーズの確定（フェーズ遷移）
 *
 * 動作:
 * 1. banConfirmedフラグを立てる
 * 2. 次のチームまたはPICKフェーズへ遷移
 * 3. drafts.state を UPDATE
 */
export async function confirmBanPhaseComplete(
  draftId: string,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    console.log('[confirmBanPhaseComplete] Starting...', {
      currentMatch: currentState.currentMatch,
      currentBanTeam: currentState.currentBanTeam
    })

    const { currentMatch, currentBanTeam, banConfirmed, firstPickByMatch } = currentState

    if (!currentBanTeam) {
      console.error('[confirmBanPhaseComplete] No current ban team')
      return false
    }

    // 既に確定済みかチェック
    const isAlreadyConfirmed =
      (currentMatch === 1 && banConfirmed.match1[currentBanTeam]) ||
      (currentMatch === 2 && banConfirmed.match2[currentBanTeam]) ||
      (currentMatch === 3 && banConfirmed.match3[currentBanTeam])

    if (isAlreadyConfirmed) {
      console.warn('[confirmBanPhaseComplete] BAN already confirmed')
      return false
    }

    // 確定フラグを立てる
    const newBanConfirmed = { ...banConfirmed }
    if (currentMatch === 1) {
      newBanConfirmed.match1 = {
        ...newBanConfirmed.match1,
        [currentBanTeam]: true,
      }
    } else if (currentMatch === 2) {
      newBanConfirmed.match2 = {
        ...newBanConfirmed.match2,
        [currentBanTeam]: true,
      }
    } else if (currentMatch === 3) {
      newBanConfirmed.match3 = {
        ...newBanConfirmed.match3,
        [currentBanTeam]: true,
      }
    }

    // 次のチームまたはフェーズへ遷移
    const firstBanTeam = firstPickByMatch[currentMatch as 1 | 2 | 3]
    const secondBanTeam: Team = firstBanTeam === 'A' ? 'B' : 'A'

    let newCurrentBanTeam: Team | null = currentBanTeam
    let newPhase: 'ban' | 'pick' = 'ban'
    let newCurrentTurn = currentState.currentTurn

    // 先行チームが確定した場合 → 後攻チームへ
    if (currentBanTeam === firstBanTeam) {
      newCurrentBanTeam = secondBanTeam
      console.log(
        `[confirmBanPhaseComplete] Team ${currentBanTeam} BAN confirmed → Switching to Team ${secondBanTeam}`
      )
    } else {
      // 後攻チームも確定した場合 → PICKフェーズへ
      newCurrentBanTeam = null
      newPhase = 'pick'
      newCurrentTurn = 0
      console.log(
        `[confirmBanPhaseComplete] Team ${currentBanTeam} BAN confirmed → Transitioning to PICK phase`
      )
    }

    const updatedState: DraftState = {
      ...currentState,
      banConfirmed: newBanConfirmed,
      currentBanTeam: newCurrentBanTeam,
      phase: newPhase,
      currentTurn: newCurrentTurn,
      updatedAt: new Date().toISOString(),
    }

    // drafts.state を UPDATE
    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[confirmBanPhaseComplete] Failed to update draft state:', updateError)
      return false
    }

    console.log('[confirmBanPhaseComplete] BAN phase transition completed')
    return true
  } catch (error) {
    console.error('[confirmBanPhaseComplete] Unexpected error:', error)
    return false
  }
}

/**
 * 次の試合へ遷移する
 *
 * 動作:
 * 1. currentMatch を +1
 * 2. phase を 'ban' にリセット
 * 3. currentBanTeam を次の試合の先行チームに設定
 * 4. drafts.state を UPDATE
 */
export async function goToNextMatch(
  draftId: string,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    console.log('[goToNextMatch] Starting...', { currentMatch: currentState.currentMatch })

    // 第3試合終了後は遷移しない
    if (currentState.currentMatch === 3) {
      console.warn('[goToNextMatch] Already at match 3')
      return false
    }

    // 次の試合へ（1→2, 2→3）
    const nextMatch = (currentState.currentMatch + 1) as 1 | 2 | 3

    // 次の試合の先行BANチームを取得
    const firstBanTeam = currentState.firstPickByMatch[nextMatch]

    const updatedState: DraftState = {
      ...currentState,
      currentMatch: nextMatch,
      currentTurn: 0,
      phase: 'ban',
      currentBanTeam: firstBanTeam,
      updatedAt: new Date().toISOString(),
    }

    console.log(
      `[goToNextMatch] Transitioning to Match ${nextMatch} (BAN phase, Team ${firstBanTeam} starts)`
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

/**
 * BANスキップを確定する（null BAN）
 */
export async function confirmBanSkip(
  draftId: string,
  team: Team,
  orderIndex: number,
  currentState: DraftState
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()

    console.log('[confirmBanSkip] Starting...', { team, orderIndex })

    // 1. draft_actions に INSERT（pokemon_id は空文字またはnull扱い）
    // ただし、draft_actionsのpokemon_idはNOT NULLなので、
    // スキップを表す特殊な値（例: '__skip__'）を使用
    const { error: actionError } = await supabase.from('draft_actions').insert({
      draft_id: draftId,
      action_type: 'ban',
      team: toDbTeam(team), // 'A' | 'B' → 'orange' | 'purple'
      pokemon_id: '__skip__', // スキップを示す特殊値
      order_index: orderIndex,
      created_by: null,
    })

    if (actionError) {
      console.error('[confirmBanSkip] Failed to insert action:', actionError)
      return false
    }

    console.log('[confirmBanSkip] Action inserted')

    // 2. drafts.state を UPDATE（nullを追加）
    const { currentMatch } = currentState
    const newBans = { ...currentState.bans }

    if (currentMatch === 1) {
      newBans.match1 = {
        ...newBans.match1,
        [team]: [...newBans.match1[team], null],
      }
    } else if (currentMatch === 2) {
      newBans.match2 = {
        ...newBans.match2,
        [team]: [...newBans.match2[team], null],
      }
    } else if (currentMatch === 3) {
      newBans.match3 = {
        ...newBans.match3,
        [team]: [...newBans.match3[team], null],
      }
    }

    const updatedState: DraftState = {
      ...currentState,
      bans: newBans,
      updatedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('drafts')
      .update({ state: updatedState })
      .eq('id', draftId)

    if (updateError) {
      console.error('[confirmBanSkip] Failed to update draft state:', updateError)
      return false
    }

    console.log('[confirmBanSkip] Draft state updated')
    return true
  } catch (error) {
    console.error('[confirmBanSkip] Unexpected error:', error)
    return false
  }
}
