import type { BanEntry } from '../../types/draft'
import PlayerCard from './PlayerCard'
import BanRow from './BanRow'
import { getPokemonById } from '../../data/pokemon'

interface PlayerCardListProps {
  teamName: string
  players: string[]
  pickedPokemonIds: string[]
  teamColor: string
  isActive: boolean
  banEntries: BanEntry[]
}

export default function PlayerCardList({
  teamName,
  players,
  pickedPokemonIds,
  teamColor,
  isActive,
  banEntries,
}: PlayerCardListProps) {
  return (
    <div
      className="player-card-list"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 'clamp(0.4rem, 1vw, 0.75rem)',
        borderRadius: 'clamp(8px, 1vw, 12px)',
        border: isActive ? `3px solid ${teamColor}` : `2px solid ${teamColor}`,
        boxShadow: isActive
          ? `0 0 30px ${teamColor}60, 0 8px 32px rgba(0, 0, 0, 0.3)`
          : '0 4px 16px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '140px',
      }}
    >
      {/* チーム名 */}
      <h2
        style={{
          color: teamColor,
          margin: '0 0 clamp(0.35rem, 1vw, 0.6rem) 0',
          fontSize: 'clamp(0.8rem, 1.8vw, 1rem)',
          textAlign: 'center',
          borderBottom: `2px solid ${teamColor}40`,
          paddingBottom: 'clamp(0.3rem, 0.8vw, 0.4rem)',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: `0 2px 12px ${teamColor}40`,
        }}
      >
        {teamName}
      </h2>

      {/* BAN枠表示 */}
      <BanRow teamColor={teamColor} banEntries={banEntries} />

      {/* プレイヤーカード一覧 */}
      <div
        className="player-cards-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.3rem, 0.8vw, 0.5rem)',
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
