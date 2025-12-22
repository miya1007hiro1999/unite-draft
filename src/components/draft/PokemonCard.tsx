import type { Pokemon } from '../../types/pokemon'
import { getPokemonImage } from '../../utils/pokemonImage'

interface PokemonCardProps {
  pokemon: Pokemon
  isBanned?: boolean
  isSelectable?: boolean
  isPickedInCurrentMatch?: boolean
  onClick?: () => void
}

export default function PokemonCard({
  pokemon,
  isBanned = false,
  isSelectable = false,
  isPickedInCurrentMatch = false,
  onClick,
}: PokemonCardProps) {
  // 黄色い縁を表示する条件：現在の試合でピックされている
  const borderColor = isBanned
    ? '#333'
    : isPickedInCurrentMatch
    ? '#fbbf24' // 黄色
    : isSelectable
    ? '#2a2a3e'
    : '#1a1a2e'

  const hoverBorderColor = isSelectable ? '#4ade80' : borderColor

  return (
    <div
      onClick={onClick}
      style={{
        background: isBanned
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
        borderRadius: '5px',
        padding: 'clamp(0.2rem, 0.5vw, 0.35rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'clamp(0.15rem, 0.4vw, 0.2rem)',
        border: `1.5px solid ${borderColor}`,
        boxShadow: isPickedInCurrentMatch
          ? '0 0 15px rgba(251, 191, 36, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
          : isBanned
          ? '0 1px 4px rgba(0, 0, 0, 0.5)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isBanned ? 'not-allowed' : isSelectable ? 'pointer' : 'default',
        opacity: isBanned ? 0.4 : 1,
        filter: isBanned ? 'grayscale(100%)' : 'none',
        transform: 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (isSelectable) {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-3px)'
          e.currentTarget.style.borderColor = hoverBorderColor
          e.currentTarget.style.boxShadow = `0 8px 16px rgba(74, 222, 128, 0.3), 0 0 0 1px ${hoverBorderColor}40 inset`
        }
      }}
      onMouseLeave={(e) => {
        if (isSelectable) {
          e.currentTarget.style.transform = 'scale(1) translateY(0)'
          e.currentTarget.style.borderColor = borderColor
          e.currentTarget.style.boxShadow = isPickedInCurrentMatch
            ? '0 0 15px rgba(251, 191, 36, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)'
        }
      }}
    >
      {/* グラデーションオーバーレイ */}
      {!isBanned && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isPickedInCurrentMatch
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
            borderRadius: '8px',
          }}
        />
      )}

      {/* ポケモン画像 */}
      <div style={{ position: 'relative' }}>
        <img
          src={getPokemonImage(pokemon.id)}
          alt={pokemon.name}
          style={{
            width: 'clamp(28px, 3.5vw, 38px)',
            height: 'clamp(28px, 3.5vw, 38px)',
            borderRadius: '4px',
            objectFit: 'cover',
            boxShadow: isPickedInCurrentMatch
              ? '0 2px 8px rgba(251, 191, 36, 0.4)'
              : '0 1px 4px rgba(0, 0, 0, 0.3)',
            transition: 'transform 0.3s ease',
          }}
        />
      </div>

      {/* ポケモン名 */}
      <div
        style={{
          color: isBanned ? '#666' : 'white',
          fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
          textAlign: 'center',
          fontWeight: isPickedInCurrentMatch ? 'bold' : '500',
          lineHeight: 1.2,
          textShadow: isPickedInCurrentMatch
            ? '0 1px 6px rgba(251, 191, 36, 0.6)'
            : '0 1px 3px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {pokemon.name}
      </div>

      {/* BANバッジ */}
      {isBanned && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-15deg)',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontSize: 'clamp(0.5rem, 1.1vw, 0.6rem)',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.6)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          BAN
        </div>
      )}
    </div>
  )
}
