import Image from "next/image";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        <Image
          src="/branding/logo.svg"
          alt="Ensolar Solutions"
          width={32}
          height={32}
          priority
        />
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      </div>
    </header>
  );
}
