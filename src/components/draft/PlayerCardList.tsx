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
        padding: 'clamp(0.3rem, 0.7vw, 0.5rem)',
        borderRadius: 'clamp(6px, 0.8vw, 10px)',
        border: isActive ? `2px solid ${teamColor}` : `1.5px solid ${teamColor}`,
        boxShadow: isActive
          ? `0 0 20px ${teamColor}60, 0 4px 16px rgba(0, 0, 0, 0.3)`
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '100px',
      }}
    >
      {/* チーム名 */}
      <h2
        style={{
          color: teamColor,
          margin: '0 0 clamp(0.25rem, 0.7vw, 0.4rem) 0',
          fontSize: 'clamp(0.65rem, 1.4vw, 0.8rem)',
          textAlign: 'center',
          borderBottom: `1.5px solid ${teamColor}40`,
          paddingBottom: 'clamp(0.2rem, 0.5vw, 0.3rem)',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: `0 1px 8px ${teamColor}40`,
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
          gap: 'clamp(0.2rem, 0.5vw, 0.35rem)',
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
