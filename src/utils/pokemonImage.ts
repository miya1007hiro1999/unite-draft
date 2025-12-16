/**
 * ポケモン画像の動的読み込みユーティリティ
 *
 * src/assets/img/pokemon/{pokemonId}.png から画像を読み込む
 */

// Viteの import.meta.glob を使用して全ての画像を一括読み込み
const images = import.meta.glob<{ default: string }>(
  '/src/assets/img/pokemon/*.png',
  { eager: true }
)

/**
 * ポケモンIDから画像URLを取得
 * @param pokemonId - ポケモンID（ファイル名と完全一致する必要あり）
 * @returns 画像URL（画像が見つからない場合はプレースホルダー）
 */
export function getPokemonImage(pokemonId: string): string {
  // パスを構築（/src/assets/img/pokemon/{pokemonId}.png）
  const imagePath = `/src/assets/img/pokemon/${pokemonId}.png`

  // 画像が存在するか確認
  if (images[imagePath]) {
    return images[imagePath].default
  }

  // 開発環境では警告を表示
  if (import.meta.env.DEV) {
    console.warn(
      `[Pokemon Image] Image not found for pokemonId: "${pokemonId}"\n` +
      `Expected path: ${imagePath}\n` +
      `Available images: ${Object.keys(images).length} files`
    )
  }

  // フォールバック: プレースホルダー画像を返す
  return `https://placehold.co/100x100/6366f1/fff?text=${encodeURIComponent(pokemonId)}`
}

/**
 * 利用可能な画像の一覧を取得（デバッグ用）
 * @returns 画像パスの配列
 */
export function getAvailableImages(): string[] {
  return Object.keys(images)
}
