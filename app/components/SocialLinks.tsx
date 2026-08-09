import type { Profile, ProfileSettings } from "@/db";

type SocialProfile = Pick<
  Profile,
  "chatgptUrl" | "discordUrl" | "xUrl" | "githubUrl" | "youtubeUrl"
>;

type SocialSettings = Pick<
  ProfileSettings,
  | "showSocials"
  | "showChatgpt"
  | "showDiscord"
  | "showX"
  | "showGithub"
  | "showYoutube"
>;

export function SocialLinks({
  profile,
  settings,
  compact = false,
}: {
  profile: SocialProfile;
  settings: SocialSettings;
  compact?: boolean;
}) {
  if (!settings.showSocials) return null;
  const links = [
    settings.showChatgpt && profile.chatgptUrl
      ? { href: profile.chatgptUrl, label: "ChatGPT" }
      : null,
    settings.showDiscord && profile.discordUrl
      ? { href: profile.discordUrl, label: "Discord" }
      : null,
    settings.showX && profile.xUrl ? { href: profile.xUrl, label: "X" } : null,
    settings.showGithub && profile.githubUrl
      ? { href: profile.githubUrl, label: "GitHub" }
      : null,
    settings.showYoutube && profile.youtubeUrl
      ? { href: profile.youtubeUrl, label: "YouTube" }
      : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  if (!links.length) return null;
  return (
    <div
      className={`profile-socials${compact ? " compact" : ""}`}
      aria-label="Creator links"
    >
      {links.map((link) => (
        <a
          href={link.href}
          key={link.label}
          rel="nofollow ugc noreferrer"
          target="_blank"
        >
          {link.label} ↗
        </a>
      ))}
    </div>
  );
}
