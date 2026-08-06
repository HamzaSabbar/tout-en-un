import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import {
  resoudreCheminLocal,
  stockageLocalAutorise,
  typeMimeDeCle,
  verifierSignatureLocale,
} from "@/lib/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ cle: string[] }>;
}

// Contrepartie du stockage disque de développement et de test : elle sert le
// fichier désigné par une URL signée par nous-mêmes.
//
// Elle n'appelle pas `verifierAccesMatiere()`, et ce n'est pas un contournement
// de l'invariant 7 : elle vérifie bien son autorisation elle-même, sous forme de
// capacité. La signature HMAC porte sur la clé et sur une expiration à
// 600 secondes, elle n'est forgeable que par ce serveur, et elle n'est émise que
// par /api/matieres/[matiereId]/documents/[documentId]/lecture, en aval d'un
// appel autorisé à l'implémentation unique de la règle d'accès. Redériver ici
// l'accès depuis l'identité exigerait un second chemin clé → fichier → document
// → matière, soit la duplication que l'invariant 1 interdit. C'est le modèle des
// URL signées Supabase, décrit en architecture section 8.
export async function GET(request: Request, { params }: RouteParams) {
  // Même fonction que le sélecteur d'adaptateur : la route ne peut pas être
  // vivante alors que le stockage local ne l'est pas, ni l'inverse.
  if (!stockageLocalAutorise()) {
    return new NextResponse(null, { status: 404 });
  }

  const cle = (await params).cle.join("/");
  const parametres = new URL(request.url).searchParams;
  const expire = Number(parametres.get("expire"));
  const signature = parametres.get("signature") ?? "";

  // Un seul refus, indistinguable, pour une forme invalide, une signature
  // absente, fausse ou expirée : la route ne dit pas à un attaquant lequel de
  // ses essais approchait. Le disque n'est touché qu'après cette porte.
  const chemin = resoudreCheminLocal(cle);
  const typeMime = typeMimeDeCle(cle);
  if (chemin === null || typeMime === null || !verifierSignatureLocale(cle, expire, signature)) {
    return new NextResponse(null, { status: 403 });
  }

  const infos = await stat(chemin).catch(() => null);
  if (!infos?.isFile()) {
    return new NextResponse(null, { status: 404 });
  }

  const flux = Readable.toWeb(
    createReadStream(chemin),
  ) as unknown as ReadableStream<Uint8Array>;

  return new NextResponse(flux, {
    status: 200,
    headers: {
      // Type pris dans une table fermée d'extensions, jamais deviné à partir
      // des octets. L'extension a été écrite par le téléversement depuis un
      // type MIME validé, et la clé entière est signée : le client ne choisit
      // ni l'une ni l'autre. `nosniff` empêche en plus qu'un contenu déguisé
      // soit réinterprété par le navigateur.
      "Content-Type": typeMime,
      "Content-Length": infos.size.toString(),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
