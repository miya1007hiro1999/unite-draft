import { getPokemonImage } from '../../utils/pokemonImage'
import { getPokemonById } from '../../data/pokemon'
import type { BanEntry } from '../../types/draft'

interface BanSlotProps {
  entry: BanEntry | undefined // undefined = 未確定
  teamColor: string
}

export default function BanSlot({ entry, teamColor }: BanSlotProps) {
  // 未確定の場合
  if (entry === undefined) {
    return (
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '5px',
          border: `2px dashed ${teamColor}40`,
          background: 'linear-gradient(135deg, #1a1a2e20 0%, #0f141920 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '0.5rem', color: '#555' }}>?</div>
      </div>
    )
  }

  // スキップの場合（BANスキップ確定）
  if (entry === null) {
    return (
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '5px',
          border: '1px solid #333', // 弱めのグレー枠線
          background: 'linear-gradient(135deg, #444 0%, #333 100%)', // 濃いグレー
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 斜線背景（使用不可・確定済みを示す） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(45deg, transparent, transparent 2px, #ffffff15 2px, #ffffff15 4px)',
          }}
        />
        <div
          style={{
            fontSize: '0.45rem',
            fontWeight: 'bold',
            color: '#888', // より明るいグレーで視認性向上
            position: 'relative',
            zIndex: 1,
          }}
        >
          SKIP
        </div>
      </div>
    )
  }

  // BANされたポケモンの場合
  const pokemon = getPokemonById(entry)

  return (
    <div
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '5px',
        border: `1.5px solid ${teamColor}`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 2px 6px ${teamColor}40`,
      }}
    >
      {/* ポケモン画像 */}
      <img
        src={getPokemonImage(entry)}
        alt={pokemon?.name || entry}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.6,
          filter: 'grayscale(50%)',
        }}
      />
      {/* BANラベル */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, #dc2626ee 0%, #dc262600 100%)',
          color: 'white',
          fontSize: '0.4rem',
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '1px 0',
          letterSpacing: '0.05em',
        }}
      >
        BAN
      </div>
    </div>
  )
}
