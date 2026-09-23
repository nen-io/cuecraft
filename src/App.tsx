import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AudioLines,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  activeCue,
  addCue,
  exportVtt,
  importVtt,
  MAX_IMPORT_BYTES,
  restoreDocument,
  sampleDocument,
  serializeDocument,
  STORAGE_KEY,
  updateCue,
  type CaptionDocument,
} from "./domain/captions";
import { createHistory, historyReducer } from "./domain/history";
import { AUDIO_URL, useMedia, type MediaController } from "./hooks/useMedia";
import { TimingOffset } from "./components/TimingOffset";
import { Transport } from "./components/Transport";
import { CueEditor } from "./components/CueEditor";
import { CaptionList } from "./components/CaptionList";
import { draftFor, matchesCue, type CueDraft } from "./domain/drafts";

function readInitial(durationMs: number) {
  const sample = sampleDocument(durationMs);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? {
          document: restoreDocument(raw, durationMs),
          remember: true,
          message: "Saved captions restored from this device.",
        }
      : { document: sample, remember: false, message: "" };
  } catch {
    return {
      document: sample,
      remember: false,
      message:
        "Saved edits could not be restored. The original sample is ready.",
    };
  }
}

function Studio({
  media,
  durationMs,
}: {
  media: MediaController;
  durationMs: number;
}) {
  const [initial] = useState(() => readInitial(durationMs));
  const [history, dispatch] = useReducer(
    historyReducer,
    initial.document,
    createHistory,
  );
  const [selectedId, setSelectedId] = useState(
    initial.document.cues[0]?.id ?? "",
  );
  const [remember, setRemember] = useState(initial.remember);
  const [notice, setNotice] = useState(initial.message);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [drafts, setDrafts] = useState<Map<string, CueDraft>>(() => new Map());
  const [inspectRequest, setInspectRequest] = useState(0);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const [deleteRequest, setDeleteRequest] = useState(0);
  useEffect(() => {
    if (!deleteRequest) return;
    const target =
      editorHeading.current ??
      window.document.getElementById("caption-track-heading");
    target?.focus();
  }, [deleteRequest]);
  const fileRef = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const importRequest = useRef(0);
  const document = history.present;
  const selected = document.cues.find((cue) => cue.id === selectedId);
  const active = activeCue(document, media.timeMs);
  const draftCount = drafts.size;

  useEffect(() => {
    if (!inspectRequest || !window.matchMedia("(max-width: 700px)").matches)
      return;
    editorHeading.current?.focus({ preventScroll: true });
    editorHeading.current?.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
  }, [inspectRequest]);

  const selectCue = (id: string) => {
    setSelectedId(id);
    setInspectRequest((value) => value + 1);
  };
  const discardDraft = (id: string) => {
    revision.current += 1;
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setError("");
    setNotice("Draft discarded. Saved caption restored.");
  };

  useEffect(() => {
    if (!remember) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeDocument(document));
    } catch {
      setNotice(
        "Device storage is unavailable or full. Edits remain in this session; export to keep them.",
      );
    }
  }, [document, remember]);
  useEffect(
    () => () => {
      importRequest.current += 1;
    },
    [],
  );

  const commit = (next: CaptionDocument, selection = selectedId) => {
    revision.current += 1;
    dispatch({ type: "commit", document: next });
    setSelectedId(
      next.cues.some((cue) => cue.id === selection)
        ? selection
        : (next.cues[0]?.id ?? ""),
    );
    setError("");
  };
  const moveHistory = (direction: "undo" | "redo") => {
    if (draftCount) return;
    revision.current += 1;
    const next = historyReducer(history, { type: direction });
    dispatch({ type: direction });
    setSelectedId(
      next.present.cues.some((cue) => cue.id === selectedId)
        ? selectedId
        : (next.present.cues[0]?.id ?? ""),
    );
    setError("");
    setNotice(
      direction === "undo" ? "Last change undone." : "Change restored.",
    );
  };
  const doImport = async (file: File) => {
    if (draftCount) {
      setError("Save or discard your caption drafts before importing a track.");
      return;
    }
    const request = ++importRequest.current;
    const startRevision = revision.current;
    setError("");
    setImporting(true);
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("WebVTT files must be 512 KiB or smaller.");
      const text = await file.text();
      if (request !== importRequest.current) return;
      if (revision.current !== startRevision)
        throw new Error(
          "Captions changed while the file was reading. Import the file again.",
        );
      const next = importVtt(text, durationMs);
      commit(next, next.cues[0]?.id ?? "");
      setNotice(
        `Imported ${next.cues.length} captions. Undo restores the previous track.`,
      );
    } catch (cause) {
      if (request === importRequest.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "This file could not be read.",
        );
    } finally {
      if (request === importRequest.current) setImporting(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportVtt(document)], { type: "text/vtt;charset=utf-8" }),
    );
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "small-hours.vtt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      draftCount
        ? "Saved captions exported. Unsaved drafts are not included."
        : "WebVTT exported. Your audio file is unchanged.",
    );
  };
  return (
    <>
      <div className="studio-toolbar">
        <span className="local-badge">
          <span /> A PRIVATE LITTLE STUDIO
        </span>
        <div className="file-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".vtt,text/vtt"
            hidden
            aria-label="Import WebVTT file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void doImport(file);
            }}
          />
          <button
            className="secondary"
            disabled={importing || draftCount > 0}
            onClick={() => fileRef.current?.click()}
          >
            <ArrowUpFromLine size={16} />{" "}
            {importing ? "Reading…" : "Import VTT"}
          </button>
          <button className="dark-button" onClick={download}>
            <ArrowDownToLine size={16} /> Export VTT
          </button>
        </div>
      </div>
      <div className="workspace-help">
        <p>
          Listen, choose a caption, then edit and Save. Undo restores saved
          changes.
        </p>
        <a
          href={selected ? "#caption-editor-heading" : "#caption-track-heading"}
        >
          {selected ? "Jump to caption editor" : "Jump to caption track"}
        </a>
        <details>
          <summary>Keyboard and timing help</summary>
          <p>
            Tab moves between controls. Enter activates buttons. Arrow keys seek
            when the waveform is focused; Space plays or pauses when focus is
            outside a control. Time fields use
            hours:minutes:seconds.milliseconds. Export includes saved captions
            only.
          </p>
        </details>
      </div>
      <Transport
        media={media}
        document={document}
        selectedId={selectedId}
        onSelect={selectCue}
      />
      <div className="edit-toolbar">
        <p>
          <strong>Your track, your timing.</strong> Saved changes are
          reversible.
        </p>
        <div>
          <button
            className="icon-button"
            aria-label="Undo"
            disabled={!history.past.length || draftCount > 0}
            onClick={() => moveHistory("undo")}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo"
            disabled={!history.future.length || draftCount > 0}
            onClick={() => moveHistory("redo")}
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>
      {draftCount > 0 && (
        <p className="draft-summary" aria-live="polite">
          <strong>
            {draftCount} unsaved {draftCount === 1 ? "draft" : "drafts"}.
          </strong>{" "}
          Save or discard before import, undo or reset. Export includes saved
          captions only.
        </p>
      )}
      {error && (
        <p className="inline-error global-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-notice global-message" role="status">
          {notice}
        </p>
      )}
      <div className="workspace">
        <CaptionList
          document={document}
          selectedId={selectedId}
          activeId={active?.id}
          onSelect={selectCue}
          draftIds={new Set(drafts.keys())}
          onAdd={() => {
            try {
              const id = `cue-${crypto.randomUUID()}`;
              commit(addCue(document, id), id);
              setInspectRequest((value) => value + 1);
              setNotice("A new caption was added in the first available gap.");
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not add a caption.",
              );
            }
          }}
        />
        {selected ? (
          <CueEditor
            key={selected.id}
            cue={selected}
            index={document.cues.indexOf(selected)}
            onSave={(cue) => {
              commit(updateCue(document, cue));
              discardDraft(cue.id);
              setNotice("Caption saved.");
            }}
            draft={drafts.get(selected.id) ?? draftFor(selected)}
            dirty={drafts.has(selected.id)}
            onChange={(draft) => {
              // A newer form edit owns the session even before it becomes a document commit.
              revision.current += 1;
              setError("");
              setNotice("");
              setDrafts((current) => {
                const next = new Map(current);
                if (matchesCue(draft, selected)) next.delete(selected.id);
                else next.set(selected.id, draft);
                return next;
              });
            }}
            onDiscard={() => discardDraft(selected.id)}
            timeMs={media.timeMs}
            readPlayhead={() =>
              Math.max(
                0,
                Math.min(
                  durationMs,
                  Math.round((media.audioRef.current?.currentTime ?? 0) * 1000),
                ),
              )
            }
            canUsePlayhead={!media.error}
            headingRef={editorHeading}
            onBack={() => {
              const heading = window.document.getElementById(
                "caption-track-heading",
              );
              heading?.focus({ preventScroll: true });
              heading?.scrollIntoView({ block: "start", behavior: "instant" });
            }}
            onDelete={(id) => {
              commit({
                ...document,
                cues: document.cues.filter((cue) => cue.id !== id),
              });
              setNotice("Caption deleted. Undo can bring it back.");
              setDeleteRequest((value) => value + 1);
            }}
          />
        ) : (
          <section className="editor panel empty-state">
            <h2>A fresh start.</h2>
            <p>Add a caption to begin shaping the track.</p>
          </section>
        )}
      </div>
      <TimingOffset
        document={document}
        selectedId={selectedId}
        hasDrafts={draftCount > 0}
        onCommit={(next, message) => {
          commit(next);
          setNotice(message);
        }}
      />
      <div className="storage-bar">
        <label>
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => {
              const enabled = event.target.checked;
              setRemember(enabled);
              if (!enabled) {
                try {
                  localStorage.removeItem(STORAGE_KEY);
                  setNotice(
                    "Device saving is off. Existing saved edits were removed.",
                  );
                } catch {
                  setNotice(
                    "Device saving is off, but saved edits could not be removed. Check your browser storage settings.",
                  );
                }
              }
            }}
          />{" "}
          Remember edits on this device
        </label>
        <button
          className="text-button"
          disabled={draftCount > 0}
          onClick={() => {
            commit(sampleDocument(durationMs), "intro");
            setNotice("Original sample captions restored. You can undo this.");
          }}
        >
          <RotateCcw size={14} /> Reset to sample
        </button>
      </div>
    </>
  );
}

