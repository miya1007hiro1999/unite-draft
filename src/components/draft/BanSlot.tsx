import { getPokemonImage } from '../../utils/pokemonImage'
import { getPokemonById } from '../../data/pokemon'
import type { BanEntry } from '../../types/draft'

interface BanSlotProps {
  entry: BanEntry | undefined // undefined = 未確定
  teamColor: string
  isCancellable?: boolean // 仮確定中で取り消し可能かどうか
  onCancel?: () => void // 取り消し時のハンドラー
}

export default function BanSlot({
  entry,
  teamColor,
  isCancellable = false,
  onCancel,
}: BanSlotProps) {
  // 未確定の場合
  if (entry === undefined) {
    return (
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '3px',
          border: `1px dashed #d1d5db`,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '0.4rem', color: '#9ca3af' }}>?</div>
      </div>
    )
  }

  // スキップの場合（BANスキップ確定）
  if (entry === null) {
    return (
      <div
        onClick={isCancellable ? onCancel : undefined}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '3px',
          border: isCancellable ? '2px solid #f59e0b' : '1px solid #d1d5db',
          background: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: isCancellable ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (isCancellable) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)'
          }
        }}
        onMouseLeave={(e) => {
          if (isCancellable) {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {/* 斜線背景（使用不可・確定済みを示す） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(45deg, transparent, transparent 1.5px, #00000010 1.5px, #00000010 3px)',
          }}
        />
        {isCancellable && (
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#f59e0b',
              color: 'white',
              fontSize: '0.4rem',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              zIndex: 2,
            }}
          >
            ✕
          </div>
        )}
        <div
          style={{
            fontSize: '0.35rem',
            fontWeight: 'bold',
            color: '#6b7280',
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
      onClick={isCancellable ? onCancel : undefined}
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '3px',
        border: isCancellable ? `2px solid #f59e0b` : `1px solid ${teamColor}`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        cursor: isCancellable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (isCancellable) {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (isCancellable) {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)'
        }
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
      {/* 取り消しアイコン（仮確定中のみ） */}
      {isCancellable && (
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#f59e0b',
            color: 'white',
            fontSize: '0.4rem',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            zIndex: 2,
          }}
        >
          ✕
        </div>
      )}
      {/* BANラベル */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, #dc2626ee 0%, #dc262600 100%)',
          color: 'white',
          fontSize: '0.3rem',
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '0.5px 0',
          letterSpacing: '0.05em',
        }}
      >
        BAN
      </div>
    </div>
  )
}
