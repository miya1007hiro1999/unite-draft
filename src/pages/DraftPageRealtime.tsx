import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDraftRealtime } from '../hooks/useDraftRealtime'
import { confirmPick, confirmBan } from '../lib/draftActions'
import type { Pokemon } from '../types/pokemon'
import { getPokemonById } from '../data/pokemon'
import { getCurrentPickingTeam } from '../utils/draftLogic'

/**
 * Realtime対応のDraftPage
 *
 * 重要な設計原則:
 * 1. 確定操作は confirmPick/confirmBan のみ（DB INSERTのみ）
 * 2. setState は呼ばない
 * 3. UI更新は Realtime イベント経由のみ
 * 4. pendingPick（未確定）はローカル state に閉じる
 */
export default function DraftPageRealtime() {
  const { draftId, mode } = useParams<{ draftId?: string; mode?: string }>()
  const isReadOnly = mode === 'view'

  // Realtime state（DB と同期）
  const { draftState, confirmedActions, isLoading, error } = useDraftRealtime({
    draftId,
    enabled: true,
  })

  // ローカル state（未確定操作のみ）
  const [pendingPick, setPendingPick] = useState<Pokemon | null>(null)

  // ポケモン選択ハンドラー（仮ピック）
  const handlePokemonPick = (pokemonId: string) => {
    if (isReadOnly || !draftState) return

    const pokemon = getPokemonById(pokemonId)
    if (pokemon) {
      console.log('[DraftPageRealtime] Pending pick:', pokemon.name)
      setPendingPick(pokemon)
    }
  }

  // PICK確定ハンドラー
  const handleConfirmPick = async () => {
    if (!draftState || !pendingPick || !draftId) return

    // 現在のorder_indexを計算（confirmedActionsの長さ + 1）
    const orderIndex = confirmedActions.length + 1

    // 現在ピック中のチーム
    const pickingTeam = getCurrentPickingTeam(draftState)

    console.log('[DraftPageRealtime] Confirming pick:', pendingPick.name)

    // DB に INSERT（setState は呼ばない）
    const success = await confirmPick(
      draftId,
      pickingTeam,
      pendingPick.id,
      orderIndex,
      draftState
    )

    if (success) {
      // pendingPick をクリア（Realtime で state が更新される）
      setPendingPick(null)
    } else {
      console.error('[DraftPageRealtime] Failed to confirm pick')
      // エラーハンドリング（必要に応じて）
    }
  }

  // BAN確定ハンドラー（ABABAB turn制）
  const handleConfirmBan = async (pokemonId: string | null) => {
    if (!draftState || !draftId) return

    console.log('[DraftPageRealtime] Confirming ban:', pokemonId ?? 'SKIP')

    // DB に INSERT（setState は呼ばない）
    const success = await confirmBan(draftId, pokemonId, draftState)

    if (!success) {
      console.error('[DraftPageRealtime] Failed to confirm ban')
    }
  }

  // BANスキップハンドラー（ABABAB turn制）
  const handleSkipBan = async () => {
    if (!draftState || !draftId) return

    console.log('[DraftPageRealtime] Skipping ban')

    // null を渡してスキップ
    const success = await confirmBan(draftId, null, draftState)

    if (!success) {
      console.error('[DraftPageRealtime] Failed to skip ban')
    }
  }

  // ローディング中
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        読み込み中...
      </div>
    )
  }

  // エラー
  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        エラー: {error}
      </div>
    )
  }

  // state なし
  if (!draftState) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ドラフトが見つかりません
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Realtime Draft</h1>

      {/* デバッグ情報 */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0f0f0' }}>
        <h3>Debug Info</h3>
        <p>Draft ID: {draftId}</p>
        <p>Mode: {isReadOnly ? 'View (Read-only)' : 'Admin'}</p>
        <p>Current Match: {draftState.currentMatch}</p>
        <p>Current Turn: {draftState.currentTurn}</p>
        <p>Phase: {draftState.phase}</p>
        <p>Confirmed Actions: {confirmedActions.length}</p>
        <p>Pending Pick: {pendingPick?.name || 'None'}</p>
      </div>

      {/* 確定ログ */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Confirmed Actions</h3>
        <ul>
          {confirmedActions.map((action) => (
            <li key={action.id}>
              #{action.order_index} - {action.action_type.toUpperCase()} - Team{' '}
              {action.team} - {action.pokemon_id}
            </li>
          ))}
        </ul>
      </div>

      {/* 仮ピック確定ボタン（PICKフェーズのみ） */}
      {pendingPick && draftState.phase === 'pick' && !isReadOnly && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fffacd' }}>
          <p>仮ピック: {pendingPick.name}</p>
          <button onClick={handleConfirmPick}>✓ 確定</button>
          <button onClick={() => setPendingPick(null)}>✕ キャンセル</button>
        </div>
      )}

      {/* BANスキップボタン（BANフェーズのみ） */}
      {draftState.phase === 'ban' && !isReadOnly && (
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={handleSkipBan}>⏭️ BANスキップ</button>
        </div>
      )}

      {/* ポケモングリッド（簡易版） */}
      <div>
        <h3>Pokemon Grid</h3>
        <p>
          ※ 実際のUIは既存のPokemonGridコンポーネントを使用
          <br />
          ※ ここでは動作確認用の簡易版のみ
        </p>
        <button onClick={() => handlePokemonPick('pikachu')}>Pikachu を選ぶ</button>
        <button onClick={() => handleConfirmBan('charizard')}>
          Charizard を BAN
        </button>
      </div>

      {/* リアルタイム同期の動作確認 */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e0ffe0' }}>
        <h3>✓ Realtime 同期が有効</h3>
        <p>他の端末で操作すると、このページも自動的に更新されます</p>
        <p>
          最終更新:{' '}
          {draftState.updatedAt
            ? new Date(draftState.updatedAt).toLocaleString('ja-JP')
            : 'N/A'}
        </p>
      </div>
    </div>
  )
}
