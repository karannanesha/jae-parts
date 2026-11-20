import Icon from '@jae/shared/Icon.jsx';
import { useUi } from '../state/UiContext.jsx';
import EnquiryForm from './EnquiryForm.jsx';

export default function EnquiryModal() {
  const { overlay, setOverlay } = useUi();
  if (overlay !== 'enquiry') return null;
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOverlay(null)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="enq-title" style={{ padding: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 id="enq-title" style={{ fontSize: 22 }}>Enquire for bulk quantity</h2>
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>We reply within one working day.</div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOverlay(null)}><Icon name="close" size={18} /></button>
        </div>
        <EnquiryForm source="bulk" defaultSubject="Bulk / wholesale order" allowPhoto={false} />
      </div>
    </div>
  );
}
