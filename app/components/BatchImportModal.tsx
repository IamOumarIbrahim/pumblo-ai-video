"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  MAX_PROFILE_VIDEO_BYTES,
  MAX_VIDEO_BYTES,
} from "@/app/lib/limits";

type ImportItem = {
  id: string;
  file: File;
  title: string;
  description: string;
  thumbnailUrl: string;
  durationSeconds: number;
  selected: boolean;
};

export function BatchImportModal({
  defaultOpen,
  profileHandle,
  remainingBytes,
  remainingSlots,
}: {
  defaultOpen: boolean;
  profileHandle: string;
  remainingBytes: number;
  remainingSlots: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultOpen && !dialog.current?.open) dialog.current?.showModal();
  }, [defaultOpen]);

  const selected = items.filter((item) => item.selected);
  const selectedBytes = selected.reduce((total, item) => total + item.file.size, 0);
  const usedBytes = MAX_PROFILE_VIDEO_BYTES - remainingBytes;
  const projectedBytes = usedBytes + selectedBytes;
  const overCapacity = selectedBytes > remainingBytes;
  const overSlots = selected.length > remainingSlots;

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const nextFiles = [...files];
    const invalid = nextFiles.find(
      (file) => !["video/mp4", "video/webm"].includes(file.type),
    );
    if (invalid) {
      setError(`${invalid.name} is not an MP4 or WebM video.`);
      return;
    }
    const oversized = nextFiles.find((file) => file.size > MAX_VIDEO_BYTES);
    if (oversized) {
      setError(`${oversized.name} is over the 40 MB per-video limit.`);
      return;
    }
    if (items.length + nextFiles.length > remainingSlots) {
      setError(`You have ${remainingSlots} upload slots available.`);
      return;
    }
    setStatus("Reading thumbnails and runtimes locally…");
    try {
      const prepared = await Promise.all(nextFiles.map(prepareImportItem));
      setItems((current) => [...current, ...prepared]);
      setStatus("");
    } catch {
      setError("One of these videos could not be read. Export it as a browser-ready MP4 or WebM.");
      setStatus("");
    } finally {
      if (picker.current) picker.current.value = "";
    }
  }

  function updateItem(id: string, update: Partial<ImportItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }

  async function importSelected() {
    if (!selected.length || overCapacity || overSlots || !rightsConfirmed) return;
    setPhase("uploading");
    setError("");
    setProgress(0);
    for (let index = 0; index < selected.length; index += 1) {
      const item = selected[index];
      setStatus(`Uploading ${index + 1} of ${selected.length}: ${item.title}`);
      try {
        await uploadItem(item, (itemProgress) => {
          setProgress(
            Math.round(((index + itemProgress / 100) / selected.length) * 100),
          );
        });
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "The import was interrupted.",
        );
        setStatus(`${index} of ${selected.length} videos imported. Reload before retrying.`);
        setPhase("idle");
        return;
      }
    }
    setProgress(100);
    setStatus(`${selected.length} ${selected.length === 1 ? "video" : "videos"} imported.`);
    setPhase("done");
  }

  return (
    <>
      <button
        className="button button-ghost"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        Import multiple videos
      </button>
      <dialog
        className="import-dialog"
        ref={dialog}
        onCancel={(event) => {
          if (phase === "uploading") event.preventDefault();
        }}
      >
        <div className="import-dialog-shell">
          {phase === "done" ? (
            <div className="import-complete">
              <span className="section-kicker">Import complete</span>
              <h2>Your videos are on Pumblo.</h2>
              <p>{status} Add generation tools, categories, and series details from your channel.</p>
              <div className="import-dialog-actions">
                <a className="button button-primary" href={`/profile/${profileHandle}?manage=1`}>
                  Edit videos
                </a>
                <button className="button button-ghost" type="button" onClick={() => window.location.reload()}>
                  Import more
                </button>
              </div>
            </div>
          ) : (
            <>
              <header className="import-dialog-heading">
                <div>
                  <span className="section-kicker">Fast channel setup</span>
                  <h2>Import your original video files.</h2>
                  <p>
                    Select one or several originals. Pumblo creates still-image
                    previews locally; nothing uploads until you confirm.
                  </p>
                </div>
                <button
                  aria-label="Close import dialog"
                  disabled={phase === "uploading"}
                  type="button"
                  onClick={() => dialog.current?.close()}
                >
                  Close
                </button>
              </header>

              <div className="import-provider-note">
                <strong>Why original files?</strong>
                <p>
                  This preserves quality and ownership. Pumblo does not download
                  or copy audiovisual files from another platform behind your back.
                </p>
              </div>

              <div className="import-capacity" aria-live="polite">
                <div>
                  <span>Projected channel storage</span>
                  <strong>
                    {formatBytes(projectedBytes)} / {formatBytes(MAX_PROFILE_VIDEO_BYTES)}
                  </strong>
                </div>
                <div className={overCapacity ? "capacity-track over" : "capacity-track"}>
                  <span
                    style={{
                      width: `${Math.min(100, (projectedBytes / MAX_PROFILE_VIDEO_BYTES) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {formatBytes(Math.max(0, remainingBytes - selectedBytes))} remaining · {selected.length} of {remainingSlots} available slots selected
                </small>
              </div>

              <input
                hidden
                multiple
                ref={picker}
                type="file"
                accept="video/mp4,video/webm"
                onChange={(event) => void chooseFiles(event.target.files)}
              />
              <button
                className="import-picker"
                type="button"
                disabled={phase === "uploading" || items.length >= remainingSlots}
                onClick={() => picker.current?.click()}
              >
                <strong>Choose MP4 or WebM originals</strong>
                <small>Up to 40 MB each · combined channel allowance 80 MB</small>
              </button>

              {items.length ? (
                <div className="import-list" aria-label="Videos ready to import">
                  {items.map((item) => (
                    <article className={item.selected ? "selected" : ""} key={item.id}>
                      <label className="import-select">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={phase === "uploading"}
                          onChange={(event) => updateItem(item.id, { selected: event.target.checked })}
                        />
                        <Image
                          src={item.thumbnailUrl}
                          alt={`Still preview for ${item.title}`}
                          width={480}
                          height={270}
                          unoptimized
                        />
                      </label>
                      <div>
                        <label>
                          <span>Title</span>
                          <input
                            required
                            minLength={2}
                            maxLength={100}
                            value={item.title}
                            disabled={phase === "uploading"}
                            onChange={(event) => updateItem(item.id, { title: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Description <i>optional</i></span>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            value={item.description}
                            disabled={phase === "uploading"}
                            onChange={(event) => updateItem(item.id, { description: event.target.value })}
                          />
                        </label>
                        <small>{formatBytes(item.file.size)} · {formatRuntime(item.durationSeconds)}</small>
                      </div>
                      <button
                        type="button"
                        disabled={phase === "uploading"}
                        onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {items.length ? (
                <label className="policy-check import-rights">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    disabled={phase === "uploading"}
                    onChange={(event) => setRightsConfirmed(event.target.checked)}
                  />
                  <span>
                    I confirm AI was material to these videos and I have the right
                    to publish each selected original.
                  </span>
                </label>
              ) : null}

              {phase === "uploading" ? (
                <div className="upload-progress" aria-live="polite">
                  <div><span style={{ width: `${progress}%` }} /></div>
                  <p>{status} · {progress}%</p>
                </div>
              ) : status ? <p className="form-status">{status}</p> : null}
              {overCapacity ? <p className="form-error">Remove a video to stay within 80 MB.</p> : null}
              {error ? <p className="form-error">{error}</p> : null}

              <div className="import-dialog-actions">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={
                    phase === "uploading" ||
                    !selected.length ||
                    overCapacity ||
                    overSlots ||
                    !rightsConfirmed ||
                    selected.some((item) => item.title.trim().length < 2)
                  }
                  onClick={() => void importSelected()}
                >
                  {phase === "uploading" ? "Importing…" : `Import ${selected.length || "selected"} ${selected.length === 1 ? "video" : "videos"}`}
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={phase === "uploading"}
                  onClick={() => dialog.current?.close()}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

async function prepareImportItem(file: File): Promise<ImportItem> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await eventOnce(video, "loadedmetadata");
    const durationSeconds = video.duration;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error();
    video.currentTime = Math.min(Math.max(0, durationSeconds * 0.12), 1);
    await eventOnce(video, "seeked");
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.fillStyle = "#0a0b0d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    return {
      id: crypto.randomUUID(),
      file,
      title: file.name.replace(/\.[^.]+$/, "").replaceAll(/[_-]+/g, " ").trim().slice(0, 100),
      description: "",
      thumbnailUrl: canvas.toDataURL("image/jpeg", 0.82),
      durationSeconds,
      selected: true,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function eventOnce(element: HTMLVideoElement, name: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video metadata could not be read"));
    };
    const cleanup = () => {
      element.removeEventListener(name, onSuccess);
      element.removeEventListener("error", onError);
    };
    element.addEventListener(name, onSuccess, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

function uploadItem(item: ImportItem, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/videos");
    request.setRequestHeader("Content-Type", item.file.type);
    request.setRequestHeader(
      "X-Pumblo-Metadata",
      encodeURIComponent(
        JSON.stringify({
          title: item.title.trim(),
          description: item.description.trim(),
          generationTool: "Not specified",
          generationMode: "hybrid-workflow",
          category: "film",
          license: "all-rights-reserved",
          prompt: "",
          aiDeclaration: "yes",
          sizeBytes: item.file.size,
          durationSeconds: item.durationSeconds,
          seriesId: "",
          seasonNumber: 1,
          episodeNumber: 0,
          sourceCreditUrl: "",
          originalSizeBytes: item.file.size,
        }),
      ),
    );
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 96));
    });
    request.addEventListener("load", () => {
      let payload: { video?: { id: string }; error?: string } = {};
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = { error: "The server returned an invalid response." };
      }
      if (request.status >= 200 && request.status < 300 && payload.video) {
        onProgress(100);
        resolve();
      } else reject(new Error(payload.error ?? "Video could not be imported."));
    });
    request.addEventListener("error", () => reject(new Error("Upload connection interrupted.")));
    request.send(item.file);
  });
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRuntime(seconds: number) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
