import { requireAuth } from "@/modules/acces/require-auth";

export default async function EleveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuth();
  return <>{children}</>;
}
