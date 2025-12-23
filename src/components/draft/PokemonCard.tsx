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
    ? '#d1d5db'
    : isPickedInCurrentMatch
    ? '#fbbf24' // 黄色
    : isSelectable
    ? '#e5e7eb'
    : '#e5e7eb'

  const hoverBorderColor = isSelectable ? '#10b981' : borderColor

  return (
    <div
      onClick={onClick}
      style={{
        width: '80px',
        minWidth: '80px',
        maxWidth: '80px',
        background: isBanned
          ? '#f3f4f6'
          : '#ffffff',
        borderRadius: '5px',
        padding: 'clamp(0.2rem, 0.5vw, 0.35rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'clamp(0.15rem, 0.4vw, 0.2rem)',
        border: `1px solid ${borderColor}`,
        boxShadow: isPickedInCurrentMatch
          ? '0 0 0 2px #fbbf2460, 0 1px 3px rgba(0, 0, 0, 0.1)'
          : isBanned
          ? '0 1px 2px rgba(0, 0, 0, 0.05)'
          : '0 1px 3px rgba(0, 0, 0, 0.08)',
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
          e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)'
          e.currentTarget.style.borderColor = hoverBorderColor
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 0 0 2px #10b98140'
        }
      }}
      onMouseLeave={(e) => {
        if (isSelectable) {
          e.currentTarget.style.transform = 'scale(1) translateY(0)'
          e.currentTarget.style.borderColor = borderColor
          e.currentTarget.style.boxShadow = isPickedInCurrentMatch
            ? '0 0 0 2px #fbbf2460, 0 1px 3px rgba(0, 0, 0, 0.1)'
            : '0 1px 3px rgba(0, 0, 0, 0.08)'
        }
      }}
    >
      {/* グラデーションオーバーレイ */}
      {!isBanned && isPickedInCurrentMatch && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, transparent 100%)',
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
          width: '100%',
          color: isBanned ? '#9ca3af' : '#374151',
          fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
          textAlign: 'center',
          fontWeight: isPickedInCurrentMatch ? 'bold' : '500',
          lineHeight: 1.2,
          position: 'relative',
          zIndex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
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
