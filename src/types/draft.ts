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
  currentMatch: 1 | 2 | 3
  currentTurn: number
  phase: Phase // BANフェーズ or PICKフェーズ
  // BANフェーズ専用の進行管理
  currentBanTeam: Team | null // 現在BAN中のチーム（BANフェーズ外ではnull）
  currentBanCount: number // 現在のチームが行ったBAN回数（0-3）
  // BANの確定状態（試合・チームごと）
  banConfirmed: {
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
