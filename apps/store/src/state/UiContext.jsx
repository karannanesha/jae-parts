import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSettings, getCategories } from '../lib/catalog.js';
import { DEFAULT_SETTINGS } from '@jae/shared/constants.js';

// Site-wide UI state: settings, category tree, toasts and which overlay is open.
const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState({ list: [], byId: new Map(), bySlug: new Map() });
  const [toast, setToast] = useState('');
  const [overlay, setOverlay] = useState(null); // 'enquiry' | { type: 'quickview', product }
  const timer = useRef();

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  return (
    <UiContext.Provider value={{ settings, categories, notify, overlay, setOverlay }}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </UiContext.Provider>
  );
}

export const useUi = () => useContext(UiContext);
