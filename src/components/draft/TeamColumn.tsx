import type { Team } from '../../types/draft'
import PickedPokemonSlot from './PickedPokemonSlot'
import { getPokemonById } from '../../data/pokemon'

interface TeamColumnProps {
  team: Team
  teamName: string
  players: string[]
  pickedPokemonIds: string[]
  teamColor: string
  isActive: boolean
}

export default function TeamColumn({
  team: _team, // 将来のピック機能で使用予定
  teamName,
  players,
  pickedPokemonIds,
  teamColor,
  isActive,
}: TeamColumnProps) {
  return (
    <div
      style={{
        backgroundColor: '#1a1a2e',
        padding: '1.5rem',
        borderRadius: '8px',
        border: isActive
          ? `3px solid ${teamColor}`
          : `2px solid ${teamColor}`,
        boxShadow: isActive ? `0 0 20px ${teamColor}80` : 'none',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {/* ピック中インジケーター */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: teamColor,
            color: 'white',
            padding: '0.25rem 1rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}
        >
          PICKING
        </div>
      )}

      <h2
        style={{
          color: teamColor,
          margin: '0 0 1rem 0',
          fontSize: '1.3rem',
        }}
      >
        {teamName}
      </h2>

      {/* プレイヤーリスト */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3
          style={{
            color: '#aaa',
            fontSize: '0.9rem',
            margin: '0 0 0.5rem 0',
          }}
        >
          プレイヤー
        </h3>
        {players.map((player, i) => {
          // 現在のピック数から、次にピックするプレイヤーを判定
          const isCurrentPicker = isActive && pickedPokemonIds.length === i

          return (
            <div
              key={i}
              style={{
                padding: '0.5rem',
                marginBottom: '0.3rem',
                backgroundColor: isCurrentPicker ? teamColor : '#0f3460',
                borderRadius: '4px',
                border: isCurrentPicker ? `3px solid ${teamColor}` : 'none',
                boxShadow: isCurrentPicker ? `0 0 15px ${teamColor}80` : 'none',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: isCurrentPicker ? 'bold' : 'normal',
                transition: 'all 0.3s ease',
              }}
            >
              {isCurrentPicker && '▶ '}
              {player}
            </div>
          )
        })}
      </div>

      {/* ピック結果 */}
      <div>
        <h3
          style={{
            color: '#aaa',
            fontSize: '0.9rem',
            margin: '0 0 0.5rem 0',
          }}
        >
          現在の試合のピック
        </h3>
        {Array.from({ length: 5 }).map((_, i) => {
          const pickedPokemonId = pickedPokemonIds[i]
          const pokemon = pickedPokemonId
            ? getPokemonById(pickedPokemonId)
            : null
          return (
            <PickedPokemonSlot
              key={i}
              pokemon={pokemon}
              teamColor={teamColor}
            />
          )
        })}
      </div>
    </div>
  )
}
