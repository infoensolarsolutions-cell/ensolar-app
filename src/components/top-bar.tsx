import Image from "next/image";
import Link from "next/link";

export function TopBar({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        ) : (
          <Image
            src="/branding/logo.svg"
            alt="Ensolar Solutions"
            width={32}
            height={32}
            priority
          />
        )}
        <h1 className="truncate text-lg font-bold text-gray-900">{title}</h1>
      </div>
    </header>
  );
}
