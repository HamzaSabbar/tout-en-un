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
