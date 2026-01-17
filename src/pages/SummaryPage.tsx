import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadDraftStateById } from '../lib/draftStorage'
import type { DraftState } from '../types/draft'
import { POKEMON_LIST } from '../data/pokemon'
import { getPokemonImage } from '../utils/pokemonImage'

// ポケモンIDから日本語名を取得
function getPokemonName(pokemonId: string): string {
  const pokemon = POKEMON_LIST.find((p) => p.id === pokemonId)
  return pokemon ? pokemon.name : pokemonId
}

export default function SummaryPage() {
  const { draftId } = useParams<{ draftId: string }>()
  const [state, setState] = useState<DraftState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadState = async () => {
      if (!draftId) {
        console.error('[SummaryPage] No draft ID provided')
        setIsLoading(false)
        return
      }

      try {
        const loadedState = await loadDraftStateById(draftId)
        if (loadedState) {
          setState(loadedState)
        } else {
          console.error('[SummaryPage] Draft not found:', draftId)
        }
      } catch (error) {
        console.error('[SummaryPage] Error loading draft:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadState()
  }, [draftId])

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.87)',
          color: '#111827',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              marginBottom: '1rem',
              fontWeight: 'bold',
              color: '#10b981',
            }}
          >
            読み込み中...
          </div>
          <div style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#6b7280' }}>
            ドラフト結果を取得しています
          </div>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.87)',
          color: '#111827',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              marginBottom: '1rem',
              color: '#dc2626',
              fontWeight: 'bold',
            }}
          >
            ドラフトが見つかりません
          </div>
          <div
            style={{
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              color: '#6b7280',
              marginBottom: '2rem',
            }}
          >
            Draft ID: {draftId}
          </div>
          <Link
            to="/setup"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            セットアップ画面へ戻る
          </Link>
        </div>
      </div>
    )
  }

  const renderPlayerCard = (
    playerName: string,
    pokemonId: string,
    teamColor: string,
    playerIndex: number
  ) => (
    <div
      key={playerIndex}
      style={{
        background: '#ffffff',
        borderRadius: 'clamp(12px, 1.5vw, 16px)',
        padding: 'clamp(0.75rem, 2vw, 1rem)',
        border: `2px solid ${teamColor}20`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(0.75rem, 2vw, 1rem)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* ポケモン画像 */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={getPokemonImage(pokemonId)}
          alt={getPokemonName(pokemonId)}
          style={{
            width: 'clamp(60px, 8vw, 80px)',
            height: 'clamp(60px, 8vw, 80px)',
            borderRadius: '10px',
            objectFit: 'cover',
            border: `3px solid ${teamColor}`,
            boxShadow: `0 2px 6px ${teamColor}30`,
          }}
        />
      </div>

      {/* プレイヤー情報 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#6b7280',
            fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
            marginBottom: '0.25rem',
          }}
        >
          プレイヤー {playerIndex + 1}
        </div>
        <div
          style={{
            color: '#111827',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            fontWeight: 'bold',
            marginBottom: '0.25rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {playerName}
        </div>
        <div
          style={{
            color: teamColor,
            fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
            fontWeight: 'bold',
          }}
        >
          {getPokemonName(pokemonId)}
        </div>
      </div>
    </div>
  )

  const renderMatchPicks = (
    matchNumber: number,
    teamAPicks: string[],
    teamBPicks: string[]
  ) => (
    <div
      key={matchNumber}
      style={{
        background: '#ffffff',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        borderRadius: 'clamp(12px, 2vw, 16px)',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h2
        style={{
          margin: '0 0 clamp(1rem, 2vw, 1.5rem) 0',
          fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#10b981',
          letterSpacing: '0.05em',
        }}
      >
        試合 {matchNumber}
      </h2>

      <div className="teams-grid-summary">
        {/* チームA */}
        <div
          style={{
            background: '#ffffff',
            padding: 'clamp(0.75rem, 2vw, 1.25rem)',
            borderRadius: 'clamp(12px, 1.5vw, 16px)',
            border: '2px solid #e9456020',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h3
            style={{
              margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: '#e94560',
              fontWeight: 'bold',
              textAlign: 'center',
              borderBottom: '2px solid #e9456020',
              paddingBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            }}
          >
            {state.teams.A.name}
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            }}
          >
            {teamAPicks.map((pokemonId, index) =>
              renderPlayerCard(
                state.teams.A.players[index],
                pokemonId,
                '#e94560',
                index
              )
            )}
          </div>
        </div>

        {/* チームB */}
        <div
          style={{
            background: '#ffffff',
            padding: 'clamp(0.75rem, 2vw, 1.25rem)',
            borderRadius: 'clamp(12px, 1.5vw, 16px)',
            border: '2px solid #4ade8020',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h3
            style={{
              margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: '#4ade80',
              fontWeight: 'bold',
              textAlign: 'center',
              borderBottom: '2px solid #4ade8020',
              paddingBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            }}
          >
            {state.teams.B.name}
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            }}
          >
            {teamBPicks.map((pokemonId, index) =>
              renderPlayerCard(
                state.teams.B.players[index],
                pokemonId,
                '#4ade80',
                index
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'rgba(255, 255, 255, 0.87)',
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          background: '#ffffff',
          color: '#111827',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 'bold',
              color: '#111827',
              letterSpacing: '0.05em',
            }}
          >
            {state.tournamentName || 'ドラフト'} - サマリー
          </h1>
          <div
            style={{
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              marginTop: 'clamp(0.5rem, 1vw, 0.75rem)',
              color: '#6b7280',
            }}
          >
            全試合のピック一覧
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(1.5rem, 3vw, 2rem)',
          }}
        >
          {/* 動的に全試合のピックを表示 */}
          {state.picks.map((matchPicks, index) => (
            <div key={index}>
              {renderMatchPicks(index + 1, matchPicks.A, matchPicks.B)}
            </div>
          ))}

          {/* 新規大会作成リンク */}
          <div style={{ textAlign: 'center', marginTop: 'clamp(1rem, 2vw, 2rem)' }}>
            <Link
              to="/setup"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2.5rem)',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              新規大会を作成
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .teams-grid-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(1rem, 3vw, 1.5rem);
        }

        @media (max-width: 768px) {
          .teams-grid-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
