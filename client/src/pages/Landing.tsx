import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, ShieldCheck, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import hero from "../assets/hackathon-hero-premium.png";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { stats } from "../data/mock";

export function Landing() {
  return (
    <div className="min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#08111f]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(45,212,191,0.25),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(99,102,241,0.34),transparent_32%),radial-gradient(circle_at_72%_78%,rgba(16,185,129,0.18),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,17,31,0.35),rgba(15,23,42,0.72)_45%,rgba(4,47,46,0.42))]" />
        <div className="hero-grid absolute inset-0 opacity-45" />
        <motion.div
          aria-hidden="true"
          className="absolute left-[12%] top-[18%] h-72 w-72 rounded-full border border-cyan-300/20"
          animate={{ scale: [1, 1.18, 1], opacity: [0.28, 0.46, 0.28] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute bottom-[12%] right-[10%] h-96 w-96 rounded-full border border-indigo-300/20"
          animate={{ scale: [1.08, 0.92, 1.08], opacity: [0.18, 0.36, 0.18] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-3 font-extrabold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-indigo-700">CH</span>
          Campus Hackathon Manager
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/72 md:flex">
          <a href="#features">Features</a>
          <a href="#roles">Roles</a>
          <a href="#analytics">Analytics</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" className="text-white hover:bg-white/10">Login</Button></Link>
          <Link to="/signup"><Button>Get Started</Button></Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-10 px-5 pb-12 pt-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-5 top-8 -z-0 h-[78%] rounded-[3rem] border border-white/10 bg-white/[0.035] shadow-glass backdrop-blur-[1px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-100 shadow-sm backdrop-blur-xl">
            <Sparkles className="h-4 w-4" />
            Live campus hackathon command center
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
            Campus Hackathon Manager
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-cyan-50/78">
            A premium operating system for registrations, teams, mentors, judges, submissions, live scoring,
            certificates, QR attendance, analytics, and AI-powered project guidance.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/student"><Button size="lg" className="bg-white text-slate-950 hover:bg-cyan-50">Open Dashboard <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/ai"><Button variant="secondary" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/15"><PlayCircle className="h-4 w-4" /> Try AI Evaluator</Button></Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["Role-based access", "Live judging", "Signed certificates"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-bold text-white/82">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }} className="relative z-10">
          <motion.div
            aria-hidden="true"
            className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-cyan-400/20 via-indigo-500/18 to-emerald-400/16 blur-2xl"
            animate={{ opacity: [0.48, 0.78, 0.48], scale: [0.98, 1.03, 0.98] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden rounded-[2.25rem] border border-white/18 bg-white/8 p-2 shadow-glass backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-2 px-3 py-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">Live Ops Preview</span>
            </div>
            <img src={hero} alt="Campus hackathon dashboard command center" className="w-full rounded-[1.7rem]" />
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <Card className="absolute -bottom-7 left-6 right-6 grid grid-cols-2 gap-3 border-white/20 bg-slate-950/58 p-3 text-white backdrop-blur-2xl sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs font-semibold text-cyan-50/55">{stat.label}</p>
                <p className="mt-1 text-xl font-black">{stat.value}</p>
              </div>
            ))}
          </Card>
        </motion.div>
      </section>

      <section id="features" className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-3">
        {([
          ["Student journey", "Register, create teams, invite members, upload GitHub repos and demo videos.", Trophy],
          ["Mentor cockpit", "Assigned teams, meeting scheduler, feedback workflows, and project review queues.", ShieldCheck],
          ["AI advantage", "Generate ideas, evaluate submissions, create feedback, and answer participant questions.", Sparkles]
        ] satisfies [string, string, LucideIcon][]).map(([title, body, Icon]) => (
          <Card key={String(title)} className="border-white/12 bg-white/8 p-7 text-white backdrop-blur-xl">
            <Icon className="h-8 w-8 text-indigo-600" />
            <h3 className="mt-5 text-xl font-black">{title}</h3>
            <p className="mt-3 leading-7 text-cyan-50/66">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
