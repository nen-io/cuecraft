import { Plus } from "lucide-react";
import { formatTimestamp, type CaptionDocument } from "../domain/captions";
interface Props {
  document: CaptionDocument;
  selectedId: string;
  activeId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}
export function CaptionList({
  document,
  selectedId,
  activeId,
  onSelect,
  onAdd,
}: Props) {
  return (
    <section className="caption-list panel" aria-label="Captions">
      <div className="section-line">
        <div>
          <span className="eyebrow">THE CAPTION TRACK</span>
          <h2>A little more meaning.</h2>
        </div>
        <span className="count">
          {document.cues.length.toString().padStart(2, "0")}
          <small>cues</small>
        </span>
      </div>
      <div className="list-items">
        {document.cues.length === 0 ? (
          <div className="empty-state">
            A clean track. Add your first sound description.
          </div>
        ) : (
          document.cues.map((cue, index) => (
            <button
              key={cue.id}
              className={`cue-row ${selectedId === cue.id ? "selected" : ""}`}
              aria-label={`Edit caption ${index + 1}`}
              aria-pressed={selectedId === cue.id}
              onClick={() => onSelect(cue.id)}
            >
              <span className="cue-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="cue-copy">
                <span className="cue-time">
                  {formatTimestamp(cue.startMs).slice(3)} <span>—</span>{" "}
                  {formatTimestamp(cue.endMs).slice(3)}
                </span>
                <span className="cue-text">{cue.text}</span>
              </span>
              <span
                className={`cue-indicator ${activeId === cue.id ? "is-active" : ""}`}
                aria-label={
                  activeId === cue.id ? "Currently playing" : undefined
                }
              />
            </button>
          ))
        )}
      </div>
      <button
        className="add-cue"
        onClick={onAdd}
        disabled={document.cues.length >= 100}
      >
        <Plus size={16} /> Add caption in next gap
      </button>
    </section>
  );
}
