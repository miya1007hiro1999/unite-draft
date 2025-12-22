import type { DraftState, Team } from '../types/draft'

/**
 * BANされたポケモンID一覧を取得（累積）
 *
 * 確定仕様：
 * - BANは試合ごとに累積（次の試合に進んでも解除されない）
 * - PICKされたポケモンも以降の試合では使用不可
 * - 使用不可ポケモン = 過去すべてのBAN + PICKの累積
 * - null（スキップ）は除外する
 *
 * @param state - 現在のDraftState
 * @returns BANされたポケモンIDの配列（重複なし、nullを除外）
 */
export function getBannedPokemon(state: DraftState): string[] {
  const { currentMatch, picks, bans } = state
  const bannedList: string[] = []

  // 第1試合中：match1のBANのみ（nullを除外）
  if (currentMatch === 1) {
    bannedList.push(
      ...bans.match1.A.filter((id): id is string => id !== null),
      ...bans.match1.B.filter((id): id is string => id !== null)
    )
  }

  // 第2試合中：match1のBAN + match1のPICK + match2のBAN
  if (currentMatch === 2) {
    bannedList.push(
      ...bans.match1.A.filter((id): id is string => id !== null),
      ...bans.match1.B.filter((id): id is string => id !== null),
      ...picks.match1.A,
      ...picks.match1.B,
      ...bans.match2.A.filter((id): id is string => id !== null),
      ...bans.match2.B.filter((id): id is string => id !== null)
    )
  }

  // 第3試合中：すべてのBAN + match1とmatch2のPICK
  if (currentMatch === 3) {
    bannedList.push(
      ...bans.match1.A.filter((id): id is string => id !== null),
      ...bans.match1.B.filter((id): id is string => id !== null),
      ...picks.match1.A,
      ...picks.match1.B,
      ...bans.match2.A.filter((id): id is string => id !== null),
      ...bans.match2.B.filter((id): id is string => id !== null),
      ...picks.match2.A,
      ...picks.match2.B,
      ...bans.match3.A.filter((id): id is string => id !== null),
      ...bans.match3.B.filter((id): id is string => id !== null)
    )
  }

  // 重複を除去してユニークなリストを返す
  return Array.from(new Set(bannedList))
}

/**
 * 現在の試合のBAN済みポケモンIDを取得（nullを除外）
 *
 * @param state - 現在のDraftState
 * @returns BAN済みポケモンIDの配列（両チーム合計、nullを除外）
 */
export function getCurrentMatchBans(state: DraftState): string[] {
  const { currentMatch, bans } = state
  if (currentMatch === 1)
    return [
      ...bans.match1.A.filter((id): id is string => id !== null),
      ...bans.match1.B.filter((id): id is string => id !== null),
    ]
  if (currentMatch === 2)
    return [
      ...bans.match2.A.filter((id): id is string => id !== null),
      ...bans.match2.B.filter((id): id is string => id !== null),
    ]
  if (currentMatch === 3)
    return [
      ...bans.match3.A.filter((id): id is string => id !== null),
      ...bans.match3.B.filter((id): id is string => id !== null),
    ]
  return []
}

/**
 * 特定チームの現在の試合のBAN済みポケモンIDを取得（nullを除外）
 *
 * @param state - 現在のDraftState
 * @param team - チーム（'A' | 'B'）
 * @returns BAN済みポケモンIDの配列（nullを除外）
 */
export function getCurrentMatchBansByTeam(
  state: DraftState,
  team: Team
): string[] {
  const { currentMatch, bans } = state
  if (currentMatch === 1)
    return bans.match1[team].filter((id): id is string => id !== null)
  if (currentMatch === 2)
    return bans.match2[team].filter((id): id is string => id !== null)
  if (currentMatch === 3)
    return bans.match3[team].filter((id): id is string => id !== null)
  return []
}

/**
 * BANフェーズの順番シーケンスを取得
 *
 * BAN順：A → B → A → B → A → B（各チーム3体ずつ、合計6体）
 *
 * @param match - 試合番号（1, 2, 3）
 * @param firstPickByMatch - 各試合の先攻チーム情報
 * @returns BAN順の配列（例: ['A', 'B', 'A', 'B', 'A', 'B']）
 */
