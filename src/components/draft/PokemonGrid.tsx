import { POKEMON_LIST } from '../../data/pokemon'
import PokemonCard from './PokemonCard'
import type { DraftState } from '../../types/draft'
import { isPokemonSelectable, getCurrentMatchPicks } from '../../utils/draftLogic'

interface PokemonGridProps {
  bannedPokemon: string[]
  state: DraftState
  onPokemonPick: (pokemonId: string) => void
  isReadOnly?: boolean
}

export default function PokemonGrid({
  bannedPokemon,
  state,
  onPokemonPick,
  isReadOnly = false,
}: PokemonGridProps) {
  // 現在の試合でピックされたポケモンのリストを取得
  const currentMatchPicksA = getCurrentMatchPicks(state, 'A')
  const currentMatchPicksB = getCurrentMatchPicks(state, 'B')
  const currentMatchPicks = [...currentMatchPicksA, ...currentMatchPicksB]

  return (
    <div>
      <h2
        style={{
          color: '#e0e0e0',
          margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0',
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}
      >
        ポケモン選択
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
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
          maxHeight: 'clamp(60vh, 70vh, 75vh)',
          overflowY: 'auto',
          padding: 'clamp(0.3rem, 1vw, 0.5rem)',
          background: 'linear-gradient(135deg, #0f141910 0%, #1a1a2e10 100%)',
          borderRadius: 'clamp(8px, 1vw, 12px)',
          border: '1px solid #2a2a3e40',
        }}
      >
        {POKEMON_LIST.map((pokemon) => {
          const isBanned = bannedPokemon.includes(pokemon.id)
          // 🔒 読み取り専用モードでは全て選択不可
          const isSelectable = !isReadOnly && isPokemonSelectable(state, pokemon.id)
          // 現在の試合でピック済みかどうか
          const isPickedInCurrentMatch = currentMatchPicks.includes(pokemon.id)

          return (
            <PokemonCard
              key={pokemon.id}
              pokemon={pokemon}
              isBanned={isBanned}
              isSelectable={isSelectable}
              isPickedInCurrentMatch={isPickedInCurrentMatch}
              onClick={() => !isReadOnly && isSelectable && onPokemonPick(pokemon.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
