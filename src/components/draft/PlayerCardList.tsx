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
  isBanCancellable?: boolean // 仮確定中でBAN取り消し可能かどうか
  onCancelBan?: (banIndex: number) => void // BAN取り消しハンドラー
}

export default function PlayerCardList({
  teamName,
  players,
  pickedPokemonIds,
  teamColor,
  isActive,
  banEntries,
  isBanCancellable = false,
  onCancelBan,
}: PlayerCardListProps) {
  return (
    <div
      className="player-card-list"
      style={{
        background: '#ffffff',
        padding: 'clamp(0.3rem, 0.7vw, 0.5rem)',
        borderRadius: 'clamp(6px, 0.8vw, 10px)',
        borderLeft: isActive ? `4px solid ${teamColor}` : `3px solid ${teamColor}`,
        border: `1px solid #e5e7eb`,
        borderLeftWidth: isActive ? '4px' : '3px',
        borderLeftColor: teamColor,
        boxShadow: isActive
          ? `0 0 0 2px ${teamColor}20, 0 1px 3px rgba(0, 0, 0, 0.1)`
          : '0 1px 3px rgba(0, 0, 0, 0.08)',
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
          borderBottom: `1px solid ${teamColor}30`,
          paddingBottom: 'clamp(0.2rem, 0.5vw, 0.3rem)',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
        }}
      >
        {teamName}
      </h2>

      {/* BAN枠表示 */}
      <BanRow
        teamColor={teamColor}
        banEntries={banEntries}
        isCancellable={isBanCancellable}
        onCancelBan={onCancelBan}
      />

      {/* プレイヤーカード一覧 */}
      <div
        className="player-cards-container"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
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
