// Manual payment methods — shown as collapsible banners at checkout and on the
// order page. Update the account details here as they change.
// WhatsApp proof line: set NEXT_PUBLIC_WHATSAPP_NUMBER in .env / Vercel
// (international format, digits only, e.g. "263773909307").

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "263773909307";

export interface ManualMethod {
  id: "bank_transfer" | "ecocash" | "innbucks";
  label: string;
  subtitle: string;
  /** Where / how to pay — shown line by line. */
  instructions: string[];
}

export const MANUAL_METHODS: ManualMethod[] = [
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    subtitle: "Direct transfer — USD account",
    instructions: [
      "Bank: CBZ Bank",
      "Account name: Digital Auto Shop",
      "Account number: 0212 3456 7890",
      "Branch: Harare",
      "Use your order reference as the transfer reference.",
    ],
  },
  {
    id: "ecocash",
    label: "EcoCash (Send Money)",
    subtitle: "Person-to-person EcoCash transfer",
    instructions: [
      "Dial *151# or use the EcoCash app",
      "Send money to: 0773 909 307 (Digital Auto Shop)",
      "Use your order reference as the payment reference.",
    ],
  },
  {
    id: "innbucks",
    label: "InnBucks",
    subtitle: "InnBucks wallet transfer",
    instructions: [
      "Open InnBucks and choose Send Money",
      "Send to: 0773 909 307 (Digital Auto Shop)",
      "Use your order reference as the payment reference.",
    ],
  },
];

export const MANUAL_IDS = MANUAL_METHODS.map((m) => m.id);

export function getManualMethod(id: string): ManualMethod | undefined {
  return MANUAL_METHODS.find((m) => m.id === id);
}

/** wa.me deep link with a prefilled proof-of-payment message. */
export function whatsappProofUrl(orderRef: string, methodLabel: string): string {
  const text = `Hi, I've paid for order ${orderRef} via ${methodLabel}. Attached is my proof of payment.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
