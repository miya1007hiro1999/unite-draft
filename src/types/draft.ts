export type Team = 'A' | 'B'
export type Phase = 'ready' | 'ban' | 'pick'

// BANエントリ：pokemonId または null（スキップ）
export type BanEntry = string | null

// 試合ごとのBANエントリ
export type MatchBanEntry = { A: BanEntry[]; B: BanEntry[] }

// 試合ごとのピックエントリ
export type MatchPickEntry = { A: string[]; B: string[] }

// シリーズ設定
export type SeriesConfig = {
  maxMatches: number // 最大試合数（BO5 = 5, BO7 = 7 など）
}

export type DraftState = {
  tournamentName?: string
  teams: {
    A: { name: string; players: string[] }
    B: { name: string; players: string[] }
  }
  // シリーズ設定
  series: SeriesConfig
  currentMatch: number // 0 = グローバルBANフェーズ, 1〜maxMatches = 各試合
  currentTurn: number // BANフェーズ: 0-5, PICKフェーズ: 0-9
  phase: Phase // BANフェーズ or PICKフェーズ
  // グローバルBAN（全試合共通、最大16体）
  globalBans: string[] // グローバルBANされたポケモンID
  globalBanConfirmed: boolean // グローバルBANの最終確定フラグ
  // 各試合の先攻チーム（配列: index 0 = match1）
  firstPickByMatch: Team[]
  // 各試合のピック（配列: index 0 = match1）
  picks: MatchPickEntry[]
  // 各試合のBAN（配列: index 0 = match1）
  bans: MatchBanEntry[]
  updatedAt: string
}

// ヘルパー関数：試合番号（1-based）から配列インデックス（0-based）へ変換
export function matchToIndex(matchNumber: number): number {
  return matchNumber - 1
}

// ヘルパー関数：配列インデックス（0-based）から試合番号（1-based）へ変換
export function indexToMatch(index: number): number {
  return index + 1
}
