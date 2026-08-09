"use client";

import { useRef, useState } from "react";
import { isQuickDuration } from "@/app/lib/quicks";
import {
  MAX_OPTIMIZATION_SOURCE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/app/lib/limits";
import { formatDuration } from "@/app/lib/format";
import type { Series } from "@/db";

export function UploadForm({
  series,
  remainingBytes,
}: {
  series: Series[];
  remainingBytes: number;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [originalSizeBytes, setOriginalSizeBytes] = useState(0);
  const [seriesId, setSeriesId] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationNote, setOptimizationNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done">(
    "idle",
  );
  const [error, setError] = useState("");

  async function chooseFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError("");
    setProgress(0);
    setDurationSeconds(null);
    setOptimizationNote("");
    setOptimizationProgress(0);
    if (!nextFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    if (!["video/mp4", "video/webm"].includes(nextFile.type)) {
      setError("Use an MP4 or WebM video.");
      return;
    }
    if (nextFile.size > MAX_OPTIMIZATION_SOURCE_BYTES) {
      setError("Choose a source smaller than 200 MB.");
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setOriginalSizeBytes(nextFile.size);
    setPreviewUrl(nextPreviewUrl);
    try {
      setDurationSeconds(await readVideoDuration(nextPreviewUrl));
      if (nextFile.size > MAX_VIDEO_BYTES) {
        setOptimizationNote("This source is over 40 MB. Optimize it before publishing.");
      }
    } catch {
      setError("The browser could not read this video's duration. Export it as a browser-ready MP4 or WebM.");
      setFile(null);
      setPreviewUrl("");
      URL.revokeObjectURL(nextPreviewUrl);
    }
  }

  async function optimize() {
    if (!file || !durationSeconds) return;
    setOptimizing(true);
    setError("");
    setOptimizationNote("Optimizing locally. Nothing has been uploaded yet.");
    try {
      const optimized = await optimizeVideo(file, durationSeconds, setOptimizationProgress);
      if (!optimized || optimized.size >= file.size * 0.92) {
        setOptimizationNote("The original is already efficient, so Pumblo kept it unchanged.");
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const nextUrl = URL.createObjectURL(optimized);
        const nextDuration = await readVideoDuration(nextUrl);
        if (
          Math.abs(nextDuration - durationSeconds) >
          Math.max(1.5, durationSeconds * 0.02)
        ) {
          URL.revokeObjectURL(nextUrl);
          throw new Error("Optimized runtime changed");
        }
        setFile(optimized);
        setPreviewUrl(nextUrl);
        setDurationSeconds(nextDuration);
        setOptimizationNote(
          `Storage optimized: ${formatBytes(originalSizeBytes)} → ${formatBytes(optimized.size)} with the original runtime preserved.`,
        );
      }
    } catch {
      setOptimizationNote("This browser could not optimize the file safely. The original remains selected.");
    } finally {
      setOptimizing(false);
      setOptimizationProgress(0);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !durationSeconds) {
      setError("Choose a video before publishing.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES || file.size > remainingBytes) {
      setError(
        file.size > MAX_VIDEO_BYTES
          ? "Optimize this file below 40 MB before publishing."
          : "This file is larger than your remaining channel storage.",
      );
      return;
    }

    setError("");
    setPhase("uploading");
    const form = new FormData(event.currentTarget);
    const metadata = {
      title: field(form, "title"),
      description: field(form, "description"),
      generationTool: field(form, "generationTool"),
      generationMode: field(form, "generationMode"),
      category: field(form, "category"),
      license: field(form, "license"),
      prompt: field(form, "prompt"),
      aiDeclaration: field(form, "aiDeclaration"),
      sizeBytes: file.size,
      durationSeconds,
      seriesId: field(form, "seriesId"),
      seasonNumber: Number(field(form, "seasonNumber")) || 1,
      episodeNumber: Number(field(form, "episodeNumber")) || 0,
      sourceCreditUrl: field(form, "sourceCreditUrl"),
      originalSizeBytes: Math.max(originalSizeBytes, file.size),
    };

    const request = new XMLHttpRequest();
    request.open("POST", "/api/videos");
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader(
      "X-Pumblo-Metadata",
      encodeURIComponent(JSON.stringify(metadata)),
    );
    request.upload.addEventListener("progress", (progressEvent) => {
      if (progressEvent.lengthComputable) {
        setProgress(
          Math.min(96, Math.round((progressEvent.loaded / progressEvent.total) * 96)),
        );
      }
    });
    request.upload.addEventListener("load", () => {
      setPhase("saving");
      setProgress(98);
    });
    request.addEventListener("load", () => {
      let payload: { error?: string; video?: { id: string } } = {};
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = { error: "The upload returned an invalid response." };
      }

      if (request.status < 200 || request.status >= 300 || !payload.video) {
        setError(payload.error ?? "Upload failed. Please try again.");
        setPhase("idle");
        setProgress(0);
        return;
      }

      setPhase("done");
      setProgress(100);
      window.location.assign(`/watch/${payload.video.id}?uploaded=1`);
    });
    request.addEventListener("error", () => {
      setError("The upload was interrupted. Check your connection and retry.");
      setPhase("idle");
      setProgress(0);
    });
    request.send(file);
  }

  return (
    <form className="upload-form" onSubmit={submit}>
      <div
        className={file ? "dropzone has-file" : "dropzone"}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          chooseFile(event.dataTransfer.files[0] ?? null);
        }}
      >
        {previewUrl ? (
          <video src={previewUrl} controls playsInline />
        ) : (
          <button type="button" onClick={() => fileInput.current?.click()}>
            <span className="upload-glyph" aria-hidden="true">
              ↑
            </span>
            <strong>Drop your finished render here</strong>
            <small>or choose an MP4 / WebM file · maximum 40 MB</small>
          </button>
        )}
        <input
          ref={fileInput}
          hidden
          type="file"
          name="file"
          accept="video/mp4,video/webm"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="selected-file">
            <span>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
              {durationSeconds ? (
                <small>
                  {formatDuration(durationSeconds)} · {isQuickDuration(durationSeconds) ? "Eligible for Quicks" : "Standard video"}
                </small>
              ) : (
                <small>Reading duration…</small>
              )}
            </span>
            <button type="button" onClick={() => fileInput.current?.click()}>
              Replace
            </button>
          </div>
        ) : null}
      </div>

      {file && durationSeconds ? (
        <div className="optimizer-panel">
          <div>
            <strong>Smart storage optimizer</strong>
            <p>Re-encodes locally to WebM at a conservative bitrate, then keeps the result only when runtime is preserved and savings exceed 8%.</p>
          </div>
          <button className="button button-ghost" type="button" disabled={optimizing} onClick={() => void optimize()}>
            {optimizing ? `Optimizing ${optimizationProgress}%` : "Optimize file"}
          </button>
          {optimizationNote ? <small role="status">{optimizationNote}</small> : null}
        </div>
      ) : null}

      <div className="upload-recipe" aria-label="Upload checklist">
        <span>Before you publish</span>
        <p>
          Use a browser-ready H.264 MP4 or WebM, keep it below 40 MB, and make
          sure you have the right to share every element.
          Videos under 60 seconds also appear in Quicks automatically. Numbered
          series episodes at least 60 seconds can qualify toward Story Tier.
        </p>
      </div>

      <div className="upload-fields">
        <label className="full-field">
          <span>Title</span>
          <input
            required
            name="title"
            minLength={2}
            maxLength={100}
            placeholder="Give the video a memorable title"
          />
        </label>

        <label>
          <span>Series <i>optional</i></span>
          <select name="seriesId" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
            <option value="">Standalone video</option>
            {series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <small>{series.length ? "Numbered episodes appear together; episodes 60 seconds or longer can count toward Story Tier." : "Create a series in Studio before assigning an episode."}</small>
        </label>
        {seriesId ? (
          <div className="episode-number-fields">
            <label>
              <span>Season</span>
              <input required name="seasonNumber" type="number" min="1" max="99" defaultValue="1" />
            </label>
            <label>
              <span>Episode</span>
              <input required name="episodeNumber" type="number" min="1" max="999" defaultValue="1" />
            </label>
          </div>
        ) : null}
        <label className="full-field">
          <span>Description</span>
          <textarea
            name="description"
            rows={4}
            maxLength={1000}
            placeholder="What should viewers know before they press play?"
          />
        </label>
        <label className="full-field">
          <span>Source credit or inspiration link <i>optional</i></span>
          <input name="sourceCreditUrl" type="url" maxLength={300} placeholder="https://original-creator.example/work" />
          <small>Credit the work, reference, or collaborator that helped shape this video.</small>
        </label>

        <label>
          <span>Generation tool <i>optional</i></span>
          <input
            name="generationTool"
            maxLength={50}
            list="generation-tools"
            placeholder="Seedance, Runway, Veo, Kling…"
          />
          <datalist id="generation-tools">
            <option value="Seedance 2.0" />
            <option value="Sora" />
            <option value="Runway" />
            <option value="Veo" />
            <option value="Kling" />
            <option value="Pika" />
            <option value="Luma" />
            <option value="Adobe Firefly" />
            <option value="Hailuo" />
            <option value="Higgsfield" />
            <option value="PixVerse" />
            <option value="Wan" />
            <option value="Stable Video Diffusion" />
            <option value="Mochi" />
            <option value="Kaiber" />
            <option value="Krea" />
            <option value="Leonardo" />
            <option value="ComfyUI" />
          </datalist>
          <small>Choose a suggestion, type any custom pipeline, or leave this blank.</small>
        </label>
        <label>
          <span>Generation mode</span>
          <select name="generationMode" defaultValue="text-to-video">
            <option value="text-to-video">Text to video</option>
            <option value="image-to-video">Image to video</option>
            <option value="video-to-video">Video to video</option>
            <option value="audio-to-video">Audio to video</option>
            <option value="hybrid-workflow">Hybrid workflow</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select name="category" defaultValue="film">
            <option value="film">Film</option>
            <option value="animation">Animation</option>
            <option value="music">Music</option>
            <option value="education">Education</option>
            <option value="experimental">Experimental</option>
          </select>
        </label>
        <label>
          <span>License</span>
          <select name="license" defaultValue="all-rights-reserved">
            <option value="all-rights-reserved">All rights reserved</option>
            <option value="cc-by-4.0">CC BY 4.0</option>
            <option value="cc-by-nc-4.0">CC BY-NC 4.0</option>
            <option value="cc0">CC0 / public domain</option>
          </select>
        </label>

        <label className="full-field">
          <span>Prompt or process notes <i>optional</i></span>
          <textarea
            name="prompt"
            rows={3}
            maxLength={1500}
            placeholder="Share the prompt, image workflow, model settings, or editing process."
          />
        </label>
      </div>

      <label className="policy-check">
        <input required type="checkbox" name="aiDeclaration" value="yes" />
        <span>
          I confirm AI was a material part of this video’s production, I have the
          right to publish it, and the process details above are accurate.
        </span>
      </label>

      {phase !== "idle" ? (
        <div className="upload-progress" aria-live="polite">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>
            {phase === "uploading"
              ? `Uploading securely… ${progress}%`
              : phase === "saving"
                ? "Saving video details…"
                : "Published. Opening your video…"}
          </p>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="publish-row">
        <button
          className="button button-primary button-large"
          disabled={phase !== "idle" || optimizing}
        >
          {phase === "idle" ? "Publish video" : "Publishing…"}
        </button>
        <p>
          Videos are public immediately. Process information is optional and
          clearly labeled creator-declared.
        </p>
      </div>
    </form>
  );
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function readVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.removeAttribute("src");
      video.load();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Invalid duration"));
    };
    video.onerror = () => reject(new Error("Metadata could not be read"));
    video.src = url;
  });
}

