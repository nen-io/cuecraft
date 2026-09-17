# Scale and resource behavior

## Implemented limits

| Resource    | Bound                                  | Reason/overload behavior                                                                                                                  |
| ----------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Cues        | 100                                    | Keeps validation/rendering/selection simple; excess imports rejected and Add disabled                                                     |
| Cue text    | 500 UTF-16 code units                  | Bounds input/rendering/undo cost; editor caps entry and imports reject excess                                                             |
| Import      | 512 KiB UTF-8                          | Pre-read file limit plus codec byte check; rejection preserves committed state                                                            |
| Saved input | 512 KiB UTF-8                          | Bounds parsed persistence, accommodates ordinary max documents and Unicode overhead                                                       |
| History     | 40 past/future states                  | Fixed memory bound, old edits age out; playback never creates snapshots                                                                   |
| Audio       | One fixed 24-second 22,050 Hz mono WAV | No arbitrary audio decoding path; 529,200 decoded samples, approximately 2.02 MiB for a mono Float32 sample array before browser overhead |
| Waveform    | 180 bars                               | Fixed DOM/SVG cost independent of playback ticks                                                                                          |

The 512 KiB import envelope accommodates every valid 100-caption document: maximum text escaping is five bytes per UTF-16 code unit for a carriage-return reference, so 100 × 500 × 5 plus bounded timestamp/identifier overhead stays below the limit. Maximum escaping and multibyte round-trip tests cover this contract.

Validation clones and sorts N cues in O(N log N) time and O(N) document storage, followed by a linear overlap check. Active-cue lookup and first-gap addition are O(N). VTT parsing/export are linear in bounded text bytes plus document sorting. History retains up to 40 full document snapshots: O(H × document size); this favors transparent correctness over patch complexity at N ≤ 100. JSON equality on commit is linear in document size. React playback events cause re-renders at the native event rate, including waveform bars; there is no custom high-frequency tick.

Waveform generation scans S decoded samples in O(S) time and stores 180 peaks. Fetch bytes and decoded buffers coexist temporarily. Contexts close after decode. No unbounded media import or user-selectable resolution exists.

## Evidence limits

No throughput, latency percentile, memory profiler result or load-test capacity is claimed. Automated checks confirm functional resource limits, not benchmarked performance. Screenshot and functional browser tests run on the local macOS development host; they do not establish mobile hardware performance. The file-size/sample arithmetic above is model-based, not a measured process-memory total.

## At 10× the scope

For roughly 1,000 cues or multi-minute audio, first profile actual interactions. Replace full-history snapshots with validated reversible commands or structural sharing if memory becomes material; preserve atomic document validation and redo invalidation. Virtualize the caption list while retaining accessible selection navigation. Use binary search on sorted cue boundaries for active-cue lookup. Keep the media clock authoritative and isolate transport rendering from the editor. Decode/aggregate larger audio in a worker or precompute versioned peak data; tie peak cache keys to the exact media digest, not the filename.

## At 100× or collaborative scope

For long recordings and 10,000+ cues, use segmented media, chunked waveform summaries and paged/virtualized caption data. Input size and media duration limits must still fail explicitly. Worker isolation reduces main-thread stalls but is not a security sandbox. A real upload/transcription system would require an authenticated backend, per-user ownership checks, storage quotas, validated media types, malware/decoder-risk handling, cancellation and bounded job queues with idempotent job IDs. None is implemented here.

Collaborative editing changes the consistency model: replace last-writer-wins localStorage with a server revision/CAS protocol or a carefully designed CRDT. Persist cue identities and separate draft edits from committed revisions. Offline edits need conflict handling, not silent last-write overwrite. Caching media must include version/digest and privacy scope; invalidation follows asset replacement and deletion. These are staged redesigns triggered by measured needs, not claims about the current static demo.
