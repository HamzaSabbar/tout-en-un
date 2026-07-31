export interface MessageWhatsApp {
  destinataire: string;
  corps: string;
}

// WhatsApp Cloud API n'est pas encore branché (voir architecture, section 3).
// La sortie reste visible en production, contrairement au mailer : aucun jeton
// ni donnée sensible ne transite par ce canal, et une confirmation d'activation
// perdue doit rester repérable dans les journaux.
export async function envoyerWhatsApp(message: MessageWhatsApp): Promise<void> {
  console.log(`[whatsapp:stub] à ${message.destinataire} — ${message.corps}`);
}