async function optimizeVideo(
  file: File,
  durationSeconds: number,
  onProgress: (progress: number) => void,
): Promise<File | null> {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder unavailable");
  const mimeType = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("WebM optimization unavailable");

  const sourceUrl = URL.createObjectURL(file);
  const player = document.createElement("video") as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  player.src = sourceUrl;
  player.preload = "auto";
  player.playsInline = true;
  player.muted = true;
  player.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0";
  document.body.appendChild(player);

  try {
    await new Promise<void>((resolve, reject) => {
      player.onloadeddata = () => resolve();
      player.onerror = () => reject(new Error("Source could not be decoded"));
    });
    const capture = player.captureStream ?? player.mozCaptureStream;
    if (!capture) throw new Error("Stream capture unavailable");
    const stream = capture.call(player);
    const sourceBitrate = (file.size * 8) / Math.max(1, durationSeconds);
    const targetBitrate = Math.round(
      Math.max(700_000, Math.min(5_000_000, sourceBitrate * 0.76)),
    );
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: targetBitrate,
      audioBitsPerSecond: 128_000,
    });
    const output = await new Promise<Blob>((resolve, reject) => {
      const timer = window.setInterval(() => {
        onProgress(Math.min(99, Math.round((player.currentTime / durationSeconds) * 100)));
      }, 500);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        window.clearInterval(timer);
        reject(new Error("Optimization failed"));
      };
      recorder.onstop = () => {
        window.clearInterval(timer);
        onProgress(100);
        resolve(new Blob(chunks, { type: mimeType }));
      };
      player.onended = () => recorder.stop();
      recorder.start(1_000);
      void player.play().catch((error) => {
        recorder.stop();
        reject(error);
      });
    });
    if (!output.size) throw new Error("Empty optimized file");
    const base = file.name.replace(/\.[^.]+$/, "") || "pumblo-video";
    return new File([output], `${base}.optimized.webm`, { type: "video/webm" });
  } finally {
    player.pause();
    player.remove();
    URL.revokeObjectURL(sourceUrl);
  }
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
