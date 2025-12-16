import type { Pokemon } from '../types/pokemon'

/**
 * ポケモン一覧（仮データ）
 * 画像URLはプレースホルダーを使用
 */
export const POKEMON_LIST: Pokemon[] = [
  { id: 'venusaur', name: 'フシギバナ' },
  { id: 'charizard', name: 'リザードン' },
  { id: 'charizard_x', name: 'メガリザードンX' },
  { id: 'charizard_y', name: 'メガリザードンY' },
  { id: 'blastoise', name: 'カメックス' },
  { id: 'pikachu', name: 'ピカチュウ' },
  { id: 'raichu_alola', name: 'アローラライチュウ' },
  { id: 'clefable', name: 'ピクシー' },
  { id: 'ninetales_alola', name: 'アローラキュウコン' },
  { id: 'wigglytuff', name: 'プクリン' },
  { id: 'psyduck', name: 'コダック' },

  { id: 'machamp', name: 'カイリキー' },
  { id: 'rapidash_galar', name: 'ガラルギャロップ' },
  { id: 'slowbro', name: 'ヤドラン' },
  { id: 'dodrio', name: 'ドードリオ' },
  { id: 'gengar', name: 'ゲンガー' },
  { id: 'mrmime', name: 'バリヤード' },
  { id: 'gyarados', name: 'ギャラドス' },
  { id: 'gyarados_mega', name: 'メガギャラドス' },
  { id: 'lapras', name: 'ラプラス' },
  { id: 'vaporeon', name: 'シャワーズ' },

  { id: 'snorlax', name: 'カビゴン' },
  { id: 'dragonite', name: 'カイリュー' },
  { id: 'mewtwo_x', name: 'ミュウツー (X)' },
  { id: 'mewtwo_y', name: 'ミュウツー (Y)' },
  { id: 'mew', name: 'ミュウ' },
  { id: 'azumarill', name: 'マリルリ' },
  { id: 'espeon', name: 'エーフィ' },
  { id: 'umbreon', name: 'ブラッキー' },
  { id: 'scizor', name: 'ハッサム' },
  { id: 'blissey', name: 'ハピナス' },

  { id: 'suicune', name: 'スイクン' },
  { id: 'tyranitar', name: 'バンギラス' },
  { id: 'hooh', name: 'ホウオウ' },
  { id: 'blaziken', name: 'バシャーモ' },
  { id: 'gardevoir', name: 'サーナイト' },
  { id: 'sableye', name: 'ヤミラミ' },
  { id: 'absol', name: 'アブソル' },
  { id: 'metagross', name: 'メタグロス' },
  { id: 'latias', name: 'ラティアス' },
  { id: 'latios', name: 'ラティオス' },

  { id: 'empoleon', name: 'エンペルト' },
  { id: 'garchomp', name: 'ガブリアス' },
  { id: 'lucario', name: 'ルカリオ' },
  { id: 'lucario_mega', name: 'メガルカリオ' },
  { id: 'leafeon', name: 'リーフィア' },
  { id: 'glaceon', name: 'グレイシア' },
  { id: 'mamoswine', name: 'マンムー' },
  { id: 'darkrai', name: 'ダークライ' },
  { id: 'crustle', name: 'イワパレス' },
  { id: 'zoroark', name: 'ゾロアーク' },

  { id: 'chandelure', name: 'シャンデラ' },
  { id: 'delphox', name: 'マフォクシー' },
  { id: 'greninja', name: 'ゲッコウガ' },
  { id: 'talonflame', name: 'ファイアロー' },
  { id: 'aegislash', name: 'ギルガルド' },
  { id: 'sylveon', name: 'ニンフィア' },
  { id: 'goodra', name: 'ヌメルゴン' },
  { id: 'trevenant', name: 'オーロット' },

  { id: 'hoopa', name: 'フーパ' },
  { id: 'decidueye', name: 'ジュナイパー' },
  { id: 'tsareena', name: 'アマージョ' },
  { id: 'comfey', name: 'キュワワー' },
  { id: 'mimikyu', name: 'ミミッキュ' },
  { id: 'dhelmise', name: 'ダダリン' },
  { id: 'buzzwole', name: 'マッシブーン' },
  { id: 'zeraora', name: 'ゼラオラ' },

  { id: 'cinderace', name: 'エースバーン' },
  { id: 'inteleon', name: 'インテレオン' },
  { id: 'greedent', name: 'ヨクバリス' },
  { id: 'eldegoss', name: 'ワタシラガ' },
  { id: 'cramorant', name: 'ウッウ' },
  { id: 'alcremie', name: 'マホイップ' },
  { id: 'falinks', name: 'タイレーツ' },
  { id: 'duraludon', name: 'ジュラルドン' },
  { id: 'dragapult', name: 'ドラパルト' },
  { id: 'zacian', name: 'ザシアン' },

  { id: 'urshifu', name: 'ウーラオス' },
  { id: 'meowscarada', name: 'マスカーニャ' },
  { id: 'pawmot', name: 'パーモット' },
  { id: 'armarouge', name: 'グレンアルマ' },
  { id: 'ceruledge', name: 'ソウブレイズ' },
  { id: 'tinkaton', name: 'デカヌチャン' },
  { id: 'miraidon', name: 'ミライドン' },
]

/**
 * ポケモンIDからPokemonオブジェクトを取得
 * @param id - ポケモンID
 * @returns Pokemonオブジェクト（見つからない場合はnull）
 */
export function getPokemonById(id: string): Pokemon | null {
  return POKEMON_LIST.find((pokemon) => pokemon.id === id) || null
}
