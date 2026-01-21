import type { Pokemon } from '../../types/pokemon'
import { getPokemonImage } from '../../utils/pokemonImage'

interface PlayerCardProps {
  playerName: string
  pokemon: Pokemon | null
  teamColor: string
  isCurrentPicker: boolean
  slotNumber: number // 1-based の枠番号
}

export default function PlayerCard({
  playerName: _playerName,
  pokemon,
  teamColor,
  isCurrentPicker,
  slotNumber,
}: PlayerCardProps) {
  return (
    <div
      className="player-card"
      style={{
        flex: 1,
        background: isCurrentPicker
          ? `linear-gradient(135deg, ${teamColor}08 0%, ${teamColor}04 100%)`
          : '#f9fafb',
        borderRadius: '6px',
        padding: 'clamp(0.2rem, 0.5vw, 0.3rem)',
        border: isCurrentPicker ? `2px solid ${teamColor}` : '1px solid #e5e7eb',
        boxShadow: isCurrentPicker
          ? `0 0 16px 4px ${teamColor}60, 0 0 0 3px ${teamColor}40, 0 1px 3px rgba(0, 0, 0, 0.1)`
          : '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        minHeight: 'clamp(50px, 10vh,  120px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
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
            background: teamColor,
            color: 'white',
            padding: '0.15rem 0.4rem',
            borderRadius: '5px',
            fontSize: 'clamp(0.45rem, 0.9vw, 0.55rem)',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
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
                  width: '100%',
                  // height: 'clamp(32px, 4vw, 42px)',
                  borderRadius: '5px',
                  objectFit: 'cover',
                  border: `1.5px solid ${teamColor}`,
                  boxShadow: `0 0 16px ${teamColor}70, 0 3px 12px ${teamColor}50, 0 0 0 1px ${teamColor}30 inset`,
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
            {/* <div
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${teamColor}15 50%, transparent 100%)`,
                color: '#374151',
                fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
                fontWeight: 'bold',
                marginTop: 'clamp(0.1rem, 0.3vw, 0.2rem)',
                padding: '0.1rem 0.2rem',
                borderRadius: '3px',
              }}
            >
              {pokemon.name}
            </div> */}
          </div>
        ) : (
          // 未ピック：番号表示
          <div
            style={{
              width: '100%',
              height: 'clamp(30px, 4vh, 42px)',
              border: `1px dashed ${teamColor}60`,
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: teamColor,
                lineHeight: 1.2,
              }}
            >
              <div style={{ fontSize: 'clamp(0.45rem, 0.9vw, 0.55rem)', opacity: 0.7 }}>PICK</div>
              <div style={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.9rem)' }}>{slotNumber}</div>
            </div>
          </div>
        )}
      </div>

      {/* 下部：プレイヤー名 */}
      {/* <div
        style={{
          textAlign: 'center',
          padding: 'clamp(0.15rem, 0.4vw, 0.25rem) clamp(0.2rem, 0.6vw, 0.3rem)',
          background: isCurrentPicker
            ? `linear-gradient(135deg, ${teamColor}20 0%, ${teamColor}10 100%)`
            : '#f3f4f6',
          borderRadius: '4px',
          color: isCurrentPicker ? teamColor : '#374151',
          fontSize: 'clamp(0.5rem, 1vw, 0.6rem)',
          fontWeight: isCurrentPicker ? 'bold' : '500',
          border: isCurrentPicker ? `1px solid ${teamColor}` : '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
        }}
      >
        {isCurrentPicker && (
          <span style={{ marginRight: '0.4rem', fontSize: '0.9em' }}>▶</span>
        )}
        {playerName}
      </div> */}

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
