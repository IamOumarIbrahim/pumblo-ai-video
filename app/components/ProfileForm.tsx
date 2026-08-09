"use client";

import { useState } from "react";
import { ImageCropField } from "./ImageCropField";

type ProfileDraft = {
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  chatgptUrl: string;
  discordUrl: string;
  xUrl: string;
  githubUrl: string;
  youtubeUrl: string;
  avatarColor: string;
  avatarUrl: string;
  bannerUrl: string;
};

type MediaAction =
  | { action: "keep" }
  | { action: "upload"; blob: Blob }
  | { action: "delete" };

const colors = [
  "#b8ff3d",
  "#ff5f56",
  "#8f7cff",
  "#43d9ff",
  "#ffca3a",
  "#ff70a6",
];

export function ProfileForm({
  initial,
  suggestedName,
  nextPath,
}: {
  initial: ProfileDraft | null;
  suggestedName: string;
  nextPath: string | null;
}) {
  const [form, setForm] = useState<ProfileDraft>(
    initial ?? {
      handle: suggestedHandle(suggestedName),
      displayName: suggestedName,
      bio: "",
      location: "",
      website: "",
      chatgptUrl: "",
      discordUrl: "",
      xUrl: "",
      githubUrl: "",
      youtubeUrl: "",
      avatarColor: colors[0],
      avatarUrl: "",
      bannerUrl: "",
    },
  );
  const [avatarAction, setAvatarAction] = useState<MediaAction>({ action: "keep" });
  const [bannerAction, setBannerAction] = useState<MediaAction>({ action: "keep" });
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [bannerEditing, setBannerEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (avatarEditing || bannerEditing) {
      setError("Finish each open crop with “Use this crop” before saving.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: form.handle,
          displayName: form.displayName,
          bio: form.bio,
          location: form.location,
          website: form.website,
          chatgptUrl: form.chatgptUrl,
          discordUrl: form.discordUrl,
          xUrl: form.xUrl,
          githubUrl: form.githubUrl,
          youtubeUrl: form.youtubeUrl,
          avatarColor: form.avatarColor,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        profile?: { handle: string };
      };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Profile could not be saved.");
      }

      await saveMedia("avatar", avatarAction);
      await saveMedia("banner", bannerAction);
      window.location.assign(
        nextPath || (initial ? `/profile/${payload.profile.handle}` : "/upload?welcome=1"),
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profile could not be saved.");
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="profile-media-editor">
        <ImageCropField
          kind="banner"
          initialUrl={form.bannerUrl}
          onChange={setBannerAction}
          onEditingChange={setBannerEditing}
        />
        <ImageCropField
          kind="avatar"
          initialUrl={form.avatarUrl}
          onChange={setAvatarAction}
          onEditingChange={setAvatarEditing}
        />
      </div>

      <div className="form-split">
        <label>
          <span>Display name</span>
          <input
            required
            minLength={2}
            maxLength={50}
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            placeholder="Oumar Ibrahim"
          />
        </label>
        <label>
          <span>Channel handle</span>
          <div className="input-prefix">
            <b>@</b>
            <input
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]+"
              value={form.handle}
              onChange={(event) =>
                update(
                  "handle",
                  event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="oumar"
            />
          </div>
          <small>Lowercase letters, numbers, and underscores.</small>
        </label>
      </div>

      <fieldset className="profile-links-fieldset">
        <legend>Creator links <i>optional</i></legend>
        <p>
          Add the public places where viewers can find your work. These are links,
          not verified endorsements or additional sign-in methods.
        </p>
        <div className="form-split">
          <label>
            <span>ChatGPT or public GPT</span>
            <input
              type="url"
              maxLength={200}
              value={form.chatgptUrl}
              onChange={(event) => update("chatgptUrl", event.target.value)}
              placeholder="https://chatgpt.com/g/..."
            />
          </label>
          <label>
            <span>Discord</span>
            <input
              type="url"
              maxLength={200}
              value={form.discordUrl}
              onChange={(event) => update("discordUrl", event.target.value)}
              placeholder="https://discord.gg/..."
            />
          </label>
          <label>
            <span>X</span>
            <input
              type="url"
              maxLength={200}
              value={form.xUrl}
              onChange={(event) => update("xUrl", event.target.value)}
              placeholder="https://x.com/creator"
            />
          </label>
          <label>
            <span>GitHub</span>
            <input
              type="url"
              maxLength={200}
              value={form.githubUrl}
              onChange={(event) => update("githubUrl", event.target.value)}
              placeholder="https://github.com/creator"
            />
          </label>
          <label>
            <span>YouTube</span>
            <input
              type="url"
              maxLength={200}
              value={form.youtubeUrl}
              onChange={(event) => update("youtubeUrl", event.target.value)}
              placeholder="https://youtube.com/@creator"
            />
          </label>
        </div>
      </fieldset>

      <label>
        <span>Bio <i>optional</i></span>
        <textarea
          maxLength={280}
          rows={4}
          value={form.bio}
          onChange={(event) => update("bio", event.target.value)}
          placeholder="What do you make, and what are you exploring?"
        />
        <small>{form.bio.length}/280 · Clear this field and save to remove your bio.</small>
      </label>

      <div className="form-split">
        <label>
          <span>Location <i>optional</i></span>
          <input
            maxLength={60}
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Dubai, UAE"
          />
        </label>
        <label>
          <span>Website <i>optional</i></span>
          <input
            maxLength={160}
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
            placeholder="https://your-site.com"
          />
        </label>
      </div>

      <fieldset className="color-fieldset">
        <legend>Fallback profile color</legend>
        <div className="color-options">
          {colors.map((color) => (
            <button
              key={color}
              className={form.avatarColor === color ? "selected" : ""}
              style={{ backgroundColor: color }}
              type="button"
              aria-label={`Use ${color} as fallback profile color`}
              aria-pressed={form.avatarColor === color}
              onClick={() => update("avatarColor", color)}
            />
          ))}
        </div>
      </fieldset>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="button button-primary button-large" disabled={saving}>
          {saving ? "Saving profile…" : initial ? "Save profile" : "Create my Pumblo channel"}
        </button>
        <p>Your sign-in email stays private. Public fields and either image can be updated or removed later.</p>
      </div>
    </form>
  );
}

async function saveMedia(kind: "avatar" | "banner", action: MediaAction) {
  if (action.action === "keep") return;
  const response = await fetch(`/api/profile/media/${kind}`, {
    method: action.action === "delete" ? "DELETE" : "POST",
    headers:
      action.action === "upload"
        ? {
            "content-type": action.blob.type,
            "x-pumblo-size": String(action.blob.size),
          }
        : undefined,
    body: action.action === "upload" ? action.blob : undefined,
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `${kind} could not be saved.`);
}

function suggestedHandle(name: string): string {
  const value = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return value.length >= 3 ? value : "";
}
