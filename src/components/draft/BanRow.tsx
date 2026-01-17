import BanSlot from './BanSlot'
import type { BanEntry, Team } from '../../types/draft'
import { getTurnNumberByTeamIndex } from '../../utils/draftLogic'

interface BanRowProps {
  teamColor: string
  banEntries: BanEntry[]
  team: Team // このチーム
  banSequence: Team[] // BAN順シーケンス（例: ['A', 'B', 'A', 'B', 'A', 'B']）
  currentTurn: number // 現在のターン（0-based）
  phase: 'ban' | 'pick' // 現在のフェーズ
  isCancellable?: boolean // 削除可能かどうか
  onCancelBan?: (banIndex: number) => void // 削除ハンドラー
}

export default function BanRow({
  teamColor,
  banEntries,
  team,
  banSequence,
  currentTurn,
  phase,
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
        {slots.map((entry, index) => {
          // シーケンス内での turn 番号を計算
          const turnNumber = getTurnNumberByTeamIndex(team, index, banSequence)

          // 現在選択中かどうか判定
          // BANフェーズで、このスロットのturn番号が現在のターン+1（1-based）で、未確定の場合
          const isCurrentPicker =
            phase === 'ban' &&
            entry === undefined &&
            turnNumber === currentTurn + 1

          return (
            <BanSlot
              key={index}
              entry={entry}
              teamColor={teamColor}
              slotNumber={turnNumber}
              isCurrentPicker={isCurrentPicker}
              isCancellable={isCancellable && entry !== undefined}
              onCancel={
                onCancelBan && entry !== undefined ? () => onCancelBan(index) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
