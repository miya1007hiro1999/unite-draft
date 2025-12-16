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
      style={{
        background: isCurrentPicker
          ? `linear-gradient(135deg, ${teamColor}20 0%, ${teamColor}10 100%)`
          : 'linear-gradient(135deg, #1a1a2e 0%, #0f1419 100%)',
        borderRadius: '16px',
        padding: 'clamp(0.75rem, 2vw, 1.25rem)',
        border: isCurrentPicker ? `3px solid ${teamColor}` : '2px solid #2a2a3e',
        boxShadow: isCurrentPicker
          ? `0 8px 32px ${teamColor}40, 0 0 0 1px ${teamColor}20 inset`
          : '0 4px 16px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        minHeight: 'clamp(160px, 20vh, 200px)',
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
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
            color: 'white',
            padding: '0.3rem 1rem',
            borderRadius: '12px',
            fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            boxShadow: `0 4px 12px ${teamColor}60`,
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
          marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
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
                style={{
                  width: 'clamp(70px, 8vw, 90px)',
                  height: 'clamp(70px, 8vw, 90px)',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: `3px solid ${teamColor}`,
                  boxShadow: `0 8px 24px ${teamColor}40, 0 0 0 1px ${teamColor}20 inset`,
                  transition: 'transform 0.3s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${teamColor}20 0%, transparent 100%)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${teamColor}20 50%, transparent 100%)`,
                color: 'white',
                fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
                fontWeight: 'bold',
                marginTop: 'clamp(0.4rem, 1vw, 0.6rem)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                textShadow: `0 2px 8px ${teamColor}80`,
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
              height: 'clamp(80px, 10vh, 110px)',
              border: '2px dashed #3a3a4e',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
              background: 'linear-gradient(135deg, #0f141920 0%, #1a1a2e20 100%)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', opacity: 0.3 }}>
                ✦
              </div>
              <div style={{ marginTop: '0.25rem' }}>未選択</div>
            </div>
          </div>
        )}
      </div>

      {/* 下部：プレイヤー名 */}
      <div
        style={{
          textAlign: 'center',
          padding: 'clamp(0.4rem, 1.2vw, 0.6rem) clamp(0.5rem, 1.5vw, 0.75rem)',
          background: isCurrentPicker
            ? `linear-gradient(135deg, ${teamColor}30 0%, ${teamColor}20 100%)`
            : 'linear-gradient(135deg, #0f3460 0%, #0a2540 100%)',
          borderRadius: '10px',
          color: 'white',
          fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
          fontWeight: isCurrentPicker ? 'bold' : '500',
          border: isCurrentPicker ? `1px solid ${teamColor}40` : '1px solid #1a3a5a',
          boxShadow: isCurrentPicker
            ? `0 4px 12px ${teamColor}30`
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
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
