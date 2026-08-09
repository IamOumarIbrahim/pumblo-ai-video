"use client";

import { useState } from "react";
import type { Video } from "@/db";

type EditableVideo = Pick<
  Video,
  | "id"
  | "title"
  | "description"
  | "generationTool"
  | "generationMode"
  | "category"
  | "license"
  | "prompt"
  | "sourceCreditUrl"
>;

export function VideoEditForm({
  initial,
  profileHandle,
}: {
  initial: EditableVideo;
  profileHandle: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof EditableVideo, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/videos/${initial.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { video?: Video; error?: string };
    if (!response.ok || !payload.video) {
      setError(payload.error ?? "Video details could not be saved.");
      setSaving(false);
      return;
    }
    window.location.assign(`/profile/${profileHandle}?managed=1`);
  }

  return (
    <form className="upload-form video-edit-form" onSubmit={save}>
      <div className="upload-fields">
        <label className="full-field">
          <span>Title</span>
          <input required minLength={2} maxLength={100} value={form.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label className="full-field">
          <span>Description</span>
          <textarea rows={4} maxLength={1000} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </label>
        <label>
          <span>Generation tool <i>optional</i></span>
          <input maxLength={50} list="edit-generation-tools" value={form.generationTool === "Not specified" ? "" : form.generationTool} onChange={(event) => update("generationTool", event.target.value)} placeholder="Seedance, Runway, Veo, Kling…" />
          <datalist id="edit-generation-tools">
            <option value="Seedance 2.0" /><option value="Sora" /><option value="Runway" />
            <option value="Veo" /><option value="Kling" /><option value="Pika" />
            <option value="Luma" /><option value="ComfyUI" />
          </datalist>
        </label>
        <label>
          <span>Generation mode</span>
          <select value={form.generationMode} onChange={(event) => update("generationMode", event.target.value)}>
            <option value="text-to-video">Text to video</option>
            <option value="image-to-video">Image to video</option>
            <option value="video-to-video">Video to video</option>
            <option value="audio-to-video">Audio to video</option>
            <option value="hybrid-workflow">Hybrid workflow</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(event) => update("category", event.target.value)}>
            <option value="film">Film</option><option value="animation">Animation</option>
            <option value="music">Music</option><option value="education">Education</option>
            <option value="experimental">Experimental</option>
          </select>
        </label>
        <label>
          <span>License</span>
          <select value={form.license} onChange={(event) => update("license", event.target.value)}>
            <option value="all-rights-reserved">All rights reserved</option>
            <option value="cc-by-4.0">CC BY 4.0</option>
            <option value="cc-by-nc-4.0">CC BY-NC 4.0</option>
            <option value="cc0">CC0 / public domain</option>
          </select>
        </label>
        <label className="full-field">
          <span>Source credit or inspiration link <i>optional</i></span>
          <input type="url" maxLength={300} value={form.sourceCreditUrl} onChange={(event) => update("sourceCreditUrl", event.target.value)} />
        </label>
        <label className="full-field">
          <span>Prompt or process notes <i>optional</i></span>
          <textarea rows={4} maxLength={1500} value={form.prompt} onChange={(event) => update("prompt", event.target.value)} />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save video details"}</button>
        <a className="button button-ghost" href={`/profile/${profileHandle}`}>Cancel</a>
      </div>
    </form>
  );
}
