const LAST_LIST_KEY = "sb_last_list";
const SCROLL_PREFIX = "sb_scroll:";

export function rememberLastList(url: string) {
  try {
    sessionStorage.setItem(LAST_LIST_KEY, url);
  } catch {
    // ignore
  }
}

export function getLastList(fallback = "/") {
  try {
    return sessionStorage.getItem(LAST_LIST_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveScroll(url: string) {
  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${url}`, String(window.scrollY ?? 0));
  } catch {
    // ignore
  }
}

export function restoreScroll(url: string) {
  try {
    const raw = sessionStorage.getItem(`${SCROLL_PREFIX}${url}`);
    const y = raw ? Number(raw) : NaN;
    if (Number.isFinite(y) && y >= 0) window.scrollTo(0, y);
  } catch {
    // ignore
  }
}