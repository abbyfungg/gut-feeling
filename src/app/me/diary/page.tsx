import { redirect } from "next/navigation";

export default async function Diary({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const sp = await searchParams;
  redirect(sp.highlight ? `/me/entries?highlight=${encodeURIComponent(sp.highlight)}` : "/me/entries");
}
