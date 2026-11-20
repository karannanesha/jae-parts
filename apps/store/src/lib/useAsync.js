import { useEffect, useState } from 'react';

/** Runs an async loader when deps change; returns { data, error, loading }. */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => {
        console.error(error);
        if (alive) setState({ data: undefined, error, loading: false });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Sets <title> and meta description for SEO on client-rendered pages. */
export function useSeo(title, description) {
  useEffect(() => {
    if (title) document.title = `${title} | Jay Ambe Enterprises`;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) { tag = document.createElement('meta'); tag.name = 'description'; document.head.appendChild(tag); }
      tag.content = description;
    }
  }, [title, description]);
}
