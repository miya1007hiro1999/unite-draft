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
