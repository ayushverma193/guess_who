import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  Upload,
  PlayCircle,
  Trophy,
  BarChart3,
  Settings2,
  Users,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useGame, type Difficulty, type Player, type Team } from "@/store/game";
import { fileToDataUrl } from "@/lib/image";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Guess Who?" },
      { name: "description", content: "Configure teams, players, and game settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const DIFFS: { key: Difficulty; label: string; sub: string }[] = [
  { key: "easy", label: "Easy", sub: "Ages 10–12" },
  { key: "medium", label: "Medium", sub: "Ages 5–9" },
  { key: "hard", label: "Hard", sub: "Ages 0–4" },
];

function AdminPage() {
  const teams = useGame((s) => s.teams);
  const settings = useGame((s) => s.settings);
  const active = useGame((s) => s.active);
  const history = useGame((s) => s.history);
  const startGame = useGame((s) => s.startGame);
  const resetGame = useGame((s) => s.resetGame);
  const clearHistory = useGame((s) => s.clearHistory);
  const navigate = useNavigate();

  const onStart = () => {
    const err = startGame();
    if (err) {
      toast.error(err);
      return;
    }
    navigate({ to: "/game" });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="display truncate text-xl sm:text-2xl font-bold">Admin</h1>
              <p className="text-xs text-muted-foreground">Set up your teams & rules</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {active && !active.finished && (
              <Link to="/game">
                <Button variant="outline" size="sm">
                  Resume
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              className="gradient-bg text-primary-foreground border-0"
              onClick={onStart}
            >
              <PlayCircle className="h-4 w-4 mr-1.5" /> Start
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="glass p-1 rounded-2xl">
            <TabsTrigger value="teams" className="rounded-xl">
              <Users className="h-4 w-4 mr-1.5" /> Teams
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl">
              <Settings2 className="h-4 w-4 mr-1.5" /> Game
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl">
              <BarChart3 className="h-4 w-4 mr-1.5" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="grid gap-6 lg:grid-cols-2">
            {teams.map((t, i) => (
              <TeamCard key={t.id} team={t} colorVar={i === 0 ? "--team-a" : "--team-b"} />
            ))}
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
            {active && (
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" size="sm" onClick={resetGame}>
                  Reset current game
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <StatsPanel />
            {history.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  Clear history
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TeamCard({ team, colorVar }: { team: Team; colorVar: string }) {
  const renameTeam = useGame((s) => s.renameTeam);
  const addPlayer = useGame((s) => s.addPlayer);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNick, setNewNick] = useState("");

  const submitRename = () => {
    if (name.trim()) {
      renameTeam(team.id, name.trim());
      setEditing(false);
    }
  };

  const submitAdd = () => {
    if (!newName.trim()) return;
    addPlayer(team.id, { fullName: newName.trim(), nickname: newNick.trim() || undefined });
    setNewName("");
    setNewNick("");
    setShowAdd(false);
  };

  return (
    <motion.div
      layout
      className="glass rounded-3xl p-5 relative overflow-hidden"
      style={{ boxShadow: `0 20px 60px -30px var(${colorVar})` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `var(${colorVar})` }}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-4">
        <div className="min-w-0 flex items-center gap-2">
          {editing ? (
            <>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && submitRename()}
              />
              <Button size="sm" onClick={submitRename}>
                Save
              </Button>
            </>
          ) : (
            <>
              <h2 className="display truncate text-2xl font-bold">{team.name}</h2>
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {team.members.length} {team.members.length === 1 ? "player" : "players"}
        </Badge>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {team.members.map((m) => (
            <PlayerRow key={m.id} player={m} />
          ))}
        </AnimatePresence>
        {team.members.length === 0 && (
          <p className="text-sm text-muted-foreground italic px-1">No players yet.</p>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full mt-4">
            <Plus className="h-4 w-4 mr-1.5" /> Add player
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add player to {team.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Nickname (optional)</Label>
              <Input value={newNick} onChange={(e) => setNewNick(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const updatePlayer = useGame((s) => s.updatePlayer);
  const deletePlayer = useGame((s) => s.deletePlayer);
  const setPlayerImage = useGame((s) => s.setPlayerImage);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.fullName);
  const [nick, setNick] = useState(player.nickname ?? "");
  const profileRef = useRef<HTMLInputElement>(null);

  const completedCount = (["easy", "medium", "hard"] as Difficulty[]).filter(
    (d) => player.images[d],
  ).length;
  const ready = completedCount === 3;

  const onProfile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await fileToDataUrl(f);
      updatePlayer(player.id, { profilePic: url });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveEdit = () => {
    if (!name.trim()) return;
    updatePlayer(player.id, { fullName: name.trim(), nickname: nick.trim() || undefined });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border border-border/70 bg-card/50 p-3"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <button
          onClick={() => profileRef.current?.click()}
          className="h-11 w-11 shrink-0 rounded-full grid place-items-center overflow-hidden bg-muted border border-border relative group"
          title="Change profile picture"
        >
          {player.profilePic ? (
            <img src={player.profilePic} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold">
              {player.fullName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
            <Upload className="h-4 w-4 text-white" />
          </span>
          <input
            ref={profileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onProfile(e.target.files?.[0])}
          />
        </button>
        <div className="min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
              <Input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                className="h-8"
                placeholder="Nickname"
              />
              <Button size="sm" onClick={saveEdit}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <div className="truncate font-medium">
                {player.fullName}
                {player.nickname && (
                  <span className="text-muted-foreground font-normal"> · "{player.nickname}"</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {ready ? (
                  <span className="text-[color:var(--success)] font-medium inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Ready
                  </span>
                ) : (
                  <span>{completedCount}/3 childhood images</span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => deletePlayer(player.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mt-3">
              {DIFFS.map((d) => (
                <ImageSlot
                  key={d.key}
                  label={d.label}
                  sub={d.sub}
                  value={player.images[d.key]}
                  onChange={(url) => setPlayerImage(player.id, d.key, url)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ImageSlot({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await fileToDataUrl(f);
      onChange(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => (value ? setPreview(true) : ref.current?.click())}
        className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-border relative group bg-muted/40 grid place-items-center"
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-xs font-medium">
              Preview
            </span>
          </>
        ) : (
          <div className="text-center px-1">
            <Upload className="h-4 w-4 mx-auto text-muted-foreground" />
            <div className="text-[10px] text-muted-foreground mt-1">Upload</div>
          </div>
        )}
      </button>
      <div className="text-[11px] text-center leading-tight">
        <div className="font-semibold">{label}</div>
        <div className="text-muted-foreground">{sub}</div>
      </div>
      <div className="flex justify-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={() => ref.current?.click()}
        >
          {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-destructive"
            onClick={() => onChange(undefined)}
          >
            Delete
          </Button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {label} · {sub}
            </DialogTitle>
          </DialogHeader>
          {value && <img src={value} alt="" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsPanel() {
  const settings = useGame((s) => s.settings);
  const updateSettings = useGame((s) => s.updateSettings);

  return (
    <div className="glass rounded-3xl p-6 space-y-8">
      <div>
        <Label className="text-base">Rounds: {settings.rounds}</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Each round is one turn per team.
        </p>
        <Slider
          min={1}
          max={25}
          step={1}
          value={[settings.rounds]}
          onValueChange={([v]) => updateSettings({ rounds: v })}
        />
      </div>
      <div>
        <Label className="text-base">Timer: {settings.timerSeconds}s per turn</Label>
        <Slider
          min={10}
          max={120}
          step={5}
          value={[settings.timerSeconds]}
          onValueChange={([v]) => updateSettings({ timerSeconds: v })}
          className="mt-3"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <div key={d} className="space-y-1.5">
            <Label className="capitalize">{d} points</Label>
            <Input
              type="number"
              min={0}
              value={settings.points[d]}
              onChange={(e) =>
                updateSettings({
                  points: { ...settings.points, [d]: Number(e.target.value) || 0 },
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel() {
  const teams = useGame((s) => s.teams);
  const history = useGame((s) => s.history);

  const gamesPlayed = history.length;
  let highest = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  const missCount: Record<string, number> = {};
  for (const h of history) {
    for (const teamId of Object.keys(h.scores)) {
      const s = h.scores[teamId];
      highest = Math.max(highest, s.points);
      totalCorrect += s.correct;
      totalAttempts += s.correct + s.wrong;
    }
    for (const e of h.log) {
      if (e.result !== "correct") {
        missCount[e.playerId] = (missCount[e.playerId] ?? 0) + 1;
      }
    }
  }
  const mostMissedId = Object.entries(missCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostMissed = mostMissedId
    ? teams.flatMap((t) => t.members).find((m) => m.id === mostMissedId)
    : undefined;
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const stats = [
    { label: "Games played", value: gamesPlayed },
    { label: "Highest score", value: highest },
    { label: "Total correct guesses", value: totalCorrect },
    { label: "Average accuracy", value: `${accuracy}%` },
    { label: "Most missed", value: mostMissed?.fullName ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="display text-3xl font-bold mt-1 gradient-text">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="display text-lg font-bold flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4" /> Recent games
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games played yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {history.map((h) => {
              const winner =
                h.winnerId === "tie"
                  ? "Tie"
                  : h.teams.find((t) => t.id === h.winnerId)?.name ?? "—";
              return (
                <li key={h.id} className="py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {h.teams[0].name} {h.scores[h.teams[0].id].points} —{" "}
                      {h.scores[h.teams[1].id].points} {h.teams[1].name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.endedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge className="gradient-bg text-primary-foreground border-0 shrink-0">
                    {winner}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
