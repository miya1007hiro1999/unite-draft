import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { createMockDraftState } from "../utils/draftState";
import type { DraftState } from "../types/draft";
import { matchToIndex } from "../types/draft";
import PokemonGrid from "../components/draft/PokemonGrid";
import {
  getBannedPokemon,
  getCurrentPickingTeam,
  getCurrentMatchPicks,
  getCurrentMatchBans,
  isMatchComplete,
  isDraftComplete,
  getCurrentMatchBanEntries,
  isBanPhaseComplete,
  BAN_PHASE_TOTAL_TURNS,
  pickRandomPokemon,
  getBanSequenceByMatch,
  getPickSequenceByMatch,
} from "../utils/draftLogic";
import { useTurnTimer } from "../hooks/useTurnTimer";
import PlayerCardList from "../components/draft/PlayerCardList";
import { getPokemonById } from "../data/pokemon";
import {
  loadDraftState,
  saveDraftState,
} from "../lib/draftStorage";
import type { Pokemon } from "../types/pokemon";
import { useDraftRealtime } from "../hooks/useDraftRealtime";
import { confirmPick, confirmBan, goToNextMatch } from "../lib/draftActions";

// PendingBan型定義（ABABAB turn制用）
type PendingBanState =
  | { type: "none" }
  | { type: "pokemon"; pokemonId: string }
  | { type: "skip" };

