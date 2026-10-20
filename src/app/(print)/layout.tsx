export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[210mm] bg-white p-10 text-black print:p-0">{children}</main>;
}
