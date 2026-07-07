import {
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileUp,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Medal,
  MessageSquareText,
  QrCode,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound
} from "lucide-react";

export type Role = "student" | "team" | "mentor" | "judge" | "admin";

export const navItems = [
  { label: "Student", path: "/student", icon: LayoutDashboard },
  { label: "Team", path: "/team", icon: UsersRound },
  { label: "Mentor", path: "/mentor", icon: GraduationCap },
  { label: "Judge", path: "/judge", icon: ClipboardCheck },
  { label: "Admin", path: "/admin", icon: ShieldCheck },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Submission", path: "/submission", icon: FileUp },
  { label: "Chat", path: "/chat", icon: MessageSquareText },
  { label: "Calendar", path: "/calendar", icon: CalendarDays },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "AI Assistant", path: "/ai", icon: Bot },
  { label: "QR Attendance", path: "/qr-attendance", icon: QrCode },
  { label: "Certificates", path: "/certificates", icon: Medal },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: UserRound },
  { label: "Settings", path: "/settings", icon: Settings }
];

export const stats = [
  { label: "Registered hackers", value: "1,284", delta: "+18.6%", tone: "from-indigo-500 to-blue-500" },
  { label: "Active teams", value: "214", delta: "+32", tone: "from-violet-500 to-fuchsia-500" },
  { label: "Submissions", value: "186", delta: "92% ready", tone: "from-sky-500 to-cyan-400" },
  { label: "Avg judge score", value: "87.4", delta: "+6.1", tone: "from-emerald-500 to-teal-400" }
];

export const timeline = [
  { time: "09:00", title: "Opening keynote", track: "Main Stage", status: "Live" },
  { time: "10:30", title: "Team formation sprint", track: "Collab Lab", status: "Upcoming" },
  { time: "14:00", title: "Mentor office hours", track: "Mentor Pods", status: "Open" },
  { time: "20:00", title: "Prototype checkpoint", track: "Submissions", status: "Critical" }
];

export const teams = [
  { name: "Neural Nexus", project: "AI campus safety companion", members: 4, progress: 86, mentor: "Dr. Asha Rao", score: 94 },
  { name: "Quantum Quills", project: "Smart lecture summarizer", members: 5, progress: 78, mentor: "Kabir Mehta", score: 91 },
  { name: "Pixel Pioneers", project: "AR lab simulator", members: 4, progress: 72, mentor: "Naina Kapoor", score: 89 },
  { name: "Cloud Catalysts", project: "Green hostel energy grid", members: 3, progress: 68, mentor: "Rohan Sen", score: 87 },
  { name: "Data Drifters", project: "Scholarship fraud detection", members: 5, progress: 63, mentor: "Meera Iyer", score: 84 }
];

export const analytics = [
  { name: "Mon", registrations: 124, submissions: 24, attendance: 82 },
  { name: "Tue", registrations: 168, submissions: 39, attendance: 88 },
  { name: "Wed", registrations: 226, submissions: 62, attendance: 91 },
  { name: "Thu", registrations: 318, submissions: 88, attendance: 94 },
  { name: "Fri", registrations: 448, submissions: 128, attendance: 97 },
  { name: "Sat", registrations: 1284, submissions: 186, attendance: 96 }
];

export const rubrics = [
  { label: "Innovation", score: 9.4 },
  { label: "Execution", score: 8.8 },
  { label: "Impact", score: 9.1 },
  { label: "Design", score: 8.9 },
  { label: "Pitch", score: 8.7 }
];

export const messages = [
  { from: "Ananya", text: "Prototype branch is deployed. Please review the QR attendance flow.", time: "2m" },
  { from: "Mentor", text: "Great progress. Tighten the problem statement before judging.", time: "16m" },
  { from: "Rishi", text: "I uploaded the demo video and updated the README.", time: "31m" },
  { from: "AI Assistant", text: "Suggested rubric improvement: add measurable campus impact metrics.", time: "44m" }
];

export const notifications = [
  { title: "Judge room changed", body: "Round 2 evaluations moved to Innovation Hall A.", type: "Critical" },
  { title: "Certificate batch ready", body: "214 participation certificates are generated and signed.", type: "Success" },
  { title: "Mentor request", body: "Neural Nexus requested a cloud architecture review.", type: "Action" },
  { title: "Submission deadline", body: "Final uploads close at 10:00 PM IST.", type: "Reminder" }
];

export const certificates = [
  { name: "Ananya Sharma", team: "Neural Nexus", award: "Winner", id: "CHM-2026-001" },
  { name: "Rishi Menon", team: "Quantum Quills", award: "Best AI Use", id: "CHM-2026-018" },
  { name: "Mehak Jain", team: "Pixel Pioneers", award: "Design Excellence", id: "CHM-2026-041" }
];

export const attendees = [
  { name: "Ananya Sharma", role: "Student", checkIn: "08:48", status: "Verified" },
  { name: "Dr. Asha Rao", role: "Mentor", checkIn: "08:36", status: "Verified" },
  { name: "Kabir Mehta", role: "Judge", checkIn: "09:05", status: "Manual review" },
  { name: "Naina Kapoor", role: "Admin", checkIn: "08:12", status: "Verified" }
];

export const users = [
  { name: "Ananya Sharma", email: "ananya@campus.edu", role: "student", status: "Active" },
  { name: "Dr. Asha Rao", email: "asha@campus.edu", role: "mentor", status: "Active" },
  { name: "Kabir Mehta", email: "kabir@campus.edu", role: "judge", status: "Invited" },
  { name: "Naina Kapoor", email: "naina@campus.edu", role: "admin", status: "Active" }
];

export const aiPrompts = [
  "Generate five AI project ideas for rural education.",
  "Evaluate this project pitch for innovation and feasibility.",
  "Write constructive mentor feedback for our prototype.",
  "Summarize judging comments into final team guidance."
];
