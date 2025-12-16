import type { Team } from '../../types/draft'
import PlayerCard from './PlayerCard'
import { getPokemonById } from '../../data/pokemon'

interface PlayerCardListProps {
  team: Team
  teamName: string
  players: string[]
  pickedPokemonIds: string[]
  teamColor: string
  isActive: boolean
}

export default function PlayerCardList({
  team: _team,
  teamName,
  players,
  pickedPokemonIds,
  teamColor,
  isActive,
}: PlayerCardListProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 'clamp(0.75rem, 2vw, 1.5rem)',
        borderRadius: 'clamp(12px, 1.5vw, 16px)',
        border: isActive ? `3px solid ${teamColor}` : `2px solid ${teamColor}`,
        boxShadow: isActive
          ? `0 0 30px ${teamColor}60, 0 8px 32px rgba(0, 0, 0, 0.3)`
          : '0 4px 16px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* チーム名 */}
      <h2
        style={{
          color: teamColor,
          margin: '0 0 clamp(0.75rem, 2vw, 1.5rem) 0',
          fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
          textAlign: 'center',
          borderBottom: `2px solid ${teamColor}40`,
          paddingBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: `0 2px 12px ${teamColor}40`,
        }}
      >
        {teamName}
      </h2>

      {/* プレイヤーカード一覧 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.5rem, 1.5vw, 1rem)',
        }}
      >
        {players.map((playerName, index) => {
          // 現在のピック数から、次にピックするプレイヤーを判定
          const isCurrentPicker = isActive && pickedPokemonIds.length === index

          // このプレイヤーのポケモンを取得
          const pokemonId = pickedPokemonIds[index]
          const pokemon = pokemonId ? getPokemonById(pokemonId) : null

          return (
            <PlayerCard
              key={index}
              playerName={playerName}
              pokemon={pokemon}
              teamColor={teamColor}
              isCurrentPicker={isCurrentPicker}
            />
          )
        })}
      </div>
    </div>
  )
}
