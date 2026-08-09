import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator ranks",
  description: "How Pumblo's three transparent creator ranks work.",
};

const ranks = [
  {
    name: "Rising",
    className: "rank-rising",
    rule: "A new channel with fewer than three published videos.",
    purpose: "A clear starting point. No popularity, identity, or follower requirement.",
  },
  {
    name: "Active",
    className: "rank-active",
    rule: "Three or more published videos.",
    purpose: "Recognizes creators who have begun building a body of work.",
  },
  {
    name: "Storyteller",
    className: "rank-storyteller",
    rule: "At least one series with three consecutive numbered episodes, each 60 seconds or longer.",
    purpose: "Recognizes sustained, related publishing rather than one-off volume.",
  },
];

export default function RanksPage() {
  return (
    <main className="ranks-page">
      <header className="form-page-heading">
        <span className="section-kicker">Transparent creator ranks</span>
        <h1>Three ranks. Rules anyone can verify.</h1>
        <p>
          Ranks describe publishing structure only. They do not judge artistic
          quality, identity, follower count, likes, or popularity.
        </p>
      </header>
      <div className="rank-rule-grid">
        {ranks.map((rank, index) => (
          <article className={`rank-rule-card ${rank.className}`} key={rank.name}>
            <span>0{index + 1}</span>
            <strong>{rank.name}</strong>
            <h2>{rank.rule}</h2>
            <p>{rank.purpose}</p>
          </article>
        ))}
      </div>
      <section className="rank-integrity-note">
        <h2>How integrity is protected</h2>
        <p>
          Duplicate files and duplicate episode slots are rejected. Storyteller
          checks server-read runtime and consecutive episode numbers, so unrelated
          uploads cannot be relabeled as a series after the fact.
        </p>
      </section>
    </main>
  );
}
