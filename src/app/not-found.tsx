import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/umira-mark.png" alt="" className="h-14 w-14" />
      <h1 className="text-2xl font-extrabold">Halaman tidak ditemukan</h1>
      <Link href="/" className="btn-primary">Kembali ke chat</Link>
    </div>
  );
}
