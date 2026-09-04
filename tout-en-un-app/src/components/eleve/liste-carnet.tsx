"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { EtatVide } from "@/components/eleve/etat-vide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import {
  enregistrerNoteCarnetAction,
  obtenirPageCarnetAction,
  supprimerNoteCarnetAction,
} from "@/modules/carnet/actions";
import type { NoteListee } from "@/modules/carnet/service";

interface ListeCarnetProps {
  notesInitiales: NoteListee[];
  curseurInitial: string | null;
  matiereId?: string;
  chapitreId?: string;
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Casablanca",
});

// Liste et pagination gérées côté client (Server Actions appelées depuis un
// clic, jamais via un `<form>`) : Modifier/Supprimer doivent retirer ou
// mettre à jour une carte précise sans recharger toute la page, comme les
// panneaux Aide/Correction de la page d'exercice.
export function ListeCarnet({ notesInitiales, curseurInitial, matiereId, chapitreId }: ListeCarnetProps) {
  const [notes, setNotes] = useState(notesInitiales);
  const [curseur, setCurseur] = useState(curseurInitial);
  const [chargementEnCours, setChargementEnCours] = useState(false);

  async function voirPlus() {
    if (!curseur) return;
    setChargementEnCours(true);
    try {
      const page = await obtenirPageCarnetAction({ matiereId, chapitreId, curseurId: curseur });
      if (page) {
        setNotes((existantes) => [...existantes, ...page.notes]);
        setCurseur(page.curseurSuivant);
      }
    } finally {
      setChargementEnCours(false);
    }
  }

  // La suppression de la dernière note vide `notes` côté client : l'état
  // vide doit s'afficher ici, pas seulement au premier rendu serveur (sinon
  // supprimer sa dernière note laisse une liste vide sans message).
  if (notes.length === 0) {
    return (
      <div className="space-y-3">
        <EtatVide icone={NotebookPen} titre={ELEVE_FR.carnet.vide} />
        <Link href="/matieres" className="text-body-sm font-medium text-primary hover:underline">
          {ELEVE_FR.navigation.matieres}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {notes.map((note) => (
          <li key={note.id}>
            <NoteCarte
              note={note}
              onSupprime={() =>
                setNotes((existantes) => existantes.filter((autre) => autre.id !== note.id))
              }
              onModifie={(miseAJour) =>
                setNotes((existantes) =>
                  existantes.map((autre) => (autre.id === note.id ? { ...autre, ...miseAJour } : autre)),
                )
              }
            />
          </li>
        ))}
      </ul>
      {curseur && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={chargementEnCours}
            onClick={() => void voirPlus()}
          >
            {ELEVE_FR.carnet.voirPlus}
          </Button>
        </div>
      )}
    </div>
  );
}

function NoteCarte({
  note,
  onSupprime,
  onModifie,
}: {
  note: NoteListee;
  onSupprime: () => void;
  onModifie: (miseAJour: { erreur: string | null; retenu: string | null }) => void;
}) {
  const [edition, setEdition] = useState(false);
  const [erreur, setErreur] = useState(note.erreur ?? "");
  const [retenu, setRetenu] = useState(note.retenu ?? "");
  const [enCours, setEnCours] = useState(false);
  const contexte = { matiereId: note.matiere.id, exerciceId: note.exercice.id };

  async function enregistrer() {
    setEnCours(true);
    try {
      const reponse = await enregistrerNoteCarnetAction(contexte, { erreur, retenu });
      if (reponse.autorise) {
        onModifie({ erreur: reponse.note?.erreur ?? null, retenu: reponse.note?.retenu ?? null });
        setEdition(false);
      }
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    if (!confirm(ELEVE_FR.carnet.confirmationSuppression)) return;
    setEnCours(true);
    try {
      const reponse = await supprimerNoteCarnetAction(contexte);
      if (reponse.autorise) onSupprime();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-caption text-muted-foreground">
          {note.matiere.libelle} · {note.chapitre.libelle} · {note.cours.titre}
        </p>
        <Link
          href={`/matieres/${note.matiere.id}/chapitres/${note.chapitre.id}/cours/${note.cours.id}`}
          className="block font-medium text-primary hover:underline"
        >
          {note.exercice.titre}
        </Link>

        {edition ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`note-erreur-${note.id}`} className="text-body-sm font-medium">
                {ELEVE_FR.carnet.champErreur}
              </label>
              <textarea
                id={`note-erreur-${note.id}`}
                rows={3}
                value={erreur}
                onChange={(evenement) => setErreur(evenement.target.value)}
                className="w-full rounded-lg border bg-transparent p-2.5 text-body-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`note-retenu-${note.id}`} className="text-body-sm font-medium">
                {ELEVE_FR.carnet.champRetenu}
              </label>
              <textarea
                id={`note-retenu-${note.id}`}
                rows={3}
                value={retenu}
                onChange={(evenement) => setRetenu(evenement.target.value)}
                className="w-full rounded-lg border bg-transparent p-2.5 text-body-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" size="sm" disabled={enCours} onClick={() => void enregistrer()}>
                {ELEVE_FR.carnet.enregistrer}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={enCours}
                onClick={() => {
                  setErreur(note.erreur ?? "");
                  setRetenu(note.retenu ?? "");
                  setEdition(false);
                }}
              >
                {ELEVE_FR.carnet.plusTard}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {note.erreur && (
              <p className="text-body-sm">
                <span className="font-medium">{ELEVE_FR.carnet.labelErreur}</span>
                {note.erreur}
              </p>
            )}
            {note.retenu && (
              <p className="text-body-sm">
                <span className="font-medium">{ELEVE_FR.carnet.labelRetenu}</span>
                {note.retenu}
              </p>
            )}
            <p className="text-caption text-muted-foreground">{FORMAT_DATE.format(new Date(note.creeLe))}</p>
            <div className="flex gap-4">
              <button
                type="button"
                className="text-body-sm font-medium text-primary hover:underline"
                onClick={() => setEdition(true)}
              >
                {ELEVE_FR.carnet.modifier}
              </button>
              <button
                type="button"
                className="text-body-sm font-medium text-destructive hover:underline"
                disabled={enCours}
                onClick={() => void supprimer()}
              >
                {ELEVE_FR.carnet.supprimer}
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
