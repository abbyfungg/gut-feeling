import Link from "next/link";
import { Brand } from "./Brand";

/** Top bar for public pages. `home` is the signed-in user's app, if any. */
export function PublicNav({ home, homeLabel, hideSignIn = false }: { home?: string | null; homeLabel?: string; hideSignIn?: boolean }) {
  return (
    <div className="mk-nav-wrap">
      <header className="mk-container mk-nav">
        <Brand />
        <nav className="mk-nav-links" aria-label="Main">
          <Link href="/privacy" className="btn btn-ghost mk-nav-quiet">
            Privacy
          </Link>
          {home ? (
            <Link href={home} className="btn btn-secondary">
              {homeLabel ?? "Open the app"}
            </Link>
          ) : (
            !hideSignIn && (
              <Link href="/signin" className="btn btn-secondary">
                Sign in
              </Link>
            )
          )}
        </nav>
      </header>
    </div>
  );
}
