import type { DraftState, Team } from '../types/draft'

/**
 * BANされたポケモンID一覧を取得
 *
 * ルール：
 * - 第1試合中：空配列
 * - 第2試合中：match1のA+B
 * - 第3試合中：match1 + match2のA+B
 *
 * @param state - 現在のDraftState
 * @returns BANされたポケモンIDの配列
 */
export function getBannedPokemon(state: DraftState): string[] {
  const { currentMatch, picks } = state

  // 第1試合中はBANなし
  if (currentMatch === 1) {
    return []
  }

  // 第2試合中：match1のピックをBAN
  if (currentMatch === 2) {
    return [...picks.match1.A, ...picks.match1.B]
  }

  // 第3試合中：match1 + match2のピックをBAN
  if (currentMatch === 3) {
    return [
      ...picks.match1.A,
      ...picks.match1.B,
      ...picks.match2.A,
      ...picks.match2.B,
    ]
  }

  return []
}

/**
 * 試合ごとのピック順シーケンスを取得
 *
 * ピック順：1→2→2→2→2→1
 * - 第1試合：ABBAABBAAB
 * - 第2試合：BAABBAABBA（第1試合のA/B反転）
 * - 第3試合：ABBAABBAAB
 *
 * @param match - 試合番号（1, 2, 3）
 * @param firstPickByMatch - 各試合の先攻チーム情報
 * @returns ピック順の配列（例: ['A', 'B', 'B', 'A', ...]）
 */
export function getPickSequenceByMatch(
  match: 1 | 2 | 3,
  firstPickByMatch: { 1: Team; 2: Team; 3: Team }
): Team[] {
  const firstPick = firstPickByMatch[match]
  const secondPick: Team = firstPick === 'A' ? 'B' : 'A'

  // 基本シーケンス（先攻基準）：ABBAABBAAB
  const baseSequence: ('first' | 'second')[] = [
    'first', // 1
    'second', 'second', // 2
    'first', 'first', // 2
    'second', 'second', // 2
    'first', 'first', // 2
    'second', // 1
  ]

  // firstPickとsecondPickに置き換え
  return baseSequence.map((turn) => (turn === 'first' ? firstPick : secondPick))
}

/**
 * 現在ピック中のチームを取得
 *
 * ピック順配列のcurrentTurnインデックスに対応するチームを返す
 *
 * @param state - 現在のDraftState
 * @returns 現在ピック中のチーム（'A' | 'B'）
 */
export function getCurrentPickingTeam(state: DraftState): Team {
  const { currentMatch, currentTurn, firstPickByMatch } = state
  const pickSequence = getPickSequenceByMatch(currentMatch, firstPickByMatch)

  // currentTurnがシーケンス範囲外の場合は最後のチームを返す
  if (currentTurn >= pickSequence.length) {
    return pickSequence[pickSequence.length - 1]
  }

  return pickSequence[currentTurn]
}

/**
 * 現在の試合のピック済みポケモンIDを取得
 *
 * @param state - 現在のDraftState
 * @param team - チーム（'A' | 'B'）
 * @returns ピック済みポケモンIDの配列
 */
export function getCurrentMatchPicks(state: DraftState, team: Team): string[] {
  const { currentMatch, picks } = state
  if (currentMatch === 1) return picks.match1[team]
  if (currentMatch === 2) return picks.match2[team]
  if (currentMatch === 3) return picks.match3[team]
  return []
}

/**
 * ポケモンが選択可能かどうかを判定
 *
 * 条件：
 * - 試合が終了していないこと
 * - BANされていないこと
 * - まだどちらのチームにもピックされていないこと
 * - ピック中のチームに空き枠があること
 *
 * @param state - 現在のDraftState
 * @param pokemonId - ポケモンID
 * @returns 選択可能ならtrue
 */
export function isPokemonSelectable(
  state: DraftState,
  pokemonId: string
): boolean {
  // 試合が終了している場合は選択不可
  if (isMatchComplete(state)) {
    return false
  }

  const bannedPokemon = getBannedPokemon(state)
  const currentPickingTeam = getCurrentPickingTeam(state)
  const teamAPicks = getCurrentMatchPicks(state, 'A')
  const teamBPicks = getCurrentMatchPicks(state, 'B')
  const currentTeamPicks = getCurrentMatchPicks(state, currentPickingTeam)

  // BANされている
  if (bannedPokemon.includes(pokemonId)) {
    return false
  }

  // すでにどちらかのチームにピックされている
  if (teamAPicks.includes(pokemonId) || teamBPicks.includes(pokemonId)) {
    return false
  }

  // ピック枠が埋まっている（最大5体）
  if (currentTeamPicks.length >= 5) {
    return false
  }

  return true
}

/**
 * 現在の試合が終了したかどうかを判定
 *
 * 条件：currentTurn === 10（両チーム5体ずつピック完了）
 *
 * @param state - 現在のDraftState
 * @returns 試合終了ならtrue
 */
export function isMatchComplete(state: DraftState): boolean {
  return state.currentTurn === 10
}

/**
 * ドラフト全体が完了したかどうかを判定
 *
 * 条件：第3試合が終了している
 *
 * @param state - 現在のDraftState
 * @returns ドラフト完了ならtrue
 */
export function isDraftComplete(state: DraftState): boolean {
  return state.currentMatch === 3 && isMatchComplete(state)
}
