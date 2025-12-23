import type { Pokemon } from '../../types/pokemon'

interface PickedPokemonSlotProps {
  pokemon: Pokemon | null
  teamColor: string
}

export default function PickedPokemonSlot({
  pokemon,
  teamColor,
}: PickedPokemonSlotProps) {
  if (!pokemon) {
    // 未ピック枠
    return (
      <div
        style={{
          padding: '0.5rem',
          marginBottom: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.87)',
          borderRadius: '4px',
          border: '2px dashed #333',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '0.8rem',
        }}
      >
        未選択
      </div>
    )
  }

  // ピック済み
  return (
    <div
      style={{
        padding: '0.5rem',
        marginBottom: '0.5rem',
        backgroundColor: teamColor,
        borderRadius: '4px',
        border: '2px solid ' + teamColor,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <img
        src={`/assets/img/pokemon/${pokemon.id}.png`}
        alt={pokemon.name}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          color: 'white',
          fontSize: '0.85rem',
          fontWeight: 'bold',
        }}
      >
        {pokemon.name}
      </div>
    </div>
  )
}