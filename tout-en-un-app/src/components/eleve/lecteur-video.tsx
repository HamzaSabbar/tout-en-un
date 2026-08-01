interface LecteurVideoProps {
  reference: string;
  titre: string;
}

export default function LecteurVideo({ reference, titre }: LecteurVideoProps) {
  const source = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(reference)}`);
  source.searchParams.set("origin", window.location.origin);
  source.searchParams.set("rel", "0");

  return (
    <iframe
      className="absolute inset-0 size-full"
      src={source.toString()}
      title={titre}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
