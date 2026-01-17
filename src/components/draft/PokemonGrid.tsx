import { POKEMON_LIST } from '../../data/pokemon'
import PokemonCard from './PokemonCard'
import type { DraftState } from '../../types/draft'
import type { Pokemon } from '../../types/pokemon'
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

  // 配列インデックスで全試合のPICKを集約
  for (let i = 0; i < state.currentMatch; i++) {
    const matchPicks = state.picks[i]
    if (matchPicks) {
      allPicksUpToCurrentMatch.push(...matchPicks.A, ...matchPicks.B)
    }
  }

  // 使用済みポケモン = 全試合のBAN + 現在試合までのPICK
  const usedPokemonIds = new Set([
    ...bannedPokemon, // 全試合のBAN（prop経由で取得）
    ...allPicksUpToCurrentMatch, // 現在試合までのPICK
  ])

  // typeの順番を固定
  const typeOrder: Pokemon['type'][] = ['attack', 'defence', 'speed', 'support', 'balance']

  // typeごとにグループ化
  const pokemonByType: Record<Pokemon['type'], Pokemon[]> = {
    attack: [],
    defence: [],
    speed: [],
    support: [],
    balance: [],
  }

  POKEMON_LIST.forEach((pokemon) => {
    pokemonByType[pokemon.type].push(pokemon)
  })

  // 各typeグループ内で優先度順にソート
  typeOrder.forEach((type) => {
    pokemonByType[type].sort((a, b) => {
      const aIsBanned = bannedPokemon.includes(a.id)
      const bIsBanned = bannedPokemon.includes(b.id)
      const aIsPicked = allPicksUpToCurrentMatch.includes(a.id)
      const bIsPicked = allPicksUpToCurrentMatch.includes(b.id)

      // 優先度: 未使用=0, BAN=1, PICK=2
      const aPriority = aIsBanned ? 1 : aIsPicked ? 2 : 0
      const bPriority = bIsBanned ? 1 : bIsPicked ? 2 : 0

      return aPriority - bPriority
    })
  })

  // タイプごとの背景色定義（極薄、不透明度 0.06）
  const typeBackgroundColors: Record<Pokemon['type'], string> = {
    attack: 'rgba(229, 57, 53, 0.06)', // #E53935
    speed: 'rgba(30, 136, 229, 0.06)', // #1E88E5
    balance: 'rgba(142, 36, 170, 0.06)', // #8E24AA
    defence: 'rgba(67, 160, 71, 0.06)', // #43A047
    support: 'rgba(249, 168, 37, 0.06)', // #F9A825
  }

  return (
    <div>
      <div
        className="pokemon-grid-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: '#f9fafb',
          borderRadius: 'clamp(6px, 0.8vw, 10px)',
          border: '1px solid #e5e7eb',
        }}
      >
        {typeOrder.map((type) => (
          <div key={type}>
            {/* type見出し */}
            {/* <div
              style={{
                fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
                fontWeight: 'bold',
                color: '#6b7280',
                marginBottom: 'clamp(0.2rem, 0.4vw, 0.3rem)',
                paddingLeft: 'clamp(0.2rem, 0.4vw, 0.3rem)',
              }}
            >
              {typeLabels[type]}
            </div> */}
            {/* ポケモンカードを横並び表示 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                backgroundColor: typeBackgroundColors[type],
                borderRadius: '8px',
              }}
            >
              {pokemonByType[type]
                .filter((pokemon) => !bannedPokemon.includes(pokemon.id)) // BANされたポケモンを除外
                .map((pokemon) => {
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
        ))}
      </div>
    </div>
  )
}
