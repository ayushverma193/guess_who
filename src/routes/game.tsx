import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Pause,
  Play,
  Home,
  RotateCcw,
  Timer as TimerIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGame, findPlayer, teamById, type Difficulty } from "@/store/game";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Playing — Guess Who?" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GamePage,
});

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Easy · 10–12",
  medium: "Medium · 5–9",
  hard: "Hard · 0–4",
};

function GamePage() {
  const teams = useGame((s) => s.teams);
  const active = useGame((s) => s.active);
  const settings = useGame((s) => s.settings);
  const submitGuess = useGame((s) => s.submitGuess);
  const revealAndAdvance = useGame((s) => s.revealAndAdvance);
  const pauseToggle = useGame((s) => s.pauseToggle);
  const resetGame = useGame((s) => s.resetGame);

  const navigate = useNavigate();

  useEffect(() => {
    if (!active) navigate({ to: "/admin" });
    else if (active.finished) navigate({ to: "/results" });
  }, [active, navigate]);

  const [remaining, setRemaining] = useState(settings.timerSeconds);
  const [guess, setGuess] = useState<string>("");
  const [started, setStarted] = useState(false);

  const turn = active?.currentTurn;
  const turnKey = turn ? `${turn.imageKey}-${active.currentRound}-${active.turnInRound}` : "";

  // reset timer whenever a new turn starts
  useEffect(() => {
    setRemaining(settings.timerSeconds);
    setGuess("");
    setStarted(false);
  }, [turnKey, settings.timerSeconds]);

  // countdown
  useEffect(() => {
    if (!active || !turn || turn.revealed || active.paused || !started) return;
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(iv);
          submitGuess(null);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [active, turn, turnKey, submitGuess, started]);

  // fire confetti on correct
  useEffect(() => {
    if (turn?.revealed && turn.result === "correct") {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }, [turn?.revealed, turn?.result]);

  if (!active || !turn) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">Loading game…</p>
        </div>
      </div>
    );
  }

  const currentTeam = teamById(teams, turn.teamId)!;
  const currentPlayer = findPlayer(teams, turn.playerId)!;
  const image = currentPlayer.images[turn.difficulty]!;
  const teamA = teams[0];
  const teamB = teams[1];
  const scoreA = active.scores[teamA.id];
  const scoreB = active.scores[teamB.id];
  const timeoutRatio = remaining / settings.timerSeconds;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Badge variant="secondary" className="shrink-0">
              Round {Math.min(active.currentRound, settings.rounds)} / {settings.rounds}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={pauseToggle}>
              {active.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Reset the current game?")) {
                  resetGame();
                  navigate({ to: "/admin" });
                }
              }}
              className="text-destructive"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <ScoreBar
            teamAName={teamA.name}
            teamBName={teamB.name}
            scoreA={scoreA.points}
            scoreB={scoreB.points}
            active={turn.teamId === teamA.id ? "a" : "b"}
          />

          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Now guessing
                </div>
                <div className="display text-2xl font-bold">{currentTeam.name}</div>
              </div>
              <Badge className="gradient-bg text-primary-foreground border-0">
                {DIFF_LABEL[turn.difficulty]}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-3 text-sm">
              <TimerIcon className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums font-semibold">
                {started ? `${remaining}s` : `${settings.timerSeconds}s (not started)`}
              </span>
              {active.paused && (
                <Badge variant="outline" className="ml-auto">
                  Paused
                </Badge>
              )}
            </div>
            <Progress
              value={started ? timeoutRatio * 100 : 100}
              className={started && remaining <= 5 ? "[&>*]:bg-destructive" : ""}
            />

            <div className="mt-6 relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted grid place-items-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={turnKey}
                  src={image}
                  alt="Childhood photo"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              {!turn.revealed && (
                <div
                  className={`absolute top-3 right-3 z-10 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums shadow-lg backdrop-blur-md ${
                    started && remaining <= 5
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-black/60 text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <TimerIcon className="h-3.5 w-3.5" />
                    {started ? `${remaining}s` : `${settings.timerSeconds}s`}
                  </span>
                </div>
              )}
              <AnimatePresence>
                {turn.revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {turn.result === "correct" ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" />
                          <span className="font-semibold">Correct!</span>
                        </>
                      ) : turn.result === "timeout" ? (
                        <>
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="font-semibold">Time's up!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="font-semibold">Wrong guess</span>
                        </>
                      )}
                    </div>
                    <div className="display text-2xl font-bold mt-1">
                      {currentPlayer.fullName}
                      {currentPlayer.nickname && (
                        <span className="opacity-70 font-normal"> · "{currentPlayer.nickname}"</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!turn.revealed ? (
              !started ? (
                <div className="mt-5 flex justify-center">
                  <Button
                    size="lg"
                    onClick={() => setStarted(true)}
                    className="gradient-bg text-primary-foreground border-0"
                  >
                    <Play className="h-5 w-5 mr-2" /> Start timer
                  </Button>
                </div>
              ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Select value={guess} onValueChange={setGuess}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Pick a ${currentTeam.name} teammate…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTeam.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName}
                        {m.nickname ? ` · "${m.nickname}"` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="lg"
                  disabled={!guess}
                  onClick={() => submitGuess(guess)}
                  className="gradient-bg text-primary-foreground border-0"
                >
                  Submit guess
                </Button>
              </div>
              )
            ) : (
              <div className="mt-5 flex justify-end">
                <Button
                  size="lg"
                  onClick={revealAndAdvance}
                  className="gradient-bg text-primary-foreground border-0"
                >
                  Next turn →
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <TeamCardStat team={teamA} stats={scoreA} tone="a" />
          <TeamCardStat team={teamB} stats={scoreB} tone="b" />
          <GameLog />
        </aside>
      </main>
    </div>
  );
}

function ScoreBar({
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  active,
}: {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  active: "a" | "b";
}) {
  return (
    <div className="glass rounded-3xl p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <TeamScore name={teamAName} score={scoreA} tone="a" active={active === "a"} align="left" />
      <div className="text-muted-foreground font-black text-lg">vs</div>
      <TeamScore name={teamBName} score={scoreB} tone="b" active={active === "b"} align="right" />
    </div>
  );
}

function TeamScore({
  name,
  score,
  tone,
  active,
  align,
}: {
  name: string;
  score: number;
  tone: "a" | "b";
  active: boolean;
  align: "left" | "right";
}) {
  const varName = tone === "a" ? "--team-a" : "--team-b";
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">{name}</div>
      <motion.div
        key={score}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="display text-3xl sm:text-4xl font-bold tabular-nums"
        style={{ color: `var(${varName})` }}
      >
        {score}
      </motion.div>
      {active && (
        <div
          className="inline-block h-1.5 w-8 rounded-full mt-1"
          style={{ background: `var(${varName})` }}
        />
      )}
    </div>
  );
}

function TeamCardStat({
  team,
  stats,
  tone,
}: {
  team: ReturnType<typeof useGame.getState>["teams"][number];
  stats: { points: number; correct: number; wrong: number };
  tone: "a" | "b";
}) {
  const varName = tone === "a" ? "--team-a" : "--team-b";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold truncate">{team.name}</div>
        <div
          className="display text-2xl font-bold tabular-nums"
          style={{ color: `var(${varName})` }}
        >
          {stats.points}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="text-[color:var(--success)] font-semibold">{stats.correct}</span> correct
        </div>
        <div>
          <span className="text-destructive font-semibold">{stats.wrong}</span> wrong
        </div>
      </div>
    </div>
  );
}

function GameLog() {
  const active = useGame((s) => s.active);
  const teams = useGame((s) => s.teams);
  if (!active) return null;
  const entries = [...active.log].reverse().slice(0, 8);
  if (entries.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recent</div>
      <ul className="space-y-2 text-sm">
        {entries.map((e, i) => {
          const player = findPlayer(teams, e.playerId);
          const team = teamById(teams, e.teamId);
          return (
            <li key={i} className="flex items-center gap-2">
              {e.result === "correct" ? (
                <CheckCircle2 className="h-4 w-4 text-[color:var(--success)] shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span className="truncate">
                <span className="text-muted-foreground">{team?.name}:</span>{" "}
                <span className="font-medium">{player?.fullName}</span>
              </span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground shrink-0">
                +{e.points}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}