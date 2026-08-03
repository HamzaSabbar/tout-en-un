interface ImageExerciceProps {
  // Base de la route de lecture, sans l'identifiant du fichier. Le composant
  // ignore volontairement comment cette route est construite : il ne reçoit
  // jamais de clé de stockage ni d'URL de fournisseur, seulement un chemin de
  // notre API et un identifiant (invariant 3).
  baseUrl: string;
  fichierId: bigint;
  alt: string;
  legende?: string;
}

export function ImageExercice({ baseUrl, fichierId, alt, legende }: ImageExerciceProps) {
  const source = `${baseUrl}/${fichierId.toString()}`;

  // `next/image` est écarté délibérément : son optimiseur va chercher l'image
  // côté serveur puis la met en cache sous `/_next/image`, cache public et non
  // signé. Une image d'exercice est du contenu payant servi par URL signée de
  // 600 secondes ; la faire recopier dans un cache public annulerait exactement
  // la protection. Le poids est donc maîtrisé au téléversement, pas à
  // l'affichage.
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="mx-auto h-auto max-w-full rounded-md border"
    />
  );

  if (!legende) return image;

  return (
    <figure className="space-y-2">
      {image}
      <figcaption className="text-center text-sm text-muted-foreground">{legende}</figcaption>
    </figure>
  );
}
