import { getPokemonImage } from '../../utils/pokemonImage'
import { getPokemonById } from '../../data/pokemon'
import type { BanEntry } from '../../types/draft'

interface BanSlotProps {
  entry: BanEntry | undefined // undefined = 未確定
  teamColor: string
  isCancellable?: boolean // 削除可能かどうか（仮確定中のみtrue）
  onCancel?: () => void // 削除ハンドラー
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
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '3px',
          border: '1px solid #d1d5db',
          background: '#e5e7eb',
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
              'repeating-linear-gradient(45deg, transparent, transparent 1.5px, #00000010 1.5px, #00000010 3px)',
          }}
        />
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

        {/* 削除ボタン（仮確定中のみ表示） */}
        {isCancellable && onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
            style={{
              position: 'absolute',
              top: '1px',
              right: '1px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#ef4444',
              border: '1px solid white',
              color: 'white',
              fontSize: '0.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ×
          </button>
        )}
      </div>
    )
  }

  // BANされたポケモンの場合
  const pokemon = getPokemonById(entry)

  return (
    <div
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '3px',
        border: `2px solid ${teamColor}`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 8px ${teamColor}60, 0 1px 2px rgba(0, 0, 0, 0.1)`,
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
          fontSize: '0.3rem',
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '0.5px 0',
          letterSpacing: '0.05em',
        }}
      >
        BAN
      </div>

      {/* 削除ボタン（仮確定中のみ表示） */}
      {isCancellable && onCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          style={{
            position: 'absolute',
            top: '1px',
            right: '1px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '1px solid white',
            color: 'white',
            fontSize: '0.5rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
