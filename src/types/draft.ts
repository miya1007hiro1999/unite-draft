export type Team = 'A' | 'B'
export type Phase = 'ban' | 'pick'

// BANエントリ：pokemonId または null（スキップ）
export type BanEntry = string | null

export type DraftState = {
  tournamentName?: string
  teams: {
    A: { name: string; players: string[] }
    B: { name: string; players: string[] }
  }
  currentMatch: 0 | 1 | 2 | 3 // 0 = グローバルBANフェーズ
  currentTurn: number
  phase: Phase // BANフェーズ or PICKフェーズ
  // グローバルBAN（全試合共通、最大16体）
  globalBans: string[] // グローバルBANされたポケモンID
  globalBanConfirmed: boolean // グローバルBANの最終確定フラグ
  // 試合BAN専用の進行管理
  currentBanTeam: Team | null // 現在BAN中のチーム（nullはグローバルBAN中 or BAN完了）
  banConfirmed: {
    // 各試合・各チームのBAN最終確定フラグ
    match1: { A: boolean; B: boolean }
    match2: { A: boolean; B: boolean }
    match3: { A: boolean; B: boolean }
  }
  firstPickByMatch: {
    1: Team
    2: Team
    3: Team
  }
  picks: {
    match1: { A: string[]; B: string[] }
    match2: { A: string[]; B: string[] }
    match3: { A: string[]; B: string[] }
  }
  bans: {
    match1: { A: BanEntry[]; B: BanEntry[] }
    match2: { A: BanEntry[]; B: BanEntry[] }
    match3: { A: BanEntry[]; B: BanEntry[] }
  }
  updatedAt: string
}
