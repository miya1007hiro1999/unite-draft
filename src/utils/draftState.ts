import type { DraftState, Team, MatchBanEntry, MatchPickEntry } from '../types/draft'

// デフォルトの最大試合数（BO5）
export const DEFAULT_MAX_MATCHES = 5

export interface SetupData {
  tournamentName?: string
  teamAName: string
  teamBName: string
  teamAPlayers: string[]
  teamBPlayers: string[]
  firstPick: Team
  maxMatches?: number // オプション: デフォルトは5（BO5）
}

/**
 * 空の試合配列を生成するヘルパー関数
 */
function createEmptyMatchArrays(maxMatches: number, firstPick: Team): {
  firstPickByMatch: Team[]
  picks: MatchPickEntry[]
  bans: MatchBanEntry[]
} {
  const firstPickByMatch: Team[] = []
  const picks: MatchPickEntry[] = []
  const bans: MatchBanEntry[] = []

  for (let i = 0; i < maxMatches; i++) {
    // 先攻は交互（match1 = firstPick, match2 = 反対, match3 = firstPick, ...）
    firstPickByMatch.push(i % 2 === 0 ? firstPick : (firstPick === 'A' ? 'B' : 'A'))
    picks.push({ A: [], B: [] })
    bans.push({ A: [], B: [] })
  }

  return { firstPickByMatch, picks, bans }
}

/**
 * Setup画面の入力データから初期DraftStateを生成
 */
export function createInitialDraftState(data: SetupData): DraftState {
  const now = new Date().toISOString()
  const maxMatches = data.maxMatches ?? DEFAULT_MAX_MATCHES

  const { firstPickByMatch, picks, bans } = createEmptyMatchArrays(maxMatches, data.firstPick)

  return {
    tournamentName: data.tournamentName,
    teams: {
      A: {
        name: data.teamAName,
        players: data.teamAPlayers,
      },
      B: {
        name: data.teamBName,
        players: data.teamBPlayers,
      },
    },
    series: {
      maxMatches,
    },
    currentMatch: 1, // 第1試合から開始
    currentTurn: 0, // BANフェーズ turn 0 から開始
    phase: 'ready', // 試合開始確認待ち（adminが「開始する」を押すまで）
    globalBans: [], // グローバルBAN（廃止、互換性のため残す）
    globalBanConfirmed: true, // グローバルBAN（廃止、互換性のため残す）
    firstPickByMatch,
    picks,
    bans,
    updatedAt: now,
  }
}

/**
 * テスト用のモックDraftStateを生成
 * UI実装時の表示確認用
 * デフォルトは第1試合、空の状態から開始
 */
export function createMockDraftState(): DraftState {
  const now = new Date().toISOString()
  const maxMatches = DEFAULT_MAX_MATCHES
  const firstPick: Team = 'A'

  const { firstPickByMatch, picks, bans } = createEmptyMatchArrays(maxMatches, firstPick)

  return {
    tournamentName: '第1回サンプルトーナメント',
    teams: {
      A: {
        name: 'チームアルファ',
        players: ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'],
      },
      B: {
        name: 'チームベータ',
        players: ['PlayerA', 'PlayerB', 'PlayerC', 'PlayerD', 'PlayerE'],
      },
    },
    series: {
      maxMatches,
    },
    currentMatch: 1, // 試合1から開始
    currentTurn: 0, // BANフェーズ turn 0 から開始
    phase: 'ready', // 試合開始確認待ち（adminが「開始する」を押すまで）
    globalBans: [],
    globalBanConfirmed: true,
    firstPickByMatch,
    picks,
    bans,
    updatedAt: now,
  }
}

/**
 * テスト用：第2試合のモックDraftState
 * BAN判定確認用（match1のピックがBANされる）
 */
export function createMockDraftStateMatch2(): DraftState {
  const now = new Date().toISOString()
  const maxMatches = DEFAULT_MAX_MATCHES
  const firstPick: Team = 'A'

  const { firstPickByMatch, picks, bans } = createEmptyMatchArrays(maxMatches, firstPick)

  // match1 完了済み
  picks[0] = {
    A: ['pikachu', 'charizard', 'lucario'],
    B: ['snorlax', 'greninja', 'cinderace'],
  }
  picks[1] = {
    A: ['garchomp'],
    B: ['sylveon'],
  }
  bans[0] = {
    A: ['gengar', 'absol', 'zeraora'],
    B: ['blastoise', 'venusaur', 'slowbro'],
  }
  bans[1] = {
    A: ['talonflame', null, 'dragonite'],
    B: ['wigglytuff', 'crustle', 'hoopa'],
  }

  return {
    tournamentName: '第1回サンプルトーナメント',
    teams: {
      A: {
        name: 'チームアルファ',
        players: ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'],
      },
      B: {
        name: 'チームベータ',
        players: ['PlayerA', 'PlayerB', 'PlayerC', 'PlayerD', 'PlayerE'],
      },
    },
    series: {
      maxMatches,
    },
    currentMatch: 2,
    currentTurn: 2, // PICKフェーズ turn 2
    phase: 'pick',
    globalBans: [],
    globalBanConfirmed: true,
    firstPickByMatch,
    picks,
    bans,
    updatedAt: now,
  }
}

/**
 * テスト用：第3試合のモックDraftState
 * BAN判定確認用（match1とmatch2のピックがBANされる）
 */
export function createMockDraftStateMatch3(): DraftState {
  const now = new Date().toISOString()
  const maxMatches = DEFAULT_MAX_MATCHES
  const firstPick: Team = 'A'

  const { firstPickByMatch, picks, bans } = createEmptyMatchArrays(maxMatches, firstPick)

  // match1, match2 完了済み
  picks[0] = {
    A: ['pikachu', 'charizard', 'lucario'],
    B: ['snorlax', 'greninja', 'cinderace'],
  }
  picks[1] = {
    A: ['garchomp', 'sylveon', 'machamp'],
    B: ['venusaur', 'blastoise', 'gengar'],
  }
  picks[2] = {
    A: ['gardevoir'],
    B: [],
  }

  bans[0] = {
    A: ['absol', 'zeraora', 'talonflame'],
    B: ['slowbro', 'wigglytuff', 'crustle'],
  }
  bans[1] = {
    A: ['greedent', 'hoopa', 'tsareena'],
    B: ['decidueye', 'dragonite', 'espeon'],
  }
  bans[2] = {
    A: ['blaziken', null, 'tyranitar'],
    B: ['urshifu', 'metagross', 'alakazam'],
  }

  return {
    tournamentName: '第1回サンプルトーナメント',
    teams: {
      A: {
        name: 'チームアルファ',
        players: ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'],
      },
      B: {
        name: 'チームベータ',
        players: ['PlayerA', 'PlayerB', 'PlayerC', 'PlayerD', 'PlayerE'],
      },
    },
    series: {
      maxMatches,
    },
    currentMatch: 3,
    currentTurn: 1, // PICKフェーズ turn 1
    phase: 'pick',
    globalBans: [],
    globalBanConfirmed: true,
    firstPickByMatch,
    picks,
    bans,
    updatedAt: now,
  }
}
