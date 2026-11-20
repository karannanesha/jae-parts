import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase.js';

/** Live collection subscription. `constraints` = array of where/orderBy/limit; `key` re-subscribes when it changes. */
export function useLiveCollection(path, constraints = [], key = '') {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error(error); setState({ data: [], loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return state;
}

export function useLiveDoc(path, id) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!id) { setState({ data: null, loading: false, error: null }); return undefined; }
    return onSnapshot(doc(db, path, id),
      (snap) => setState({ data: snap.exists() ? { id: snap.id, ...snap.data() } : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }));
  }, [path, id]);
  return state;
}
