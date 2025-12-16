export type Team = 'A' | 'B'

export type DraftState = {
  tournamentName?: string
  teams: {
    A: { name: string; players: string[] }
    B: { name: string; players: string[] }
  }
  currentMatch: 1 | 2 | 3
  currentTurn: number
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
  updatedAt: string
}
