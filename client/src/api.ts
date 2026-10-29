import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
});
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("worksphere_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (e) =>
    Promise.reject(new Error(e.response?.data?.message || "Request failed")),
);
export default api;
