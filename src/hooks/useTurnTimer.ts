import { useState, useEffect, useRef } from 'react'

const TURN_DURATION_SECONDS = 30

interface UseTurnTimerOptions {
  currentTurn: number
  phase: 'ban' | 'pick'
  isAdmin: boolean
  onTimeout: () => void
}

/**
 * ターンタイマーフック
 *
 * - currentTurn が変わったら 30 秒タイマーを開始
 * - 時間切れで onTimeout() を呼ぶ
 * - state は一切変更しない
 *
 * @param options - タイマーオプション
 * @returns 残り秒数
 */
export function useTurnTimer({
  currentTurn,
  phase,
  isAdmin,
  onTimeout,
}: UseTurnTimerOptions): number {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION_SECONDS)
  const timeoutCalledRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  // onTimeout を最新に保つ（useEffect 内で stale closure を防ぐ）
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  // currentTurn または phase が変わったらタイマーをリセット
  useEffect(() => {
    console.log(`[useTurnTimer] Reset timer: turn=${currentTurn}, phase=${phase}`)
    setTimeLeft(TURN_DURATION_SECONDS)
    timeoutCalledRef.current = false
  }, [currentTurn, phase])

  // タイマーのカウントダウン処理
  useEffect(() => {
    // admin 以外はタイマーを動かさない
    if (!isAdmin) {
      return
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 0秒になった瞬間に onTimeout を 1回だけ呼ぶ
          if (!timeoutCalledRef.current) {
            timeoutCalledRef.current = true
            console.log(`[useTurnTimer] Timeout! Calling onTimeout...`)
            // 次のティックで呼び出す（setState 内での副作用を避ける）
            setTimeout(() => {
              onTimeoutRef.current()
            }, 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // cleanup
    return () => {
      clearInterval(intervalId)
    }
  }, [isAdmin, currentTurn, phase])

  return timeLeft
}
