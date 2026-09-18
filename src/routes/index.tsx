import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Users,
  PartyPopper,
  PlayCircle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const teams = useGame((s) => s.teams);
  const active = useGame((s) => s.active);
  const totalPlayers = teams[0].members.length + teams[1].members.length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 gradient-bg opacity-20" />
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
        <nav className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="grid place-items-center h-10 w-10 rounded-2xl gradient-bg text-primary-foreground shadow-[var(--shadow-glow)]">
              <PartyPopper className="h-5 w-5" />
            </span>
            <span className="display">Guess Who?</span>
          </div>
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <Settings2 className="h-4 w-4 mr-2" /> Admin
            </Button>
          </Link>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            The childhood photo party showdown
          </div>
          <h1 className="display text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight">
            Who was <span className="gradient-text">that adorable</span>
            <br />
            little troublemaker?
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Two teams. Baby photos. Bragging rights. Upload childhood pics, spin
            the wheel of nostalgia, and see who really knows their teammates.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/game">
              <Button
                size="lg"
                className="h-14 px-8 text-base gradient-bg text-primary-foreground border-0 shadow-[var(--shadow-glow)] hover:opacity-90"
                disabled={!active && totalPlayers === 0}
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                {active ? "Resume Game" : "Start Guess Who"}
              </Button>
            </Link>
            <Link to="/admin">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base"
              >
                <Users className="h-5 w-5 mr-2" /> Set Up Teams
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Build the roster",
              body: "Two teams, any size. Add nicknames and profile pics.",
            },
            {
              icon: Sparkles,
              title: "Upload 3 baby pics",
              body: "Easy (ages 10–12), Medium (5–9), Hard (0–4). Points scale.",
            },
            {
              icon: Trophy,
              title: "Battle & brag",
              body: "Timed turns, confetti, live scoreboard, trophy finale.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i + 0.2 }}
              className="glass rounded-3xl p-6"
            >
              <span className="grid place-items-center h-11 w-11 rounded-2xl gradient-bg text-primary-foreground mb-4">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
