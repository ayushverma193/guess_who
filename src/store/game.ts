import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Difficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  fullName: string;
  nickname?: string;
  teamId: string;
  profilePic?: string;
  images: Partial<Record<Difficulty, string>>;
}

export interface Team {
  id: string;
  name: string;
  members: Player[];
}

export interface Settings {
  rounds: number;
  timerSeconds: number;
  points: Record<Difficulty, number>;
}

export interface TeamStats {
  points: number;
  correct: number;
  wrong: number;
}

export interface CurrentTurn {
  teamId: string;
  playerId: string;
  difficulty: Difficulty;
  imageKey: string; // playerId:difficulty
  revealed: boolean;
  result?: "correct" | "wrong" | "timeout";
  guessedPlayerId?: string;
}

export interface GameLogEntry {
  round: number;
  teamId: string;
  playerId: string;
  difficulty: Difficulty;
  result: "correct" | "wrong" | "timeout";
  guessedPlayerId?: string;
  points: number;
}

export interface ActiveGame {
  startedAt: number;
  currentRound: number; // 1-based
  turnInRound: 0 | 1; // 0 first team, 1 second team
  order: [string, string]; // teamId order (first, second)
  scores: Record<string, TeamStats>;
  usedImageKeys: string[];
  lastPlayerByTeam: Record<string, string | undefined>;
  currentTurn?: CurrentTurn;
  paused: boolean;
  log: GameLogEntry[];
  finished: boolean;
}

export interface HistoryEntry {
  id: string;
  endedAt: number;
  teams: { id: string; name: string }[];
  scores: Record<string, TeamStats>;
  winnerId: string | "tie";
  log: GameLogEntry[];
}

interface State {
  teams: [Team, Team];
  settings: Settings;
  active?: ActiveGame;
  history: HistoryEntry[];

  renameTeam: (teamId: string, name: string) => void;
  addPlayer: (teamId: string, p: Omit<Player, "id" | "teamId" | "images">) => void;
  updatePlayer: (playerId: string, patch: Partial<Player>) => void;
  deletePlayer: (playerId: string) => void;
  setPlayerImage: (playerId: string, diff: Difficulty, dataUrl: string | undefined) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  startGame: () => string | null; // returns error message or null
  nextTurn: () => void;
  submitGuess: (guessedPlayerId: string | null) => void; // null = timeout
  revealAndAdvance: () => void;
  pauseToggle: () => void;
  resetGame: () => void;
  endGame: () => void;
  clearHistory: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function initialTeams(): [Team, Team] {
  return [
    { id: "team-a", name: "Team A", members: [] },
    { id: "team-b", name: "Team B", members: [] },
  ];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const useGame = create<State>()(
  persist(
    (set, get) => ({
      teams: initialTeams(),
      settings: {
        rounds: 5,
        timerSeconds: 30,
        points: { easy: 10, medium: 20, hard: 30 },
      },
      history: [],

      renameTeam: (teamId, name) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === teamId ? { ...t, name } : t)) as [Team, Team],
        })),

