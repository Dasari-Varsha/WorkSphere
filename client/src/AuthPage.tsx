import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Boxes, ArrowRight } from "lucide-react";
import { useAuth } from "./auth";
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const reg = mode === "register",
    { login, register } = useAuth(),
    nav = useNavigate();
  const [name, SN] = useState(""),
    [email, SE] = useState(""),
    [password, SP] = useState(""),
    [error, ER] = useState(""),
    [busy, B] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    B(true);
    ER("");
    try {
      if (reg) await register(name, email, password);
      else await login(email, password);
      nav("/");
    } catch (e) {
      ER(e instanceof Error ? e.message : "Unable to continue");
    } finally {
      B(false);
    }
  }
  return (
    <div className="auth">
      <section className="auth-art">
        <div className="brand">
          <Boxes /> worksphere<span>.</span>
        </div>
        <div>
          <small>WORK BETTER, TOGETHER</small>
          <h1>
            Great work
            <br />
            happens <em>in sync.</em>
          </h1>
          <p>
            Bring projects, tasks and team conversations into one shared space.
          </p>
        </div>
        <small>One team. One shared workspace.</small>
      </section>
      <section className="auth-form-wrap">
        <form onSubmit={submit}>
          <small>{reg ? "GET STARTED" : "WELCOME BACK"}</small>
          <h2>{reg ? "Create your account" : "Sign in to WorkSphere"}</h2>
          <p>
            {reg
              ? "Set up your account to start collaborating."
              : "Your team workspace is waiting for you."}
          </p>
          {error && <div className="alert">{error}</div>}
          {reg && (
            <label>
              Full name
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => SN(e.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => SE(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => SP(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <button className="primary">
            {busy ? "Please wait…" : reg ? "Create account" : "Sign in"}{" "}
            <ArrowRight size={16} />
          </button>
          <p className="switch">
            {reg ? "Already have an account?" : "New to WorkSphere?"}{" "}
            <Link to={reg ? "/login" : "/register"}>
              {reg ? "Sign in" : "Create account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
