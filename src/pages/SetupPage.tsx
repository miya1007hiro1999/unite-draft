import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInitialDraftState } from '../utils/draftState'
import { saveDraftState, startNewDraft } from '../lib/draftStorage'
import type { Team } from '../types/draft'

export default function SetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tournamentName, setTournamentName] = useState('')
  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')
  const [teamAPlayers, setTeamAPlayers] = useState(['', '', '', '', ''])
  const [teamBPlayers, setTeamBPlayers] = useState(['', '', '', '', ''])
  const [firstPick, setFirstPick] = useState<Team>('A')

  const handlePlayerChange = (
    team: 'A' | 'B',
    index: number,
    value: string
  ) => {
    if (team === 'A') {
      const newPlayers = [...teamAPlayers]
      newPlayers[index] = value
      setTeamAPlayers(newPlayers)
    } else {
      const newPlayers = [...teamBPlayers]
      newPlayers[index] = value
      setTeamBPlayers(newPlayers)
    }
  }

  const handleStartDraft = async () => {
    // バリデーション
    if (!teamAName.trim() || !teamBName.trim()) {
      setError('チーム名を入力してください')
      return
    }

    const allPlayersA = teamAPlayers.every((p) => p.trim())
    const allPlayersB = teamBPlayers.every((p) => p.trim())
    if (!allPlayersA || !allPlayersB) {
      setError('すべてのプレイヤー名を入力してください')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // 既存のドラフトIDをクリア（新規ドラフトを作成）
      startNewDraft()

      const initialState = createInitialDraftState({
        tournamentName: tournamentName.trim() || undefined,
        teamAName: teamAName.trim(),
        teamBName: teamBName.trim(),
        teamAPlayers: teamAPlayers.map((p) => p.trim()),
        teamBPlayers: teamBPlayers.map((p) => p.trim()),
        firstPick,
      })

      // Supabaseに新規作成（UUIDが自動生成される）
      const result = await saveDraftState(initialState)

      if (typeof result === 'string') {
        // 新規作成成功 - 返却されたUUIDを使用
        console.log('[SetupPage] New draft created with ID:', result)
        navigate(`/draft/${result}/admin`)
      } else if (result === true) {
        // 更新成功（通常は発生しない）
        console.warn('[SetupPage] Unexpected update success, redirecting to /draft')
        navigate('/draft')
      } else {
        // 失敗
        throw new Error('ドラフトの作成に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 50%, #16213e 100%)',
        padding: 'clamp(1rem, 3vw, 2rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 'clamp(16px, 2vw, 24px)',
          padding: 'clamp(1.5rem, 4vw, 3rem)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1
          style={{
            background: 'linear-gradient(135deg, #4ade80 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
            letterSpacing: '0.05em',
          }}
        >
          ドラフトセットアップ
        </h1>

        {error && (
          <div
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: 'white',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: '12px',
              marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
              border: '2px solid rgba(220, 38, 38, 0.5)',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          <label
            style={{
              color: '#e0e0e0',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              display: 'block',
            }}
          >
            大会名（任意）
          </label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="例: 第1回トーナメント"
            style={{
              display: 'block',
              width: '100%',
              padding: 'clamp(0.6rem, 1.5vw, 0.75rem)',
              background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)',
              border: '2px solid #2a2a3e',
              borderRadius: '10px',
              color: 'white',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              transition: 'all 0.3s ease',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4ade80'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.3)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2a2a3e'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        <div className="teams-grid" style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          {/* チームA */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
              padding: 'clamp(1rem, 2.5vw, 1.5rem)',
              borderRadius: '16px',
              border: '2px solid #dc262640',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.2)',
            }}
          >
            <h2
              style={{
                color: '#dc2626',
                fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                fontWeight: 'bold',
                marginBottom: '1rem',
                textAlign: 'center',
                textShadow: '0 2px 12px rgba(220, 38, 38, 0.4)',
              }}
            >
              チームA
            </h2>
            <label
              style={{
                color: '#e0e0e0',
                fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                display: 'block',
              }}
            >
              チーム名
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              placeholder="チームA"
              className="team-input"
              style={{
                display: 'block',
                width: '100%',
                padding: 'clamp(0.5rem, 1.2vw, 0.65rem)',
                marginBottom: '1rem',
                background: '#0a0a0a',
                border: '2px solid #2a2a3e',
                borderRadius: '8px',
                color: 'white',
                fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                transition: 'all 0.3s ease',
                outline: 'none',
              }}
            />
            <h3
              style={{
                color: '#aaa',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                fontWeight: 'bold',
                marginBottom: '0.75rem',
              }}
            >
              プレイヤー
            </h3>
            {teamAPlayers.map((player, index) => (
              <input
                key={index}
                type="text"
                value={player}
                onChange={(e) => handlePlayerChange('A', index, e.target.value)}
                placeholder={`プレイヤー ${index + 1}`}
                className="player-input"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 'clamp(0.5rem, 1.2vw, 0.65rem)',
                  marginBottom: 'clamp(0.4rem, 1vw, 0.5rem)',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a3e',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {/* チームB */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
              padding: 'clamp(1rem, 2.5vw, 1.5rem)',
              borderRadius: '16px',
              border: '2px solid #4ade8040',
              boxShadow: '0 8px 24px rgba(74, 222, 128, 0.2)',
            }}
          >
            <h2
              style={{
                color: '#4ade80',
                fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                fontWeight: 'bold',
                marginBottom: '1rem',
                textAlign: 'center',
                textShadow: '0 2px 12px rgba(74, 222, 128, 0.4)',
              }}
            >
              チームB
            </h2>
            <label
              style={{
                color: '#e0e0e0',
                fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                display: 'block',
              }}
            >
              チーム名
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              placeholder="チームB"
              className="team-input"
              style={{
                display: 'block',
                width: '100%',
                padding: 'clamp(0.5rem, 1.2vw, 0.65rem)',
                marginBottom: '1rem',
                background: '#0a0a0a',
                border: '2px solid #2a2a3e',
                borderRadius: '8px',
                color: 'white',
                fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                transition: 'all 0.3s ease',
                outline: 'none',
              }}
            />
            <h3
              style={{
                color: '#aaa',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                fontWeight: 'bold',
                marginBottom: '0.75rem',
              }}
            >
              プレイヤー
            </h3>
            {teamBPlayers.map((player, index) => (
              <input
                key={index}
                type="text"
                value={player}
                onChange={(e) => handlePlayerChange('B', index, e.target.value)}
                placeholder={`プレイヤー ${index + 1}`}
                className="player-input"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 'clamp(0.5rem, 1.2vw, 0.65rem)',
                  marginBottom: 'clamp(0.4rem, 1vw, 0.5rem)',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a3e',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          <label
            style={{
              color: '#e0e0e0',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              display: 'block',
            }}
          >
            試合1の先攻
          </label>
          <select
            value={firstPick}
            onChange={(e) => setFirstPick(e.target.value as Team)}
            style={{
              display: 'block',
              width: '100%',
              padding: 'clamp(0.6rem, 1.5vw, 0.75rem)',
              background: 'linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)',
              border: '2px solid #2a2a3e',
              borderRadius: '10px',
              color: 'white',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              transition: 'all 0.3s ease',
              outline: 'none',
              cursor: 'pointer',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4ade80'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.3)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2a2a3e'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <option value="A">チームA</option>
            <option value="B">チームB</option>
          </select>
        </div>

        <button
          onClick={handleStartDraft}
          disabled={loading}
          style={{
            width: '100%',
            padding: 'clamp(0.9rem, 2.5vw, 1.2rem)',
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading
              ? 'linear-gradient(135deg, #666 0%, #444 100%)'
              : 'linear-gradient(135deg, #4ade80 0%, #3b82f6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: loading
              ? 'none'
              : '0 8px 24px rgba(74, 222, 128, 0.4)',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(74, 222, 128, 0.6)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 222, 128, 0.4)'
            }
          }}
        >
          {loading ? '作成中...' : 'ドラフト開始'}
        </button>

        <style>{`
          .teams-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: clamp(1rem, 3vw, 2rem);
          }

          @media (max-width: 768px) {
            .teams-grid {
              grid-template-columns: 1fr;
            }
          }

          .team-input:focus,
          .player-input:focus {
            border-color: #4ade80 !important;
            box-shadow: 0 0 20px rgba(74, 222, 128, 0.3) !important;
          }
        `}</style>
      </div>
    </div>
  )
}
