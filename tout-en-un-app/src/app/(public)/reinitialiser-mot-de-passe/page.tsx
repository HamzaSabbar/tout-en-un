import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReinitialiserForm } from "./reinitialiser-form";

export default async function ReinitialiserMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choisir un nouveau mot de passe</CardTitle>
          <CardDescription>
            Le lien reçu par email est valable une heure et à usage unique.
          </CardDescription>
        </CardHeader>
        {jeton ? (
          <ReinitialiserForm jeton={jeton} />
        ) : (
          <p className="px-6 pb-6 text-sm text-destructive">
            Lien de réinitialisation manquant ou invalide.
          </p>
        )}
      </Card>
    </div>
  );
}
