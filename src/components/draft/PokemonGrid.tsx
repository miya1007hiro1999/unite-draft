import { POKEMON_LIST } from '../../data/pokemon'
import PokemonCard from './PokemonCard'
import type { DraftState } from '../../types/draft'
import { isPokemonSelectable, getCurrentMatchPicks } from '../../utils/draftLogic'

interface PokemonGridProps {
  bannedPokemon: string[]
  currentMatchBannedPokemonIds: string[]
  state: DraftState
  onPokemonPick: (pokemonId: string) => void
  isReadOnly?: boolean
}

export default function PokemonGrid({
  bannedPokemon,
  currentMatchBannedPokemonIds,
  state,
  onPokemonPick,
  isReadOnly = false,
}: PokemonGridProps) {
  // 現在の試合でピックされたポケモンのリストを取得
  const currentMatchPicksA = getCurrentMatchPicks(state, 'A')
  const currentMatchPicksB = getCurrentMatchPicks(state, 'B')
  const currentMatchPicks = [...currentMatchPicksA, ...currentMatchPicksB]

  // 全試合のBANを集約（bannedPokemon prop = getBannedPokemon(state) で全試合分）
  // 現在の試合までのPICKを集約
  const allPicksUpToCurrentMatch: string[] = []

  // match1 のピック（常に含める）
  const match1PicksA = state.picks.match1.A
  const match1PicksB = state.picks.match1.B
  allPicksUpToCurrentMatch.push(...match1PicksA, ...match1PicksB)

  // match2 のピック（currentMatch >= 2 の場合）
  if (state.currentMatch >= 2) {
    const match2PicksA = state.picks.match2.A
    const match2PicksB = state.picks.match2.B
    allPicksUpToCurrentMatch.push(...match2PicksA, ...match2PicksB)
  }

  // match3 のピック（currentMatch >= 3 の場合）
  if (state.currentMatch >= 3) {
    const match3PicksA = state.picks.match3.A
    const match3PicksB = state.picks.match3.B
    allPicksUpToCurrentMatch.push(...match3PicksA, ...match3PicksB)
  }

  // 使用済みポケモン = 全試合のBAN + 現在試合までのPICK
  const usedPokemonIds = new Set([
    ...bannedPokemon, // 全試合のBAN（prop経由で取得）
    ...allPicksUpToCurrentMatch, // 現在試合までのPICK
  ])

  // ポケモンリストを並び替え: 未使用 → 上、使用済み → 下
  const sortedPokemonList = [...POKEMON_LIST].sort((a, b) => {
    const aUsed = usedPokemonIds.has(a.id)
    const bUsed = usedPokemonIds.has(b.id)

    // 未使用を上に、使用済みを下に
    if (aUsed && !bUsed) return 1
    if (!aUsed && bUsed) return -1

    // 同じグループ内では元の順序を保持
    return 0
  })

  // フェーズに応じたタイトル
  const title = state.phase === 'ban' ? '🚫 BAN 選択' : '✓ ポケモン選択'
  const titleColor = state.phase === 'ban' ? '#ef4444' : '#4ade80'

  return (
    <div>
      <h2
        style={{
          color: titleColor,
          margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: `0 2px 8px ${titleColor}40`,
        }}
      >
        {title}
        {isReadOnly && (
          <span
            style={{
              marginLeft: 'clamp(0.3rem, 1vw, 0.5rem)',
              fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
              color: '#fbbf24',
              backgroundColor: '#78350f',
              padding: 'clamp(0.2rem, 0.5vw, 0.25rem) clamp(0.3rem, 1vw, 0.5rem)',
              borderRadius: '4px',
              fontWeight: 'bold',
              border: '1px solid #fbbf2440',
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
            }}
          >
            読み取り専用
          </span>
        )}
      </h2>

      <div
        className="pokemon-grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'clamp(0.35rem, 0.8vw, 0.5rem)',
          maxHeight: 'clamp(60vh, 70vh, 75vh)',
          overflowY: 'auto',
          padding: 'clamp(0.3rem, 0.8vw, 0.4rem)',
          background: 'linear-gradient(135deg, #0f141910 0%, #1a1a2e10 100%)',
          borderRadius: 'clamp(8px, 1vw, 12px)',
          border: '1px solid #2a2a3e40',
        }}
      >
        {sortedPokemonList.map((pokemon) => {
          const isBanned = bannedPokemon.includes(pokemon.id)
          // 🔒 読み取り専用モードでは全て選択不可
          const isSelectable = !isReadOnly && isPokemonSelectable(state, pokemon.id)
          // 現在の試合でピック済みかどうか（PICKフェーズのみ）
          const isPickedInCurrentMatch =
            state.phase === 'pick' && currentMatchPicks.includes(pokemon.id)
          // 現在の試合でBAN済みかどうか（BANフェーズのみ）
          const isBannedInCurrentMatch =
            state.phase === 'ban' && currentMatchBannedPokemonIds.includes(pokemon.id)
          // 現在の試合で使用済み（BAN or PICK）
          const isUsedInCurrentMatch = usedPokemonIds.has(pokemon.id)

          return (
            <div
              key={pokemon.id}
              style={{
                // 使用済みポケモンに視覚効果を適用
                opacity: isUsedInCurrentMatch ? 0.5 : 1,
                filter: isUsedInCurrentMatch ? 'grayscale(70%)' : 'none',
                transition: 'opacity 0.3s ease, filter 0.3s ease',
              }}
            >
              <PokemonCard
                pokemon={pokemon}
                isBanned={isBanned}
                isSelectable={isSelectable}
                isPickedInCurrentMatch={isPickedInCurrentMatch || isBannedInCurrentMatch}
                onClick={() => !isReadOnly && isSelectable && onPokemonPick(pokemon.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
