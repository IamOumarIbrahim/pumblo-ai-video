"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";

type NavItem = { href: string; label: string; exact?: boolean };

const discover: NavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/quicks", label: "Quicks" },
  { href: "/following", label: "Following" },
];

export function SidebarNav({
  signedIn,
  signInPath,
  profile,
  unreadNotifications,
}: {
  signedIn: boolean;
  signInPath: string;
  profile: {
    handle: string;
    displayName: string;
    avatarColor: string;
    avatarUrl: string;
  } | null;
  unreadNotifications: number;
}) {
  const pathname = usePathname();
  const accountItems: NavItem[] = [
    {
      href: profile ? `/profile/${profile.handle}` : "/settings/profile",
      label: profile ? "Your channel" : "Create channel",
    },
    { href: "/library", label: "Library" },
    {
      href: "/notifications",
      label: unreadNotifications ? `Notifications (${unreadNotifications})` : "Notifications",
    },
    { href: "/studio", label: "Creator studio", exact: true },
    { href: "/studio/series", label: "Series" },
    { href: "/upload", label: "Upload video" },
    ...(profile
      ? [{ href: "/settings/profile", label: "Edit profile" }]
      : []),
    ...(profile
      ? [{ href: "/settings", label: "Settings" }]
      : []),
    { href: "/about", label: "About Pumblo" },
  ];

  return (
    <aside className="side-nav" aria-label="Pumblo navigation">
      <nav>
        <div className="side-nav-group">
          <span className="side-nav-label">Discover</span>
          {discover.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {signedIn ? (
          <div className="side-nav-group side-account-group">
            <span className="side-nav-label">You</span>
            {profile ? (
              <Link className="side-profile" href={`/profile/${profile.handle}`}>
                <Avatar
                  name={profile.displayName}
                  color={profile.avatarColor}
                  src={profile.avatarUrl || undefined}
                  size="sm"
                />
                <span>
                  <strong>{profile.displayName}</strong>
                  <small>@{profile.handle}</small>
                </span>
              </Link>
            ) : null}
            {accountItems.map((item) => (
              <NavLink key={`${item.href}-${item.label}`} item={item} pathname={pathname} />
            ))}
          </div>
        ) : (
          <div className="side-signin">
            <strong>Join the conversation</strong>
            <p>Watch as a guest. Sign in with ChatGPT to upload, like, comment, and follow.</p>
            <Link className="button button-primary" href={signInPath}>Sign in with ChatGPT</Link>
          </div>
        )}
      </nav>
      <p className="side-nav-foot">AI video only · Open beta</p>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link className={active ? "side-nav-link active" : "side-nav-link"} href={item.href} aria-current={active ? "page" : undefined}>
      <span className="side-nav-text">{item.label}</span>
    </Link>
  );
}
