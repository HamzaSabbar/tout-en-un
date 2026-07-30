export interface EmailAEnvoyer {
  destinataire: string;
  sujet: string;
  corps: string;
}

// Aucun fournisseur transactionnel n'est encore branché (voir architecture,
// section 3 : Resend ou Brevo). En attendant, la sortie va sur la console
// serveur pour rester exploitable en développement et en test. Le corps peut
// contenir un jeton sensible (réinitialisation de mot de passe) : il ne doit
// jamais atterrir dans les journaux de production.
export async function envoyerEmail(email: EmailAEnvoyer): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.log(`[email] à ${email.destinataire} — ${email.sujet}`);
    return;
  }
  console.log(`[email] à ${email.destinataire} — ${email.sujet}\n${email.corps}`);
}
