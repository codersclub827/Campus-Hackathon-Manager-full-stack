import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Activity,
  Award,
  BellRing,
  Bot,
  Camera,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Crown,
  Github,
  Download,
  DownloadCloud,
  Edit3,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Lock,
  LogOut,
  Mail,
  Medal,
  MapPin,
  Megaphone,
  MonitorCheck,
  Moon,
  Plus,
  Printer,
  QrCode,
  Flag,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ScanLine,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Unlock,
  UserCheck,
  UsersRound,
  Volume2,
  VolumeX,
  Video,
  Wifi,
  WifiOff,
  XCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { aiPrompts, analytics, attendees, messages, rubrics, stats, teams, timeline, users } from "../data/mock";
import { useCertificates, type CertificateCategory, type CertificateItem } from "../lib/certificates";
import { eventTypes, useEventCalendar, type CalendarEvent, type CalendarEventType, type CalendarView } from "../lib/calendar";
import { countdown, useLiveLeaderboard, type LeaderboardSnapshot, type LeaderboardTeam, type RubricScores } from "../lib/leaderboard";
import { useQRAttendance, type AttendanceRecord, type AttendanceRole } from "../lib/attendance";
import { useLiveOps } from "../lib/live";
import { relativeTime, useNotificationCenter, type BroadcastPayload, type NotificationItem } from "../lib/notifications";
import { currency } from "../lib/utils";

export function StudentDashboard() {
  return (
    <PageGrid>
      <HeroPanel title="Student Dashboard" eyebrow="Build, collaborate, submit" body="Track your hackathon journey from registration to certificate, with team collaboration and AI project support." actions={["Register Hackathon", "Create Team", "Join Team"]} />
      <StatsRow />
      <ProgressPanel />
      <LiveActivityRail />
      <TimelinePanel />
      <TeamPanel />
    </PageGrid>
  );
}

export function TeamDashboard() {
  return (
    <PageGrid>
      <HeroPanel title="Team Dashboard" eyebrow="Neural Nexus workspace" body="Invite members, manage milestones, connect GitHub, upload demo assets, and keep everyone aligned." actions={["Invite Members", "Upload Project", "Sync GitHub"]} />
      <Card className="lg:col-span-2"><TeamTable /></Card>
      <ChatPreview />
      <SubmissionPanel />
    </PageGrid>
  );
}

export function MentorDashboard() {
  return (
    <PageGrid>
      <HeroPanel title="Mentor Dashboard" eyebrow="Assigned teams" body="Review progress, schedule meetings, leave feedback, and unblock teams before judging begins." actions={["Schedule Meeting", "Send Feedback"]} />
      <TeamPanel />
      <TimelinePanel />
      <FeedbackPanel />
    </PageGrid>
  );
}

export function JudgeDashboard() {
  return (
    <PageGrid>
      <HeroPanel title="Judge Dashboard" eyebrow="Live evaluation" body="Score projects with rubric precision, add comments, and publish the leaderboard with confidence." actions={["Start Evaluation", "Save Scores"]} />
      <RubricPanel />
      <Leaderboard compact />
      <FeedbackPanel />
    </PageGrid>
  );
}

export function AdminDashboard() {
  return (
    <PageGrid>
      <HeroPanel title="Admin Dashboard" eyebrow="Hackathon control room" body="Manage users, teams, hackathons, reports, email broadcast, certificates, analytics, and QR attendance." actions={["Broadcast Email", "Generate Reports", "Issue Certificates"]} />
      <StatsRow />
      <AnalyticsPanel />
      <LiveActivityRail />
      <Card><UserTable /></Card>
    </PageGrid>
  );
}

export function AnalyticsPage() {
  return (
    <PageGrid>
      <HeroPanel title="Analytics" eyebrow="Realtime operations" body="Monitor registrations, attendance, submission velocity, judging progress, budget usage, and role activity." actions={["Export CSV", "Create Report"]} />
      <StatsRow />
      <AnalyticsPanel />
      <LiveActivityRail />
      <Card><h3 className="text-lg font-black">Budget</h3><p className="mt-2 text-4xl font-black">{currency.format(850000)}</p><p className="mt-2 text-sm text-slate-500">Sponsorship utilized across venues, cloud credits, prizes, and certificates.</p></Card>
    </PageGrid>
  );
}

export function NotificationsPage() {
  return (
    <PageGrid>
      <NotificationsList />
    </PageGrid>
  );
}

export function CertificatesPage() {
  return <CertificateGrid />;
}

export function SubmissionPage() {
  return <PageGrid><HeroPanel title="Project Submission" eyebrow="Final upload" body="Submit your GitHub repository, demo video, deck, Cloudinary assets, and deployment URL." actions={["Save Draft", "Submit Final"]} /><SubmissionPanel /></PageGrid>;
}

export function TeamChatPage() {
  return <PageGrid><HeroPanel title="Team Chat" eyebrow="Socket.io ready" body="Realtime team chat with mentor comments, AI suggestions, and submission reminders." actions={["Start Huddle"]} /><ChatPreview full /></PageGrid>;
}

export function CalendarPage() {
  return <CalendarBoard />;
}

export function LeaderboardPage() {
  return <Leaderboard />;
}

export function AIAssistantPage() {
  return <PageGrid><HeroPanel title="AI Assistant" eyebrow="Idea, evaluator, feedback, chat" body="Generate project ideas, evaluate readiness, draft mentor feedback, and answer participant questions." actions={["Generate Idea", "Evaluate Project"]} /><AIPanel /></PageGrid>;
}

export function QRAttendancePage() {
  return <QRPanel />;
}

export function ProfilePage() {
  return <PageGrid><HeroPanel title="Profile" eyebrow="Ananya Sharma" body="Student, AI track participant, Neural Nexus lead, GitHub connected, certificate eligible." actions={["Edit Profile"]} /><ProfilePanel /></PageGrid>;
}

export function SettingsPage() {
  return <PageGrid><HeroPanel title="Settings" eyebrow="Workspace controls" body="Manage account security, notification preferences, integrations, roles, and API keys." actions={["Save Changes"]} /><SettingsPanel /></PageGrid>;
}

function PageGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-3">{children}</div>;
}

