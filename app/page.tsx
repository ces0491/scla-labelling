import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-[var(--accent)]">
        SCLA labelling
      </h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        A small app for adding annotations to rugby video frames in
        support of the SCLA research project. Access is invite-only.
      </p>
      <p className="mt-6">
        <Link
          href="/login"
          className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[#0f1117]"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
