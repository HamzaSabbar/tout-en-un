import { z } from "zod";

const identifiantUrlSchema = z.string().regex(/^[1-9][0-9]*$/);

export const lectureVideoParamsSchema = z.object({
  matiereId: identifiantUrlSchema,
  videoId: identifiantUrlSchema,
});

export const lectureDocumentParamsSchema = z.object({
  matiereId: identifiantUrlSchema,
  documentId: identifiantUrlSchema,
});

export const videoReferenceSchema = z.string().regex(/^[A-Za-z0-9_-]{6,64}$/);

// Sujet ou correction : même route, distinguée par ce segment plutôt que deux
// dossiers dupliqués (lot 5, examens nationaux).
export const cibleNationalSchema = z.enum(["sujet", "correction"]);

export const lectureExtraitNationalParamsSchema = z.object({
  matiereId: identifiantUrlSchema,
  extraitId: identifiantUrlSchema,
  cible: cibleNationalSchema,
});

export const lectureExamenNationalParamsSchema = z.object({
  matiereId: identifiantUrlSchema,
  examenId: identifiantUrlSchema,
  cible: cibleNationalSchema,
});
