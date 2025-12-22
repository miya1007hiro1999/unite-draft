import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createMockDraftState } from '../utils/draftState'
import type { DraftState } from '../types/draft'
import PokemonGrid from '../components/draft/PokemonGrid'
import {
  getBannedPokemon,
  getCurrentPickingTeam,
  getCurrentMatchPicks,
  getCurrentMatchBans,
  isMatchComplete,
  isDraftComplete,
} from '../utils/draftLogic'
import PlayerCardList from '../components/draft/PlayerCardList'
import {
  loadDraftState,
  loadDraftStateById,
  saveDraftState,
} from '../lib/draftStorage'

export default function DraftPage() {
  // URLパラメータから draftId と mode を取得
  const { draftId, mode } = useParams<{ draftId?: string; mode?: string }>()

  // mode が 'view' の場合は読み取り専用
  const isReadOnly = mode === 'view'

  const [state, setState] = useState<DraftState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingPick, setPendingPick] = useState<string | null>(null) // null = BANスキップ

  // React 18 StrictMode による useEffect 二重実行を防ぐためのガード
  // 開発環境でも初期化が一度だけ実行されることを保証
  const isInitialized = useRef(false)

  // 初期表示時にSupabaseからDraftStateを読み込む（一度だけ初期化）
  useEffect(() => {
    // ✅ StrictMode二重実行ガード: 既に初期化済みなら何もしない
    if (isInitialized.current) {
      console.log('[DraftPage] Already initialized, skipping...')
      return
    }

    const loadInitialState = async () => {
      try {
        console.log('[DraftPage] === Initialization START ===')
        console.log('[DraftPage] Mode:', mode || 'default', '| Draft ID:', draftId || 'none')
        console.log('[DraftPage] Read-only:', isReadOnly)

        let loadedState: DraftState | null = null

        // ケース1: URLにdraftIdが指定されている場合（運営・観戦用）
        if (draftId) {
          console.log('[DraftPage] Loading specific draft by ID...')
          loadedState = await loadDraftStateById(draftId)

          if (!loadedState) {
            console.error('[DraftPage] ❌ Draft not found:', draftId)
            // エラーメッセージを表示するため、空の状態で終了
            setIsLoading(false)
            return
          }

          console.log('[DraftPage] ✅ Loaded draft by ID')
          setState(loadedState)
        } else {
          // ケース2: URLにdraftIdがない場合（既存の挙動: /draft）
          console.log('[DraftPage] No draft ID in URL, using default behavior...')

          // Supabaseから既存ドラフトを読み込み
          loadedState = await loadDraftState()

          if (loadedState) {
            // 既存のドラフトがある場合はそれを使用（正本）
            console.log('[DraftPage] Using existing draft from Supabase')
            setState(loadedState)
          } else {
            // 既存データがない場合のみモックを作成
            console.log('[DraftPage] No existing draft, creating mock...')
            const mockState = createMockDraftState()

            // モックをSupabaseに保存してから setState
            const result = await saveDraftState(mockState)

            if (result) {
              // 成功（新規作成 or 更新）
              console.log('[DraftPage] Mock draft saved and set as initial state')
              if (typeof result === 'string') {
                console.log('[DraftPage] New draft ID:', result)
              }
              setState(mockState)
            } else {
              // 保存失敗時もモックを使用（ローカルのみで動作）
              console.warn('[DraftPage] Failed to save initial mock, using local state only')
              setState(mockState)
            }
          }
        }
      } catch (error) {
        console.error('[DraftPage] Failed to load initial state:', error)
        // エラー時はモックデータで動作
        setState(createMockDraftState())
      } finally {
        setIsLoading(false)
        console.log('[DraftPage] === Initialization END ===')
      }
    }

    // ✅ 初期化フラグを立ててから実行
    isInitialized.current = true
    loadInitialState()
  }, [draftId, mode, isReadOnly])

  // ピック追加ハンドラー（仮ピック）
  const handlePokemonPick = (pokemonId: string) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn('[DraftPage] Read-only mode: Pokemon pick disabled')
      return
    }

    // 仮ピックに保存
    console.log('[DraftPage] Pending pick:', pokemonId)
    setPendingPick(pokemonId)
  }

  // BANスキップハンドラー
  const handleSkipBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn('[DraftPage] Read-only mode: BAN skip disabled')
      return
    }

    // BANフェーズ中のみスキップ可能
    if (!state || state.phase !== 'ban') {
      console.warn('[DraftPage] BAN skip is only available during BAN phase')
      return
    }

    // nullを仮ピックとして設定（スキップを表す）
    console.log('[DraftPage] BAN skip requested')
    setPendingPick(null)
  }

  // 仮ピックを確定してSupabaseに保存（pendingPick が null の場合はスキップ）
  const handleConfirmPick = () => {
    // BANスキップ以外で null の場合は何もしない
    if (pendingPick === null && (!state || state.phase !== 'ban')) return

    setState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState

      const { currentMatch, phase } = prevState
      const pickingTeam = getCurrentPickingTeam(prevState)

      // BANフェーズ中の処理
      if (phase === 'ban') {
        // 現在の試合のBANに追加（イミュータブル更新、重複チェック付き）
        const newBans = { ...prevState.bans }
        if (currentMatch === 1) {
          const currentBans = newBans.match1[pickingTeam]
          // 重複チェック：nullは常に追加、ポケモンIDは重複時は追加しない
          if (pendingPick === null || !currentBans.includes(pendingPick)) {
            newBans.match1 = {
              ...newBans.match1,
              [pickingTeam]: [...currentBans, pendingPick],
            }
          }
        } else if (currentMatch === 2) {
          const currentBans = newBans.match2[pickingTeam]
          if (pendingPick === null || !currentBans.includes(pendingPick)) {
            newBans.match2 = {
              ...newBans.match2,
              [pickingTeam]: [...currentBans, pendingPick],
            }
          }
        } else if (currentMatch === 3) {
          const currentBans = newBans.match3[pickingTeam]
          if (pendingPick === null || !currentBans.includes(pendingPick)) {
            newBans.match3 = {
              ...newBans.match3,
              [pickingTeam]: [...currentBans, pendingPick],
            }
          }
        }

        const newTurn = prevState.currentTurn + 1

        // BANフェーズ完了判定（各チーム3体ずつ = 合計6ターン）
        const isBanComplete = newTurn >= 6

        const newState = {
          ...prevState,
          bans: newBans,
          currentTurn: isBanComplete ? 0 : newTurn, // BAN完了時はターンリセット
          phase: (isBanComplete ? 'pick' : 'ban') as 'ban' | 'pick', // BAN完了時はPICKフェーズへ
          updatedAt: new Date().toISOString(),
        }

        // デバッグ：累積BAN数を確認
        const totalBanned = getBannedPokemon(newState).length
        const banAction = pendingPick === null ? 'SKIP' : pendingPick
        console.log(
          `[DraftPage] Confirming BAN: ${banAction} (${
            isBanComplete ? 'BAN完了 → PICK移行' : `BAN ${newTurn}/6`
          }) | 累積BAN数: ${totalBanned}`
        )

        // Supabaseに保存（非同期だが待たない）
        saveDraftState(newState).catch((error) => {
          console.error('Failed to save draft state after ban:', error)
        })

        return newState
      }

      // PICKフェーズ中の処理（重複チェック付き）
      // PICKフェーズではnullは許可しない（型安全性のための早期リターン）
      if (pendingPick === null) return prevState

      const newPicks = { ...prevState.picks }
      if (currentMatch === 1) {
        const currentPicks = newPicks.match1[pickingTeam]
        // 重複チェック：既にピックされていなければ追加
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match1 = {
            ...newPicks.match1,
            [pickingTeam]: [...currentPicks, pendingPick],
          }
        }
      } else if (currentMatch === 2) {
        const currentPicks = newPicks.match2[pickingTeam]
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match2 = {
            ...newPicks.match2,
            [pickingTeam]: [...currentPicks, pendingPick],
          }
        }
      } else if (currentMatch === 3) {
        const currentPicks = newPicks.match3[pickingTeam]
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match3 = {
            ...newPicks.match3,
            [pickingTeam]: [...currentPicks, pendingPick],
          }
        }
      }

      const newState = {
        ...prevState,
        picks: newPicks,
        currentTurn: prevState.currentTurn + 1,
        updatedAt: new Date().toISOString(),
      }

      // デバッグ：累積BAN数を確認
      const totalBanned = getBannedPokemon(newState).length
      console.log(
        `[DraftPage] Confirming PICK: ${pendingPick} | 累積BAN数: ${totalBanned}`
      )
      saveDraftState(newState).catch((error) => {
        console.error('Failed to save draft state after pick:', error)
      })

      return newState
    })

    // 仮ピックをクリア
    setPendingPick(null)
  }

  // 仮ピックをキャンセル
  const handleCancelPick = () => {
    console.log('[DraftPage] Canceling pending pick')
    setPendingPick(null)
  }

  // 次の試合へ進むハンドラー
  const handleGoToNextMatch = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn('[DraftPage] Read-only mode: Match transition disabled')
      return
    }

    setState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState

      // 第3試合終了後は何もしない
      if (prevState.currentMatch === 3) {
        return prevState
      }

      const newState = {
        ...prevState,
        currentMatch: (prevState.currentMatch + 1) as 1 | 2 | 3,
        currentTurn: 0,
        phase: 'ban' as 'ban' | 'pick', // 次の試合はBANフェーズから開始
        updatedAt: new Date().toISOString(),
      }

      console.log('[DraftPage] Transitioning to next match (BAN phase)')

      // Supabaseに保存（非同期だが待たない）
      saveDraftState(newState).catch((error) => {
        console.error('Failed to save draft state after match transition:', error)
      })

      return newState
    })
  }

  // ローディング中またはstateがnullの場合は描画しない
  if (isLoading || !state) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 50%, #16213e 100%)',
          color: 'white',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              marginBottom: '1rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #4ade80 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            読み込み中...
          </div>
          <div style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#aaa' }}>
            DraftStateを取得しています
          </div>
        </div>
      </div>
    )
  }

  // この時点でstateは必ず存在する
  // BAN判定
  const bannedPokemon = getBannedPokemon(state)
  // 現在の試合でBAN済みのポケモンID配列
  const currentMatchBannedPokemonIds = getCurrentMatchBans(state)

  // 現在ピック中のチーム
  const currentPickingTeam = getCurrentPickingTeam(state)

  // 試合終了判定
  const matchComplete = isMatchComplete(state)
  const draftComplete = isDraftComplete(state)

  // 現在の試合のBAN枠を取得
  const currentMatchBanEntriesA =
    state.currentMatch === 1
      ? state.bans.match1.A
      : state.currentMatch === 2
      ? state.bans.match2.A
      : state.bans.match3.A
  const currentMatchBanEntriesB =
    state.currentMatch === 1
      ? state.bans.match1.B
      : state.currentMatch === 2
      ? state.bans.match2.B
      : state.bans.match3.B

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          padding: 'clamp(1rem, 2vw, 1.5rem) clamp(1rem, 3vw, 2rem)',
          borderBottom: '2px solid #2a2a3e',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4ade80 0%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '0.05em',
              }}
            >
              {state.tournamentName || 'ドラフト'}
              {isReadOnly && (
                <span
                  style={{
                    marginLeft: 'clamp(0.5rem, 1vw, 1rem)',
                    fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)',
                    color: '#fbbf24',
                    backgroundColor: '#78350f',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    border: '1px solid #fbbf2440',
                    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
                  }}
                >
                  👁️ 観戦モード
                </span>
              )}
            </h1>
            <div
              style={{
                fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
                marginTop: 'clamp(0.3rem, 1vw, 0.5rem)',
                color: '#aaa',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(0.5rem, 1vw, 0.75rem)',
                flexWrap: 'wrap',
              }}
            >
              <span>試合 {state.currentMatch} / 3</span>
              <span
                style={{
                  background:
                    state.phase === 'ban'
                      ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                      : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  color: 'white',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
                  fontWeight: 'bold',
                  boxShadow:
                    state.phase === 'ban'
                      ? '0 2px 8px rgba(220, 38, 38, 0.4)'
                      : '0 2px 8px rgba(74, 222, 128, 0.4)',
                }}
              >
                {state.phase === 'ban' ? '🚫 BAN' : '✓ PICK'}
              </span>
              <span>ターン {state.currentTurn}</span>
              <span
                style={{
                  color: '#666',
                  fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
                }}
              >
                (使用不可: {bannedPokemon.length}体)
              </span>
            </div>
          </div>

          {/* 運営・観戦URL表示（admin モードのみ） */}
          {!isReadOnly && draftId && (
            <div
              style={{
                fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
                textAlign: 'right',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
                padding: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                borderRadius: '8px',
                border: '1px solid #2a2a3e',
              }}
            >
              <div style={{ marginBottom: '0.5rem', color: '#4ade80' }}>
                🔗 運営URL:{' '}
                <code
                  style={{
                    backgroundColor: '#0a0a0a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    border: '1px solid #2a2a3e',
                  }}
                >
                  https://unite-draft-dun.vercel.app/draft/{draftId}/admin
                </code>
              </div>
              <div style={{ color: '#fbbf24' }}>
                👁️ 観戦URL:{' '}
                <code
                  style={{
                    backgroundColor: '#0a0a0a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    border: '1px solid #2a2a3e',
                  }}
                >
                  https://unite-draft-dun.vercel.app/draft/{draftId}/view
                </code>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ flex: 1, padding: 'clamp(1rem, 3vw, 2rem)' }}>
        <div className="draft-grid-layout">
          {/* チームA */}
          <div style={{ gridArea: 'teamA' }}>
            <div style={{ width: '80%', margin: '0 auto' }}>
              <PlayerCardList
                teamName={state.teams.A.name}
                players={state.teams.A.players}
                pickedPokemonIds={getCurrentMatchPicks(state, 'A')}
                teamColor="#e94560"
                isActive={currentPickingTeam === 'A'}
                banEntries={currentMatchBanEntriesA}
              />
            </div>
          </div>

          {/* 中央エリア（ポケモングリッド） */}
          <div
            style={{
              gridArea: 'center',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: 'clamp(12px, 2vw, 16px)',
              border: '2px solid #2a2a3e',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(1rem, 2vw, 1.5rem)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <PokemonGrid
              bannedPokemon={bannedPokemon}
              currentMatchBannedPokemonIds={currentMatchBannedPokemonIds}
              state={state}
              onPokemonPick={handlePokemonPick}
              isReadOnly={isReadOnly}
            />

            {/* 仮ピック/仮BAN確定/キャンセルボタン */}
            {pendingPick !== undefined && !isReadOnly && !matchComplete && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)',
                  padding: 'clamp(1rem, 2vw, 1.5rem)',
                  borderRadius: '12px',
                  border: `2px solid ${
                    state.phase === 'ban' ? '#ef444460' : '#fbbf2460'
                  }`,
                  boxShadow: `0 8px 24px ${
                    state.phase === 'ban'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(251, 191, 36, 0.3)'
                  }`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    color: state.phase === 'ban' ? '#ef4444' : '#fbbf24',
                    marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                    fontWeight: 'bold',
                  }}
                >
                  {pendingPick === null ? (
                    <>⏭️ BANスキップ</>
                  ) : (
                    <>
                      {state.phase === 'ban' ? '🚫 仮BAN' : '✓ 仮ピック'}:{' '}
                      <strong>{pendingPick}</strong>
                    </>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 'clamp(0.75rem, 2vw, 1rem)',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={handleConfirmPick}
                    style={{
                      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                      borderRadius: '10px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(74, 222, 128, 0.4)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 222, 128, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(74, 222, 128, 0.4)'
                    }}
                  >
                    ✓ 確定
                  </button>
                  <button
                    onClick={handleCancelPick}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                      borderRadius: '10px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    ✕ キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* BANスキップボタン（BANフェーズ中で何も選択していない時） */}
            {state.phase === 'ban' &&
              !pendingPick &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)',
                    padding: 'clamp(1rem, 2vw, 1.5rem)',
                    borderRadius: '12px',
                    border: '2px solid #6b728040',
                    boxShadow: '0 8px 24px rgba(107, 114, 128, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      color: '#9ca3af',
                      marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                      fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                    }}
                  >
                    ポケモンを選択するか、このBAN枠をスキップできます
                  </div>
                  <button
                    onClick={handleSkipBan}
                    style={{
                      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                      borderRadius: '10px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(107, 114, 128, 0.4)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow =
                        '0 8px 24px rgba(107, 114, 128, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow =
                        '0 4px 16px rgba(107, 114, 128, 0.4)'
                    }}
                  >
                    ⏭️ このBAN枠をスキップ
                  </button>
                </div>
              )}

            {/* 試合終了時のボタン・メッセージ表示 */}
            {matchComplete && !isReadOnly && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)',
                  padding: 'clamp(1.25rem, 3vw, 1.5rem)',
                  borderRadius: '12px',
                  border: '2px solid #4ade8060',
                  boxShadow: '0 8px 24px rgba(74, 222, 128, 0.3)',
                  textAlign: 'center',
                }}
              >
                {draftComplete ? (
                  // 第3試合終了：ドラフト完了
                  <div>
                    <h2
                      style={{
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
                        fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                        fontWeight: 'bold',
                      }}
                    >
                      ドラフト完了
                    </h2>
                    <p
                      style={{
                        color: '#aaa',
                        margin: '0 0 clamp(1rem, 2vw, 1.5rem) 0',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      }}
                    >
                      全3試合のドラフトが完了しました
                    </p>
                    {draftId && (
                      <Link
                        to={`/draft/${draftId}/summary`}
                        style={{
                          display: 'inline-block',
                          background: 'linear-gradient(135deg, #4ade80 0%, #3b82f6 100%)',
                          color: 'white',
                          textDecoration: 'none',
                          padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                          borderRadius: '10px',
                          fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                          fontWeight: 'bold',
                          boxShadow: '0 4px 16px rgba(74, 222, 128, 0.4)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 222, 128, 0.6)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(74, 222, 128, 0.4)'
                        }}
                      >
                        サマリーを見る
                      </Link>
                    )}
                  </div>
                ) : (
                  // 第1・第2試合終了：次の試合へ進むボタン
                  <div>
                    <h3
                      style={{
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
                        fontSize: 'clamp(1.1rem, 2.5vw, 1.2rem)',
                        fontWeight: 'bold',
                      }}
                    >
                      試合 {state.currentMatch} 終了
                    </h3>
                    <button
                      onClick={handleGoToNextMatch}
                      style={{
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        color: 'white',
                        border: 'none',
                        padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                        borderRadius: '10px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(74, 222, 128, 0.4)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 222, 128, 0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(74, 222, 128, 0.4)'
                      }}
                    >
                      次の試合へ進む（試合 {state.currentMatch + 1}）
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* チームB */}
          <div style={{ gridArea: 'teamB' }}>
            <div style={{ width: '80%', margin: '0 auto' }}>
              <PlayerCardList
                teamName={state.teams.B.name}
                players={state.teams.B.players}
                pickedPokemonIds={getCurrentMatchPicks(state, 'B')}
                teamColor="#4ade80"
                isActive={currentPickingTeam === 'B'}
                banEntries={currentMatchBanEntriesB}
              />
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#aaa',
          padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem)',
          borderTop: '2px solid #2a2a3e',
          textAlign: 'center',
          fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        最終更新: {new Date(state.updatedAt).toLocaleString('ja-JP')}
      </footer>

      {/* レスポンシブCSS */}
      <style>{`
        .draft-grid-layout {
          display: grid;
          gap: clamp(1rem, 2vw, 1.5rem);
          max-width: 1400px;
          margin: 0 auto;
        }

        /* PC: 大画面（1024px以上） - 3カラム */
        @media (min-width: 1024px) {
          .draft-grid-layout {
            grid-template-columns: 1fr 3fr 1fr;
            grid-template-areas: "teamA center teamB";
          }
        }

        /* タブレット: 中画面（768px-1023px） - 2カラム */
        @media (min-width: 768px) and (max-width: 1023px) {
          .draft-grid-layout {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "teamA teamB"
              "center center";
          }
        }

        /* スマホ: 小画面（768px未満） - Pokemon grid on top, teams side-by-side */
        @media (max-width: 767px) {
          .draft-grid-layout {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "center center"
              "teamA teamB";
          }
        }

        /* スマホ横持ち（480px以上、768px未満、横長） */
        @media (min-width: 480px) and (max-width: 767px) and (orientation: landscape) {
          .draft-grid-layout {
            grid-template-columns: 1fr 1.5fr 1fr;
            grid-template-areas: "teamA center teamB";
          }
        }
      `}</style>
    </div>
  )
}
