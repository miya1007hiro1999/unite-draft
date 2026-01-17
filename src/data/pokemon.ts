import type { Pokemon } from '../types/pokemon'

/**
 * ポケモン一覧（仮データ）
 * 画像URLはプレースホルダーを使用
 */
export const POKEMON_LIST: Pokemon[] = [
  { id: 'venusaur', name: 'フシギバナ',type :'attack'},
  { id: 'charizard', name: 'リザードン',type:'balance' },
  { id: 'charizard_x', name: 'メガリザードンX',type:'balance' },
  { id: 'charizard_y', name: 'メガリザードンY',type:'balance' },
  { id: 'blastoise', name: 'カメックス',type:'defence' },
  { id: 'pikachu', name: 'ピカチュウ',type :'attack' },
  { id: 'raichu_alola', name: 'アローラライチュウ',type :'attack' },
  { id: 'clefable', name: 'ピクシー' ,type:'support'},
  { id: 'ninetales_alola', name: 'アローラキュウコン',type :'attack' },
  { id: 'wigglytuff', name: 'プクリン',type:'support' },
  { id: 'meowth', name:'ニャース', type:'speed'},
  { id: 'psyduck', name: 'コダック',type:'support' },

  { id: 'machamp', name: 'カイリキー',type:'balance' },
  { id: 'rapidash_galar', name: 'ガラルギャロップ',type:'speed' },
  { id: 'slowbro', name: 'ヤドラン',type:'defence'  },
  { id: 'dodrio', name: 'ドードリオ' ,type:'speed'},
  { id: 'gengar', name: 'ゲンガー',type:'speed' },
  { id: 'mrmime', name: 'バリヤード' ,type:'support'},
  { id: 'gyarados', name: 'ギャラドス',type:'balance' },
  { id: 'gyarados_mega', name: 'メガギャラドス',type:'balance' },
  { id: 'lapras', name: 'ラプラス' ,type:'defence' },
  { id: 'vaporeon', name: 'シャワーズ',type:'defence'  },

  { id: 'snorlax', name: 'カビゴン',type:'defence'  },
  { id: 'dragonite', name: 'カイリュー',type:'balance' },
  { id: 'mewtwo_x', name: 'ミュウツー (X)',type:'balance' },
  { id: 'mewtwo_y', name: 'ミュウツー (Y)',type :'attack' },
  { id: 'mew', name: 'ミュウ',type :'attack' },
  { id: 'azumarill', name: 'マリルリ',type:'balance' },
  { id: 'espeon', name: 'エーフィ',type :'attack' },
  { id: 'umbreon', name: 'ブラッキー',type:'defence'  },
  { id: 'scizor', name: 'ハッサム',type:'balance' },
  { id: 'blissey', name: 'ハピナス',type:'support' },

  { id: 'suicune', name: 'スイクン',type:'balance' },
  { id: 'tyranitar', name: 'バンギラス',type:'balance' },
  { id: 'hooh', name: 'ホウオウ',type:'defence'  },
  { id: 'blaziken', name: 'バシャーモ',type:'balance' },
  { id: 'gardevoir', name: 'サーナイト',type :'attack' },
  { id: 'sableye', name: 'ヤミラミ',type:'support' },
  { id: 'absol', name: 'アブソル',type:'speed' },
  { id: 'metagross', name: 'メタグロス',type:'balance' },
  { id: 'latias', name: 'ラティアス',type:'support' },
  { id: 'latios', name: 'ラティオス',type :'attack' },

  { id: 'empoleon', name: 'エンペルト',type:'balance' },
  { id: 'garchomp', name: 'ガブリアス',type:'balance' },
  { id: 'lucario', name: 'ルカリオ',type:'balance' },
  { id: 'lucario_mega', name: 'メガルカリオ',type:'balance' },
  { id: 'leafeon', name: 'リーフィア',type:'speed' },
  { id: 'glaceon', name: 'グレイシア',type :'attack' },
  { id: 'mamoswine', name: 'マンムー',type:'defence'  },
  { id: 'darkrai', name: 'ダークライ' ,type:'speed'},
  { id: 'crustle', name: 'イワパレス',type:'defence'  },
  { id: 'zoroark', name: 'ゾロアーク' ,type:'speed'},

  { id: 'chandelure', name: 'シャンデラ',type :'attack' },
  { id: 'delphox', name: 'マフォクシー',type :'attack' },
  { id: 'greninja', name: 'ゲッコウガ',type :'attack' },
  { id: 'talonflame', name: 'ファイアロー',type:'speed' },
  { id: 'aegislash', name: 'ギルガルド',type:'balance' },
  { id: 'sylveon', name: 'ニンフィア',type :'attack' },
  { id: 'goodra', name: 'ヌメルゴン',type:'defence'  },
  { id: 'trevenant', name: 'オーロット',type:'defence'  },

  { id: 'hoopa', name: 'フーパ',type:'support' },
  { id: 'decidueye', name: 'ジュナイパー',type :'attack' },
  { id: 'tsareena', name: 'アマージョ',type:'balance' },
  { id: 'comfey', name: 'キュワワー',type:'support' },
  { id: 'mimikyu', name: 'ミミッキュ' ,type:'balance'},
  { id: 'dhelmise', name: 'ダダリン' ,type:'balance'},
  { id: 'buzzwole', name: 'マッシブーン' ,type:'balance'},
  { id: 'zeraora', name: 'ゼラオラ',type:'speed' },

  { id: 'cinderace', name: 'エースバーン',type :'attack' },
  { id: 'inteleon', name: 'インテレオン',type :'attack' },
  { id: 'greedent', name: 'ヨクバリス',type:'defence'  },
  { id: 'eldegoss', name: 'ワタシラガ' ,type:'support'},
  { id: 'cramorant', name: 'ウッウ',type :'attack' },
  { id: 'alcremie', name: 'マホイップ',type:'support' },
  { id: 'falinks', name: 'タイレーツ',type:'balance' },
  { id: 'duraludon', name: 'ジュラルドン',type :'attack' },
  { id: 'dragapult', name: 'ドラパルト',type :'attack' },
  { id: 'zacian', name: 'ザシアン',type:'balance' },

  { id: 'urshifu', name: 'ウーラオス',type:'balance' },
  { id: 'meowscarada', name: 'マスカーニャ',type:'speed' },
  { id: 'pawmot', name: 'パーモット' ,type:'balance'},
  { id: 'armarouge', name: 'グレンアルマ',type :'attack' },
  { id: 'ceruledge', name: 'ソウブレイズ',type:'balance' },
  { id: 'tinkaton', name: 'デカヌチャン',type:'balance' },
  { id: 'miraidon', name: 'ミライドン',type :'attack' },
]

/**
 * ポケモンIDからPokemonオブジェクトを取得
 * @param id - ポケモンID
 * @returns Pokemonオブジェクト（見つからない場合はnull）
 */
export function getPokemonById(id: string): Pokemon | null {
  return POKEMON_LIST.find((pokemon) => pokemon.id === id) || null
}
