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
    currentMatch: 1, // 第1試合から開始
    currentTurn: 0,
    phase: 'ban', // BANフェーズから開始
    globalBans: [], // グローバルBAN（廃止、互換性のため残す）
    globalBanConfirmed: true, // グローバルBAN（廃止、互換性のため残す）
    currentBanTeam: data.firstPick, // 第1試合の先行BANチーム
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
    currentMatch: 1, // 試合1から開始（グローバルBAN完了済み想定）
    currentTurn: 0,
    phase: 'ban', // BANフェーズから開始
    globalBans: [], // グローバルBAN（テスト用は空）
    globalBanConfirmed: true, // グローバルBAN完了済み
    currentBanTeam: 'A', // チームAのBAN中
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
    globalBans: [], // グローバルBAN（テスト用は空）
    globalBanConfirmed: true,
    currentBanTeam: null, // BANフェーズ完了
    banConfirmed: {
      match1: { A: true, B: true },
      match2: { A: true, B: true },
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
        A: ['talonflame', null, 'dragonite'],
        B: ['wigglytuff', 'crustle', 'hoopa'],
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
    globalBans: [], // グローバルBAN（テスト用は空）
    globalBanConfirmed: true,
    currentBanTeam: null, // BANフェーズ完了
    banConfirmed: {
      match1: { A: true, B: true },
      match2: { A: true, B: true },
      match3: { A: true, B: true },
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
        A: ['blaziken', null, 'tyranitar'],
        B: ['urshifu', 'metagross', 'alakazam'],
      },
    },
    updatedAt: now,
  }
}
