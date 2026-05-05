import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmForm } from "./confirm-form";

export const metadata = {
  title: "Nouveau mot de passe · Gestion Boissons",
};

export default function ResetConfirmPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
        <CardDescription>
          Choisissez un mot de passe d&apos;au moins 8 caractères.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmForm />
      </CardContent>
    </Card>
  );
}
