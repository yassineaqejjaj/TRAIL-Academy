import { formatEuro } from "@/lib/catalog";

export interface Email { subject: string; text: string }

export function purchaseConfirmed(p: { title: string; amountCents: number; accessUntil: string | null; appUrl: string }): Email {
  const until = p.accessUntil ? `Votre accès est valable jusqu'au ${new Date(p.accessUntil).toLocaleDateString("fr-FR")}.\n` : "";
  return {
    subject: `Confirmation de votre achat — ${p.title}`,
    text: `Bonjour,\n\nNous confirmons la réception de votre paiement de ${formatEuro(p.amountCents)} pour « ${p.title} ».\n${until}\nAccéder à votre espace : ${p.appUrl}/compte\n\nVotre facture est disponible dans votre espace, rubrique Commandes.\n\nTRAIL Academy`,
  };
}

export function refundProcessed(p: { title: string; appUrl: string; full: boolean }): Email {
  return {
    subject: `Remboursement — ${p.title}`,
    text: `Bonjour,\n\nUn remboursement ${p.full ? "total" : "partiel"} a été enregistré pour « ${p.title} ».\n${p.full ? "L'accès associé à cette commande a été retiré.\n" : "Votre accès est conservé.\n"}\nDétails : ${p.appUrl}/compte/commandes\n\nTRAIL Academy`,
  };
}
