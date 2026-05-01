/**
 * Categorias setorizadas para anexos de venda.
 * Os slugs são gravados em `attachments.category` e lidos por SaleAttachmentsSection.
 * NÃO renomear slugs · vendas antigas dependem deles.
 */
import {
  FileText, Plane, Hotel, Car, Package, Ticket, Receipt, FileSpreadsheet, File,
  type LucideIcon,
} from "lucide-react";

export type SaleAttachmentCategory =
  | "prints_emissao"
  | "voucher_aereo"
  | "voucher_hospedagem"
  | "voucher_transfer"
  | "voucher_pacote"
  | "ingressos"
  | "comprovante"
  | "nota_fiscal"
  | "outros";

export interface SaleAttachmentCategoryDef {
  key: SaleAttachmentCategory;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const SALE_ATTACHMENT_CATEGORIES: SaleAttachmentCategoryDef[] = [
  { key: "prints_emissao",     label: "Prints para Emissão",      icon: FileText,        hint: "Espelhos, prints da reserva" },
  { key: "voucher_aereo",      label: "Voucher Aéreo",            icon: Plane,           hint: "Bilhete, e-ticket" },
  { key: "voucher_hospedagem", label: "Voucher Hospedagem",       icon: Hotel,           hint: "Confirmação do hotel" },
  { key: "voucher_transfer",   label: "Voucher Transfer",         icon: Car,             hint: "Translado, traslados" },
  { key: "voucher_pacote",     label: "Voucher Pacote",           icon: Package,         hint: "Operadora, pacote completo" },
  { key: "ingressos",          label: "Ingressos",                icon: Ticket,          hint: "Atrações, parques, shows" },
  { key: "comprovante",        label: "Comprovante de Pagamento", icon: Receipt,         hint: "PIX, cartão, boleto pago" },
  { key: "nota_fiscal",        label: "Nota Fiscal",              icon: FileSpreadsheet, hint: "NF emitida" },
  { key: "outros",             label: "Outros",                   icon: File,            hint: "Documentos diversos" },
];

export const EMPTY_FILES_BY_CATEGORY: Record<SaleAttachmentCategory, File[]> = {
  prints_emissao: [],
  voucher_aereo: [],
  voucher_hospedagem: [],
  voucher_transfer: [],
  voucher_pacote: [],
  ingressos: [],
  comprovante: [],
  nota_fiscal: [],
  outros: [],
};
