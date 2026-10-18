import Link from "next/link";
import { Womby } from "@/components/Womby";

/** Womby + wordmark, linking home. */
export function Brand({ tagline = false }: { tagline?: boolean }) {
  return (
    <Link href="/" className="mk-brand" aria-label="Gut Feeling, home">
      <Womby pose="happy" size={56} />
      <span className="mk-brand-name">
        Gut Feeling
        {tagline && <span className="mk-brand-tag">Your gut has a lot to say.</span>}
      </span>
    </Link>
  );
}
