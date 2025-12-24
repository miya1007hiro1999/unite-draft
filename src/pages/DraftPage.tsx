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
import { getPokemonImage } from "../utils/pokemonImage";
import {
  loadDraftState,
  loadDraftStateById,
  saveDraftState,
} from "../lib/draftStorage";

export default function DraftPage() {
  // URLパラメータから draftId と mode を取得
  const { draftId, mode } = useParams<{ draftId?: string; mode?: string }>();

  // mode が 'view' の場合は読み取り専用
  const isReadOnly = mode === "view";

  const [state, setState] = useState<DraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPick, setPendingPick] = useState<string | null>(null); // null = BANスキップ

  // React 18 StrictMode による useEffect 二重実行を防ぐためのガード
  // 開発環境でも初期化が一度だけ実行されることを保証
  const isInitialized = useRef(false);

  // 初期表示時にSupabaseからDraftStateを読み込む（一度だけ初期化）
  useEffect(() => {
    // ✅ StrictMode二重実行ガード: 既に初期化済みなら何もしない
    if (isInitialized.current) {
      console.log("[DraftPage] Already initialized, skipping...");
      return;
    }

    const loadInitialState = async () => {
      try {
        console.log("[DraftPage] === Initialization START ===");
        console.log(
          "[DraftPage] Mode:",
          mode || "default",
          "| Draft ID:",
          draftId || "none"
        );
        console.log("[DraftPage] Read-only:", isReadOnly);

        let loadedState: DraftState | null = null;

        // ケース1: URLにdraftIdが指定されている場合（運営・観戦用）
        if (draftId) {
          console.log("[DraftPage] Loading specific draft by ID...");
          loadedState = await loadDraftStateById(draftId);

          if (!loadedState) {
            console.error("[DraftPage] ❌ Draft not found:", draftId);
            // エラーメッセージを表示するため、空の状態で終了
            setIsLoading(false);
            return;
          }

          console.log("[DraftPage] ✅ Loaded draft by ID");
          setState(loadedState);
        } else {
          // ケース2: URLにdraftIdがない場合（既存の挙動: /draft）
          console.log(
            "[DraftPage] No draft ID in URL, using default behavior..."
          );

          // Supabaseから既存ドラフトを読み込み
          loadedState = await loadDraftState();

          if (loadedState) {
            // 既存のドラフトがある場合はそれを使用（正本）
            console.log("[DraftPage] Using existing draft from Supabase");
            setState(loadedState);
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
              setState(mockState);
            } else {
              // 保存失敗時もモックを使用（ローカルのみで動作）
              console.warn(
                "[DraftPage] Failed to save initial mock, using local state only"
              );
              setState(mockState);
            }
          }
        }
      } catch (error) {
        console.error("[DraftPage] Failed to load initial state:", error);
        // エラー時はモックデータで動作
        setState(createMockDraftState());
      } finally {
        setIsLoading(false);
        console.log("[DraftPage] === Initialization END ===");
      }
    };

    // ✅ 初期化フラグを立ててから実行
    isInitialized.current = true;
    loadInitialState();
  }, [draftId, mode, isReadOnly]);

  // ピック追加ハンドラー（仮ピック）
  const handlePokemonPick = (pokemonId: string) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Pokemon pick disabled");
      return;
    }

    // BANフェーズ：即座にBAN配列に追加
    if (state && state.phase === "ban") {
      setState((prevState) => {
        if (!prevState) return prevState;

        const { currentMatch, currentBanTeam, bans } = prevState;

        // グローバルBANフェーズ（match 0）
        if (currentMatch === 0) {
          const newGlobalBans = prevState.globalBans.includes(pokemonId)
            ? prevState.globalBans
            : [...prevState.globalBans, pokemonId];

          const newState = {
            ...prevState,
            globalBans: newGlobalBans,
            updatedAt: new Date().toISOString(),
          };

          console.log(`[DraftPage] Global BAN added: ${pokemonId}`);

          saveDraftState(newState).catch((error) => {
            console.error(
              "Failed to save draft state after global BAN:",
              error
            );
          });

          return newState;
        }

        // 通常試合BAN（match 1-3）
        if (!currentBanTeam) return prevState;

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
          ...prevState,
          bans: newBans,
          updatedAt: new Date().toISOString(),
        };

        console.log(
          `[DraftPage] BAN added: ${pokemonId} (Match ${currentMatch}, Team ${currentBanTeam})`
        );

        saveDraftState(newState).catch((error) => {
          console.error("Failed to save draft state after BAN:", error);
        });

        return newState;
      });
      return;
    }

    // PICKフェーズ：従来通り仮ピックに保存
    console.log("[DraftPage] Pending pick:", pokemonId);
    setPendingPick(pokemonId);
  };

  // BANスキップハンドラー
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

    // 即座にBAN配列にnullを追加（スキップを表す）
    setState((prevState) => {
      if (!prevState) return prevState;

      const { currentMatch, currentBanTeam, bans } = prevState;

      // 通常試合BAN（match 1-3）のみスキップ可能
      if (currentMatch === 0) {
        console.warn("[DraftPage] Skip is not available in global BAN phase");
        return prevState;
      }

      if (!currentBanTeam) return prevState;

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
        ...prevState,
        bans: newBans,
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[DraftPage] BAN skipped (Match ${currentMatch}, Team ${currentBanTeam})`
      );

      saveDraftState(newState).catch((error) => {
        console.error("Failed to save draft state after BAN skip:", error);
      });

      return newState;
    });
  };

  // 仮ピックを確定してSupabaseに保存（PICKフェーズのみ）
  const handleConfirmPick = () => {
    // PICKフェーズ以外では何もしない
    if (!state || state.phase !== "pick") return;

    // nullの場合は何もしない
    if (pendingPick === null) return;

    setState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState;

      const { currentMatch } = prevState;
      const pickingTeam = getCurrentPickingTeam(prevState);

      // PICKフェーズ中の処理（重複チェック付き）

      const newPicks = { ...prevState.picks };
      if (currentMatch === 1) {
        const currentPicks = newPicks.match1[pickingTeam];
        // 重複チェック：既にピックされていなければ追加
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match1 = {
            ...newPicks.match1,
            [pickingTeam]: [...currentPicks, pendingPick],
          };
        }
      } else if (currentMatch === 2) {
        const currentPicks = newPicks.match2[pickingTeam];
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match2 = {
            ...newPicks.match2,
            [pickingTeam]: [...currentPicks, pendingPick],
          };
        }
      } else if (currentMatch === 3) {
        const currentPicks = newPicks.match3[pickingTeam];
        if (!currentPicks.includes(pendingPick)) {
          newPicks.match3 = {
            ...newPicks.match3,
            [pickingTeam]: [...currentPicks, pendingPick],
          };
        }
      }

      const newState = {
        ...prevState,
        picks: newPicks,
        currentTurn: prevState.currentTurn + 1,
        updatedAt: new Date().toISOString(),
      };

      // デバッグ：累積BAN数を確認
      const totalBanned = getBannedPokemon(newState).length;
      console.log(
        `[DraftPage] Confirming PICK: ${pendingPick} | 累積BAN数: ${totalBanned}`
      );
      saveDraftState(newState).catch((error) => {
        console.error("Failed to save draft state after pick:", error);
      });

      return newState;
    });

    // 仮ピックをクリア
    setPendingPick(null);
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

    setState((prevState) => {
      if (!prevState) return prevState;

      const { currentMatch, phase, currentBanTeam } = prevState;

      // グローバルBANの削除
      if (currentMatch === 0 && phase === "ban") {
        if (prevState.globalBanConfirmed) {
          console.warn(
            "[DraftPage] Global BAN already confirmed, cannot cancel"
          );
          return prevState;
        }

        const newGlobalBans = [...prevState.globalBans];
        if (banIndex >= 0 && banIndex < newGlobalBans.length) {
          const removed = newGlobalBans.splice(banIndex, 1)[0];
          console.log(`[DraftPage] Global BAN cancelled: ${removed}`);

          const newState = {
            ...prevState,
            globalBans: newGlobalBans,
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

  // グローバルBAN最終確定ハンドラー
  const handleConfirmGlobalBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Global BAN confirm disabled");
      return;
    }

    setState((prevState) => {
      if (!prevState || prevState.currentMatch !== 0) return prevState;

      if (prevState.globalBanConfirmed) {
        console.warn("[DraftPage] Global BAN already confirmed");
        return prevState;
      }

      const newState = {
        ...prevState,
        globalBanConfirmed: true,
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[DraftPage] Global BAN confirmed | Total: ${prevState.globalBans.length} Pokemon`
      );

      saveDraftState(newState).catch((error) => {
        console.error(
          "Failed to save draft state after global BAN confirm:",
          error
        );
      });

      return newState;
    });
  };

  // グローバルBAN削除ハンドラー
  const handleCancelGlobalBan = (pokemonId: string) => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: Global BAN cancel disabled");
      return;
    }

    setState((prevState) => {
      if (!prevState || prevState.currentMatch !== 0) return prevState;

      // 確定済みの場合は削除不可
      if (prevState.globalBanConfirmed) {
        console.warn("[DraftPage] Global BAN already confirmed, cannot cancel");
        return prevState;
      }

      // globalBans から該当ポケモンを削除
      const newGlobalBans = prevState.globalBans.filter(
        (id) => id !== pokemonId
      );

      const newState = {
        ...prevState,
        globalBans: newGlobalBans,
        updatedAt: new Date().toISOString(),
      };

      console.log(`[DraftPage] Global BAN cancelled: ${pokemonId}`);

      saveDraftState(newState).catch((error) => {
        console.error(
          "Failed to save draft state after global BAN cancel:",
          error
        );
      });

      return newState;
    });
  };

  // 通常試合のBAN最終確定ハンドラー
  const handleConfirmBan = () => {
    // 🔒 読み取り専用モードでは何もしない
    if (isReadOnly) {
      console.warn("[DraftPage] Read-only mode: BAN confirm disabled");
      return;
    }

    setState((prevState) => {
      if (!prevState || prevState.phase !== "ban") return prevState;

      const { currentMatch, currentBanTeam, banConfirmed, firstPickByMatch } =
        prevState;

      if (currentMatch === 0 || !currentBanTeam) return prevState;

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

    setState((prevState) => {
      // prevStateがnullの場合は何もしない（通常は起こらない）
      if (!prevState) return prevState;

      // 第3試合終了後は何もしない
      if (prevState.currentMatch === 3) {
        return prevState;
      }

      // グローバルBAN完了後は match 1 へ
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

      if (prevState.currentMatch === 0) {
        console.log(
          `[DraftPage] Transitioning from Global BAN to Match 1 (BAN phase, Team ${firstBanTeam} starts)`
        );
      } else {
        console.log(
          `[DraftPage] Transitioning to Match ${nextMatch} (BAN phase, Team ${firstBanTeam} starts)`
        );
      }

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

  // 現在ピック中のチーム（match 0では使用しない）
  const currentPickingTeam =
    state.currentMatch === 0 ? null : getCurrentPickingTeam(state);

  // 試合終了判定
  const matchComplete = isMatchComplete(state);
  const draftComplete = isDraftComplete(state);

  // 現在の試合のBAN枠を取得（match 0では空配列）
  const currentMatchBanEntriesA =
    state.currentMatch === 0
      ? []
      : state.currentMatch === 1
      ? state.bans.match1.A
      : state.currentMatch === 2
      ? state.bans.match2.A
      : state.bans.match3.A;
  const currentMatchBanEntriesB =
    state.currentMatch === 0
      ? []
      : state.currentMatch === 1
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
      {/* ヘッダー */}
      <header
        style={{
          flexShrink: 0,
          background: "#ffffff",
          color: "#1f2937",
          padding: "clamp(0.5rem, 1vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                fontWeight: "bold",
                color: "#111827",
                letterSpacing: "0.05em",
              }}
            >
              {state.tournamentName || "ドラフト"}
              {isReadOnly && (
                <span
                  style={{
                    marginLeft: "clamp(0.3rem, 0.8vw, 0.5rem)",
                    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
                    color: "#92400e",
                    backgroundColor: "#fef3c7",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    border: "1px solid #fbbf24",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  👁️ 観戦モード
                </span>
              )}
            </h1>
            <div
              style={{
                fontSize: "clamp(0.6rem, 1.3vw, 0.75rem)",
                marginLeft: "clamp(0.2rem, 0.6vw, 0.3rem)",
                color: "#6b7280",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.3rem, 0.8vw, 0.5rem)",
                flexWrap: "wrap",
              }}
            >
              {state.currentMatch === 0 ? (
                <>
                  <span style={{ color: "#7c3aed", fontWeight: "bold" }}>
                    🌐 グローバルBAN
                  </span>
                  <span
                    style={{
                      color: "#9ca3af",
                      fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
                    }}
                  >
                    (BAN済み: {state.globalBans.length}/16体)
                  </span>
                </>
              ) : (
                <>
                  <span>試合 {state.currentMatch} / 3</span>
                  <span
                    style={{
                      background: state.phase === "ban" ? "#fee2e2" : "#d1fae5",
                      color: state.phase === "ban" ? "#991b1b" : "#065f46",
                      padding: "0.15rem 0.35rem",
                      borderRadius: "4px",
                      fontSize: "clamp(0.55rem, 1.2vw, 0.65rem)",
                      fontWeight: "bold",
                      border:
                        state.phase === "ban"
                          ? "1px solid #dc2626"
                          : "1px solid #10b981",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    {state.phase === "ban" ? "🚫 BAN" : "✓ PICK"}
                  </span>
                  <span>ターン {state.currentTurn}</span>
                  <span
                    style={{
                      color: "#9ca3af",
                      fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
                    }}
                  >
                    (使用不可: {bannedPokemon.length}体)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 運営・観戦URL表示（admin モードのみ） */}
          {!isReadOnly && draftId && (
            <div
              style={{
                display: "flex",
                fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
                textAlign: "right",
                background: "#f9fafb",
                padding: "clamp(0.3rem, 1vw, 0.5rem)",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            >
              <a
                href={`https://unite-draft-dun.vercel.app/draft/${draftId}/admin`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: "#059669",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                🔗 運営URL:
              </a>
              <a
                href={`https://unite-draft-dun.vercel.app/draft/${draftId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: "#d97706",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                👁️ 観戦URL:
              </a>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: "clamp(0.5rem, 1.5vw, 1rem)",
        }}
      >
        {state.currentMatch === 0 ? (
          // グローバルBANフェーズ：チームカード非表示、中央にグリッドのみ
          <div
            style={{
              maxWidth: "1400px",
              margin: "0 auto",
              background: "#ffffff",
              padding: "clamp(1rem, 2vw, 1.5rem)",
              borderRadius: "clamp(12px, 2vw, 16px)",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
          >
            {/* グローバルBAN説明 */}
            <div
              style={{
                background: "#faf5ff",
                padding: "clamp(0.75rem, 2vw, 1rem)",
                borderRadius: "8px",
                border: "1px solid #c084fc",
                marginBottom: "clamp(1rem, 2vw, 1.5rem)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#7c3aed",
                  fontSize: "clamp(0.75rem, 1.6vw, 0.9rem)",
                  fontWeight: "bold",
                  marginBottom: "clamp(0.3rem, 0.7vw, 0.5rem)",
                }}
              >
                🌐 グローバルBANフェーズ
              </div>
              <div
                style={{
                  color: "#6b7280",
                  fontSize: "clamp(0.65rem, 1.4vw, 0.75rem)",
                }}
              >
                全試合で使用不可にするポケモンを選択してください（最大16体）
              </div>
            </div>

            {/* ポケモングリッド */}
            <PokemonGrid
              bannedPokemon={bannedPokemon}
              currentMatchBannedPokemonIds={currentMatchBannedPokemonIds}
              state={state}
              onPokemonPick={handlePokemonPick}
              isReadOnly={isReadOnly}
            />

            {/* グローバルBAN一覧表示 */}
            {state.globalBans.length > 0 && (
              <div
                style={{
                  background: "#fef3c7",
                  padding: "clamp(0.8rem, 2vw, 1rem)",
                  borderRadius: "10px",
                  border: "2px solid #f59e0b",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                  marginTop: "clamp(1rem, 2vw, 1.5rem)",
                }}
              >
                <div
                  style={{
                    color: "#92400e",
                    fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                    fontWeight: "bold",
                    marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  🌐 グローバルBAN済み ({state.globalBans.length}/16体)
                  {!state.globalBanConfirmed && (
                    <span
                      style={{
                        fontSize: "clamp(0.6rem, 1.3vw, 0.7rem)",
                        color: "#d97706",
                        fontWeight: "normal",
                      }}
                    >
                      （×ボタンで取り消し可能）
                    </span>
                  )}
                </div>

                {/* BAN枠グリッド */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
                    gap: "clamp(0.4rem, 1vw, 0.6rem)",
                    maxWidth: "100%",
                  }}
                >
                  {state.globalBans.map((pokemonId, index) => {
                    const pokemon = getPokemonById(pokemonId);
                    return (
                      <div
                        key={index}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          maxWidth: "80px",
                          borderRadius: "6px",
                          border: "2px solid #f59e0b",
                          position: "relative",
                          overflow: "hidden",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                          background: "#ffffff",
                        }}
                      >
                        {/* ポケモン画像 */}
                        <img
                          src={getPokemonImage(pokemonId)}
                          alt={pokemon?.name || pokemonId}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: state.globalBanConfirmed ? 0.5 : 0.7,
                            filter: state.globalBanConfirmed
                              ? "grayscale(80%)"
                              : "grayscale(30%)",
                          }}
                        />

                        {/* BANラベル */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background:
                              "linear-gradient(to top, #f59e0bee 0%, #f59e0b00 100%)",
                            color: "white",
                            fontSize: "clamp(0.35rem, 0.8vw, 0.45rem)",
                            fontWeight: "bold",
                            textAlign: "center",
                            padding: "1px 0",
                            letterSpacing: "0.05em",
                          }}
                        >
                          BAN
                        </div>

                        {/* 削除ボタン（仮確定中のみ表示） */}
                        {!state.globalBanConfirmed && !isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelGlobalBan(pokemonId);
                            }}
                            style={{
                              position: "absolute",
                              top: "2px",
                              right: "2px",
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              background: "#ef4444",
                              border: "1.5px solid white",
                              color: "white",
                              fontSize: "0.65rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dc2626";
                              e.currentTarget.style.transform = "scale(1.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ef4444";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* グローバルBAN確定/遷移ボタン */}
            {!isReadOnly && (
              <div
                style={{
                  background: state.globalBanConfirmed ? "#f0fdf4" : "#fef3c7",
                  padding: "clamp(1rem, 2.5vw, 1.25rem)",
                  borderRadius: "12px",
                  border: state.globalBanConfirmed
                    ? "2px solid #10b981"
                    : "2px solid #f59e0b",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                  textAlign: "center",
                  marginTop: "clamp(1rem, 2vw, 1.5rem)",
                }}
              >
                {!state.globalBanConfirmed ? (
                  // 未確定：確定ボタンを表示
                  <>
                    <div
                      style={{
                        color: "#92400e",
                        marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                        fontWeight: "bold",
                      }}
                    >
                      ⚠️ グローバルBANを確定してください
                    </div>
                    <button
                      onClick={handleConfirmGlobalBan}
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
                      グローバルBANを確定する
                    </button>
                  </>
                ) : (
                  // 確定済み：次試合へ進むボタンを表示
                  <>
                    <div
                      style={{
                        color: "#6b7280",
                        marginBottom: "clamp(0.5rem, 1.3vw, 0.75rem)",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
                      }}
                    >
                      グローバルBANを終了して第1試合へ進みます
                    </div>
                    <button
                      onClick={handleGoToNextMatch}
                      style={{
                        background: "#10b981",
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
                        e.currentTarget.style.background = "#059669";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.background = "#10b981";
                      }}
                    >
                      第1試合へ進む →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          // 通常試合（match 1-3）：従来のレイアウト
          <div className="draft-grid-layout">
            {/* チームA */}
            <div style={{ gridArea: "teamA" }}>
              <div style={{ width: "100%" }}>
                <PlayerCardList
                  teamName={state.teams.A.name}
                  players={state.teams.A.players}
                  pickedPokemonIds={getCurrentMatchPicks(state, "A")}
                  teamColor="#e94560"
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
              {pendingPick !== undefined &&
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
                      ✓ 仮ピック: <strong>{pendingPick}</strong>
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
            <div style={{ gridArea: "teamB" }}>
              <div style={{ width: "100%" }}>
                <PlayerCardList
                  teamName={state.teams.B.name}
                  players={state.teams.B.players}
                  pickedPokemonIds={getCurrentMatchPicks(state, "B")}
                  teamColor="#4ade80"
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
        )}
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

        /* 全画面で統一レイアウト: 上段にPokemonGrid、下段にチーム並列 */
        @media (min-width: 768px) {
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
            grid-template-rows: auto 1fr;
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "center center"
              "teamA teamB";
          }
        }
      `}</style>
    </div>
  );
}