export default function App() {
  const media = useMedia();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest(
          'input, textarea, select, button, a, summary, [contenteditable="true"]',
        )
      )
        return;
      event.preventDefault();
      void media.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.toggle]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <audio ref={media.audioRef} src={AUDIO_URL} preload="auto" />
      <header className="site-header">
        <a href="./" className="brand" aria-label="Cuecraft home">
          <span className="brand-mark">
            <AudioLines size={22} />
          </span>
          cuecraft<span className="brand-period">.</span>
        </a>
        <span className="header-note">THE SOUND IS ONLY HALF THE STORY.</span>
        <span className="edition">STUDIO / 001</span>
      </header>
      <main id="workspace" tabIndex={-1}>
        <section className="project-heading">
          <div>
            <div className="eyebrow">AUDIO CAPTION STUDIO</div>
            <h1>
              Small hours<span className="title-period">.</span>
            </h1>
            <p>A melody worth putting into words.</p>
          </div>
          <div className="asset-description">
            <span className="asset-icon">
              <AudioLines size={22} />
            </span>
            <div>
              <strong>Original synthetic tone composition</strong>
              <span>Descriptive captions · No speech recognition</span>
            </div>
          </div>
        </section>
        {media.durationMs === null ? (
          <>
            <Transport media={media} />
            <div className="loading-workspace panel" role="status">
              The caption studio opens when the audio duration is known.
            </div>
          </>
        ) : (
          <Studio media={media} durationMs={media.durationMs} />
        )}
      </main>
      <footer>
        <span>Made for careful listening.</span>
        <span>Local audio. Real timing. Open format.</span>
        <nav className="reviewer-links" aria-label="Project resources">
          <a href="https://github.com/nen-io/cuecraft">Source</a>
          <a href="https://github.com/nen-io/cuecraft/blob/main/docs/REVIEWER_GUIDE.md">
            Engineering walkthrough
          </a>
        </nav>
      </footer>
    </div>
  );
}
