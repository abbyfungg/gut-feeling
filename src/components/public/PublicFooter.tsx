import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-inner">
        <p>Gut Feeling · Hack the Valley prototype · Not a medical device</p>
        <nav className="mk-footer-links" aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/signin">Sign in</Link>
          <Link href="/signup">Create a diary</Link>
        </nav>
      </div>
    </footer>
  );
}
