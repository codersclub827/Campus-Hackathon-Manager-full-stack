import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { apiUrl, saveAuth, type AuthUser, type UserRole } from "../lib/auth";

export function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your command center" : "Reset your password";
  const action = mode === "login" ? "Sign in securely" : mode === "signup" ? "Create account" : "Send reset link";

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/45 shadow-glass backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr]">
        <div className="dark-glass hidden min-h-[650px] flex-col justify-between rounded-[2.25rem] p-8 text-white lg:flex">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/80">
            <ArrowLeft className="h-4 w-4" />
            Back to product
          </Link>
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-indigo-600">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-black leading-tight">Run the entire hackathon from one elegant workspace.</h1>
            <p className="mt-5 text-lg leading-8 text-white/66">
              Authentication, role-based dashboards, live evaluation, AI feedback, QR attendance, and certificates are unified here.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["JWT", "Socket.io", "MongoDB"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 p-4 text-center text-sm font-bold">{item}</div>
            ))}
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <Card className="mx-auto max-w-md p-6 sm:p-8">
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                {mode === "forgot" ? <Mail className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
              </div>
              <h2 className="text-3xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "forgot" ? "Enter your registered email to receive a secure reset link." : "Use the demo experience or connect the backend to your MongoDB cluster."}
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const endpoint = mode === "forgot" ? "/api/auth/forgot-password" : `/api/auth/${mode}`;
                const payload =
                  mode === "signup"
                    ? {
                        name: String(form.get("name")),
                        email: String(form.get("email")),
                        password: String(form.get("password")),
                        role: String(form.get("role")).toLowerCase() as UserRole
                      }
                    : mode === "login"
                      ? { email: String(form.get("email")), password: String(form.get("password")) }
                      : { email: String(form.get("email")) };

                setLoading(true);
                try {
                  const response = await fetch(apiUrl(endpoint), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.message ?? "Authentication failed");

                  if (mode === "forgot") {
                    toast.success("Password reset email queued");
                    return;
                  }

                  saveAuth(data.token, data.user as AuthUser);
                  toast.success("Signed in", { description: "Realtime notifications are now authenticated." });
                  navigate(`/${data.user.role}`);
                } catch (error) {
                  toast.error(action, { description: error instanceof Error ? error.message : "Please try again." });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {mode === "signup" && <Input name="name" placeholder="Full name" autoComplete="name" required />}
              <Input name="email" placeholder="Email address" type="email" autoComplete="email" defaultValue={location.state?.email ?? ""} required />
              {mode !== "forgot" && <Input name="password" placeholder="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />}
              {mode === "signup" && (
                <select name="role" className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-4 text-sm outline-none">
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="judge">Judge</option>
                  <option value="admin">Admin</option>
                </select>
              )}
              <Button className="w-full" size="lg" disabled={loading}>{loading ? "Working..." : action}</Button>
            </form>
            <div className="mt-6 flex justify-between text-sm font-semibold text-slate-500">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create account" : "Have an account?"}</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
