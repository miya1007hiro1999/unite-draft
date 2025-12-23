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

        // 新しいBAN進行ロジック：仮確定方式（3回選択 → 確定ボタン待ち）
        const newBanCount = prevState.currentBanCount + 1

        // 3回選択完了したら仮確定状態（自動遷移しない）
        const newState = {
          ...prevState,
          bans: newBans,
          currentBanCount: newBanCount,
          updatedAt: new Date().toISOString(),
        }

        // デバッグ：累積BAN数を確認
        const totalBanned = getBannedPokemon(newState).length
        const banAction = pendingPick === null ? 'SKIP' : pendingPick

        if (newBanCount === 3) {
          console.log(
            `[DraftPage] Tentative BAN confirmation: ${banAction} | Team ${pickingTeam}: ${newBanCount}/3 | 仮確定 → 確定ボタン待ち | 累積BAN数: ${totalBanned}`
          )
        } else {
          console.log(
            `[DraftPage] Confirming BAN: ${banAction} | Team ${pickingTeam}: ${newBanCount}/3 | 累積BAN数: ${totalBanned}`
          )
        }

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

  // 仮確定中のBANを取り消すハンドラー
  const handleCancelBan = (banIndex: number) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn('[DraftPage] Read-only mode: BAN cancellation disabled')
      return
    }

    setState((prevState) => {
      // prevStateがnullの場合は何もしない
      if (!prevState) return prevState

      // BANフェーズ中でない場合は何もしない
      if (prevState.phase !== 'ban') {
        console.warn('[DraftPage] Not in BAN phase')
        return prevState
      }

      const { currentMatch, currentBanTeam } = prevState

      // 現在のチームが確定済みの場合は取り消し不可
      let isConfirmed = false
      if (currentMatch === 1) {
        isConfirmed = prevState.banConfirmed.match1[currentBanTeam!]
      } else if (currentMatch === 2) {
        isConfirmed = prevState.banConfirmed.match2[currentBanTeam!]
      } else if (currentMatch === 3) {
        isConfirmed = prevState.banConfirmed.match3[currentBanTeam!]
      }

      if (isConfirmed) {
        console.warn('[DraftPage] BAN already confirmed, cannot cancel')
        return prevState
      }

      // BAN配列から指定されたインデックスの要素を削除
      const newBans = { ...prevState.bans }
      if (currentMatch === 1) {
        const currentBans = [...newBans.match1[currentBanTeam!]]
        currentBans.splice(banIndex, 1)
        newBans.match1 = {
          ...newBans.match1,
          [currentBanTeam!]: currentBans,
        }
      } else if (currentMatch === 2) {
        const currentBans = [...newBans.match2[currentBanTeam!]]
        currentBans.splice(banIndex, 1)
        newBans.match2 = {
          ...newBans.match2,
          [currentBanTeam!]: currentBans,
        }
      } else if (currentMatch === 3) {
        const currentBans = [...newBans.match3[currentBanTeam!]]
        currentBans.splice(banIndex, 1)
        newBans.match3 = {
          ...newBans.match3,
          [currentBanTeam!]: currentBans,
        }
      }

      const newState = {
        ...prevState,
        bans: newBans,
        currentBanCount: prevState.currentBanCount - 1,
        updatedAt: new Date().toISOString(),
      }

      console.log(
        `[DraftPage] Cancelled BAN at index ${banIndex} | Team ${currentBanTeam}: ${newState.currentBanCount}/3`
      )

      // Supabaseに保存（非同期だが待たない）
      saveDraftState(newState).catch((error) => {
        console.error('Failed to save draft state after BAN cancellation:', error)
      })

      return newState
    })
  }

  // BANを最終確定するハンドラー（仮確定 → 最終確定）
  const handleConfirmBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn('[DraftPage] Read-only mode: BAN confirmation disabled')
      return
    }

    setState((prevState) => {
      // prevStateがnullの場合は何もしない
      if (!prevState) return prevState

      // BANフェーズ中でない場合は何もしない
      if (prevState.phase !== 'ban') {
        console.warn('[DraftPage] Not in BAN phase')
        return prevState
      }

      // 3回BAN選択されていない場合は何もしない
      if (prevState.currentBanCount !== 3) {
        console.warn('[DraftPage] BAN count is not 3, cannot confirm')
        return prevState
      }

      const { currentMatch, currentBanTeam } = prevState

      // 現在のチームのBAN確定フラグを立てる
      const newBanConfirmed = { ...prevState.banConfirmed }
      if (currentMatch === 1) {
        newBanConfirmed.match1 = {
          ...newBanConfirmed.match1,
          [currentBanTeam!]: true,
        }
      } else if (currentMatch === 2) {
        newBanConfirmed.match2 = {
          ...newBanConfirmed.match2,
          [currentBanTeam!]: true,
        }
      } else if (currentMatch === 3) {
        newBanConfirmed.match3 = {
          ...newBanConfirmed.match3,
          [currentBanTeam!]: true,
        }
      }

      // 次のチームまたは次フェーズへの遷移を決定
      // 試合ごとの先行チーム情報を使用
      const firstPickTeam = prevState.firstPickByMatch[currentMatch]
      const secondPickTeam = firstPickTeam === 'A' ? 'B' : 'A'

      let nextBanTeam = currentBanTeam
      let nextBanCount = prevState.currentBanCount
      let nextPhase: 'ban' | 'pick' = 'ban'
      let nextTurn = prevState.currentTurn

      if (currentBanTeam === firstPickTeam) {
        // 先行チームが確定 → 後攻チームに移行
        nextBanTeam = secondPickTeam
        nextBanCount = 0
        console.log(`[DraftPage] Match ${currentMatch}: Team ${firstPickTeam} BAN confirmed → Switching to Team ${secondPickTeam}`)
      } else if (currentBanTeam === secondPickTeam) {
        // 後攻チームが確定 → PICKフェーズに移行
        nextPhase = 'pick'
        nextBanTeam = null
        nextBanCount = 0
        nextTurn = 0
        console.log(`[DraftPage] Match ${currentMatch}: Team ${secondPickTeam} BAN confirmed → Transitioning to PICK phase`)
      }

      const newState = {
        ...prevState,
        banConfirmed: newBanConfirmed,
        currentBanTeam: nextBanTeam,
        currentBanCount: nextBanCount,
        phase: nextPhase,
        currentTurn: nextTurn,
        updatedAt: new Date().toISOString(),
      }

      // Supabaseに保存（非同期だが待たない）
      saveDraftState(newState).catch((error) => {
        console.error('Failed to save draft state after BAN confirmation:', error)
      })

      return newState
    })
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

      // 次の試合の先攻チームを取得
      const nextMatch = (prevState.currentMatch + 1) as 1 | 2 | 3
      const nextMatchFirstPick = prevState.firstPickByMatch[nextMatch]

      const newState = {
        ...prevState,
        currentMatch: nextMatch,
        currentTurn: 0,
        phase: 'ban' as 'ban' | 'pick', // 次の試合はBANフェーズから開始
        currentBanTeam: nextMatchFirstPick, // 次の試合の先攻チームがBAN開始
        currentBanCount: 0, // BAN回数をリセット
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
          background: 'rgba(255, 255, 255, 0.87)',
          color: '#1f2937',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              marginBottom: '1rem',
              fontWeight: 'bold',
              color: '#059669',
            }}
          >
            読み込み中...
          </div>
          <div style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#6b7280' }}>
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

  // BAN取り消し可能かどうかを判定（仮確定中のみ）
  const getBanConfirmedForTeam = (team: 'A' | 'B'): boolean => {
    if (state.currentMatch === 1) return state.banConfirmed.match1[team]
    if (state.currentMatch === 2) return state.banConfirmed.match2[team]
    if (state.currentMatch === 3) return state.banConfirmed.match3[team]
    return false
  }

  const isBanCancellableA =
    state.phase === 'ban' &&
    state.currentBanTeam === 'A' &&
    !getBanConfirmedForTeam('A') &&
    !isReadOnly

  const isBanCancellableB =
    state.phase === 'ban' &&
    state.currentBanTeam === 'B' &&
    !getBanConfirmedForTeam('B') &&
    !isReadOnly

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.87)',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          flexShrink: 0,
          background: '#ffffff',
          color: '#1f2937',
          padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
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
                fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                fontWeight: 'bold',
                color: '#111827',
                letterSpacing: '0.05em',
              }}
            >
              {state.tournamentName || 'ドラフト'}
              {isReadOnly && (
                <span
                  style={{
                    marginLeft: 'clamp(0.3rem, 0.8vw, 0.5rem)',
                    fontSize: 'clamp(0.55rem, 1.2vw, 0.7rem)',
                    color: '#92400e',
                    backgroundColor: '#fef3c7',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    border: '1px solid #fbbf24',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  👁️ 観戦モード
                </span>
              )}
            </h1>
            <div
              style={{
                fontSize: 'clamp(0.6rem, 1.3vw, 0.75rem)',
                marginTop: 'clamp(0.2rem, 0.6vw, 0.3rem)',
                color: '#6b7280',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(0.3rem, 0.8vw, 0.5rem)',
                flexWrap: 'wrap',
              }}
            >
              <span>試合 {state.currentMatch} / 3</span>
              <span
                style={{
                  background:
                    state.phase === 'ban'
                      ? '#fee2e2'
                      : '#d1fae5',
                  color: state.phase === 'ban' ? '#991b1b' : '#065f46',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '4px',
                  fontSize: 'clamp(0.55rem, 1.2vw, 0.65rem)',
                  fontWeight: 'bold',
                  border: state.phase === 'ban' ? '1px solid #dc2626' : '1px solid #10b981',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {state.phase === 'ban' ? '🚫 BAN' : '✓ PICK'}
              </span>
              <span>ターン {state.currentTurn}</span>
              <span
                style={{
                  color: '#9ca3af',
                  fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
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
                fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
                textAlign: 'right',
                background: '#f9fafb',
                padding: 'clamp(0.3rem, 1vw, 0.5rem)',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ marginBottom: '0.3rem', color: '#059669' }}>
                🔗 運営URL:{' '}
                <code
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0.15rem 0.3rem',
                    borderRadius: '3px',
                    fontSize: '0.85em',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                  }}
                >
                  https://unite-draft-dun.vercel.app/draft/{draftId}/admin
                </code>
              </div>
              <div style={{ color: '#d97706' }}>
                👁️ 観戦URL:{' '}
                <code
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0.15rem 0.3rem',
                    borderRadius: '3px',
                    fontSize: '0.85em',
                    border: '1px solid #d1d5db',
                    color: '#374151',
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
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 'clamp(0.5rem, 1.5vw, 1rem)',
        }}
      >
        <div className="draft-grid-layout">
          {/* チームA */}
          <div style={{ gridArea: 'teamA' }}>
            <div style={{ width: '100%' }}>
              <PlayerCardList
                teamName={state.teams.A.name}
                players={state.teams.A.players}
                pickedPokemonIds={getCurrentMatchPicks(state, 'A')}
                teamColor="#e94560"
                isActive={currentPickingTeam === 'A'}
                banEntries={currentMatchBanEntriesA}
                isBanCancellable={isBanCancellableA}
                onCancelBan={handleCancelBan}
              />
            </div>
          </div>

          {/* 中央エリア（ポケモングリッド） */}
          <div
            style={{
              gridArea: 'center',
              background: '#ffffff',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: 'clamp(12px, 2vw, 16px)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(1rem, 2vw, 1.5rem)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
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
                  background: '#f9fafb',
                  padding: 'clamp(0.6rem, 1.5vw, 1rem)',
                  borderRadius: '8px',
                  border: `1.5px solid ${
                    state.phase === 'ban' ? '#dc2626' : '#f59e0b'
                  }`,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    color: state.phase === 'ban' ? '#dc2626' : '#d97706',
                    marginBottom: 'clamp(0.5rem, 1.3vw, 0.75rem)',
                    fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
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
                    gap: 'clamp(0.5rem, 1.3vw, 0.75rem)',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={handleConfirmPick}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)',
                      borderRadius: '6px',
                      fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#059669'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#10b981'
                    }}
                  >
                    ✓ 確定
                  </button>
                  <button
                    onClick={handleCancelPick}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)',
                      borderRadius: '6px',
                      fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#dc2626'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#ef4444'
                    }}
                  >
                    ✕ キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* BANスキップボタン（BANフェーズ中で何も選択していない時、かつ3枠未満） */}
            {state.phase === 'ban' &&
              !pendingPick &&
              state.currentBanCount < 3 &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: '#f9fafb',
                    padding: 'clamp(0.6rem, 1.5vw, 1rem)',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      color: '#6b7280',
                      marginBottom: 'clamp(0.5rem, 1.3vw, 0.75rem)',
                      fontSize: 'clamp(0.65rem, 1.4vw, 0.75rem)',
                    }}
                  >
                    ポケモンを選択するか、このBAN枠をスキップできます
                  </div>
                  <button
                    onClick={handleSkipBan}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)',
                      borderRadius: '6px',
                      fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#4b5563'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#6b7280'
                    }}
                  >
                    ⏭️ このBAN枠をスキップ
                  </button>
                </div>
              )}

            {/* BAN確定ボタン（3枠すべて選択完了時） */}
            {state.phase === 'ban' &&
              !pendingPick &&
              state.currentBanCount === 3 &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: '#fef3c7',
                    padding: 'clamp(1rem, 2vw, 1.5rem)',
                    borderRadius: '12px',
                    border: '2px solid #f59e0b',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      color: '#d97706',
                      marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)',
                      fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                      fontWeight: 'bold',
                    }}
                  >
                    ⚠️ チーム{state.currentBanTeam}のBAN3枠すべて選択完了（仮確定）
                  </div>
                  <div
                    style={{
                      color: '#92400e',
                      marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)',
                      fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                    }}
                  >
                    確定ボタンを押すと次に進みます。修正する場合はBAN枠をクリックして取り消せます。
                  </div>
                  <button
                    onClick={handleConfirmBan}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                      borderRadius: '10px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)'
                      e.currentTarget.style.background = '#d97706'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.background = '#f59e0b'
                    }}
                  >
                    🔒 BANを確定する
                  </button>
                </div>
              )}

            {/* 試合終了時のボタン・メッセージ表示 */}
            {matchComplete && !isReadOnly && (
              <div
                style={{
                  background: '#f0fdf4',
                  padding: 'clamp(1.25rem, 3vw, 1.5rem)',
                  borderRadius: '12px',
                  border: '2px solid #10b981',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  textAlign: 'center',
                }}
              >
                {draftComplete ? (
                  // 第3試合終了：ドラフト完了
                  <div>
                    <h2
                      style={{
                        color: '#059669',
                        margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
                        fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                        fontWeight: 'bold',
                      }}
                    >
                      ドラフト完了
                    </h2>
                    <p
                      style={{
                        color: '#6b7280',
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
                          background: '#10b981',
                          color: 'white',
                          textDecoration: 'none',
                          padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                          borderRadius: '10px',
                          fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                          fontWeight: 'bold',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                          e.currentTarget.style.background = '#059669'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                          e.currentTarget.style.background = '#10b981'
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
                        color: '#059669',
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
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)',
                        borderRadius: '10px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                        e.currentTarget.style.background = '#059669'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                        e.currentTarget.style.background = '#10b981'
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
            <div style={{ width: '100%' }}>
              <PlayerCardList
                teamName={state.teams.B.name}
                players={state.teams.B.players}
                pickedPokemonIds={getCurrentMatchPicks(state, 'B')}
                teamColor="#4ade80"
                isActive={currentPickingTeam === 'B'}
                banEntries={currentMatchBanEntriesB}
                isBanCancellable={isBanCancellableB}
                onCancelBan={handleCancelBan}
              />
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer
        style={{
          flexShrink: 0,
          background: '#ffffff',
          color: '#9ca3af',
          padding: 'clamp(0.3rem, 1vw, 0.5rem) clamp(0.5rem, 2vw, 1rem)',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: 'clamp(0.6rem, 1.2vw, 0.7rem)',
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        最終更新: {new Date(state.updatedAt).toLocaleString('ja-JP')}
      </footer>

      {/* レスポンシブCSS */}
      <style>{`
        .draft-grid-layout {
          display: grid;
          grid-template-rows: auto 1fr;
          grid-template-columns: 1fr 1fr;
          grid-template-areas:
            "center center"
            "teamA teamB";
          gap: clamp(0.75rem, 1.5vw, 1rem);
          max-width: 1400px;
          margin: 0 auto;
        }

        /* 全画面で統一レイアウト: 上段にPokemonGrid、下段にチーム並列 */
        @media (min-width: 768px) {
          .draft-grid-layout {
            grid-template-rows: auto 1fr;
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "center center"
              "teamA teamB";
          }
        }

        /* スマホ: 小画面（768px未満） */
        @media (max-width: 767px) {
          .draft-grid-layout {
            grid-template-rows: auto 1fr;
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "center center"
              "teamA teamB";
          }
        }
      `}</style>
    </div>
  )
}