      addPlayer: (teamId, p) =>
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: [...t.members, { ...p, id: uid(), teamId, images: {} }] }
              : t,
          ) as [Team, Team],
        })),

      updatePlayer: (playerId, patch) =>
        set((s) => ({
          teams: s.teams.map((t) => ({
            ...t,
            members: t.members.map((m) => (m.id === playerId ? { ...m, ...patch } : m)),
          })) as [Team, Team],
        })),

      deletePlayer: (playerId) =>
        set((s) => ({
          teams: s.teams.map((t) => ({
            ...t,
            members: t.members.filter((m) => m.id !== playerId),
          })) as [Team, Team],
        })),

      setPlayerImage: (playerId, diff, dataUrl) =>
        set((s) => ({
          teams: s.teams.map((t) => ({
            ...t,
            members: t.members.map((m) =>
              m.id === playerId
                ? {
                    ...m,
                    images: { ...m.images, [diff]: dataUrl },
                  }
                : m,
            ),
          })) as [Team, Team],
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      startGame: () => {
        const { teams, settings } = get();
        for (const t of teams) {
          if (t.members.length < 2) return `${t.name} needs at least 2 players.`;
          for (const m of t.members) {
            if (!m.images.easy || !m.images.medium || !m.images.hard)
              return `${m.fullName} is missing childhood images.`;
          }
        }
        if (settings.rounds < 1) return "Rounds must be at least 1.";
        const first = Math.random() < 0.5 ? 0 : 1;
        const order: [string, string] = [teams[first].id, teams[1 - first].id];
        const active: ActiveGame = {
          startedAt: Date.now(),
          currentRound: 1,
          turnInRound: 0,
          order,
          scores: {
            [teams[0].id]: { points: 0, correct: 0, wrong: 0 },
            [teams[1].id]: { points: 0, correct: 0, wrong: 0 },
          },
          usedImageKeys: [],
          lastPlayerByTeam: {},
          paused: false,
          log: [],
          finished: false,
        };
        set({ active });
        // set first turn
        get().nextTurn();
        return null;
      },

      nextTurn: () => {
        const { teams, active } = get();
        if (!active || active.finished) return;
        const teamId = active.order[active.turnInRound];
        const team = teams.find((t) => t.id === teamId)!;
        // find candidate players with unused images, excluding last player if possible
        const diffs: Difficulty[] = ["easy", "medium", "hard"];
        const availableFor = (p: Player) =>
          diffs.filter((d) => p.images[d] && !active.usedImageKeys.includes(`${p.id}:${d}`));
        let candidates = team.members.filter((m) => availableFor(m).length > 0);
        if (candidates.length === 0) {
          // no images left for this team — end game
          set({ active: { ...active, finished: true } });
          return;
        }
        const last = active.lastPlayerByTeam[teamId];
        if (last && candidates.length > 1) {
          candidates = candidates.filter((c) => c.id !== last);
        }
        const player = pickRandom(candidates);
        const difficulty = pickRandom(availableFor(player));
        const imageKey = `${player.id}:${difficulty}`;
        set({
          active: {
            ...active,
            currentTurn: {
              teamId,
              playerId: player.id,
              difficulty,
              imageKey,
              revealed: false,
            },
          },
        });
      },

      submitGuess: (guessedPlayerId) => {
        const { active, settings } = get();
        if (!active || !active.currentTurn || active.currentTurn.revealed) return;
        const turn = active.currentTurn;
        const isTimeout = guessedPlayerId === null;
        const correct = !isTimeout && guessedPlayerId === turn.playerId;
        const result: CurrentTurn["result"] = isTimeout ? "timeout" : correct ? "correct" : "wrong";
        const gained = correct ? settings.points[turn.difficulty] : 0;
        const scores = { ...active.scores };
        scores[turn.teamId] = {
          points: scores[turn.teamId].points + gained,
          correct: scores[turn.teamId].correct + (correct ? 1 : 0),
          wrong: scores[turn.teamId].wrong + (correct ? 0 : 1),
        };
        const log: GameLogEntry[] = [
          ...active.log,
          {
            round: active.currentRound,
            teamId: turn.teamId,
            playerId: turn.playerId,
            difficulty: turn.difficulty,
            result,
            guessedPlayerId: guessedPlayerId ?? undefined,
            points: gained,
          },
        ];
        set({
          active: {
            ...active,
            scores,
            log,
            currentTurn: {
              ...turn,
              revealed: true,
              result,
              guessedPlayerId: guessedPlayerId ?? undefined,
            },
          },
        });
      },

      revealAndAdvance: () => {
        const { active, teams, settings } = get();
        if (!active || !active.currentTurn) return;
        const turn = active.currentTurn;
        const usedImageKeys = active.usedImageKeys.includes(turn.imageKey)
          ? active.usedImageKeys
          : [...active.usedImageKeys, turn.imageKey];
        const lastPlayerByTeam = { ...active.lastPlayerByTeam, [turn.teamId]: turn.playerId };

        // advance turn
        let nextTurnInRound: 0 | 1 = active.turnInRound === 0 ? 1 : 0;
        let nextRound = active.currentRound;
        if (active.turnInRound === 1) {
          nextRound += 1;
          nextTurnInRound = 0;
        }

        const totalImages = teams.reduce(
          (n, t) => n + t.members.reduce((k, m) => k + Object.values(m.images).filter(Boolean).length, 0),
          0,
        );
        const noImagesLeft = usedImageKeys.length >= totalImages;
        const roundsDone = nextRound > settings.rounds;
        const finished = noImagesLeft || roundsDone;

        const nextActive: ActiveGame = {
          ...active,
          usedImageKeys,
          lastPlayerByTeam,
          currentRound: nextRound,
          turnInRound: nextTurnInRound,
          currentTurn: undefined,
          finished,
        };
        set({ active: nextActive });
        if (finished) {
          get().endGame();
        } else {
          get().nextTurn();
        }
      },

      pauseToggle: () =>
        set((s) => (s.active ? { active: { ...s.active, paused: !s.active.paused } } : {})),

      resetGame: () => set({ active: undefined }),

      endGame: () => {
        const { active, teams, history } = get();
        if (!active) return;
        const [a, b] = teams;
        const sa = active.scores[a.id].points;
        const sb = active.scores[b.id].points;
        const winnerId = sa === sb ? "tie" : sa > sb ? a.id : b.id;
        const entry: HistoryEntry = {
          id: uid(),
          endedAt: Date.now(),
          teams: [
            { id: a.id, name: a.name },
            { id: b.id, name: b.name },
          ],
          scores: active.scores,
          winnerId,
          log: active.log,
        };
        set({
          active: { ...active, finished: true, currentTurn: undefined },
          history: [entry, ...history].slice(0, 25),
        });
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "guess-who-game",
      version: 1,
    },
  ),
);

export function findPlayer(teams: Team[], playerId: string): Player | undefined {
  for (const t of teams) {
    const p = t.members.find((m) => m.id === playerId);
    if (p) return p;
  }
  return undefined;
}

export function teamById(teams: Team[], teamId: string): Team | undefined {
  return teams.find((t) => t.id === teamId);
}