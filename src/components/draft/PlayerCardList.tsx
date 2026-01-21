import type { BanEntry, Team } from "../../types/draft";
import PlayerCard from "./PlayerCard";
import BanRow from "./BanRow";
import { getPokemonById } from "../../data/pokemon";
import { getTurnNumberByTeamIndex } from "../../utils/draftLogic";

interface PlayerCardListProps {
  teamName: string;
  players: string[];
  pickedPokemonIds: string[];
  teamColor: string;
  isActive: boolean;
  banEntries: BanEntry[];
  team: Team; // このチーム ('A' | 'B')
  banSequence: Team[]; // BAN順シーケンス（例: ['A', 'B', 'A', 'B', 'A', 'B']）
  pickSequence: Team[]; // PICK順シーケンス（例: ['A', 'B', 'B', 'A', 'A', 'B', 'B', 'A', 'A', 'B']）
  currentTurn: number; // 現在のターン（0-based）
  phase: 'ready' | 'ban' | 'pick'; // 現在のフェーズ
  isBanCancellable?: boolean; // BAN削除可能かどうか
  onCancelBan?: (banIndex: number) => void; // BAN削除ハンドラー
}

export default function PlayerCardList({
  teamName,
  players,
  pickedPokemonIds,
  teamColor,
  isActive,
  banEntries,
  team,
  banSequence,
  pickSequence,
  currentTurn,
  phase,
  isBanCancellable = false,
  onCancelBan,
}: PlayerCardListProps) {
  return (
    <div
      className="player-card-list"
      style={{
        background: "#ffffff",
        padding: "clamp(0.3rem, 0.7vw, 0.5rem)",
        borderRadius: "clamp(6px, 0.8vw, 10px)",
        borderLeft: isActive
          ? `4px solid ${teamColor}`
          : `3px solid ${teamColor}`,
        border: `1px solid #e5e7eb`,
        borderLeftWidth: isActive ? "4px" : "3px",
        borderLeftColor: teamColor,
        boxShadow: isActive
          ? `0 0 12px 2px ${teamColor}80, 0 0 0 2px ${teamColor}40, 0 1px 3px rgba(0, 0, 0, 0.1)`
          : "0 1px 3px rgba(0, 0, 0, 0.08)",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "100px",
      }}
    >
      <div
      className="player-card-list-header"
      style={{
          display: "flex",
          flexDirection: "row",
          gap: "8px",
        }}
      >
        {/* BAN枠表示 */}
        <BanRow
          teamColor={teamColor}
          banEntries={banEntries}
          team={team}
          banSequence={banSequence}
          currentTurn={currentTurn}
          phase={phase}
          isCancellable={isBanCancellable}
          onCancelBan={onCancelBan}
        />

        {/* チーム名 */}
        <p
          style={{
            color: teamColor,
            width:'60%',
            margin: "0",
            fontSize: "1.5rem",
            textAlign: "center",
            borderBottom: `1px solid ${teamColor}30`,
            paddingBottom: "clamp(0.2rem, 0.5vw, 0.3rem)",
            fontWeight: "bold",
            letterSpacing: "0.05em",
            alignSelf:"center",
            justifySelf:"end",
            textAlignLast:"center",
          }}
        >
          {teamName}
        </p>
      </div>
      {/* プレイヤーカード一覧 */}
      <div
        className="player-cards-container"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "8px",
        }}
      >
        {players.map((playerName, index) => {
          // 現在のピック数から、次にピックするプレイヤーを判定
          // PICKフェーズのみで表示（BANフェーズ中はBanSlotに表示）
          const isCurrentPicker = phase === 'pick' && isActive && pickedPokemonIds.length === index;

          // このプレイヤーのポケモンを取得
          const pokemonId = pickedPokemonIds[index];
          const pokemon = pokemonId ? getPokemonById(pokemonId) : null;

          // シーケンス内での turn 番号を計算
          const turnNumber = getTurnNumberByTeamIndex(team, index, pickSequence);

          return (
            <PlayerCard
              key={index}
              playerName={playerName}
              pokemon={pokemon}
              teamColor={teamColor}
              isCurrentPicker={isCurrentPicker}
              slotNumber={turnNumber}
            />
          );
        })}
      </div>
    </div>
  );
}
