import type { DraftState, Team } from '../types/draft'

export interface SetupData {
  tournamentName?: string
  teamAName: string
  teamBName: string
  teamAPlayers: string[]
  teamBPlayers: string[]
  firstPick: Team
}

/**
 * Setup画面の入力データから初期DraftStateを生成
 */
export function createInitialDraftState(data: SetupData): DraftState {
  const now = new Date().toISOString()

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
    currentMatch: 1,
    currentTurn: 0,
    phase: 'ban', // BANフェーズから開始
    currentBanTeam: data.firstPick, // 先攻チームがBAN開始
    currentBanCount: 0, // BAN回数は0から
    banConfirmed: {
      match1: { A: false, B: false },
      match2: { A: false, B: false },
      match3: { A: false, B: false },
    },
    firstPickByMatch: {
      1: data.firstPick,
      2: data.firstPick === 'A' ? 'B' : 'A',
      3: data.firstPick,
    },
    picks: {
      match1: { A: [], B: [] },
      match2: { A: [], B: [] },
      match3: { A: [], B: [] },
    },
    bans: {
      match1: { A: [], B: [] },
      match2: { A: [], B: [] },
      match3: { A: [], B: [] },
    },
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
    currentMatch: 1,
    currentTurn: 0,
    phase: 'ban', // BANフェーズから開始
    currentBanTeam: 'A', // チームAがBAN開始
    currentBanCount: 0, // BAN回数は0から
    banConfirmed: {
      match1: { A: false, B: false },
      match2: { A: false, B: false },
      match3: { A: false, B: false },
    },
    firstPickByMatch: {
      1: 'A',
      2: 'B',
      3: 'A',
    },
    picks: {
      match1: { A: [], B: [] },
      match2: { A: [], B: [] },
      match3: { A: [], B: [] },
    },
    bans: {
      match1: { A: [], B: [] },
      match2: { A: [], B: [] },
      match3: { A: [], B: [] },
    },
    updatedAt: now,
  }
}

/**
 * テスト用：第2試合のモックDraftState
 * BAN判定確認用（match1のピックがBANされる）
 */
export function createMockDraftStateMatch2(): DraftState {
  const now = new Date().toISOString()

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
    currentMatch: 2,
    currentTurn: 2,
    phase: 'pick', // PICKフェーズ
    currentBanTeam: null, // PICKフェーズ中はnull
    currentBanCount: 0, // PICKフェーズ中は0
    banConfirmed: {
      match1: { A: true, B: true }, // 第1試合は確定済み
      match2: { A: true, B: false }, // 第2試合は進行中
      match3: { A: false, B: false },
    },
    firstPickByMatch: {
      1: 'A',
      2: 'B',
      3: 'A',
    },
    picks: {
      match1: {
        A: ['pikachu', 'charizard', 'lucario'],
        B: ['snorlax', 'greninja', 'cinderace'],
      },
      match2: {
        A: ['garchomp'],
        B: ['sylveon'],
      },
      match3: { A: [], B: [] },
    },
    bans: {
      match1: {
        A: ['gengar', 'absol', 'zeraora'],
        B: ['blastoise', 'venusaur', 'slowbro'],
      },
      match2: {
        A: ['talonflame'],
        B: ['wigglytuff'],
      },
      match3: { A: [], B: [] },
    },
    updatedAt: now,
  }
}

/**
 * テスト用：第3試合のモックDraftState
 * BAN判定確認用（match1とmatch2のピックがBANされる）
 */
export function createMockDraftStateMatch3(): DraftState {
  const now = new Date().toISOString()

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
    currentMatch: 3,
    currentTurn: 1,
    phase: 'pick', // PICKフェーズ
    currentBanTeam: null, // PICKフェーズ中はnull
    currentBanCount: 0, // PICKフェーズ中は0
    banConfirmed: {
      match1: { A: true, B: true }, // 第1試合は確定済み
      match2: { A: true, B: true }, // 第2試合は確定済み
      match3: { A: false, B: false }, // 第3試合は進行中
    },
    firstPickByMatch: {
      1: 'A',
      2: 'B',
      3: 'A',
    },
    picks: {
      match1: {
        A: ['pikachu', 'charizard', 'lucario'],
        B: ['snorlax', 'greninja', 'cinderace'],
      },
      match2: {
        A: ['garchomp', 'sylveon', 'machamp'],
        B: ['venusaur', 'blastoise', 'gengar'],
      },
      match3: {
        A: ['gardevoir'],
        B: [],
      },
    },
    bans: {
      match1: {
        A: ['absol', 'zeraora', 'talonflame'],
        B: ['slowbro', 'wigglytuff', 'crustle'],
      },
      match2: {
        A: ['greedent', 'hoopa', 'tsareena'],
        B: ['decidueye', 'dragonite', 'espeon'],
      },
      match3: {
        A: ['blaziken'],
        B: [],
      },
    },
    updatedAt: now,
  }
}
