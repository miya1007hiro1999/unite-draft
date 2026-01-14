import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { createMockDraftState } from "../utils/draftState";
import type { DraftState, BanEntry, Team } from "../types/draft";
import PokemonGrid from "../components/draft/PokemonGrid";
import {
  getBannedPokemon,
  getCurrentPickingTeam,
  getCurrentMatchPicks,
  getCurrentMatchBans,
  getCurrentMatchBansByTeam,
  isMatchComplete,
  isDraftComplete,
} from "../utils/draftLogic";
import PlayerCardList from "../components/draft/PlayerCardList";
import { getPokemonById } from "../data/pokemon";
import {
  loadDraftState,
  saveDraftState,
} from "../lib/draftStorage";
import type { Pokemon } from "../types/pokemon";
import { useDraftRealtime } from "../hooks/useDraftRealtime";
import { confirmPick, confirmBan, confirmBanSkip } from "../lib/draftActions";

// Phase型定義
type Phase = "ban" | "pick";

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
  const [pendingPick, setPendingPick] = useState<Pokemon | null>(null); // null = BANスキップ

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

  // ピック追加ハンドラー（仮ピック）
  const handlePokemonPick = async (pokemonId: string) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Pokemon pick disabled");
      return;
    }

    // BANフェーズ：即座に確定
    if (state && state.phase === "ban") {
      if (!state.currentBanTeam) return;

      console.log(
        `[DraftPage] BAN selected: ${pokemonId} (Match ${state.currentMatch}, Team ${state.currentBanTeam})`
      );

      // Realtime 対応：draftId がある場合は confirmBan を使用
      if (draftId) {
        const orderIndex = confirmedActions.length + 1;
        const success = await confirmBan(
          draftId,
          state.currentBanTeam,
          pokemonId,
          orderIndex,
          state
        );

        if (!success) {
          console.error("[DraftPage] Failed to confirm BAN");
        }
        // state は Realtime で自動更新される
      } else {
        // Legacy: draftId がない場合は従来の処理
        const { currentMatch, currentBanTeam, bans } = state;
        const newBans = { ...bans };

        if (currentMatch === 1) {
          newBans.match1 = {
            ...newBans.match1,
            [currentBanTeam]: [...newBans.match1[currentBanTeam], pokemonId],
          };
        } else if (currentMatch === 2) {
          newBans.match2 = {
            ...newBans.match2,
            [currentBanTeam]: [...newBans.match2[currentBanTeam], pokemonId],
          };
        } else if (currentMatch === 3) {
          newBans.match3 = {
            ...newBans.match3,
            [currentBanTeam]: [...newBans.match3[currentBanTeam], pokemonId],
          };
        }

        const newState = {
          ...state,
          bans: newBans,
          updatedAt: new Date().toISOString(),
        };

        setLegacyState(newState);
        saveDraftState(newState).catch((error) => {
          console.error("Failed to save draft state after BAN:", error);
        });
      }

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

  // BANスキップハンドラー
  const handleSkipBan = async () => {
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

    const { currentMatch, currentBanTeam } = state;
    if (!currentBanTeam) return;

    console.log(`[DraftPage] BAN skipped (Match ${currentMatch}, Team ${currentBanTeam})`);

    // Realtime 対応：draftId がある場合は confirmBanSkip を使用
    if (draftId) {
      const orderIndex = confirmedActions.length + 1;
      const success = await confirmBanSkip(draftId, currentBanTeam, orderIndex, state);

      if (!success) {
        console.error("[DraftPage] Failed to confirm BAN skip");
      }
      // state は Realtime で自動更新される
    } else {
      // Legacy: draftId がない場合は従来の処理
      const { bans } = state;
      const newBans = { ...bans };

      if (currentMatch === 1) {
        newBans.match1 = {
          ...newBans.match1,
          [currentBanTeam]: [...newBans.match1[currentBanTeam], null],
        };
      } else if (currentMatch === 2) {
        newBans.match2 = {
          ...newBans.match2,
          [currentBanTeam]: [...newBans.match2[currentBanTeam], null],
        };
      } else if (currentMatch === 3) {
        newBans.match3 = {
          ...newBans.match3,
          [currentBanTeam]: [...newBans.match3[currentBanTeam], null],
        };
      }

      const newState = {
        ...state,
        bans: newBans,
        updatedAt: new Date().toISOString(),
      };

      setLegacyState(newState);
      saveDraftState(newState).catch((error) => {
        console.error("Failed to save draft state after BAN skip:", error);
      });
    }
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
      const newPicks = { ...state.picks };

      if (currentMatch === 1) {
        const currentPicks = newPicks.match1[pickingTeam];
        if (!currentPicks.includes(pendingPick.id)) {
          newPicks.match1 = {
            ...newPicks.match1,
            [pickingTeam]: [...currentPicks, pendingPick.id],
          };
        }
      } else if (currentMatch === 2) {
        const currentPicks = newPicks.match2[pickingTeam];
        if (!currentPicks.includes(pendingPick.id)) {
          newPicks.match2 = {
            ...newPicks.match2,
            [pickingTeam]: [...currentPicks, pendingPick.id],
          };
        }
      } else if (currentMatch === 3) {
        const currentPicks = newPicks.match3[pickingTeam];
        if (!currentPicks.includes(pendingPick.id)) {
          newPicks.match3 = {
            ...newPicks.match3,
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

  // BAN削除ハンドラー（仮確定中のみ）
  const handleCancelBan = (banIndex: number) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: BAN cancel disabled");
      return;
    }

    // Realtime モードでは BAN 取り消しは未対応
    if (draftId) {
      console.warn("[DraftPage] BAN cancel is not supported in Realtime mode");
      return;
    }

    // Legacy モードのみ対応
    if (!state) return;

    setLegacyState((prevState) => {
      if (!prevState) return prevState;

      const { currentMatch, phase, currentBanTeam } = prevState;

      // 通常試合のBAN削除
      if (phase === "ban" && currentBanTeam) {
        // 確定済みかチェック
        const isConfirmed =
          (currentMatch === 1 &&
            prevState.banConfirmed.match1[currentBanTeam]) ||
          (currentMatch === 2 &&
            prevState.banConfirmed.match2[currentBanTeam]) ||
          (currentMatch === 3 && prevState.banConfirmed.match3[currentBanTeam]);

        if (isConfirmed) {
          console.warn("[DraftPage] BAN already confirmed, cannot cancel");
          return prevState;
        }

        const newBans = { ...prevState.bans };
        let currentBans: BanEntry[] = [];

        if (currentMatch === 1)
          currentBans = [...newBans.match1[currentBanTeam]];
        else if (currentMatch === 2)
          currentBans = [...newBans.match2[currentBanTeam]];
        else if (currentMatch === 3)
          currentBans = [...newBans.match3[currentBanTeam]];

        if (banIndex >= 0 && banIndex < currentBans.length) {
          const removed = currentBans.splice(banIndex, 1)[0];
          console.log(
            `[DraftPage] BAN cancelled: ${removed} | Team ${currentBanTeam}`
          );

          if (currentMatch === 1) {
            newBans.match1 = {
              ...newBans.match1,
              [currentBanTeam]: currentBans,
            };
          } else if (currentMatch === 2) {
            newBans.match2 = {
              ...newBans.match2,
              [currentBanTeam]: currentBans,
            };
          } else if (currentMatch === 3) {
            newBans.match3 = {
              ...newBans.match3,
              [currentBanTeam]: currentBans,
            };
          }

          const newState = {
            ...prevState,
            bans: newBans,
            updatedAt: new Date().toISOString(),
          };

          saveDraftState(newState).catch((error) => {
            console.error(
              "Failed to save draft state after BAN cancel:",
              error
            );
          });

          return newState;
        }
      }

      return prevState;
    });
  };

  // 通常試合のBAN最終確定ハンドラー
  const handleConfirmBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: BAN confirm disabled");
      return;
    }

    // Realtime モードでは BAN 確定（フェーズ遷移）は未対応
    if (draftId) {
      console.warn("[DraftPage] BAN phase transition is not supported in Realtime mode yet");
      return;
    }

    // Legacy モードのみ対応
    if (!state) return;

    setLegacyState((prevState) => {
      if (!prevState || prevState.phase !== "ban") return prevState;

      const { currentMatch, currentBanTeam, banConfirmed, firstPickByMatch } =
        prevState;

      if (!currentBanTeam) return prevState;

      // 既に確定済みかチェック
      const isAlreadyConfirmed =
        (currentMatch === 1 && banConfirmed.match1[currentBanTeam]) ||
        (currentMatch === 2 && banConfirmed.match2[currentBanTeam]) ||
        (currentMatch === 3 && banConfirmed.match3[currentBanTeam]);

      if (isAlreadyConfirmed) {
        console.warn("[DraftPage] BAN already confirmed");
        return prevState;
      }

      // 確定フラグを立てる
      const newBanConfirmed = { ...banConfirmed };
      if (currentMatch === 1) {
        newBanConfirmed.match1 = {
          ...newBanConfirmed.match1,
          [currentBanTeam]: true,
        };
      } else if (currentMatch === 2) {
        newBanConfirmed.match2 = {
          ...newBanConfirmed.match2,
          [currentBanTeam]: true,
        };
      } else if (currentMatch === 3) {
        newBanConfirmed.match3 = {
          ...newBanConfirmed.match3,
          [currentBanTeam]: true,
        };
      }

      // 次のチームまたはフェーズへ遷移
      const firstBanTeam = firstPickByMatch[currentMatch as 1 | 2 | 3];
      const secondBanTeam: Team = firstBanTeam === "A" ? "B" : "A";

      let newCurrentBanTeam: Team | null = currentBanTeam;
      let newPhase: Phase = "ban";
      let newCurrentTurn = prevState.currentTurn;

      // 先行チームが確定した場合 → 後攻チームへ
      if (currentBanTeam === firstBanTeam) {
        newCurrentBanTeam = secondBanTeam;
        console.log(
          `[DraftPage] Team ${currentBanTeam} BAN confirmed → Switching to Team ${secondBanTeam}`
        );
      } else {
        // 後攻チームも確定した場合 → PICKフェーズへ
        newCurrentBanTeam = null;
        newPhase = "pick";
        newCurrentTurn = 0;
        console.log(
          `[DraftPage] Team ${currentBanTeam} BAN confirmed → Transitioning to PICK phase`
        );
      }

      const newState = {
        ...prevState,
        banConfirmed: newBanConfirmed,
        currentBanTeam: newCurrentBanTeam,
        phase: newPhase,
        currentTurn: newCurrentTurn,
        updatedAt: new Date().toISOString(),
      };

      saveDraftState(newState).catch((error) => {
        console.error("Failed to save draft state after BAN confirm:", error);
      });

      return newState;
    });
  };

  // 次の試合へ進むハンドラー
  const handleGoToNextMatch = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Match transition disabled");
      return;
    }

    // Realtime モードでは試合遷移は未対応
    if (draftId) {
      console.warn("[DraftPage] Match transition is not supported in Realtime mode yet");
      return;
    }

    // Legacy モードのみ対応
    if (!state) return;

    setLegacyState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState;

      // 第3試合終了後は何もしない
      if (prevState.currentMatch === 3) {
        return prevState;
      }

      // 通常試合完了後は次の試合へ（1→2, 2→3）
      const nextMatch = (prevState.currentMatch + 1) as 1 | 2 | 3;

      // 次の試合の先行BANチームを取得
      const firstBanTeam = prevState.firstPickByMatch[nextMatch];

      const newState = {
        ...prevState,
        currentMatch: nextMatch,
        currentTurn: 0,
        phase: "ban" as "ban" | "pick", // 次の試合はBANフェーズから開始
        currentBanTeam: firstBanTeam, // 先行チームからBAN開始
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[DraftPage] Transitioning to Match ${nextMatch} (BAN phase, Team ${firstBanTeam} starts)`
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

  // 現在の試合のBAN枠を取得
  const currentMatchBanEntriesA =
    state.currentMatch === 1
      ? state.bans.match1.A
      : state.currentMatch === 2
      ? state.bans.match2.A
      : state.bans.match3.A;
  const currentMatchBanEntriesB =
    state.currentMatch === 1
      ? state.bans.match1.B
      : state.currentMatch === 2
      ? state.bans.match2.B
      : state.bans.match3.B;

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
      {/* 運営・観戦URL表示（画面右上に固定） */}
      {!isReadOnly && draftId && (
        <div
          style={{
            position: "fixed",
            top: "clamp(0.5rem, 1vw, 1rem)",
            left: "clamp(0.5rem, 1vw, 1rem)",
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
        {/* 通常試合（match 1-3）：従来のレイアウト */}
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
                isBanCancellable={
                  state.phase === "ban" &&
                  state.currentBanTeam === "A" &&
                  ((state.currentMatch === 1 &&
                    !state.banConfirmed.match1.A) ||
                    (state.currentMatch === 2 &&
                      !state.banConfirmed.match2.A) ||
                    (state.currentMatch === 3 &&
                      !state.banConfirmed.match3.A))
                }
                onCancelBan={(banIndex) => handleCancelBan(banIndex)}
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
                    background: "#f9fafb",
                    padding: "clamp(0.6rem, 1.5vw, 1rem)",
                    borderRadius: "8px",
                    border: "1.5px solid #f59e0b",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    textAlign: "center",
                    position: "fixed",
                    bottom: "10vh",
                    left: "50%",
                    transform: "translate(-50% , -50%)",
                    zIndex: "1",
                  }}
                >
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

            {/* BANスキップボタン（BANフェーズ中で何も選択していない時、かつBAN枠に余裕がある） */}
            {state.phase === "ban" &&
              !pendingPick &&
              currentPickingTeam &&
              getCurrentMatchBansByTeam(state, currentPickingTeam).length <
                3 &&
              !isReadOnly &&
              !matchComplete && (
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "clamp(0.6rem, 1.5vw, 1rem)",
                    borderRadius: "8px",
                    border: "1.5px solid #d1d5db",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                    textAlign: "center",
                    position: "fixed",
                    bottom: "10vh",
                    left: "50%",
                    transform: "translate(-50% , -50%)",
                    zIndex: "1",
                  }}
                >
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
                    ⏭️ このBAN枠をスキップ
                  </button>
                </div>
              )}

            {/* BAN確定ボタン（BANフェーズ中で、BAN枠が3つすべて埋まっているとき） */}
            {(() => {
              // currentPickingTeam が null の場合は早期リターン
              if (!currentPickingTeam) return null;

              // 現在の試合・チームのBAN配列を取得
              const currentMatchBans =
                state.currentMatch === 1
                  ? state.bans.match1[currentPickingTeam]
                  : state.currentMatch === 2
                  ? state.bans.match2[currentPickingTeam]
                  : state.currentMatch === 3
                  ? state.bans.match3[currentPickingTeam]
                  : [];

              // BAN枠がすべて埋まっているか（null含む、3枠のみ）
              const isBanSlotsFilled = currentMatchBans.length === 3;

              return (
                state.phase === "ban" &&
                !pendingPick &&
                currentPickingTeam &&
                state.currentBanTeam === currentPickingTeam &&
                isBanSlotsFilled &&
                ((state.currentMatch === 1 &&
                  !state.banConfirmed.match1[currentPickingTeam]) ||
                  (state.currentMatch === 2 &&
                    !state.banConfirmed.match2[currentPickingTeam]) ||
                  (state.currentMatch === 3 &&
                    !state.banConfirmed.match3[currentPickingTeam])) &&
                !isReadOnly &&
                !matchComplete && (
                  <div
                    style={{
                      background: "#fef3c7",
                      padding: "clamp(1rem, 2.5vw, 1.25rem)",
                      borderRadius: "12px",
                      border: "2px solid #f59e0b",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                      textAlign: "center",
                      position: "fixed",
                      bottom: "10vh",
                      left: "50%",
                      transform: "translate(-50% , -50%)",
                      zIndex: "2",
                    }}
                  >
                    <div
                      style={{
                        color: "#92400e",
                        marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                        fontWeight: "bold",
                      }}
                    >
                      ⚠️ {state.teams[currentPickingTeam].name} の
                      BANを確定してください
                    </div>
                    <div
                      style={{
                        color: "#6b7280",
                        marginBottom: "clamp(0.75rem, 2vw, 1rem)",
                        fontSize: "clamp(0.65rem, 1.4vw, 0.75rem)",
                      }}
                    >
                      現在のBAN数: {currentMatchBans.length} / 3
                      <br />
                      確定後は変更できません
                    </div>
                    <button
                      onClick={handleConfirmBan}
                      style={{
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        padding:
                          "clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 3vw, 2rem)",
                        borderRadius: "10px",
                        fontSize: "clamp(0.8rem, 1.7vw, 0.9rem)",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#d97706";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#f59e0b";
                      }}
                    >
                      BANを確定する
                    </button>
                  </div>
                )
              );
            })()}

          {/* 試合終了時のボタン・メッセージ表示 */}
          {matchComplete && !isReadOnly && (
            <div
              style={{
                background: "#f0fdf4",
                padding: "clamp(1.25rem, 3vw, 1.5rem)",
                borderRadius: "12px",
                border: "2px solid #10b981",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                textAlign: "center",
                position: "fixed",
                bottom: "10vh",
                left: "50%",
                transform: "translate(-50% , -50%)",
                zIndex: "1",
              }}
            >
              {draftComplete ? (
                // 第3試合終了：ドラフト完了
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
                    全3試合のドラフトが完了しました
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
                // 第1・第2試合終了：次の試合へ進むボタン
                <div>
                  <h3
                    style={{
                      color: "#059669",
                      margin: "0 0 clamp(0.75rem, 2vw, 1rem) 0",
                      fontSize: "clamp(1.1rem, 2.5vw, 1.2rem)",
                      fontWeight: "bold",
                    }}
                  >
                    試合 {state.currentMatch} 終了
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
              isBanCancellable={
                state.phase === "ban" &&
                state.currentBanTeam === "B" &&
                ((state.currentMatch === 1 &&
                  !state.banConfirmed.match1.B) ||
                  (state.currentMatch === 2 &&
                    !state.banConfirmed.match2.B) ||
                  (state.currentMatch === 3 &&
                    !state.banConfirmed.match3.B))
              }
              onCancelBan={(banIndex) => handleCancelBan(banIndex)}
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
          "center center"
          "teamA teamB";
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