export default function DraftPage() {
  // URLパラメータから draftId と mode を取得
  const { draftId, mode } = useParams<{ draftId?: string; mode?: string }>();

  // mode が 'view' の場合は読み取り専用
  const isReadOnly = mode === "view";

  // Realtime で state を管理（draftId がある場合）
  const {
    draftState: realtimeState,
    confirmedActions,
    isLoading: realtimeLoading,
    error,
  } = useDraftRealtime({
    draftId,
    enabled: !!draftId,
  });

  // 従来の state（draftId がない場合の /draft 用）
  const [legacyState, setLegacyState] = useState<DraftState | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(true);

  // draftId の有無で state を切り替え
  const state = draftId ? realtimeState : legacyState;
  const isLoading = draftId ? realtimeLoading : legacyLoading;

  // 未確定 state はローカルのみ
  const [pendingPick, setPendingPick] = useState<Pokemon | null>(null);
  const [pendingBan, setPendingBan] = useState<PendingBanState>({ type: "none" });

  // タイムアウト処理（admin のみ実行）
  const handleTimeout = useCallback(async () => {
    if (!state || !draftId) return;

    // 試合が終了している場合は何もしない
    if (isMatchComplete(state) || isDraftComplete(state)) {
      console.log("[DraftPage] Timeout skipped: match/draft already complete");
      return;
    }

    console.log(`[DraftPage] Timeout! phase=${state.phase}`);

    if (state.phase === "pick") {
      // PICK フェーズ：ランダムポケモンを選んで confirmPick()
      const randomPokemonId = pickRandomPokemon(state);
      const pickingTeam = getCurrentPickingTeam(state);

      console.log(`[DraftPage] Auto-pick: ${randomPokemonId} for Team ${pickingTeam}`);

      const success = await confirmPick(
        draftId,
        pickingTeam,
        randomPokemonId,
        confirmedActions.length + 1,
        state
      );

      if (!success) {
        console.error("[DraftPage] Failed to auto-pick on timeout");
      }

      // pendingPick をクリア
      setPendingPick(null);
    } else if (state.phase === "ban") {
      // BAN フェーズ：スキップとして confirmBan(draftId, null, state)
      console.log("[DraftPage] Auto-skip BAN on timeout");

      const success = await confirmBan(draftId, null, state);

      if (!success) {
        console.error("[DraftPage] Failed to auto-skip BAN on timeout");
      }

      // pendingBan をクリア
      setPendingBan({ type: "none" });
    }
  }, [state, draftId, confirmedActions.length]);

  // ターンタイマー（admin のみカウントダウン、観戦者は表示のみ）
  const timeLeft = useTurnTimer({
    currentTurn: state?.currentTurn ?? 0,
    phase: state?.phase ?? "ban",
    isAdmin: !isReadOnly && !!draftId,
    onTimeout: handleTimeout,
  });

  // React 18 StrictMode による useEffect 二重実行を防ぐためのガード
  // 開発環境でも初期化が一度だけ実行されることを保証
  const isInitialized = useRef(false);

  // 初期表示時にSupabaseからDraftStateを読み込む（draftId がない場合のみ）
  useEffect(() => {
    // draftId がある場合は useDraftRealtime が処理するのでスキップ
    if (draftId) {
      return;
    }

    // ✅ StrictMode二重実行ガード: 既に初期化済みなら何もしない
    if (isInitialized.current) {
      console.log("[DraftPage] Already initialized, skipping...");
      return;
    }

    const loadInitialState = async () => {
      try {
        console.log("[DraftPage] === Legacy Initialization START ===");
        console.log("[DraftPage] No draft ID in URL, using legacy behavior");

        let loadedState: DraftState | null = null;

        // Supabaseから既存ドラフトを読み込み
        loadedState = await loadDraftState();

        if (loadedState) {
          // 既存のドラフトがある場合はそれを使用（正本）
          console.log("[DraftPage] Using existing draft from Supabase");
          setLegacyState(loadedState);
        } else {
          // 既存データがない場合のみモックを作成
          console.log("[DraftPage] No existing draft, creating mock...");
          const mockState = createMockDraftState();

          // モックをSupabaseに保存してから setState
          const result = await saveDraftState(mockState);

          if (result) {
            // 成功（新規作成 or 更新）
            console.log(
              "[DraftPage] Mock draft saved and set as initial state"
            );
            if (typeof result === "string") {
              console.log("[DraftPage] New draft ID:", result);
            }
            setLegacyState(mockState);
          } else {
            // 保存失敗時もモックを使用（ローカルのみで動作）
            console.warn(
              "[DraftPage] Failed to save initial mock, using local state only"
            );
            setLegacyState(mockState);
          }
        }
      } catch (error) {
        console.error("[DraftPage] Failed to load initial state:", error);
        // エラー時はモックデータで動作
        setLegacyState(createMockDraftState());
      } finally {
        setLegacyLoading(false);
        console.log("[DraftPage] === Legacy Initialization END ===");
      }
    };

    // ✅ 初期化フラグを立ててから実行
    isInitialized.current = true;
    loadInitialState();
  }, [draftId]);

  // ピック追加ハンドラー（仮ピック / 仮BAN）
  const handlePokemonPick = (pokemonId: string) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Pokemon pick disabled");
      return;
    }

    if (!state) return;

    // BANフェーズ：pendingBan にセット（ABABAB turn制）
    if (state.phase === "ban") {
      const currentTeam = getCurrentPickingTeam(state);
      console.log(
        `[DraftPage] BAN selected: ${pokemonId} (Match ${state.currentMatch}, Turn ${state.currentTurn}, Team ${currentTeam})`
      );
      setPendingBan({ type: "pokemon", pokemonId });
      return;
    }

    // PICKフェーズ：pokemonId から Pokemon を取得して仮ピックに保存
    const pokemon = getPokemonById(pokemonId);
    if (pokemon) {
      console.log("[DraftPage] Pending pick:", pokemon.name);
      setPendingPick(pokemon);
    } else {
      console.warn("[DraftPage] Pokemon not found:", pokemonId);
    }
  };

  // BANスキップ選択ハンドラー（pendingBan に skip をセット）
  const handleSkipBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: BAN skip disabled");
      return;
    }

    // BANフェーズ中のみスキップ可能
    if (!state || state.phase !== "ban") {
      console.warn("[DraftPage] BAN skip is only available during BAN phase");
      return;
    }

    const currentTeam = getCurrentPickingTeam(state);
    console.log(`[DraftPage] BAN skip selected (Match ${state.currentMatch}, Turn ${state.currentTurn}, Team ${currentTeam})`);
    setPendingBan({ type: "skip" });
  };

  // 仮ピックを確定してSupabaseに保存（PICKフェーズのみ）
  const handleConfirmPick = async () => {
    // PICKフェーズ以外では何もしない
    if (!state || state.phase !== "pick") return;

    // nullの場合は何もしない
    if (pendingPick === null) return;

    const pickingTeam = getCurrentPickingTeam(state);

    console.log(`[DraftPage] Confirming PICK: ${pendingPick.name} (Team ${pickingTeam})`);

    // Realtime 対応：draftId がある場合は confirmPick を使用
    if (draftId) {
      const orderIndex = confirmedActions.length + 1;
      const success = await confirmPick(
        draftId,
        pickingTeam,
        pendingPick.id,
        orderIndex,
        state
      );

      if (success) {
        // pendingPick をクリア（state は Realtime で自動更新される）
        setPendingPick(null);
      } else {
        console.error("[DraftPage] Failed to confirm PICK");
      }
    } else {
      // Legacy: draftId がない場合は従来の処理
      const { currentMatch } = state;
      const idx = matchToIndex(currentMatch);
      const newPicks = [...state.picks];

      if (newPicks[idx]) {
        const currentPicks = newPicks[idx][pickingTeam];
        if (!currentPicks.includes(pendingPick.id)) {
          newPicks[idx] = {
            ...newPicks[idx],
            [pickingTeam]: [...currentPicks, pendingPick.id],
          };
        }
      }

      const newState = {
        ...state,
        picks: newPicks,
        currentTurn: state.currentTurn + 1,
        updatedAt: new Date().toISOString(),
      };

      setLegacyState(newState);
      saveDraftState(newState).catch((error) => {
        console.error("Failed to save draft state after pick:", error);
      });

      // 仮ピックをクリア
      setPendingPick(null);
    }
  };

  // 仮ピックをキャンセル
  const handleCancelPick = () => {
    console.log("[DraftPage] Canceling pending pick");
    setPendingPick(null);
  };

  // 仮BANをキャンセル（pendingBan をクリア）
  const handleCancelBan = () => {
    console.log("[DraftPage] Canceling pending BAN");
    setPendingBan({ type: "none" });
  };

  // BAN確定ハンドラー（ABABAB turn制: pendingBan を確定）
  const handleConfirmBan = async () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: BAN confirm disabled");
      return;
    }

    if (!state || state.phase !== "ban") return;

    // pendingBan が none の場合は何もしない
    if (pendingBan.type === "none") {
      console.warn("[DraftPage] No pending BAN to confirm");
      return;
    }

    const currentTeam = getCurrentPickingTeam(state);
    const pokemonId = pendingBan.type === "pokemon" ? pendingBan.pokemonId : null;

    console.log(`[DraftPage] Confirming BAN: ${pokemonId ?? "SKIP"} (Match ${state.currentMatch}, Turn ${state.currentTurn}, Team ${currentTeam})`);

    // Realtime モード: confirmBan を使用
    if (draftId) {
      const success = await confirmBan(draftId, pokemonId, state);

      if (success) {
        setPendingBan({ type: "none" });
      } else {
        console.error("[DraftPage] Failed to confirm BAN");
      }
      // state は Realtime で自動更新される
      return;
    }

    // Legacy モード: setLegacyState を使用
    const { currentMatch, currentTurn } = state;
    const idx = matchToIndex(currentMatch);
    const newBans = [...state.bans];

    // 現在の試合のBANを更新
    if (newBans[idx]) {
      newBans[idx] = {
        ...newBans[idx],
        [currentTeam]: [...newBans[idx][currentTeam], pokemonId],
      };
    }

    // 次のターンを計算
    const nextTurn = currentTurn + 1;

    // BANフェーズ完了判定：6ターン完了でPICKフェーズへ自動遷移
    const banPhaseComplete = nextTurn >= BAN_PHASE_TOTAL_TURNS;

    const newState: DraftState = {
      ...state,
      bans: newBans,
      currentTurn: banPhaseComplete ? 0 : nextTurn,
      phase: banPhaseComplete ? "pick" : "ban",
      updatedAt: new Date().toISOString(),
    };

    if (banPhaseComplete) {
      console.log("[DraftPage] BAN phase complete, transitioning to PICK phase");
    }

    setLegacyState(newState);
    setPendingBan({ type: "none" });

    saveDraftState(newState).catch((error) => {
      console.error("Failed to save draft state after BAN confirm:", error);
    });
  };

  // 次の試合へ進むハンドラー
  const handleGoToNextMatch = async () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Match transition disabled");
      return;
    }

    if (!state) return;

    // Realtime モード: goToNextMatch を使用
    if (draftId) {
      const success = await goToNextMatch(draftId, state);
      if (!success) {
        console.error("[DraftPage] Failed to transition to next match");
      }
      return;
    }

    // Legacy モード: setLegacyState を使用

    setLegacyState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState;

      const { currentMatch, series, firstPickByMatch } = prevState;
      const maxMatches = series.maxMatches;

      // 最終試合終了後は何もしない
      if (currentMatch >= maxMatches) {
        return prevState;
      }

      // 通常試合完了後は次の試合へ
      const nextMatch = currentMatch + 1;
      const nextIdx = matchToIndex(nextMatch);

      // 次の試合の先行チームを取得（ログ用）
      const firstTeam = firstPickByMatch[nextIdx];

      const newState: DraftState = {
        ...prevState,
        currentMatch: nextMatch,
        currentTurn: 0,
        phase: "ban", // 次の試合はBANフェーズから開始
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[DraftPage] Transitioning to Match ${nextMatch} (BAN phase, Team ${firstTeam} starts)`
      );

      // Supabaseに保存（非同期だが待たない）
      saveDraftState(newState).catch((error) => {
        console.error(
          "Failed to save draft state after match transition:",
          error
        );
      });

      return newState;
    });
  };

  // エラー表示
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.87)",
          color: "#1f2937",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
              marginBottom: "1rem",
              fontWeight: "bold",
              color: "#dc2626",
            }}
          >
            エラーが発生しました
          </div>
          <div
            style={{ fontSize: "clamp(0.9rem, 2vw, 1rem)", color: "#6b7280" }}
          >
            {error}
          </div>
        </div>
      </div>
    );
  }

  // ローディング中またはstateがnullの場合は描画しない
  if (isLoading || !state) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.87)",
          color: "#1f2937",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
              marginBottom: "1rem",
              fontWeight: "bold",
              color: "#059669",
            }}
          >
            読み込み中...
          </div>
          <div
            style={{ fontSize: "clamp(0.9rem, 2vw, 1rem)", color: "#6b7280" }}
          >
            DraftStateを取得しています
          </div>
        </div>
      </div>
    );
  }

  // この時点でstateは必ず存在する
  // BAN判定
  const bannedPokemon = getBannedPokemon(state);
  // 現在の試合でBAN済みのポケモンID配列
  const currentMatchBannedPokemonIds = getCurrentMatchBans(state);

  // 現在ピック中のチーム
  const currentPickingTeam = getCurrentPickingTeam(state);

  // 試合終了判定
  const matchComplete = isMatchComplete(state);
  const draftComplete = isDraftComplete(state);

  // 現在の試合のBAN枠を取得（新しいヘルパー関数を使用）
  const currentMatchBanEntriesA = getCurrentMatchBanEntries(state, "A");
  const currentMatchBanEntriesB = getCurrentMatchBanEntries(state, "B");

  // 現在の試合のシーケンスを取得（turn番号計算用）
  const matchIdx = state.currentMatch > 0 ? matchToIndex(state.currentMatch) : 0;
  const banSequence = getBanSequenceByMatch(matchIdx, state.firstPickByMatch);
  const pickSequence = getPickSequenceByMatch(matchIdx, state.firstPickByMatch);

  // 最大試合数
  const maxMatches = state.series.maxMatches;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255, 255, 255, 0.87)",
        overflow: "hidden",
      }}
    >
      {/* 運営・観戦URL表示（画面右下に固定） */}
      {!isReadOnly && draftId && (
        <div
          style={{
            position: "fixed",
            bottom: "clamp(0.5rem, 1vw, 1rem)",
            right: "clamp(0.5rem, 1vw, 1rem)",
            zIndex: 1000,
            background: "rgba(249, 250, 251, 0.95)",
            padding: "clamp(0.4rem, 1vw, 0.6rem)",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            fontSize: "clamp(0.5rem, 1vw, 0.65rem)",
            display: "flex",
            flexDirection: "row",
            gap: "clamp(0.3rem, 0.7vw, 0.4rem)",
          }}
        >
          <a
            href={`https://unite-draft-dun.vercel.app/draft/${draftId}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "#059669",
              textDecoration: "none",
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            🔗 運営URL
          </a>
          <a
            href={`https://unite-draft-dun.vercel.app/draft/${draftId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "#d97706",
              textDecoration: "none",
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            👁️ 観戦URL
          </a>
        </div>
      )}

      {/* メインコンテンツ */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {/* 通常試合（match 1-maxMatches）：従来のレイアウト */}
        <div className="draft-grid-layout">
          {/* チームA */}
          <div style={{ gridArea: "teamA" }}>
            <div style={{ width: "100%" }}>
              <PlayerCardList
                teamName={state.teams.A.name}
                players={state.teams.A.players}
                pickedPokemonIds={getCurrentMatchPicks(state, "A")}
                teamColor="#f97316"
                isActive={currentPickingTeam === "A"}
                banEntries={currentMatchBanEntriesA}
                team="A"
                banSequence={banSequence}
                pickSequence={pickSequence}
                currentTurn={state.currentTurn}
                phase={state.phase}
                isBanCancellable={false}
                onCancelBan={() => {}}
              />
            </div>
          </div>

          {/* 中央エリア（ポケモングリッド） */}
          <div
            style={{
              gridArea: "center",
              background: "#ffffff",
              padding: "clamp(1rem, 2vw, 1.5rem)",
              borderRadius: "clamp(12px, 2vw, 16px)",
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1rem, 2vw, 1.5rem)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
          >
            <PokemonGrid
              bannedPokemon={bannedPokemon}
              currentMatchBannedPokemonIds={currentMatchBannedPokemonIds}
              state={state}
              onPokemonPick={handlePokemonPick}
              isReadOnly={isReadOnly}
            />

            {/* 仮ピック確定/キャンセルボタン（PICKフェーズのみ） */}
            {pendingPick !== null &&
              state.phase === "pick" &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: "#f9fafbe2",
                    padding: "clamp(0.6rem, 1.5vw, 1rem)",
                    borderRadius: "8px",
                    border: "1.5px solid #f59e0b",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    textAlign: "center",
                    position: "fixed",
                    top: "9vh",
                    left: "50%",
                    transform: "translate(-50% , -50%)",
                    zIndex: "1",
                  }}
                >
                  <div
                    className="timer"
                    style={{
                      color: timeLeft <= 10 ? "#dc2626" : "#059669",
                      fontSize: "clamp(1rem, 2vw, 1.25rem)",
                      fontWeight: "bold",
                      marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                    }}
                  >
                    残り {timeLeft} 秒
                  </div>
                  <div
                    style={{
                      color: "#d97706",
                      marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                      fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
                      fontWeight: "bold",
                    }}
                  >
                    ✓ 仮ピック: <strong>{pendingPick.name}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "clamp(0.5rem, 1.3vw, 0.75rem)",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={handleConfirmPick}
                      style={{
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        padding:
                          "clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)",
                        borderRadius: "6px",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#059669";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#10b981";
                      }}
                    >
                      ✓ 確定
                    </button>
                    <button
                      onClick={handleCancelPick}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding:
                          "clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)",
                        borderRadius: "6px",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#dc2626";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#ef4444";
                      }}
                    >
                      ✕ キャンセル
                    </button>
                  </div>
                </div>
              )}

            {/* PICKフェーズ：pendingPick がない場合の簡易タイマー */}
            {pendingPick === null &&
              state.phase === "pick" &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: "#f9fafbe2",
                    padding: "clamp(0.6rem, 1.5vw, 1rem)",
                    borderRadius: "8px",
                    border: "1.5px solid #d1d5db",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    textAlign: "center",
                    position: "fixed",
                    top: "9vh",
                    left: "50%",
                    transform: "translate(-50% , -50%)",
                    zIndex: "1",
                  }}
                >
                  <div
                    style={{
                      color: "#374151",
                      marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                      fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                      fontWeight: "bold",
                    }}
                  >
                    {state.teams[currentPickingTeam].name} のPICKターン ({state.currentTurn + 1}/10)
                  </div>
                  <div
                    className="timer"
                    style={{
                      color: timeLeft <= 10 ? "#dc2626" : "#059669",
                      fontSize: "clamp(1rem, 2vw, 1.25rem)",
                      fontWeight: "bold",
                      marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                    }}
                  >
                    残り {timeLeft} 秒
                  </div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "clamp(0.65rem, 1.4vw, 0.75rem)",
                    }}
                  >
                    ポケモンを選択してください
                  </div>
                </div>
              )}

            {/* BANフェーズ：pendingBan の状態に応じた UI */}
            {state.phase === "ban" &&
              !isBanPhaseComplete(state) &&
              !isReadOnly &&
              !matchComplete && (
                <>
                  {/* pendingBan が none の場合：選択待ち + スキップボタン */}
                  {pendingBan.type === "none" && (
                    <div
                      style={{
                        background: "#f9fafbe2",
                        padding: "clamp(0.6rem, 1.5vw, 1rem)",
                        borderRadius: "8px",
                        border: "1.5px solid #d1d5db",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                        textAlign: "center",
                        position: "fixed",
                        top: "9vh",
                        left: "50%",
                        transform: "translate(-50% , -50%)",
                        zIndex: "1",
                      }}
                    >
                      <div
                        style={{
                          color: "#374151",
                          marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                          fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                          fontWeight: "bold",
                        }}
                      >
                        {state.teams[currentPickingTeam].name} のBANターン ({state.currentTurn + 1}/6)
                      </div>
                      <div
                        className="timer"
                        style={{
                          color: timeLeft <= 10 ? "#dc2626" : "#059669",
                          fontSize: "clamp(1rem, 2vw, 1.25rem)",
                          fontWeight: "bold",
                          marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                        }}
                      >
                        残り {timeLeft} 秒
                      </div>
                      <div
                        style={{
                          color: "#6b7280",
                          marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                          fontSize: "clamp(0.65rem, 1.4vw, 0.75rem)",
                        }}
                      >
                        ポケモンを選択するか、このBAN枠をスキップできます
                      </div>
                      <button
                        onClick={handleSkipBan}
                        style={{
                          background: "#6b7280",
                          color: "white",
                          border: "none",
                          padding:
                            "clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)",
                          borderRadius: "6px",
                          fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                          fontWeight: "bold",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 6px rgba(0, 0, 0, 0.1)";
                          e.currentTarget.style.background = "#4b5563";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 1px 3px rgba(0, 0, 0, 0.1)";
                          e.currentTarget.style.background = "#6b7280";
                        }}
                      >
                        このBAN枠をスキップ
                      </button>
                    </div>
                  )}

                  {/* pendingBan が pokemon または skip の場合：確定/キャンセルボタン */}
                  {pendingBan.type !== "none" && (
                    <div
                      style={{
                        background: "#fef3c7e2",
                        padding: "clamp(0.6rem, 1.5vw, 1rem)",
                        borderRadius: "8px",
                        border: "1.5px solid #f59e0b",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                        textAlign: "center",
                        position: "fixed",
                        top: "9vh",
                        left: "50%",
                        transform: "translate(-50% , -50%)",
                        zIndex: "2",
                      }}
                    >
                      <div
                        className="timer"
                        style={{
                          color: timeLeft <= 10 ? "#dc2626" : "#059669",
                          fontSize: "clamp(1rem, 2vw, 1.25rem)",
                          fontWeight: "bold",
                          marginBottom: "clamp(0.3rem, 0.8vw, 0.5rem)",
                        }}
                      >
                        残り {timeLeft} 秒
                      </div>
                      <div
                        style={{
                          color: "#d97706",
                          marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                          fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
                          fontWeight: "bold",
                        }}
                      >
                        {pendingBan.type === "pokemon" ? (
                          <>✓ 仮BAN: <strong>{getPokemonById(pendingBan.pokemonId)?.name ?? pendingBan.pokemonId}</strong></>
                        ) : (
                          <>✓ BANスキップを選択</>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "clamp(0.5rem, 1.3vw, 0.75rem)",
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={handleConfirmBan}
                          style={{
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            padding:
                              "clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)",
                            borderRadius: "6px",
                            fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                            fontWeight: "bold",
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 6px rgba(0, 0, 0, 0.1)";
                            e.currentTarget.style.background = "#059669";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 1px 3px rgba(0, 0, 0, 0.1)";
                            e.currentTarget.style.background = "#10b981";
                          }}
                        >
                          ✓ 確定
                        </button>
                        <button
                          onClick={handleCancelBan}
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            padding:
                              "clamp(0.4rem, 1vw, 0.5rem) clamp(1rem, 2vw, 1.3rem)",
                            borderRadius: "6px",
                            fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                            fontWeight: "bold",
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 6px rgba(0, 0, 0, 0.1)";
                            e.currentTarget.style.background = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 1px 3px rgba(0, 0, 0, 0.1)";
                            e.currentTarget.style.background = "#ef4444";
                          }}
                        >
                          ✕ キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

          {/* 試合終了時のボタン・メッセージ表示 */}
          {matchComplete && !isReadOnly && (
            <div
              style={{
                background: "#f0fdf4e2",
                padding: "clamp(1.25rem, 3vw, 1.5rem)",
                borderRadius: "12px",
                border: "2px solid #10b981",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                textAlign: "center",
                position: "fixed",
                top: "9vh",
                left: "50%",
                transform: "translate(-50% , -50%)",
                zIndex: "1",
              }}
            >
              {draftComplete ? (
                // 最終試合終了：ドラフト完了
                <div>
                  <h2
                    style={{
                      color: "#059669",
                      margin: "0 0 clamp(0.75rem, 2vw, 1rem) 0",
                      fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                      fontWeight: "bold",
                    }}
                  >
                    ドラフト完了
                  </h2>
                  <p
                    style={{
                      color: "#6b7280",
                      margin: "0 0 clamp(1rem, 2vw, 1.5rem) 0",
                      fontSize: "clamp(0.9rem, 2vw, 1rem)",
                    }}
                  >
                    全{maxMatches}試合のドラフトが完了しました
                  </p>
                  {draftId && (
                    <Link
                      to={`/draft/${draftId}/summary`}
                      style={{
                        display: "inline-block",
                        background: "#10b981",
                        color: "white",
                        textDecoration: "none",
                        padding:
                          "clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)",
                        borderRadius: "10px",
                        fontSize: "clamp(0.9rem, 2vw, 1rem)",
                        fontWeight: "bold",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform =
                          "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#059669";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#10b981";
                      }}
                    >
                      サマリーを見る
                    </Link>
                  )}
                </div>
              ) : (
                // 試合終了：次の試合へ進むボタン
                <div>
                  <h3
                    style={{
                      color: "#059669",
                      margin: "0 0 clamp(0.75rem, 2vw, 1rem) 0",
                      fontSize: "clamp(1.1rem, 2.5vw, 1.2rem)",
                      fontWeight: "bold",
                    }}
                  >
                    試合 {state.currentMatch} / {maxMatches} 終了
                  </h3>
                  <button
                    onClick={handleGoToNextMatch}
                    style={{
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      padding:
                        "clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)",
                      borderRadius: "10px",
                      fontSize: "clamp(0.9rem, 2vw, 1rem)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 6px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.background = "#059669";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.background = "#10b981";
                    }}
                  >
                    次の試合へ進む（試合 {state.currentMatch + 1}）
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* チームB */}
        <div className="teamB" style={{ gridArea: "teamB" }}>
          <div style={{ width: "100%" }}>
            <PlayerCardList
              teamName={state.teams.B.name}
              players={state.teams.B.players}
              pickedPokemonIds={getCurrentMatchPicks(state, "B")}
              teamColor="#8b5cf6"
              isActive={currentPickingTeam === "B"}
              banEntries={currentMatchBanEntriesB}
              team="B"
              banSequence={banSequence}
              pickSequence={pickSequence}
              currentTurn={state.currentTurn}
              phase={state.phase}
              isBanCancellable={false}
              onCancelBan={() => {}}
            />
          </div>
        </div>
      </div>
    </main>

    {/* フッター */}
    <footer
      style={{
        flexShrink: 0,
        background: "#ffffff",
        color: "#9ca3af",
        padding: "clamp(0.3rem, 1vw, 0.5rem) clamp(0.5rem, 2vw, 1rem)",
        borderTop: "1px solid #e5e7eb",
        textAlign: "center",
        fontSize: "clamp(0.6rem, 1.2vw, 0.7rem)",
        boxShadow: "0 -1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      最終更新: {new Date(state.updatedAt).toLocaleString("ja-JP")}
    </footer>

    {/* レスポンシブCSS */}
    <style>{`
      .draft-grid-layout {
        display: grid;
        grid-template-rows: auto 1fr;
        grid-template-columns: 1fr 1fr;
        grid-template-areas:
        "teamA teamB"
        "center center";
        gap: clamp(0.75rem, 1.5vw, 1rem);
        max-width: 1400px;
        margin: 0 auto;
      }

      /* タブレット: 中画面（768px-1023px） */
      @media (min-width: 768px) and (max-width: 1023px) {
        .draft-grid-layout {
          grid-template-rows: auto 1fr 1fr;
          grid-template-columns: 1fr;
          grid-template-areas:
            "center center"
            "teamA teamA"
            "teamB teamB";
        }
      }

      /* タブレット: 小～中画面（1024px-1279px） */
      @media (min-width: 1024px) and (max-width: 1279px) {
        .draft-grid-layout {
          grid-template-rows: auto 1fr;
          grid-template-columns: 1fr 1fr;
          grid-template-areas:
            "center center"
            "teamA teamB";
        }
      }

      /* スマホ: 小画面（768px未満） */
      @media (max-width: 767px) {
        .draft-grid-layout {
          grid-template-rows: auto 1fr 1fr;
          grid-template-columns: 1fr 1fr;
          grid-template-areas:
            "center center"
            "teamA teamA"
            "teamB teamB";
        }
      }
    `}</style>
  </div>
);
}