function HeroPanel({ title, eyebrow, body, actions }: { title: string; eyebrow: string; body: string; actions: string[] }) {
  const live = useLiveOps();

  return (
    <Card className="overflow-hidden p-6 lg:col-span-3">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-500">{eyebrow}</p>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${live.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              <Radio className="h-3.5 w-3.5" />
              {live.connected ? "Live" : "Connecting"} · {live.onlineUsers} online
            </span>
          </div>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button key={action} variant={index === 0 ? "primary" : "secondary"} onClick={() => toast.success(action)}>
              {action}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function StatsRow() {
  const live = useLiveOps();
  const dynamicStats = [
    { label: "Registered hackers", value: live.metrics.hackers.toLocaleString("en-IN"), delta: "+ live", tone: "from-indigo-500 to-blue-500" },
    { label: "Active teams", value: live.metrics.teams.toLocaleString("en-IN"), delta: "forming now", tone: "from-violet-500 to-fuchsia-500" },
    { label: "Submissions", value: live.metrics.submissions.toLocaleString("en-IN"), delta: `${live.uploadProgress || 92}% latest`, tone: "from-sky-500 to-cyan-400" },
    { label: "Avg judge score", value: live.metrics.averageScore.toFixed(1), delta: `${live.metrics.attendanceRate}% attendance`, tone: "from-emerald-500 to-teal-400" }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
      {dynamicStats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${stat.tone} opacity-25 blur-2xl`} />
          <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
          <p className="mt-3 text-3xl font-black transition-all duration-500">{stat.value}</p>
          <p className="mt-2 text-sm font-bold text-indigo-600">{stat.delta}</p>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsPanel() {
  const live = useLiveOps();

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black">Registration and Submission Velocity</h3>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{live.onlineUsers} live users</span>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={analytics}>
            <defs>
              <linearGradient id="registrations" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="registrations" stroke="#4f46e5" fill="url(#registrations)" strokeWidth={3} />
            <Area type="monotone" dataKey="submissions" stroke="#06b6d4" fill="#67e8f933" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ProgressPanel() {
  return (
    <Card>
      <h3 className="text-lg font-black">Progress Tracking</h3>
      <div className="mt-5 space-y-4">
        {["Team created", "GitHub connected", "Demo video", "Final submission"].map((item, index) => (
          <div key={item}>
            <div className="mb-2 flex justify-between text-sm font-bold"><span>{item}</span><span>{Math.min(100, 35 + index * 21)}%</span></div>
            <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400" style={{ width: `${Math.min(100, 35 + index * 21)}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimelinePanel() {
  return (
    <Card>
      <h3 className="text-lg font-black">Today</h3>
      <div className="mt-5 space-y-3">
        {timeline.map((item) => (
          <div key={item.title} className="rounded-2xl bg-white/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-black">{item.time}</p>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{item.status}</span>
            </div>
            <p className="mt-2 font-bold">{item.title}</p>
            <p className="text-sm text-slate-500">{item.track}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TeamPanel() {
  return <Card className="lg:col-span-2"><TeamTable /></Card>;
}

function TeamTable() {
  return (
    <>
      <h3 className="text-lg font-black">Teams</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-3">Team</th><th>Project</th><th>Mentor</th><th>Progress</th><th>Score</th></tr></thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.name} className="border-t border-slate-200/70">
                <td className="py-4 font-black">{team.name}<p className="text-xs font-semibold text-slate-500">{team.members} members</p></td>
                <td>{team.project}</td><td>{team.mentor}</td>
                <td><div className="h-2 w-28 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${team.progress}%` }} /></div></td>
                <td className="font-black">{team.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SubmissionPanel() {
  const live = useLiveOps();
  const runUpload = () => {
    [18, 36, 58, 77, 91, 100].forEach((progress, index) => {
      window.setTimeout(() => live.trackUpload("Neural Nexus", progress), index * 320);
    });
    toast.success("Live upload tracker started");
  };

  return (
    <Card className="lg:col-span-2">
      <h3 className="text-lg font-black">Submission</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input placeholder="Project title" defaultValue="AI Campus Safety Companion" />
        <Input placeholder="Deployment URL" defaultValue="https://neural-nexus.vercel.app" />
        <Input placeholder="GitHub repository" defaultValue="github.com/neural-nexus/campus-safety" />
        <Input placeholder="Demo video URL" defaultValue="https://youtu.be/demo" />
        <Textarea className="sm:col-span-2" placeholder="Problem statement and impact" defaultValue="A privacy-first assistant for safer campus navigation, emergency reporting, and event alerts." />
      </div>
      <div className="mt-5 rounded-2xl bg-white/70 p-4">
        <div className="mb-2 flex justify-between text-sm font-black"><span>Live upload progress</span><span>{live.uploadProgress}%</span></div>
        <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400 transition-all" style={{ width: `${live.uploadProgress}%` }} /></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={runUpload}><UploadCloud className="h-4 w-4" /> Upload</Button><Button variant="secondary"><Github className="h-4 w-4" /> GitHub</Button><Button variant="secondary"><Video className="h-4 w-4" /> Demo</Button>
      </div>
    </Card>
  );
}

function FeedbackPanel() {
  return <Card><h3 className="text-lg font-black">Feedback</h3><Textarea className="mt-4" defaultValue="Strong product direction. Add a clearer risk model, measurable campus impact, and a 90-second demo script." /><Button className="mt-4"><Send className="h-4 w-4" /> Send Feedback</Button></Card>;
}

function RubricPanel() {
  return (
    <Card className="lg:col-span-2">
      <h3 className="text-lg font-black">Rubric Scoring</h3>
      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">{rubrics.map((r) => <div key={r.label}><div className="flex justify-between text-sm font-bold"><span>{r.label}</span><span>{r.score}/10</span></div><input className="mt-2 w-full accent-indigo-600" type="range" min="0" max="10" step="0.1" defaultValue={r.score} /></div>)}</div>
        <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={rubrics} dataKey="score" innerRadius={54} outerRadius={86}>{rubrics.map((_, i) => <Cell key={i} fill={["#4f46e5", "#7c3aed", "#06b6d4", "#10b981", "#f59e0b"][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
      </div>
    </Card>
  );
}

function Leaderboard({ compact = false }: { compact?: boolean }) {
  const live = useLiveOps();
  const ranked = useMemo(() => {
    const liveScores = new Map(live.scores.map((score) => [score.team, score.score]));
    return teams
      .map((team) => ({ ...team, score: liveScores.get(team.name) ?? team.score }))
      .sort((a, b) => b.score - a.score);
  }, [live.scores]);

  if (!compact) return <LiveLeaderboard />;

  return (
    <Card className={compact ? "" : "lg:col-span-3"}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black">Leaderboard</h3>
        <Button variant="secondary" size="sm" onClick={() => live.updateScore("Neural Nexus", Math.floor(94 + Math.random() * 6))}>Live Score</Button>
      </div>
      <div className="mt-4 space-y-3">{ranked.map((team, index) => <div key={team.name} className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 transition hover:-translate-y-0.5 hover:bg-white"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">#{index + 1}</span><div className="min-w-0 flex-1"><p className="font-black">{team.name}</p><p className="truncate text-sm text-slate-500">{team.project}</p></div><p className="text-2xl font-black text-indigo-600">{team.score}</p></div>)}</div>
    </Card>
  );
}

function LiveLeaderboard() {
  const board = useLiveLeaderboard();
  const [scoreDraft, setScoreDraft] = useState<RubricScores>({ innovation: 9, technical: 9, uiux: 9, business: 8.5, presentation: 9, impact: 9 });
  const selected = board.selectedTeam;
  const stats = [
    { label: "Total Teams", value: board.stats.totalTeams, icon: UsersRound, tone: "from-indigo-500 to-sky-500" },
    { label: "Evaluated", value: board.stats.evaluatedTeams, icon: CheckCircle2, tone: "from-emerald-500 to-teal-400" },
    { label: "Pending", value: board.stats.pendingTeams, icon: Clock3, tone: "from-amber-500 to-orange-400" },
    { label: "Active Judges", value: board.stats.activeJudges, icon: Radio, tone: "from-violet-500 to-fuchsia-500" },
    { label: "Average Score", value: `${board.stats.averageScore}/60`, icon: TrendingUp, tone: "from-cyan-500 to-blue-500" },
    { label: "Highest Score", value: `${board.stats.highestScore}/60`, icon: Crown, tone: "from-rose-500 to-pink-500" }
  ];

  const submit = (editing = false) => {
    if (!selected) return;
    board.submitScore(selected.id, scoreDraft, editing);
  };

  return (
    <div className={board.dark ? "leaderboard-dark -m-3 rounded-[2rem] bg-slate-950 p-3 text-white sm:-m-4 sm:p-4 lg:-m-6 lg:p-6" : ""}>
      <div className="grid gap-4">
        <Card className={`relative overflow-hidden p-6 ${board.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
          {board.state.published && <Confetti />}
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white"><TrophyIcon /> Live Rankings</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${board.state.locked ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{board.state.locked ? "Locked" : "Unlocked"}</span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">Judging {countdown(board.state.judgingEndsAt, board.now)}</span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">Final {countdown(board.state.announcementAt, board.now)}</span>
              </div>
              <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Live Leaderboard</h2>
              <p className={`mt-4 max-w-3xl text-sm leading-7 ${board.dark ? "text-white/65" : "text-slate-600"}`}>
                Formula 1-style live timing for hackathon judging: every score, rank change, judge action, and winner announcement streams instantly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => board.setDark(!board.dark)}>{board.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {board.dark ? "Light" : "Dark"}</Button>
              <Button variant="secondary" onClick={() => board.setLocked(!board.state.locked)}>{board.state.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />} {board.state.locked ? "Unlock" : "Lock"}</Button>
              <Button variant="secondary" onClick={board.exportResults}><Download className="h-4 w-4" /> Export</Button>
              <Button onClick={board.publish}><Flag className="h-4 w-4" /> Publish Final</Button>
            </div>
          </div>
          {board.state.published && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl bg-gradient-to-r from-amber-400 via-rose-500 to-violet-600 p-4 text-white shadow-glow">
              <p className="text-sm font-black uppercase tracking-[0.18em]">Winner announced</p>
              <p className="mt-1 text-2xl font-black">{board.podium[0]?.teamName} takes Gold with {board.podium[0]?.totalScore} points</p>
            </motion.div>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className={`relative overflow-hidden ${board.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.tone} opacity-25 blur-xl`} />
                <stat.icon className="h-5 w-5 text-indigo-500" />
                <p className={`mt-4 text-xs font-black uppercase tracking-[0.16em] ${board.dark ? "text-white/45" : "text-slate-400"}`}>{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Podium teams={board.podium} dark={board.dark} />
            <Card className={`overflow-hidden p-0 ${board.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
              <div className="flex items-center justify-between gap-3 border-b border-white/60 p-4">
                <div>
                  <h3 className="text-lg font-black">Rank Timing Tower</h3>
                  <p className={board.dark ? "text-sm text-white/50" : "text-sm text-slate-500"}>Previous rank, current rank, deltas, scores, and team status.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={board.refresh}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              {board.loading ? (
                <div className="grid gap-3 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className={board.dark ? "text-white/45" : "text-slate-500"}>
                      <tr><th className="px-4 py-3">Rank</th><th>Team</th><th>Status</th><th>Total</th><th>Avg</th><th>High</th><th>Breakdown</th><th>Judge</th></tr>
                    </thead>
                    <tbody>
                      {board.entries.map((team) => (
                        <LeaderboardRow key={team.id} team={team} dark={board.dark} selected={selected?.id === team.id} onSelect={() => { board.setSelectedTeamId(team.id); setScoreDraft(team.scores); }} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <JudgePanel team={selected} draft={scoreDraft} setDraft={setScoreDraft} dark={board.dark} onSubmit={submit} onOverride={(rank) => selected && board.overrideRank(selected.id, rank)} onReset={board.reset} />
            <ScoreChart team={selected} dark={board.dark} />
            <ActivityFeed activity={board.state.activity} dark={board.dark} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrophyIcon() {
  return <Crown className="h-3.5 w-3.5" />;
}

function Podium({ teams, dark }: { teams: LeaderboardTeam[]; dark: boolean }) {
  const order = [teams[1], teams[0], teams[2]].filter(Boolean);
  const heights = ["h-28", "h-40", "h-24"];
  const medals = ["Silver", "Gold", "Bronze"];
  return (
    <Card className={`${dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">Live Winner Podium</h3>
        <Medal className="h-5 w-5 text-amber-500" />
      </div>
      <div className="mt-6 grid items-end gap-3 md:grid-cols-3">
        {order.map((team, index) => (
          <motion.div key={team.id} layout className={`rounded-3xl bg-gradient-to-br ${index === 1 ? "from-amber-300 to-orange-500" : index === 0 ? "from-slate-300 to-slate-500" : "from-orange-300 to-rose-500"} p-4 text-white shadow-glow ${heights[index]}`}>
            <p className="text-xs font-black uppercase tracking-[0.16em]">{medals[index]}</p>
            <p className="mt-3 text-xl font-black">{team.teamName}</p>
            <p className="mt-1 text-sm opacity-85">Rank #{team.currentRank} · {team.totalScore}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function LeaderboardRow({ team, dark, selected, onSelect }: { team: LeaderboardTeam; dark: boolean; selected: boolean; onSelect: () => void }) {
  const movedUp = team.currentRank < team.previousRank;
  const movedDown = team.currentRank > team.previousRank;
  const statusTone = team.status === "Finalized" || team.status === "Evaluation Completed" ? "bg-emerald-100 text-emerald-700" : team.status === "Under Evaluation" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return (
    <motion.tr layout onClick={onSelect} className={`cursor-pointer border-t transition ${selected ? "bg-indigo-50" : dark ? "border-white/10 hover:bg-white/10" : "border-slate-200/70 hover:bg-white/70"}`}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">#{team.currentRank}</span>
          {movedUp && <TrendingUp className="h-4 w-4 text-emerald-500" />}
          {movedDown && <TrendingDown className="h-4 w-4 text-rose-500" />}
          <span className="text-xs font-bold text-slate-400">prev #{team.previousRank}</span>
        </div>
      </td>
      <td><p className="font-black">{team.teamName}</p><p className={dark ? "text-xs text-white/45" : "text-xs text-slate-500"}>{team.projectName}</p></td>
      <td><span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone}`}>{team.status}</span></td>
      <td><AnimatedNumber value={team.totalScore} /></td>
      <td className="font-black">{team.averageScore}</td>
      <td className="font-black">{team.highestScore}</td>
      <td><ScoreBars scores={team.scores} /></td>
      <td>{team.activeJudge || "Waiting"}<p className="text-xs text-slate-400">{team.evaluationsRemaining} remaining</p></td>
    </motion.tr>
  );
}

function ScoreBars({ scores }: { scores: RubricScores }) {
  return (
    <div className="grid w-44 gap-1">
      {Object.entries(scores).slice(0, 6).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-16 truncate text-[10px] font-black uppercase text-slate-400">{key}</span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-indigo-500" animate={{ width: `${value * 10}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return <motion.span key={value} initial={{ scale: 1.2, color: "#16a34a" }} animate={{ scale: 1, color: "#4f46e5" }} className="text-2xl font-black">{value}</motion.span>;
}

function JudgePanel({ team, draft, setDraft, dark, onSubmit, onOverride, onReset }: { team?: LeaderboardTeam; draft: RubricScores; setDraft: (scores: RubricScores) => void; dark: boolean; onSubmit: (editing?: boolean) => void; onOverride: (rank: number) => void; onReset: () => void }) {
  const [rank, setRank] = useState(1);
  if (!team) return null;
  return (
    <Card className={dark ? "border-white/10 bg-white/10 text-white" : ""}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black">Judge Score Entry</h3>
          <p className={dark ? "text-sm text-white/50" : "text-sm text-slate-500"}>{team.teamName} · autosave ready</p>
        </div>
        <Radio className="h-5 w-5 text-emerald-500" />
      </div>
      <div className="mt-4 space-y-3">
        {(Object.keys(draft) as Array<keyof RubricScores>).map((key) => (
          <label key={key} className="block">
            <div className="mb-1 flex justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-400"><span>{key}</span><span>{draft[key]}</span></div>
            <input className="w-full accent-indigo-600" type="range" min="0" max="10" step="0.1" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} onMouseUp={() => onSubmit(true)} />
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button onClick={() => onSubmit(false)}><CheckCircle2 className="h-4 w-4" /> Submit</Button>
        <Button variant="secondary" onClick={() => onSubmit(true)}><Edit3 className="h-4 w-4" /> Edit</Button>
        <div className="col-span-2 flex gap-2">
          <Input type="number" min={1} value={rank} onChange={(event) => setRank(Number(event.target.value))} />
          <Button variant="secondary" onClick={() => onOverride(rank)}>Override</Button>
        </div>
        <Button className="col-span-2" variant="danger" onClick={onReset}><RotateCcw className="h-4 w-4" /> Reset Scores</Button>
      </div>
    </Card>
  );
}

function ScoreChart({ team, dark }: { team?: LeaderboardTeam; dark: boolean }) {
  if (!team) return null;
  const data = Object.entries(team.scores).map(([name, score]) => ({ name, score }));
  return (
    <Card className={dark ? "border-white/10 bg-white/10 text-white" : ""}>
      <h3 className="text-lg font-black">Score Breakdown</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#ffffff22" : "#e2e8f0"} />
            <XAxis dataKey="name" hide />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Bar dataKey="score" fill="#4f46e5" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ActivityFeed({ activity, dark }: { activity: LeaderboardSnapshot["state"]["activity"]; dark: boolean }) {
  const toneClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700"
  };
  return (
    <Card className={dark ? "border-white/10 bg-white/10 text-white" : ""}>
      <h3 className="text-lg font-black">Live Activity Feed</h3>
      <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
        {activity.map((item) => (
          <div key={`${item.message}-${item.at}`} className={dark ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-white/70 p-3"}>
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${toneClasses[item.tone]}`}>{relativeTime(item.at)}</span>
            <p className="mt-2 text-sm font-bold">{item.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-2 w-2 rounded-full"
          style={{ left: `${(index * 37) % 100}%`, backgroundColor: ["#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"][index % 4] }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 260, opacity: [0, 1, 0], rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.08 }}
        />
      ))}
    </div>
  );
}

function ChatPreview({ full = false }: { full?: boolean }) {
  const live = useLiveOps();
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const mergedMessages = [...live.messages, ...messages].slice(0, full ? 10 : 5);
  const send = () => {
    if (!text.trim()) return;
    const sentText = text.trim();
    live.sendMessage(sentText);
    setText("");
    setIsTyping(true);
    window.setTimeout(() => {
      live.sendMessage(`Mentor reply: Great update on "${sentText}". Please add one measurable impact point before final submission.`);
      setIsTyping(false);
    }, 1200);
  };

  return <Card className={full ? "lg:col-span-3" : ""}><div className="flex items-center justify-between"><h3 className="text-lg font-black">Team Chat</h3><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">auto reply live</span></div><div className="mt-4 space-y-3">{isTyping && <div className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">Mentor is typing...</div>}{mergedMessages.map((m) => <div key={`${m.from}-${m.text}-${m.time}`} className="rounded-2xl bg-white/70 p-4"><div className="flex justify-between text-sm"><b>{m.from}</b><span className="text-slate-400">{m.time}</span></div><p className="mt-1 text-sm text-slate-600">{m.text}</p></div>)}</div><div className="mt-4 flex gap-2"><Input placeholder="Message your team" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} /><Button onClick={send}><Send className="h-4 w-4" /></Button></div></Card>;
}

function NotificationsList() {
  const {
    user,
    notifications,
    unreadCount,
    loading,
    browserEnabled,
    soundEnabled,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
    broadcast,
    requestBrowserPermission,
    toggleSound
  } = useNotificationCenter();
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all");
  const [form, setForm] = useState<BroadcastPayload>({
    title: "Final submission checkpoint",
    body: "All teams must upload GitHub, demo video, and deployment links before 10:00 PM IST.",
    priority: "high",
    type: "deadline",
    roles: ["student", "mentor"]
  });

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.read);
    if (filter === "urgent") return notifications.filter((notification) => notification.priority === "urgent" || notification.priority === "high");
    return notifications;
  }, [filter, notifications]);

  const roleSummary = useMemo(() => {
    const counts = new Map<string, number>();
    notifications.forEach((notification) => notification.roles.forEach((role) => counts.set(role, (counts.get(role) ?? 0) + 1)));
    return ["student", "mentor", "judge", "admin"].map((role) => ({ role, count: counts.get(role) ?? 0 }));
  }, [notifications]);

  const updateRoles = (role: "student" | "mentor" | "judge" | "admin") => {
    setForm((current) => {
      const roles = current.roles ?? [];
      return { ...current, roles: roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role] };
    });
  };

  const sendBroadcast = () => {
    if (!form.title?.trim() || !form.body?.trim()) {
      toast.error("Broadcast needs a title and message");
      return;
    }
    broadcast(form);
  };

  return (
    <div className="grid gap-4 lg:col-span-3 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  <BellRing className="h-3.5 w-3.5" />
                  Realtime
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">{unreadCount} unread</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{user?.role ?? "demo"} role</span>
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Notifications</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Live Socket.io alerts with MongoDB persistence, JWT-aware delivery, role targeting, toasts, browser alerts, and read state that updates without refreshing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>
              <Button variant="secondary" size="sm" onClick={requestBrowserPermission}><MonitorCheck className="h-4 w-4" /> {browserEnabled ? "Browser On" : "Browser"}</Button>
              <Button variant="secondary" size="sm" onClick={toggleSound}>{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Sound</Button>
              <Button size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark All Read</Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-white/70 p-4 md:grid-cols-3">
          {(["all", "unread", "urgent"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${filter === item ? "bg-slate-950 text-white shadow-glow" : "bg-white/70 text-slate-600 hover:bg-white"}`}
            >
              {item === "all" ? "All updates" : item === "unread" ? "Unread only" : "High priority"}
            </button>
          ))}
        </div>

        <div className="scrollbar-soft max-h-[680px] space-y-3 overflow-auto p-4">
          {loading && <div className="rounded-2xl bg-white/70 p-5 text-sm font-bold text-slate-500">Loading live notification stream...</div>}
          {!loading && filtered.length === 0 && <div className="rounded-2xl bg-white/70 p-5 text-sm font-bold text-slate-500">No notifications match this view.</div>}
          {filtered.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onRead={() => markRead(notification.id)}
              onDelete={() => deleteNotification(notification.id)}
            />
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Admin Broadcast</p>
              <h3 className="mt-1 text-xl font-black">Send Live Alert</h3>
            </div>
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="mt-5 space-y-3">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Broadcast title" />
            <Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Message body" />
            <select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value as NotificationItem["priority"] })}
              className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent priority</option>
              <option value="low">Low priority</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              {(["student", "mentor", "judge", "admin"] as const).map((role) => (
                <label key={role} className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm font-black capitalize">
                  <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={(form.roles ?? []).includes(role)} onChange={() => updateRoles(role)} />
                  {role}
                </label>
              ))}
            </div>
            <Button className="w-full" onClick={sendBroadcast}><Megaphone className="h-4 w-4" /> Broadcast</Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-black">Role Delivery</h3>
          <div className="mt-4 space-y-3">
            {roleSummary.map((item) => (
              <div key={item.role} className="flex items-center justify-between rounded-2xl bg-white/70 p-4">
                <span className="font-black capitalize">{item.role}</span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NotificationRow({ notification, onRead, onDelete }: { notification: NotificationItem; onRead: () => void; onDelete: () => void }) {
  const tone = {
    low: "bg-slate-100 text-slate-600",
    normal: "bg-indigo-100 text-indigo-700",
    high: "bg-amber-100 text-amber-700",
    urgent: "bg-rose-100 text-rose-700"
  }[notification.priority];

  return (
    <div className={`rounded-2xl border p-4 transition hover:bg-white ${notification.read ? "border-white/70 bg-white/55" : "border-indigo-200 bg-white shadow-glow"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone}`}>{notification.priority}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-600">{notification.type}</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Clock3 className="h-3.5 w-3.5" /> {relativeTime(notification.createdAt)}</span>
          </div>
          <h3 className="mt-3 text-lg font-black">{notification.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {notification.roles.map((role) => (
              <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-500">{role}</span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={onRead} disabled={notification.read} aria-label="Mark notification as read">
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} aria-label="Delete notification">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CertificateGrid() {
  const certs = useCertificates();
  const [dark, setDark] = useState(false);
  const [selected, setSelected] = useState<CertificateItem | null>(null);
  const active = selected ?? certs.selected;
  const categories: Array<CertificateCategory | "All"> = ["All", "Winner", "Runner-up", "Participant", "Mentor", "Judge", "Organizer"];
  const totalPages = Math.max(1, Math.ceil(certs.total / 8));
  const statCards = [
    { label: "Total Certificates", value: certs.stats.total, icon: Award, tone: "from-indigo-500 to-sky-500" },
    { label: "Generated", value: certs.stats.generated, icon: CheckCircle2, tone: "from-emerald-500 to-teal-400" },
    { label: "Pending", value: certs.stats.pending, icon: Clock3, tone: "from-amber-500 to-orange-400" },
    { label: "Downloaded", value: certs.stats.downloaded, icon: Download, tone: "from-violet-500 to-fuchsia-500" },
    { label: "Verified", value: certs.stats.verified, icon: Shield, tone: "from-cyan-500 to-blue-500" },
    { label: "Emailed", value: certs.stats.emailed, icon: Mail, tone: "from-rose-500 to-pink-500" }
  ];

  const printCertificate = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  return (
    <div className={dark ? "certificate-dark -m-3 rounded-[2rem] bg-slate-950 p-3 text-white sm:-m-4 sm:p-4 lg:-m-6 lg:p-6" : ""}>
      <div className="grid gap-4">
        <Card className={`overflow-hidden p-6 ${dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  Finalized Results Ready
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Socket.io live</span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">JWT secured</span>
              </div>
              <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Certificate Management</h2>
              <p className={`mt-4 max-w-3xl text-sm leading-7 ${dark ? "text-white/65" : "text-slate-600"}`}>
                Generate branded certificates after results are finalized, track delivery, verify credentials by QR, and export PDFs or ZIP archives from one realtime workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Light" : "Dark"}</Button>
              <Button variant="secondary" onClick={certs.generateIndividual}><FileText className="h-4 w-4" /> Individual</Button>
              <Button onClick={certs.generateBatch}><Sparkles className="h-4 w-4" /> Generate Batch</Button>
            </div>
          </div>
          <div className="mt-6">
            <div className={`mb-2 flex justify-between text-xs font-black uppercase tracking-[0.18em] ${dark ? "text-white/55" : "text-slate-400"}`}>
              <span>Batch generation progress</span>
              <span>{certs.progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/50">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400" animate={{ width: `${certs.progress}%` }} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {statCards.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className={`relative overflow-hidden ${dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.tone} opacity-25 blur-xl`} />
                <stat.icon className="h-5 w-5 text-indigo-500" />
                <p className={`mt-4 text-xs font-black uppercase tracking-[0.16em] ${dark ? "text-white/45" : "text-slate-400"}`}>{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <CertificatePreview certificate={active} dark={dark} onDownload={() => certs.downloadPdf(active)} onPrint={printCertificate} onEmail={() => certs.emailCertificate(active)} />
          <Card className={dark ? "border-white/10 bg-white/10 text-white" : ""}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Generation Analytics</h3>
                <p className={`mt-1 text-sm ${dark ? "text-white/55" : "text-slate-500"}`}>Certificate creation and download velocity.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={certs.downloadZip}><FileArchive className="h-4 w-4" /> ZIP</Button>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={certs.stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#ffffff22" : "#e2e8f0"} />
                  <XAxis dataKey="name" stroke={dark ? "#ffffff88" : "#64748b"} />
                  <YAxis stroke={dark ? "#ffffff88" : "#64748b"} />
                  <Tooltip />
                  <Bar dataKey="generated" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="downloads" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className={`overflow-hidden p-0 ${dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
          <div className="grid gap-3 border-b border-white/60 p-4 lg:grid-cols-[1fr_220px_180px_140px]">
            <div className={`flex h-12 items-center gap-2 rounded-2xl px-4 ${dark ? "bg-white/10" : "bg-white/70"}`}>
              <Search className="h-4 w-4 text-slate-400" />
              <input value={certs.search} onChange={(event) => { certs.setPage(1); certs.setSearch(event.target.value); }} placeholder="Search student, team, event, certificate ID" className="w-full bg-transparent text-sm font-semibold outline-none" />
            </div>
            <select value={certs.category} onChange={(event) => { certs.setPage(1); certs.setCategory(event.target.value as CertificateCategory | "All"); }} className={`h-12 rounded-2xl px-4 text-sm font-bold outline-none ${dark ? "bg-slate-900 text-white" : "bg-white/70 text-slate-900"}`}>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <select value={certs.sort} onChange={(event) => certs.setSort(event.target.value as "newest" | "name")} className={`h-12 rounded-2xl px-4 text-sm font-bold outline-none ${dark ? "bg-slate-900 text-white" : "bg-white/70 text-slate-900"}`}>
              <option value="newest">Newest first</option>
              <option value="name">Student A-Z</option>
            </select>
            <Button variant="secondary" onClick={certs.refresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </div>

          {certs.loading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className={dark ? "text-white/45" : "text-slate-500"}>
                  <tr>
                    <th className="px-4 py-3">Recipient</th>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Email</th>
                    <th>Downloads</th>
                    <th>Certificate ID</th>
                    <th className="text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.certificates.map((certificate) => (
                    <tr key={certificate.id} onClick={() => setSelected(certificate)} className={`cursor-pointer border-t ${dark ? "border-white/10 hover:bg-white/10" : "border-slate-200/70 hover:bg-white/70"}`}>
                      <td className="px-4 py-4"><p className="font-black">{certificate.recipientName}</p><p className={dark ? "text-white/45" : "text-slate-500"}>{certificate.teamName || certificate.recipientEmail}</p></td>
                      <td>{certificate.eventName}</td>
                      <td><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{certificate.category}</span></td>
                      <td><EmailStatusPill status={certificate.emailStatus} /></td>
                      <td>{certificate.downloadCount}</td>
                      <td className="font-mono text-xs font-black">{certificate.certificateId}</td>
                      <td className="pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); certs.downloadPdf(certificate); }}><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); certs.emailCertificate(certificate); }}><Mail className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm font-bold ${dark ? "text-white/50" : "text-slate-500"}`}>Page {certs.page} of {totalPages} · {certs.total} certificates</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={certs.page === 1} onClick={() => certs.setPage(certs.page - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={certs.page === totalPages} onClick={() => certs.setPage(certs.page + 1)}>Next</Button>
            </div>
          </div>
        </Card>

        <Card className={dark ? "border-white/10 bg-white/10 text-white" : ""}>
          <h3 className="text-lg font-black">Certificate History</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {active.history.slice(0, 4).map((entry) => (
              <div key={`${entry.action}-${entry.at}`} className={dark ? "rounded-2xl bg-white/10 p-4" : "rounded-2xl bg-white/70 p-4"}>
                <p className="font-black">{entry.action}</p>
                <p className={dark ? "mt-1 text-sm text-white/50" : "mt-1 text-sm text-slate-500"}>{new Date(entry.at).toLocaleString()}</p>
                <p className={dark ? "mt-2 text-sm text-white/65" : "mt-2 text-sm text-slate-600"}>{entry.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CertificatePreview({ certificate, dark, onDownload, onPrint, onEmail }: { certificate: CertificateItem; dark: boolean; onDownload: () => void; onPrint: () => void; onEmail: () => void }) {
  return (
    <Card className={`overflow-hidden ${dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Live Certificate Preview</h3>
          <p className={dark ? "mt-1 text-sm text-white/55" : "mt-1 text-sm text-slate-500"}>Event-branded PDF with QR verification.</p>
        </div>
        <QrCode className="h-7 w-7 text-indigo-500" />
      </div>

      <motion.div layout className="mt-6 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-6 text-slate-950 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-500">Campus Hackathon Manager</p>
            <h4 className="mt-4 text-3xl font-black">Certificate of Achievement</h4>
          </div>
          <div className="grid h-20 w-20 grid-cols-5 gap-1 rounded-2xl bg-white p-2 shadow-inner">
            {Array.from({ length: 25 }).map((_, index) => <span key={index} className={(index % 2 === 0 || index % 7 === 0) ? "rounded-sm bg-slate-950" : "rounded-sm bg-slate-100"} />)}
          </div>
        </div>
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
        <p className="text-sm font-bold text-slate-500">Presented to</p>
        <h5 className="mt-2 text-4xl font-black tracking-tight">{certificate.recipientName}</h5>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
          For earning <b>{certificate.award}</b> in <b>{certificate.eventName}</b>{certificate.teamName ? ` with ${certificate.teamName}` : ""}.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <PreviewMeta label="Certificate ID" value={certificate.certificateId} />
          <PreviewMeta label="Category" value={certificate.category} />
          <PreviewMeta label="Issued" value={new Date(certificate.issuedAt).toLocaleDateString()} />
        </div>
      </motion.div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Button onClick={onDownload}><Download className="h-4 w-4" /> PDF</Button>
        <Button variant="secondary" onClick={onPrint}><Printer className="h-4 w-4" /> Print</Button>
        <Button variant="secondary" onClick={onEmail}><Mail className="h-4 w-4" /> Email</Button>
      </div>
    </Card>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function EmailStatusPill({ status }: { status: string }) {
  const tone = status === "Sent" ? "bg-emerald-100 text-emerald-700" : status === "Failed" ? "bg-rose-100 text-rose-700" : status === "Sending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function CalendarBoard() {
  const calendar = useEventCalendar();
  const [draft, setDraft] = useState({
    title: "Demo Session",
    type: "Demo Session" as CalendarEventType,
    startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    location: "Microsoft Teams Room",
    mentors: "Dr. Asha Rao",
    judges: "Kabir Mehta",
    color: "#4f46e5"
  });
  const views: Array<{ id: CalendarView; label: string }> = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "agenda", label: "Agenda" }
  ];
  const stats = [
    { label: "Today's Events", value: calendar.stats.today, icon: CalendarDays, tone: "from-indigo-500 to-sky-500" },
    { label: "Upcoming", value: calendar.stats.upcoming, icon: Clock3, tone: "from-cyan-500 to-blue-500" },
    { label: "Ongoing", value: calendar.stats.ongoing, icon: Radio, tone: "from-emerald-500 to-teal-400" },
    { label: "Missed", value: calendar.stats.missed, icon: XCircle, tone: "from-rose-500 to-pink-500" }
  ];
  const selectedLabel = calendar.selectedDate.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" });
  const nextCountdown = formatCountdown(calendar.nextEvent?.startsAt);

  const shiftDate = (days: number) => {
    const date = new Date(calendar.selectedDate);
    date.setDate(date.getDate() + days);
    calendar.setSelectedDate(date);
  };

  const createEvent = () => {
    calendar.createCustomEvent({
      title: draft.title,
      description: "Created from the live event console.",
      type: draft.type,
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt).toISOString(),
      location: draft.location,
      color: draft.color,
      mentors: draft.mentors.split(",").map((item) => item.trim()).filter(Boolean),
      judges: draft.judges.split(",").map((item) => item.trim()).filter(Boolean)
    });
  };

  return (
    <div className={calendar.dark ? "calendar-dark -m-3 rounded-[2rem] bg-slate-950 p-3 text-white sm:-m-4 sm:p-4 lg:-m-6 lg:p-6" : ""}>
      <div className="grid gap-4">
        <Card className={`overflow-hidden p-6 ${calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white"><CalendarClock className="h-3.5 w-3.5" /> Live Scheduler</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Socket.io synced</span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{nextCountdown}</span>
              </div>
              <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Event Management Calendar</h2>
              <p className={`mt-4 max-w-3xl text-sm leading-7 ${calendar.dark ? "text-white/65" : "text-slate-600"}`}>
                Plan hackathon milestones, mentor meetings, judging sessions, deadlines, and personal RSVPs with live updates across every connected dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => calendar.setDark(!calendar.dark)}>{calendar.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {calendar.dark ? "Light" : "Dark"}</Button>
              <Button variant="secondary" onClick={calendar.downloadSchedule}><DownloadCloud className="h-4 w-4" /> Schedule</Button>
              <Button onClick={calendar.createSampleEvent}><Plus className="h-4 w-4" /> Quick Event</Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className={`relative overflow-hidden ${calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.tone} opacity-25 blur-xl`} />
                <stat.icon className="h-5 w-5 text-indigo-500" />
                <p className={`mt-4 text-xs font-black uppercase tracking-[0.16em] ${calendar.dark ? "text-white/45" : "text-slate-400"}`}>{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card className={`overflow-hidden p-0 ${calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
            <div className="flex flex-col gap-3 border-b border-white/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {views.map((view) => (
                  <button key={view.id} onClick={() => calendar.setView(view.id)} className={`rounded-2xl px-4 py-2 text-sm font-black transition ${calendar.view === view.id ? "bg-slate-950 text-white shadow-glow" : calendar.dark ? "bg-white/10 text-white/70 hover:bg-white/15" : "bg-white/70 text-slate-600 hover:bg-white"}`}>
                    {view.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => shiftDate(calendar.view === "month" ? -30 : -7)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="min-w-44 text-center text-sm font-black">{selectedLabel}</span>
                <Button variant="secondary" size="sm" onClick={() => shiftDate(calendar.view === "month" ? 30 : 7)}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="secondary" size="sm" onClick={calendar.refresh}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-white/60 p-4 lg:grid-cols-[1fr_260px]">
              <div className={`flex h-12 items-center gap-2 rounded-2xl px-4 ${calendar.dark ? "bg-white/10" : "bg-white/70"}`}>
                <Search className="h-4 w-4 text-slate-400" />
                <input value={calendar.search} onChange={(event) => calendar.setSearch(event.target.value)} placeholder="Search events, locations, teams" className="w-full bg-transparent text-sm font-semibold outline-none" />
              </div>
              <select value={calendar.typeFilter} onChange={(event) => calendar.setTypeFilter(event.target.value as CalendarEventType | "All")} className={`h-12 rounded-2xl px-4 text-sm font-bold outline-none ${calendar.dark ? "bg-slate-900 text-white" : "bg-white/70 text-slate-900"}`}>
                <option>All</option>
                {eventTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            <div className="p-4">
              {calendar.loading ? (
                <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>
              ) : calendar.events.length === 0 ? (
                <div className={`rounded-3xl p-10 text-center ${calendar.dark ? "bg-white/10" : "bg-white/70"}`}>
                  <CalendarDays className="mx-auto h-10 w-10 text-indigo-500" />
                  <h3 className="mt-4 text-xl font-black">No events scheduled</h3>
                  <p className={calendar.dark ? "mt-2 text-sm text-white/55" : "mt-2 text-sm text-slate-500"}>Create a new event or adjust filters.</p>
                </div>
              ) : (
                <CalendarViewPanel calendar={calendar} />
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className={calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Admin Console</h3>
                <Edit3 className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="mt-4 space-y-3">
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Event title" />
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as CalendarEventType })} className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-bold text-slate-900 outline-none">
                  {eventTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
                <Input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} />
                <Input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} />
                <Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Location" />
                <Input value={draft.mentors} onChange={(event) => setDraft({ ...draft, mentors: event.target.value })} placeholder="Mentors" />
                <Input value={draft.judges} onChange={(event) => setDraft({ ...draft, judges: event.target.value })} placeholder="Judges" />
                <div className="flex gap-2">
                  {["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((color) => (
                    <button key={color} onClick={() => setDraft({ ...draft, color })} className={`h-8 w-8 rounded-full ring-offset-2 ${draft.color === color ? "ring-2 ring-slate-950" : ""}`} style={{ backgroundColor: color }} aria-label={`Use ${color}`} />
                  ))}
                </div>
                <Button className="w-full" onClick={createEvent}><CalendarPlus className="h-4 w-4" /> Add Event</Button>
              </div>
            </Card>

            <Card className={calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <h3 className="text-lg font-black">Next Deadline</h3>
              {calendar.stats.nextDeadline ? <EventCard event={calendar.stats.nextDeadline} compact dark={calendar.dark} onRsvp={calendar.rsvp} onCancel={calendar.cancel} onDelete={calendar.deleteCalendarEvent} onMove={calendar.updateEventTime} /> : <p className="mt-3 text-sm text-slate-500">No upcoming deadlines.</p>}
            </Card>

            <Card className={calendar.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <h3 className="text-lg font-black">Recent Activity</h3>
              <div className="mt-4 space-y-3">
                {calendar.stats.recentActivity.map((event) => (
                  <div key={event.id} className={calendar.dark ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-white/70 p-3"}>
                    <p className="font-black">{event.title}</p>
                    <p className={calendar.dark ? "text-sm text-white/50" : "text-sm text-slate-500"}>{event.status} · {formatTimeRange(event)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarViewPanel({ calendar }: { calendar: ReturnType<typeof useEventCalendar> }) {
  if (calendar.view === "agenda") {
    return <div className="space-y-3">{calendar.events.map((event) => <EventCard key={event.id} event={event} dark={calendar.dark} onRsvp={calendar.rsvp} onCancel={calendar.cancel} onDelete={calendar.deleteCalendarEvent} onMove={calendar.updateEventTime} />)}</div>;
  }

  if (calendar.view === "day") {
    const events = calendar.events.filter((event) => isSameDay(new Date(event.startsAt), calendar.selectedDate));
    return (
      <DropDay date={calendar.selectedDate} calendar={calendar} className="min-h-[520px] rounded-3xl border border-dashed border-indigo-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">{calendar.selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h3>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{events.length} events</span>
        </div>
        <div className="space-y-3">
          {events.map((event) => <EventCard key={event.id} event={event} dark={calendar.dark} onRsvp={calendar.rsvp} onCancel={calendar.cancel} onDelete={calendar.deleteCalendarEvent} onMove={calendar.updateEventTime} />)}
        </div>
      </DropDay>
    );
  }

  if (calendar.view === "week") {
    return (
      <div className="grid gap-3 lg:grid-cols-7">
        {weekDays(calendar.selectedDate).map((date) => {
          const dayEvents = calendar.events.filter((event) => isSameDay(new Date(event.startsAt), date));
          return (
            <DropDay key={date.toISOString()} date={date} calendar={calendar} className={`min-h-64 rounded-3xl p-3 ${calendar.dark ? "bg-white/10" : "bg-white/60"}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{date.toLocaleDateString("en-IN", { weekday: "short" })}</p>
              <p className="mt-1 text-2xl font-black">{date.getDate()}</p>
              <div className="mt-3 space-y-2">
                {dayEvents.map((event) => <MiniEvent key={event.id} event={event} calendar={calendar} />)}
              </div>
            </DropDay>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {monthDays(calendar.selectedDate).map((date) => {
        const dayEvents = calendar.events.filter((event) => isSameDay(new Date(event.startsAt), date));
        return (
          <DropDay key={date.toISOString()} date={date} calendar={calendar} className={`min-h-32 rounded-2xl p-3 ${date.getMonth() === calendar.selectedDate.getMonth() ? calendar.dark ? "bg-white/10" : "bg-white/70" : calendar.dark ? "bg-white/5" : "bg-slate-100/70"}`}>
            <p className="text-sm font-black">{date.getDate()}</p>
            <div className="mt-2 space-y-1">
              {dayEvents.slice(0, 3).map((event) => <MiniEvent key={event.id} event={event} calendar={calendar} tiny />)}
              {dayEvents.length > 3 && <p className="text-xs font-black text-indigo-500">+{dayEvents.length - 3} more</p>}
            </div>
          </DropDay>
        );
      })}
    </div>
  );
}

function DropDay({ date, calendar, className, children }: { date: Date; calendar: ReturnType<typeof useEventCalendar>; className: string; children: React.ReactNode }) {
  return (
    <div
      className={className}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(dropEvent) => {
        const eventId = dropEvent.dataTransfer.getData("event-id");
        const found = calendar.events.find((event) => event.id === eventId);
        if (!found) return;
        const current = new Date(found.startsAt);
        const next = new Date(date);
        next.setHours(current.getHours(), current.getMinutes(), 0, 0);
        const minutes = Math.round((next.getTime() - current.getTime()) / 60_000);
        calendar.updateEventTime(found, minutes);
      }}
    >
      {children}
    </div>
  );
}

function MiniEvent({ event, calendar, tiny = false }: { event: CalendarEvent; calendar: ReturnType<typeof useEventCalendar>; tiny?: boolean }) {
  return (
    <button
      draggable
      onDragStart={(dragEvent) => dragEvent.dataTransfer.setData("event-id", event.id)}
      onDoubleClick={() => calendar.updateEventTime(event, 30)}
      className={`w-full rounded-xl p-2 text-left text-white shadow-sm transition hover:-translate-y-0.5 ${tiny ? "text-[11px]" : "text-xs"}`}
      style={{ backgroundColor: event.status === "Cancelled" ? "#64748b" : event.color }}
    >
      <p className="truncate font-black">{event.title}</p>
      {!tiny && <p className="mt-1 truncate opacity-80">{formatTimeRange(event)}</p>}
    </button>
  );
}

function EventCard({ event, dark, compact = false, onRsvp, onCancel, onDelete, onMove }: { event: CalendarEvent; dark: boolean; compact?: boolean; onRsvp: (event: CalendarEvent) => void; onCancel: (event: CalendarEvent) => void; onDelete: (event: CalendarEvent) => void; onMove: (event: CalendarEvent, minutes: number) => void }) {
  const statusTone = event.status === "Ongoing" ? "bg-emerald-100 text-emerald-700" : event.status === "Cancelled" ? "bg-rose-100 text-rose-700" : event.status === "Completed" ? "bg-slate-100 text-slate-600" : "bg-indigo-100 text-indigo-700";
  return (
    <motion.div layout draggable onDragStart={(dragEvent: any) => dragEvent.dataTransfer.setData("event-id", event.id)} className={`rounded-3xl border p-4 ${dark ? "border-white/10 bg-white/10" : "border-white/70 bg-white/75"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1 h-12 w-2 rounded-full" style={{ backgroundColor: event.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone}`}>{event.status}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{event.type}</span>
          </div>
          <h3 className="mt-3 text-lg font-black">{event.title}</h3>
          {!compact && <p className={dark ? "mt-2 text-sm leading-6 text-white/60" : "mt-2 text-sm leading-6 text-slate-600"}>{event.description}</p>}
          <div className={`mt-3 grid gap-2 text-sm ${compact ? "" : "sm:grid-cols-2"}`}>
            <span className="inline-flex items-center gap-2 font-bold"><Clock3 className="h-4 w-4 text-indigo-500" /> {formatTimeRange(event)}</span>
            <span className="inline-flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-indigo-500" /> {event.location}</span>
            <span className="inline-flex items-center gap-2 font-bold"><UsersRound className="h-4 w-4 text-indigo-500" /> {event.rsvpCount} RSVP</span>
            <span className="inline-flex items-center gap-2 font-bold"><UserCheck className="h-4 w-4 text-indigo-500" /> {[...event.mentors, ...event.judges].slice(0, 2).join(", ") || "Open"}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onRsvp(event)}><UserCheck className="h-4 w-4" /> RSVP</Button>
        <Button size="sm" variant="secondary" onClick={() => onMove(event, 30)}><Edit3 className="h-4 w-4" /> +30m</Button>
        <Button size="sm" variant="secondary" onClick={() => onCancel(event)}><XCircle className="h-4 w-4" /> Cancel</Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(event)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </motion.div>
  );
}

function weekDays(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function formatTimeRange(event: CalendarEvent) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatCountdown(value?: string) {
  if (!value) return "No deadline";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Live now";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m to next event`;
}

function AIPanel() {
  const live = useLiveOps();
  return <Card className="lg:col-span-3"><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div><Bot className="h-10 w-10 text-indigo-600" /><h3 className="mt-4 text-2xl font-black">AI Project Copilot</h3><div className="mt-5 space-y-2">{aiPrompts.map((p) => <button key={p} onClick={() => { toast.success("AI response generated"); live.publishAnnouncement("Live AI Assistant", "AI generated project feedback for Neural Nexus"); }} className="w-full rounded-2xl bg-white/70 p-4 text-left text-sm font-bold transition hover:bg-white">{p}</button>)}</div></div><div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-sm font-bold text-indigo-200">Generated feedback</p><p className="mt-4 leading-7 text-white/76">Your project has a strong campus relevance and clear implementation path. Improve the pitch by quantifying safety outcomes, adding a fallback plan for low-connectivity areas, and showing a concise architecture diagram during the demo.</p><Skeleton className="mt-5 h-24 bg-white/10" /></div></div></Card>;
}

function QRPanel() {
  const attendance = useQRAttendance();
  const [raw, setRaw] = useState("CHM:Live-Participant:Campus-Builders:Student:CSE");
  const [manual, setManual] = useState({ name: "Manual Participant", team: "Campus Builders", role: "Student" as AttendanceRole, department: "CSE" });
  const stats = [
    { label: "Total Registered", value: attendance.stats.totalRegistered, icon: UsersRound, tone: "from-indigo-500 to-sky-500" },
    { label: "Present", value: attendance.stats.present, icon: CheckCircle2, tone: "from-emerald-500 to-teal-400" },
    { label: "Absent", value: attendance.stats.absent, icon: XCircle, tone: "from-rose-500 to-pink-500" },
    { label: "Late", value: attendance.stats.late, icon: Clock3, tone: "from-amber-500 to-orange-400" },
    { label: "Checked Out", value: attendance.stats.checkedOut, icon: LogOut, tone: "from-violet-500 to-fuchsia-500" },
    { label: "Attendance", value: `${attendance.stats.attendancePercentage}%`, icon: TrendingUp, tone: "from-cyan-500 to-blue-500" }
  ];

  return (
    <div className={attendance.dark ? "qr-dark -m-3 rounded-[2rem] bg-slate-950 p-3 text-white sm:-m-4 sm:p-4 lg:-m-6 lg:p-6" : ""}>
      <div className="grid gap-4">
        <Card className={`overflow-hidden p-6 ${attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white"><QrCode className="h-3.5 w-3.5" /> Realtime QR Gate</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{attendance.stats.liveActiveParticipants} active now</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${navigator.onLine ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>{navigator.onLine ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {attendance.offlineCount} offline queued</span>
              </div>
              <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">QR Attendance Control</h2>
              <p className={`mt-4 max-w-3xl text-sm leading-7 ${attendance.dark ? "text-white/65" : "text-slate-600"}`}>
                Scan QR badges, prevent duplicate entries, sync offline scans, check participants out, and watch every admin screen update instantly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => attendance.setDark(!attendance.dark)}>{attendance.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {attendance.dark ? "Light" : "Dark"}</Button>
              <Button variant="secondary" onClick={attendance.exportCsv}><FileSpreadsheet className="h-4 w-4" /> Export CSV</Button>
              <Button variant="secondary" onClick={attendance.syncOffline} disabled={!attendance.offlineCount}><Wifi className="h-4 w-4" /> Sync Offline</Button>
              <Button onClick={attendance.refresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className={`relative overflow-hidden ${attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.tone} opacity-25 blur-xl`} />
                <stat.icon className="h-5 w-5 text-indigo-500" />
                <p className={`mt-4 text-xs font-black uppercase tracking-[0.16em] ${attendance.dark ? "text-white/45" : "text-slate-400"}`}>{stat.label}</p>
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
          <div className="space-y-4">
            <Card className={`overflow-hidden ${attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">Live Scanner</h3>
                  <p className={attendance.dark ? "mt-1 text-sm text-white/50" : "mt-1 text-sm text-slate-500"}>Webcam QR scan with instant validation.</p>
                </div>
                <ScanState state={attendance.scannerState} />
              </div>
              <div className={`mt-5 overflow-hidden rounded-[2rem] border ${attendance.scannerState === "success" ? "border-emerald-300" : attendance.scannerState === "error" || attendance.scannerState === "duplicate" ? "border-rose-300" : "border-white/70"} bg-slate-950 p-3`}>
                <video ref={attendance.videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-3xl object-cover" />
                <div className="grid grid-cols-5 gap-2 p-6">
                  {Array.from({ length: 75 }).map((_, index) => <span key={index} className={`aspect-square rounded ${index % 3 === 0 || index % 7 === 0 ? "bg-white" : "bg-white/10"}`} />)}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" onClick={attendance.startCamera}><Camera className="h-4 w-4" /> Camera</Button>
                <Button onClick={attendance.detectFromCamera}><ScanLine className="h-4 w-4" /> Scan Frame</Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Input value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="QR payload" />
                <Button onClick={() => attendance.scanRaw(raw)}><QrCode className="h-4 w-4" /></Button>
              </div>
              <Button className="mt-3 w-full" variant="ghost" onClick={attendance.stopCamera}>Stop Camera</Button>
            </Card>

            <Card className={attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <h3 className="text-lg font-black">Manual Attendance</h3>
              <div className="mt-4 space-y-3">
                <Input value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} placeholder="Participant name" />
                <Input value={manual.team} onChange={(event) => setManual({ ...manual, team: event.target.value })} placeholder="Team" />
                <select value={manual.role} onChange={(event) => setManual({ ...manual, role: event.target.value as AttendanceRole })} className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-bold text-slate-900 outline-none">
                  {(["Student", "Mentor", "Judge", "Admin"] as const).map((role) => <option key={role}>{role}</option>)}
                </select>
                <Input value={manual.department} onChange={(event) => setManual({ ...manual, department: event.target.value })} placeholder="Department" />
                <Button className="w-full" onClick={() => attendance.manualAttendance(manual)}><UserCheck className="h-4 w-4" /> Add Manual Entry</Button>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className={attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <h3 className="text-lg font-black">Last Scanned Participant</h3>
              {attendance.lastScanned ? <ParticipantCard record={attendance.lastScanned} dark={attendance.dark} onCheckout={attendance.checkout} /> : <p className="mt-3 text-sm text-slate-500">No participant scanned yet.</p>}
            </Card>

            <Card className={attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px]">
                <div className={`flex h-12 items-center gap-2 rounded-2xl px-4 ${attendance.dark ? "bg-white/10" : "bg-white/70"}`}>
                  <Search className="h-4 w-4 text-slate-400" />
                  <input value={attendance.search} onChange={(event) => attendance.setSearch(event.target.value)} placeholder="Search name, QR, team, department" className="w-full bg-transparent text-sm font-semibold outline-none" />
                </div>
                <select value={attendance.role} onChange={(event) => attendance.setRole(event.target.value as AttendanceRole | "All")} className={`h-12 rounded-2xl px-4 text-sm font-bold outline-none ${attendance.dark ? "bg-slate-900 text-white" : "bg-white/70 text-slate-900"}`}>
                  <option>All</option><option>Student</option><option>Mentor</option><option>Judge</option><option>Admin</option>
                </select>
                <Input value={attendance.team} onChange={(event) => attendance.setTeam(event.target.value)} placeholder="Team" />
                <Input value={attendance.department} onChange={(event) => attendance.setDepartment(event.target.value)} placeholder="Department" />
              </div>
            </Card>

            <Card className={`overflow-hidden p-0 ${attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}`}>
              <div className="border-b border-white/60 p-4">
                <h3 className="text-lg font-black">Live Attendance Log</h3>
                <p className={attendance.dark ? "mt-1 text-sm text-white/50" : "mt-1 text-sm text-slate-500"}>Last scanned participants appear first on every connected admin screen.</p>
              </div>
              {attendance.loading ? (
                <div className="grid gap-3 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className={attendance.dark ? "text-white/45" : "text-slate-500"}>
                      <tr><th className="px-4 py-3">Participant</th><th>Role</th><th>Department</th><th>Check-in</th><th>Check-out</th><th>Status</th><th className="text-right pr-4">Action</th></tr>
                    </thead>
                    <tbody>
                      {attendance.rows.map((record) => <AttendanceRow key={record.id} record={record} dark={attendance.dark} onCheckout={attendance.checkout} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className={attendance.dark ? "border-white/10 bg-white/10 text-white" : ""}>
              <h3 className="text-lg font-black">Live Attendance Analytics</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendance.stats.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={attendance.dark ? "#ffffff22" : "#e2e8f0"} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="present" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="late" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanState({ state }: { state: string }) {
  const config = {
    idle: ["Ready", "bg-slate-100 text-slate-600"],
    scanning: ["Scanning", "bg-indigo-100 text-indigo-700"],
    success: ["Verified", "bg-emerald-100 text-emerald-700"],
    error: ["Invalid", "bg-rose-100 text-rose-700"],
    duplicate: ["Duplicate", "bg-amber-100 text-amber-700"]
  }[state] ?? ["Ready", "bg-slate-100 text-slate-600"];
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${config[1]}`}>{config[0]}</span>;
}

function ParticipantCard({ record, dark, onCheckout }: { record: AttendanceRecord; dark: boolean; onCheckout: (record: AttendanceRecord) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-3xl p-4 ${dark ? "bg-white/10" : "bg-white/70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black">{record.name}</p>
          <p className={dark ? "mt-1 text-sm text-white/55" : "mt-1 text-sm text-slate-500"}>{record.team} · {record.department}</p>
        </div>
        <AttendanceBadge status={record.status} checkedOut={Boolean(record.checkedOutAt)} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <InfoPill label="Role" value={record.role} />
        <InfoPill label="Check-in" value={record.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} />
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={() => onCheckout(record)} disabled={Boolean(record.checkedOutAt)}><LogOut className="h-4 w-4" /> Check Out</Button>
    </motion.div>
  );
}

function AttendanceRow({ record, dark, onCheckout }: { record: AttendanceRecord; dark: boolean; onCheckout: (record: AttendanceRecord) => void }) {
  return (
    <tr className={`border-t ${dark ? "border-white/10 hover:bg-white/10" : "border-slate-200/70 hover:bg-white/70"}`}>
      <td className="px-4 py-4"><p className="font-black">{record.name}</p><p className={dark ? "text-xs text-white/45" : "text-xs text-slate-500"}>{record.team || record.qrCode}</p></td>
      <td>{record.role}</td>
      <td>{record.department}</td>
      <td>{record.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
      <td>{record.checkedOutAt ? new Date(record.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
      <td><AttendanceBadge status={record.status} checkedOut={Boolean(record.checkedOutAt)} /></td>
      <td className="pr-4 text-right"><Button size="sm" variant="secondary" onClick={() => onCheckout(record)} disabled={Boolean(record.checkedOutAt)}><LogOut className="h-4 w-4" /></Button></td>
    </tr>
  );
}

function AttendanceBadge({ status, checkedOut }: { status: string; checkedOut: boolean }) {
  const tone = checkedOut ? "bg-violet-100 text-violet-700" : status === "Present" ? "bg-emerald-100 text-emerald-700" : status === "Late" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{checkedOut ? "Checked Out" : status}</span>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>;
}

function LiveActivityRail() {
  const live = useLiveOps();
  const toneClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700"
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">Live Activity</h3>
        <Activity className="h-5 w-5 text-indigo-600" />
      </div>
      <div className="mt-4 space-y-3">
        {live.activities.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white/70 p-4">
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${toneClasses[item.tone]}`}>{item.time}</span>
            <p className="mt-3 font-black">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProfilePanel() {
  return <Card className="lg:col-span-2"><div className="flex flex-col gap-5 sm:flex-row"><div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-600 to-cyan-400 text-3xl font-black text-white">AS</div><div><h3 className="text-2xl font-black">Ananya Sharma</h3><p className="mt-2 text-slate-500">Student lead at Neural Nexus. Focused on AI safety products for campus communities.</p><div className="mt-4 flex flex-wrap gap-2">{["React", "Node.js", "MongoDB", "AI/ML", "UX"].map((s) => <span key={s} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">{s}</span>)}</div></div></div></Card>;
}

function SettingsPanel() {
  return <Card className="lg:col-span-2"><div className="grid gap-4 sm:grid-cols-2"><Input defaultValue="Campus Hackathon Manager" /><Input defaultValue="Asia/Kolkata" /><Input defaultValue="notifications@campus.edu" /><Input defaultValue="https://campus-hackathon.local" /></div><div className="mt-6 space-y-3">{["Email notifications", "Two-factor authentication", "Auto-generate certificates", "Require QR check-in"].map((s) => <label key={s} className="flex items-center justify-between rounded-2xl bg-white/70 p-4 font-bold"><span>{s}</span><input type="checkbox" className="h-5 w-5 accent-indigo-600" defaultChecked /></label>)}</div></Card>;
}

function UserTable() {
  return <><h3 className="text-lg font-black">Users</h3><div className="mt-4 space-y-3">{users.map((u) => <div key={u.email} className="flex items-center justify-between rounded-2xl bg-white/70 p-4"><div><p className="font-black">{u.name}</p><p className="text-sm text-slate-500">{u.email}</p></div><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase text-indigo-700">{u.role}</span></div>)}</div></>;
}
