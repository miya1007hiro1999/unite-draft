import BanSlot from './BanSlot'
import type { BanEntry } from '../../types/draft'

interface BanRowProps {
  teamColor: string
  banEntries: BanEntry[]
  isCancellable?: boolean // 削除可能かどうか
  onCancelBan?: (banIndex: number) => void // 削除ハンドラー
}

export default function BanRow({
  teamColor,
  banEntries,
  isCancellable = false,
  onCancelBan,
}: BanRowProps) {
  // 常に3枠表示（未確定枠はundefinedで表現）
  // IMPORTANT: nullはスキップ確定なので、そのまま保持する
  const slots: (BanEntry | undefined)[] = [
    banEntries.length > 0 ? banEntries[0] : undefined,
    banEntries.length > 1 ? banEntries[1] : undefined,
    banEntries.length > 2 ? banEntries[2] : undefined,
  ]

  return (
    <div
      style={{
        marginBottom: 'clamp(0.2rem, 0.5vw, 0.3rem)',
        width:'40%',
      }}
    >
      {/* BAN ヘッダー */}
      {/* <div
        style={{
          fontSize: 'clamp(0.45rem, 0.9vw, 0.55rem)',
          color: '#dc2626',
          fontWeight: 'bold',
          marginBottom: 'clamp(0.1rem, 0.3vw, 0.15rem)',
          letterSpacing: '0.05em',
        }}
      >
        🚫 BAN
      </div> */}

      {/* BAN枠3つを横並び */}
      <div
      className='player-ban-list'
        style={{
          display: 'flex',
          gap: 'clamp(0.15rem, 0.4vw, 0.2rem)',
          justifyContent: 'flex-start',
        }}
      >
        {slots.map((entry, index) => (
          <BanSlot
            key={index}
            entry={entry}
            teamColor={teamColor}
            isCancellable={isCancellable && entry !== undefined}
            onCancel={
              onCancelBan && entry !== undefined ? () => onCancelBan(index) : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
