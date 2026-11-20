import { useEffect, useRef } from 'react';

// Minimal WYSIWYG editor (bold, italic, headings, lists, links) that stores HTML.
export default function RichText({ value, onChange }) {
  const el = useRef(null);
  useEffect(() => { if (el.current && el.current.innerHTML !== value) el.current.innerHTML = value || ''; }, [value]);
  const cmd = (c, arg) => { el.current.focus(); document.execCommand(c, false, arg); onChange(el.current.innerHTML); };
  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 9, overflow: 'hidden' }}>
      <div className="row" style={{ gap: 2, padding: '4px 6px', borderBottom: '1px solid var(--line)', background: '#FAFBFC' }}>
        {[['bold', 'B'], ['italic', 'I'], ['formatBlock', 'H2', 'h2'], ['formatBlock', 'P', 'p'], ['insertUnorderedList', 'List']].map(([c, l, a]) => (
          <button key={l} type="button" className="btn btn-sm" style={{ background: 'none', minHeight: 32, padding: '0 10px', color: 'var(--ink-2)' }} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd(c, a)}>{l}</button>
        ))}
        <button type="button" className="btn btn-sm" style={{ background: 'none', minHeight: 32, padding: '0 10px', color: 'var(--ink-2)' }} onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = window.prompt('Link URL'); if (u) cmd('createLink', u); }}>Link</button>
      </div>
      <div ref={el} className="prose" contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)} style={{ padding: 14, minHeight: 140, outline: 'none', fontSize: 14 }} />
    </div>
  );
}
