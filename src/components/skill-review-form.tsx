"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Send, Star } from "lucide-react";

export function SkillReviewForm({ skillId }: { skillId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`/api/dashboard/skills/${skillId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || undefined, body })
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setStatus(payload.error?.message ?? "Review could not be submitted.");
        return;
      }
      setTitle("");
      setBody("");
      setStatus("Review saved. Marketplace reputation updated.");
      router.refresh();
    } catch {
      setStatus("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[1.25rem] border border-line bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mint">Buyer signal</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Review this skill</h2>
        </div>
        <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`Rate ${value} stars`}
              className="rounded-md p-1.5 transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-mint/30"
            >
              <Star className={`h-5 w-5 ${value <= rating ? "fill-amber text-amber" : "text-white/20"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          placeholder="Short verdict (optional)"
          className="h-11 rounded-xl border border-line bg-ink/70 px-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-mint/55"
        />
        <textarea
          required
          minLength={8}
          maxLength={1200}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What worked, what was reproducible, and where should another agent be careful?"
          className="min-h-28 resize-y rounded-xl border border-line bg-ink/70 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/28 focus:border-mint/55"
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-white/38">Login is required. Reviews linked to a ContextKit purchase receive a verified badge.</p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/login" className="text-xs text-white/48 transition hover:text-white">Login</Link>
          <button disabled={submitting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-wait disabled:opacity-60">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit review
          </button>
        </div>
      </div>
      {status ? <p className="mt-4 rounded-lg border border-line bg-ink/50 px-3 py-2 text-xs text-white/60" role="status">{status}</p> : null}
    </form>
  );
}
