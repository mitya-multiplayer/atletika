// Hash routing: works on any static host without server rewrites.

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path, query: new URLSearchParams(search) };
}

let state = $state(parse());

window.addEventListener('hashchange', () => {
  state = parse();
  window.scrollTo(0, 0);
});

export const router = {
  get path() {
    return state.path;
  },
  get query() {
    return state.query;
  },
};

/** `replace` swaps the current history entry, so Back skips the page we are leaving. */
export function navigate(to: string, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', '#' + to);
    state = parse();
    window.scrollTo(0, 0);
  } else {
    location.hash = to;
  }
}

/** Matches "/days/:dayId" against "/days/abc" → { dayId: "abc" }. */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  const have = path.split('/').filter(Boolean);
  if (want.length !== have.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(have[i]);
    else if (want[i] !== have[i]) return null;
  }
  return params;
}
