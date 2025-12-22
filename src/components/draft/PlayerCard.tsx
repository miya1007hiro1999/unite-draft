import type { Pokemon } from '../../types/pokemon'
import { getPokemonImage } from '../../utils/pokemonImage'

interface PlayerCardProps {
  playerName: string
  pokemon: Pokemon | null
  teamColor: string
  isCurrentPicker: boolean
}

export default function PlayerCard({
  playerName,
  pokemon,
  teamColor,
  isCurrentPicker,
}: PlayerCardProps) {
  return (
    <div
      className="player-card"
      style={{
        background: isCurrentPicker
          ? `linear-gradient(135deg, ${teamColor}20 0%, ${teamColor}10 100%)`
          : 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
        borderRadius: '6px',
        padding: 'clamp(0.25rem, 0.7vw, 0.4rem)',
        border: isCurrentPicker ? `2px solid ${teamColor}` : '1.5px solid #2a2a3e',
        boxShadow: isCurrentPicker
          ? `0 4px 16px ${teamColor}40, 0 0 0 1px ${teamColor}20 inset`
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        minHeight: 'clamp(60px, 8vh, 80px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backdropFilter: isCurrentPicker ? 'blur(10px)' : 'none',
        transform: isCurrentPicker ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* PICKING ラベル */}
      {isCurrentPicker && (
        <div
          style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
            color: 'white',
            padding: '0.15rem 0.4rem',
            borderRadius: '5px',
            fontSize: 'clamp(0.45rem, 0.9vw, 0.55rem)',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            boxShadow: `0 2px 8px ${teamColor}60`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          ⚡ PICKING
        </div>
      )}

      {/* 中央：ポケモン情報 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'clamp(0.2rem, 0.5vw, 0.3rem)',
        }}
      >
        {pokemon ? (
          // ピック済み：ポケモンカード
          <div
            style={{
              textAlign: 'center',
              animation: 'fadeInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <img
                src={getPokemonImage(pokemon.id)}
                alt={pokemon.name}
                className="player-card-pokemon-img"
                style={{
                  width: 'clamp(32px, 4vw, 42px)',
                  height: 'clamp(32px, 4vw, 42px)',
                  borderRadius: '5px',
                  objectFit: 'cover',
                  border: `1.5px solid ${teamColor}`,
                  boxShadow: `0 3px 12px ${teamColor}40, 0 0 0 1px ${teamColor}20 inset`,
                  transition: 'transform 0.3s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${teamColor}20 0%, transparent 100%)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${teamColor}20 50%, transparent 100%)`,
                color: 'white',
                fontSize: 'clamp(0.55rem, 1.1vw, 0.65rem)',
                fontWeight: 'bold',
                marginTop: 'clamp(0.15rem, 0.4vw, 0.25rem)',
                padding: '0.1rem 0.2rem',
                borderRadius: '3px',
                textShadow: `0 1px 6px ${teamColor}80`,
              }}
            >
              {pokemon.name}
            </div>
          </div>
        ) : (
          // 未ピック：空スロット
          <div
            style={{
              width: '100%',
              height: 'clamp(35px, 4.5vh, 48px)',
              border: '1.5px dashed #3a3a4e',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
              background: 'linear-gradient(135deg, #0f141920 0%, #1a1a2e20 100%)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)', opacity: 0.3 }}>
                ✦
              </div>
              <div style={{ marginTop: '0.1rem' }}>未選択</div>
            </div>
          </div>
        )}
      </div>

      {/* 下部：プレイヤー名 */}
      <div
        style={{
          textAlign: 'center',
          padding: 'clamp(0.2rem, 0.5vw, 0.3rem) clamp(0.25rem, 0.7vw, 0.35rem)',
          background: isCurrentPicker
            ? `linear-gradient(135deg, ${teamColor}30 0%, ${teamColor}20 100%)`
            : 'linear-gradient(135deg, #0f3460 0%, #0a2540 100%)',
          borderRadius: '4px',
          color: 'white',
          fontSize: 'clamp(0.55rem, 1.1vw, 0.65rem)',
          fontWeight: isCurrentPicker ? 'bold' : '500',
          border: isCurrentPicker ? `1px solid ${teamColor}40` : '1px solid #1a3a5a',
          boxShadow: isCurrentPicker
            ? `0 2px 8px ${teamColor}30`
            : '0 1px 4px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        {isCurrentPicker && (
          <span style={{ marginRight: '0.4rem', fontSize: '0.9em' }}>▶</span>
        )}
        {playerName}
      </div>

      {/* アニメーション用のCSS */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.7) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateX(-50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
