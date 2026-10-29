import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "./api";
import type { User } from "./types";
const C = createContext<any>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem("worksphere_token")) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem("worksphere_token"))
      .finally(() => setLoading(false));
  }, []);
  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("worksphere_token", data.token);
    setUser(data.user);
  }
  async function register(name: string, email: string, password: string) {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    localStorage.setItem("worksphere_token", data.token);
    setUser(data.user);
  }
  function logout() {
    localStorage.removeItem("worksphere_token");
    setUser(null);
  }
  return (
    <C.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </C.Provider>
  );
}
export function useAuth() {
  return useContext(C);
}