export function getBanSequenceByMatch(
  match: 1 | 2 | 3,
  firstPickByMatch: { 1: Team; 2: Team; 3: Team }
): Team[] {
  const firstPick = firstPickByMatch[match]
  const secondPick: Team = firstPick === 'A' ? 'B' : 'A'

  // BAN順シーケンス：先攻 → 後攻 を3回繰り返し
  return [
    firstPick,
    secondPick,
    firstPick,
    secondPick,
    firstPick,
    secondPick,
  ]
}

/**
 * 現在BAN中のチームを取得
 *
 * @param state - 現在のDraftState
 * @returns 現在BAN中のチーム（'A' | 'B'）
 */
export function getCurrentBanningTeam(state: DraftState): Team {
  const { currentMatch, currentTurn, firstPickByMatch } = state
  const banSequence = getBanSequenceByMatch(currentMatch, firstPickByMatch)

  // currentTurnがシーケンス範囲外の場合は最後のチームを返す
  if (currentTurn >= banSequence.length) {
    return banSequence[banSequence.length - 1]
  }

  return banSequence[currentTurn]
}

/**
 * BANフェーズが完了したかどうかを判定
 *
 * 条件：各チーム3体ずつBAN完了（合計6体）
 *
 * @param state - 現在のDraftState
 * @returns BANフェーズ完了ならtrue
 */
export function isBanPhaseComplete(state: DraftState): boolean {
  const teamABans = getCurrentMatchBansByTeam(state, 'A')
  const teamBBans = getCurrentMatchBansByTeam(state, 'B')

  return teamABans.length >= 3 && teamBBans.length >= 3
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
 * 現在ピック中/BAN中のチームを取得
 *
 * phaseに応じてBAN中のチームまたはピック中のチームを返す
 *
 * @param state - 現在のDraftState
 * @returns 現在ピック中/BAN中のチーム（'A' | 'B'）
 */
export function getCurrentPickingTeam(state: DraftState): Team {
  // BANフェーズ中はBAN中のチームを返す
  if (state.phase === 'ban') {
    return getCurrentBanningTeam(state)
  }

  // PICKフェーズ中はピック中のチームを返す
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
 * BANフェーズとPICKフェーズで異なる条件を適用
 *
 * @param state - 現在のDraftState
 * @param pokemonId - ポケモンID
 * @returns 選択可能ならtrue
 */
export function isPokemonSelectable(
  state: DraftState,
  pokemonId: string
): boolean {
  const currentTeam = getCurrentPickingTeam(state)

  // BANフェーズ中
  if (state.phase === 'ban') {
    // BANフェーズが完了している場合は選択不可
    if (isBanPhaseComplete(state)) {
      return false
    }

    const currentMatchBans = getCurrentMatchBans(state)
    const currentTeamBans = getCurrentMatchBansByTeam(state, currentTeam)

    // すでにBANされている
    if (currentMatchBans.includes(pokemonId)) {
      return false
    }

    // BAN枠が埋まっている（最大3体）
    if (currentTeamBans.length >= 3) {
      return false
    }

    return true
  }

  // PICKフェーズ中
  // 試合が終了している場合は選択不可
  if (isMatchComplete(state)) {
    return false
  }

  const bannedPokemon = getBannedPokemon(state)
  const teamAPicks = getCurrentMatchPicks(state, 'A')
  const teamBPicks = getCurrentMatchPicks(state, 'B')
  const currentTeamPicks = getCurrentMatchPicks(state, currentTeam)

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
 * 条件：PICKフェーズで currentTurn === 10（両チーム5体ずつピック完了）
 *
 * @param state - 現在のDraftState
 * @returns 試合終了ならtrue
 */
export function isMatchComplete(state: DraftState): boolean {
  // PICKフェーズでのみ試合終了を判定
  return state.phase === 'pick' && state.currentTurn === 10
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
