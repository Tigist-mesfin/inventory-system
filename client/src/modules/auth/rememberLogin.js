const REMEMBER_KEY = "ims_remember_login";

export function loadRememberedLogin() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return { remember: true, username: "", password: "" };
    const data = JSON.parse(raw);
    return {
      remember: data.remember !== false,
      username: String(data.username || ""),
      password: String(data.password || ""),
    };
  } catch {
    return { remember: true, username: "", password: "" };
  }
}

export function saveRememberedLogin({ remember, username, password }) {
  try {
    if (!remember) {
      localStorage.removeItem(REMEMBER_KEY);
      return;
    }
    localStorage.setItem(
      REMEMBER_KEY,
      JSON.stringify({
        remember: true,
        username: String(username || "").trim(),
        password: String(password || ""),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
