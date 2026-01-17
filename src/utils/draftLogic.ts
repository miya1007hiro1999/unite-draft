import type { DraftState, Team } from '../types/draft'
import { matchToIndex } from '../types/draft'
import { POKEMON_LIST } from '../data/pokemon'

// BANフェーズの総ターン数（各チーム3体ずつ、合計6体）
export const BAN_PHASE_TOTAL_TURNS = 6

// PICKフェーズの総ターン数（各チーム5体ずつ、合計10体）
export const PICK_PHASE_TOTAL_TURNS = 10

/**
 * BANされたポケモンID一覧を取得（累積）
 *
 * 確定仕様：
 * - グローバルBANは全試合で適用される
 * - BANは試合ごとに累積（次の試合に進んでも解除されない）
 * - PICKされたポケモンも以降の試合では使用不可
 * - 使用不可ポケモン = グローバルBAN + 過去すべてのBAN + PICKの累積
 * - null（スキップ）は除外する
 *
 * @param state - 現在のDraftState
 * @returns BANされたポケモンIDの配列（重複なし、nullを除外）
 */
export function getBannedPokemon(state: DraftState): string[] {
  const { currentMatch, picks, bans, globalBans } = state
  const bannedList: string[] = []

  // グローバルBANを常に含める（全試合共通）
  bannedList.push(...globalBans)

  // グローバルBANフェーズ（currentMatch === 0）の場合はグローバルBANのみ返す
  if (currentMatch === 0) {
    return Array.from(new Set(bannedList))
  }

  // 現在の試合までのBANとPICKを累積
  const idx = matchToIndex(currentMatch)

  for (let i = 0; i <= idx; i++) {
    const matchBans = bans[i]
    const matchPicks = picks[i]

    if (matchBans) {
      // BANを追加（nullを除外）
      bannedList.push(
        ...matchBans.A.filter((id): id is string => id !== null),
        ...matchBans.B.filter((id): id is string => id !== null)
      )
    }

    // 過去の試合のPICKを追加（現在の試合のPICKは含めない）
    if (i < idx && matchPicks) {
      bannedList.push(...matchPicks.A, ...matchPicks.B)
    }
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

  if (currentMatch === 0) return []

  const idx = matchToIndex(currentMatch)
  const matchBans = bans[idx]

  if (!matchBans) return []

  return [
    ...matchBans.A.filter((id): id is string => id !== null),
    ...matchBans.B.filter((id): id is string => id !== null),
  ]
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

  if (currentMatch === 0) return []

  const idx = matchToIndex(currentMatch)
  const matchBans = bans[idx]

  if (!matchBans) return []

  return matchBans[team].filter((id): id is string => id !== null)
}

/**
 * BANフェーズの順番シーケンスを取得
 *
 * BAN順：先攻 → 後攻 → 先攻 → 後攻 → 先攻 → 後攻（各チーム3体ずつ、合計6体）
 *
 * @param matchIndex - 試合インデックス（0-based）
 * @param firstPickByMatch - 各試合の先攻チーム配列
 * @returns BAN順の配列（例: ['A', 'B', 'A', 'B', 'A', 'B']）
 */
export function getBanSequenceByMatch(
  matchIndex: number,
  firstPickByMatch: Team[]
): Team[] {
  const firstPick = firstPickByMatch[matchIndex]
  if (!firstPick) return []

  const secondPick: Team = firstPick === 'A' ? 'B' : 'A'

  // BAN順シーケンス：先攻 → 後攻 を3回繰り返し（ABABAB）
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
 * BANフェーズが完了したかどうかを判定
 *
 * 条件：currentTurn >= 6（ABABAB進行で6ターン完了）
 * ※ BANフェーズ中にのみ意味を持つ
 *
 * @param state - 現在のDraftState
 * @returns BANフェーズ完了ならtrue
 */
export function isBanPhaseComplete(state: DraftState): boolean {
  const { currentMatch, phase, currentTurn } = state

  // グローバルBANフェーズの場合
  if (currentMatch === 0) {
    return state.globalBanConfirmed
  }

  // PICKフェーズに既に移行している場合は完了済み
  if (phase === 'pick') {
    return true
  }

  // BANフェーズ中: currentTurn >= 6 で完了
  return currentTurn >= BAN_PHASE_TOTAL_TURNS
}

/**
 * 試合ごとのピック順シーケンスを取得
 *
 * ピック順：1→2→2→2→2→1
 * - 第1試合：ABBAABBAAB
 * - 第2試合：BAABBAABBA（第1試合のA/B反転）
 * - 第3試合：ABBAABBAAB
 *
 * @param matchIndex - 試合インデックス（0-based）
 * @param firstPickByMatch - 各試合の先攻チーム配列
 * @returns ピック順の配列（例: ['A', 'B', 'B', 'A', ...]）
 */
export function getPickSequenceByMatch(
  matchIndex: number,
  firstPickByMatch: Team[]
): Team[] {
  const firstPick = firstPickByMatch[matchIndex]
  if (!firstPick) return []

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
 * currentTurn とシーケンス関数を使用して動的に計算
 *
 * @param state - 現在のDraftState
 * @returns 現在ピック中/BAN中のチーム（'A' | 'B'）
 */
export function getCurrentPickingTeam(state: DraftState): Team {
  const { currentMatch, currentTurn, firstPickByMatch, phase } = state

  // グローバルBANフェーズ（match 0）では先行チームを返す
  if (currentMatch === 0) {
    return firstPickByMatch[0] ?? 'A'
  }

  const idx = matchToIndex(currentMatch)

  // BANフェーズ中
  if (phase === 'ban') {
    const banSequence = getBanSequenceByMatch(idx, firstPickByMatch)

    // currentTurnがシーケンス範囲外の場合は最後のチームを返す
    if (currentTurn >= banSequence.length) {
      return banSequence[banSequence.length - 1] ?? firstPickByMatch[idx] ?? 'A'
    }

    return banSequence[currentTurn]
  }

  // PICKフェーズ中
  const pickSequence = getPickSequenceByMatch(idx, firstPickByMatch)

  // currentTurnがシーケンス範囲外の場合は最後のチームを返す
  if (currentTurn >= pickSequence.length) {
    return pickSequence[pickSequence.length - 1] ?? firstPickByMatch[idx] ?? 'A'
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

  if (currentMatch === 0) return []

  const idx = matchToIndex(currentMatch)
  const matchPicks = picks[idx]

  if (!matchPicks) return []

  return matchPicks[team]
}

/**
 * ポケモンが選択可能かどうかを判定
 *
 * グローバルBAN、BANフェーズ、PICKフェーズで異なる条件を適用
 *
 * @param state - 現在のDraftState
 * @param pokemonId - ポケモンID
 * @returns 選択可能ならtrue
 */
export function isPokemonSelectable(
  state: DraftState,
  pokemonId: string
): boolean {
  // グローバルBANフェーズ（currentMatch === 0）
  if (state.currentMatch === 0) {
    // グローバルBAN中
    if (state.phase === 'ban') {
      // すでにグローバルBANされている
      if (state.globalBans.includes(pokemonId)) {
        return false
      }

      // グローバルBAN枠が埋まっている（最大30体）
      if (state.globalBans.length >= 30) {
        return false
      }

      return true
    }
    // グローバルBANフェーズでPICKフェーズに入ることはないが、安全のためfalse
    return false
  }

  // 通常試合（currentMatch >= 1）：グローバルBANチェック
  if (state.globalBans.includes(pokemonId)) {
    return false
  }

  // BANフェーズ中
  if (state.phase === 'ban') {
    // BANフェーズが完了している場合は選択不可
    if (isBanPhaseComplete(state)) {
      return false
    }

    const currentMatchBans = getCurrentMatchBans(state)

    // すでにBANされている
    if (currentMatchBans.includes(pokemonId)) {
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
  const currentTeam = getCurrentPickingTeam(state)
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
  return state.phase === 'pick' && state.currentTurn >= PICK_PHASE_TOTAL_TURNS
}

/**
 * ドラフト全体が完了したかどうかを判定
 *
 * 条件：最終試合が終了している
 *
 * @param state - 現在のDraftState
 * @returns ドラフト完了ならtrue
 */
export function isDraftComplete(state: DraftState): boolean {
  const maxMatches = state.series.maxMatches
  return state.currentMatch === maxMatches && isMatchComplete(state)
}

/**
 * 現在の試合のBANエントリを取得（nullを含む）
 *
 * @param state - 現在のDraftState
 * @param team - チーム（'A' | 'B'）
 * @returns BANエントリの配列（nullを含む）
 */
export function getCurrentMatchBanEntries(
  state: DraftState,
  team: Team
): (string | null)[] {
  const { currentMatch, bans } = state

  if (currentMatch === 0) return []

  const idx = matchToIndex(currentMatch)
  const matchBans = bans[idx]

  if (!matchBans) return []

  return matchBans[team]
}

/**
 * ランダムにピック可能なポケモンを1体選ぶ
 *
 * 以下を除外して候補を作る:
 * - BAN 済みポケモン
 * - すでに PICK 済みポケモン
 *
 * @param state - 現在のDraftState
 * @returns ランダムに選ばれたポケモンID
 */
export function pickRandomPokemon(state: DraftState): string {
  // BAN済みポケモン（グローバルBAN + 過去のBAN + 過去のPICK）
  const bannedPokemon = getBannedPokemon(state)

  // 現在の試合でPICK済みのポケモン
  const teamAPicks = getCurrentMatchPicks(state, 'A')
  const teamBPicks = getCurrentMatchPicks(state, 'B')

  // 除外リストを作成
  const excludedIds = new Set([
    ...bannedPokemon,
    ...teamAPicks,
    ...teamBPicks,
  ])

  // 候補を作成（除外リストに含まれないポケモン）
  const candidates = POKEMON_LIST.filter((pokemon) => !excludedIds.has(pokemon.id))

  if (candidates.length === 0) {
    console.error('[pickRandomPokemon] No candidates available!')
    // フォールバック：最初のポケモンを返す
    return POKEMON_LIST[0].id
  }

  // ランダムに1体選ぶ
  const randomIndex = Math.floor(Math.random() * candidates.length)
  const selected = candidates[randomIndex]

  console.log(`[pickRandomPokemon] Selected: ${selected.name} (${selected.id})`)

  return selected.id
}

/**
 * 指定チームがシーケンス内で indexInTeam 回目に登場する turn 番号を取得
 *
 * 例: sequence = ['A', 'B', 'A', 'B', 'A', 'B']
 * - getTurnNumberByTeamIndex('A', 0, sequence) → 1 (最初のA)
 * - getTurnNumberByTeamIndex('A', 1, sequence) → 3 (2番目のA)
 * - getTurnNumberByTeamIndex('B', 0, sequence) → 2 (最初のB)
 *
 * @param team - チーム ('A' | 'B')
 * @param indexInTeam - チーム内でのインデックス (0-based)
 * @param sequence - 進行順シーケンス
 * @returns turn 番号 (1-based)、見つからない場合は -1
 */
export function getTurnNumberByTeamIndex(
  team: Team,
  indexInTeam: number,
  sequence: Team[]
): number {
  let count = 0

  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === team) {
      if (count === indexInTeam) {
        return i + 1 // 1-based
      }
      count++
    }
  }

  return -1 // 見つからない場合
}
