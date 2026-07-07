import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Download, PartyPopper, PlayCircle, RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game";
import { toast } from "sonner";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — Guess Who?" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const teams = useGame((s) => s.teams);
  const active = useGame((s) => s.active);
  const history = useGame((s) => s.history);
  const resetGame = useGame((s) => s.resetGame);
  const startGame = useGame((s) => s.startGame);
  const navigate = useNavigate();

  const last = history[0];

  useEffect(() => {
    if (!active && !last) navigate({ to: "/admin" });
  }, [active, last, navigate]);

  useEffect(() => {
    const t = setTimeout(() => {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      confetti({ particleCount: 200, spread: 100, angle: 60, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 200, spread: 100, angle: 120, origin: { x: 1, y: 0.7 } });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const source = last;
  if (!source) return null;

  const [aInfo, bInfo] = source.teams;
  const aScore = source.scores[aInfo.id];
  const bScore = source.scores[bInfo.id];
  const winner =
    source.winnerId === "tie"
      ? null
      : source.teams.find((t) => t.id === source.winnerId)!;
  const loser =
    source.winnerId === "tie"
      ? null
      : source.teams.find((t) => t.id !== source.winnerId)!;

  const totalAttempts =
    aScore.correct + aScore.wrong + bScore.correct + bScore.wrong;
  const totalCorrect = aScore.correct + bScore.correct;
  const accuracy = totalAttempts
    ? Math.round((totalCorrect / totalAttempts) * 100)
    : 0;

  const playAgain = () => {
    resetGame();
    const err = startGame();
    if (err) {
      toast.error(err);
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/game" });
    }
  };

  const exportCsv = () => {
    const header = [
      "round",
      "team",
      "player",
      "difficulty",
      "result",
      "guessed",
      "points",
    ].join(",");
    const rows = source.log.map((e) => {
      const team = source.teams.find((t) => t.id === e.teamId)?.name ?? e.teamId;
      const player =
        teams.flatMap((t) => t.members).find((m) => m.id === e.playerId)?.fullName ??
        e.playerId;
      const guessed = e.guessedPlayerId
        ? teams.flatMap((t) => t.members).find((m) => m.id === e.guessedPlayerId)?.fullName ??
          e.guessedPlayerId
        : "";
      return [
        e.round,
        `"${team}"`,
        `"${player}"`,
        e.difficulty,
        e.result,
        `"${guessed}"`,
        e.points,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guess-who-${new Date(source.endedAt).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 gradient-bg opacity-15" />
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="inline-grid place-items-center h-24 w-24 rounded-3xl gradient-bg text-primary-foreground shadow-[var(--shadow-glow)] mb-6"
        >
          {winner ? <Trophy className="h-12 w-12" /> : <PartyPopper className="h-12 w-12" />}
        </motion.div>

        <h1 className="display text-5xl sm:text-6xl font-bold">
          {winner ? (
            <>
              <span className="gradient-text">{winner.name}</span> wins!
            </>
          ) : (
            "It's a tie!"
          )}
        </h1>
        <p className="text-muted-foreground mt-3">
          {winner
            ? `Sorry, ${loser?.name} — better luck (or better baby pics) next time.`
            : "Both teams brought their A-game."}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ResultTeamCard
            name={aInfo.name}
            score={aScore}
            winner={source.winnerId === aInfo.id}
          />
          <ResultTeamCard
            name={bInfo.name}
            score={bScore}
            winner={source.winnerId === bInfo.id}
          />
        </div>

        <div className="mt-6 glass rounded-2xl p-4 inline-flex flex-wrap justify-center gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">Total turns</div>
            <div className="font-bold">{totalAttempts}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Correct</div>
            <div className="font-bold text-[color:var(--success)]">{totalCorrect}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Accuracy</div>
            <div className="font-bold">{accuracy}%</div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            className="gradient-bg text-primary-foreground border-0"
            onClick={playAgain}
          >
            <PlayCircle className="h-5 w-5 mr-2" /> Play again
          </Button>
          <Link to="/admin">
            <Button size="lg" variant="outline">
              <RotateCcw className="h-5 w-5 mr-2" /> New setup
            </Button>
          </Link>
          <Button size="lg" variant="ghost" onClick={exportCsv}>
            <Download className="h-5 w-5 mr-2" /> Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultTeamCard({
  name,
  score,
  winner,
}: {
  name: string;
  score: { points: number; correct: number; wrong: number };
  winner: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className={`glass rounded-3xl p-6 relative ${winner ? "ring-2 ring-primary" : ""}`}
    >
      {winner && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
          WINNER
        </span>
      )}
      <div className="display text-xl font-bold truncate">{name}</div>
      <div className="display text-5xl font-black gradient-text mt-2 tabular-nums">
        {score.points}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {score.correct} correct · {score.wrong} wrong
      </div>
    </motion.div>
  );
}