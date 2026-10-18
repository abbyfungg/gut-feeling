import { PixelScene } from "@/components/PixelScene";
import { Womby } from "@/components/Womby";
import type { WombyPose } from "@/lib/womby";

/** Centred auth card: a small pixel landscape with Womby, then a heading and the form. */
export function AuthCard({ pose, title, sub, children }: { pose: WombyPose; title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mk-auth-card">
      <div className="mk-auth-band">
        <PixelScene height={26} seed={pose === "wave" ? 11 : 4} />
        <Womby pose={pose} size={84} />
      </div>
      <div className="mk-auth-body">
        <div className="mk-auth-head">
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
