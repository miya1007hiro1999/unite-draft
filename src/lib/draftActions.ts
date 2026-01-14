import { getSupabaseClient } from './supabase'
import type { DraftState, Team } from '../types/draft'

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
      team,
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
      team,
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
      team,
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
