export type DocumentType =
  | "proposal"
  | "quotation"
  | "agreement"
  | "contract"
  | "invoice"
  | "onboarding"
  | "project-brief";

export type DocumentLineItem = {
  description: string;
  quantity: string;
  rate: string;
};

export type DocumentFormData = {
  documentType: DocumentType;
  fileName: string;
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  clientName: string;
  clientBusinessName: string;
  clientAddress: string;
  clientEmail: string;
  projectName: string;
  serviceName: string;
  scopeOfWork: string;
  deliverables: string;
  timeline: string;
  startDate: string;
  deliveryDate: string;
  totalAmount: string;
  advancePercent: string;
  milestonePlan: string;
  paymentTerms: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  quotationValidityDays: string;
  onboardingItems: string;
  projectObjectives: string;
  assumptions: string;
  termsAndConditions: string;
  notes: string;
  senderName: string;
  senderTitle: string;
  senderEmail: string;
  senderPhone: string;
  contractDuration: string;
  lineItems: DocumentLineItem[];
};

export type DocumentSection = {
  heading: string;
  lines: string[];
};

export const documentPresetStorageKey = "pixelkode_os_document_presets";

export const documentTypeMeta: Record<DocumentType, { label: string; description: string }> = {
  proposal: {
    label: "Proposal",
    description: "Project offer with scope, timeline, and commercials."
  },
  quotation: {
    label: "Quotation",
    description: "Structured pricing quote with validity and deliverables."
  },
  agreement: {
    label: "Agreement",
    description: "Commercial agreement covering payment terms and delivery commitments."
  },
  contract: {
    label: "Contract",
    description: "Formal service contract with scope, duration, and obligations."
  },
  invoice: {
    label: "Invoice",
    description: "Billing document with due date, amount, and payment instructions."
  },
  onboarding: {
    label: "Onboarding",
    description: "Client intake checklist and access collection sheet."
  },
  "project-brief": {
    label: "Project Brief",
    description: "Execution document with goals, scope, timeline, and assumptions."
  }
};

export function createDefaultDocumentForm(): DocumentFormData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    documentType: "proposal",
    fileName: "pixelkode-proposal",
    businessName: "PixelKode OS",
    businessAddress: "",
    businessEmail: "",
    businessPhone: "",
    clientName: "",
    clientBusinessName: "",
    clientAddress: "",
    clientEmail: "",
    projectName: "",
    serviceName: "",
    scopeOfWork: "",
    deliverables: "",
    timeline: "",
    startDate: today,
    deliveryDate: "",
    totalAmount: "",
    advancePercent: "50",
    milestonePlan: "50% before starting, 50% after final delivery.",
    paymentTerms: "Advance payment is required before work starts. Final payment is due before final handover.",
    invoiceNumber: `INV-${today.replace(/-/g, "")}`,
    invoiceDate: today,
    dueDate: "",
    quotationValidityDays: "15",
    onboardingItems: "Brand logo files\nBrand colors and fonts\nDomain/hosting access\nReference websites\nPrimary contacts and approval flow",
    projectObjectives: "",
    assumptions: "",
    termsAndConditions: "Timeline depends on timely approvals, assets, and content from the client.",
    notes: "",
    senderName: "",
    senderTitle: "",
    senderEmail: "",
    senderPhone: "",
    contractDuration: "",
    lineItems: [
      {
        description: "",
        quantity: "1",
        rate: ""
      }
    ]
  };
}

function asBulletLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("-") ? line : `- ${line}`));
}

function moneyLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Not specified";
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(numeric);
  }
  return trimmed;
}

function parseMoney(value: string) {
  const numeric = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

export function calculateLineItemTotal(lineItems: DocumentLineItem[]) {
  return lineItems.reduce((sum, item) => sum + parseMoney(item.quantity) * parseMoney(item.rate), 0);
}

function pushSection(sections: DocumentSection[], heading: string, lines: string[]) {
  const normalized = lines.map((line) => line.trim()).filter(Boolean);
  if (normalized.length === 0) return;
  sections.push({ heading, lines: normalized });
}

export function buildDocumentSections(data: DocumentFormData) {
  const docMeta = documentTypeMeta[data.documentType];
  const sections: DocumentSection[] = [];
  const computedTotal = calculateLineItemTotal(data.lineItems);
  const effectiveTotal = data.totalAmount.trim() ? moneyLabel(data.totalAmount) : computedTotal > 0 ? moneyLabel(String(computedTotal)) : "Not specified";

  pushSection(sections, "Document Summary", [
    `${docMeta.label} for ${data.projectName || "Untitled Project"}`,
    `Prepared by ${data.businessName || "Your Business"}`,
    data.clientBusinessName ? `Prepared for ${data.clientBusinessName}` : "",
    data.clientName ? `Primary contact: ${data.clientName}` : "",
    data.invoiceNumber ? `Reference no: ${data.invoiceNumber}` : ""
  ]);

  pushSection(sections, "Business Details", [
    data.businessName,
    data.businessAddress,
    data.businessEmail ? `Email: ${data.businessEmail}` : "",
    data.businessPhone ? `Phone: ${data.businessPhone}` : ""
  ]);

  pushSection(sections, "Client Details", [
    data.clientBusinessName,
    data.clientName ? `Contact: ${data.clientName}` : "",
    data.clientAddress,
    data.clientEmail ? `Email: ${data.clientEmail}` : ""
  ]);

  if (["proposal", "quotation", "agreement", "contract", "project-brief"].includes(data.documentType)) {
    pushSection(sections, "Project Scope", [
      data.projectName ? `Project: ${data.projectName}` : "",
      data.serviceName ? `Service: ${data.serviceName}` : "",
      data.scopeOfWork,
      ...asBulletLines(data.deliverables)
    ]);
  }

  if (["proposal", "quotation", "agreement", "contract", "project-brief"].includes(data.documentType)) {
    pushSection(sections, "Timeline", [
      data.timeline,
      data.startDate ? `Start date: ${data.startDate}` : "",
      data.deliveryDate ? `Expected delivery: ${data.deliveryDate}` : "",
      data.contractDuration ? `Duration: ${data.contractDuration}` : ""
    ]);
  }

  if (["proposal", "quotation", "agreement", "contract", "invoice"].includes(data.documentType)) {
    pushSection(sections, "Commercials", [
      `Total amount: ${effectiveTotal}`,
      data.advancePercent ? `Advance before starting: ${data.advancePercent}%` : "",
      data.milestonePlan,
      data.paymentTerms
    ]);
  }

  if (data.lineItems.some((item) => item.description.trim() || item.rate.trim())) {
    pushSection(
      sections,
      "Line Items",
      data.lineItems
        .filter((item) => item.description.trim() || item.rate.trim())
        .map((item) => {
          const quantity = parseMoney(item.quantity) || 0;
          const rate = parseMoney(item.rate) || 0;
          return `${item.description || "Item"} - ${quantity} x ${moneyLabel(String(rate))} = ${moneyLabel(String(quantity * rate))}`;
        })
    );
  }

  if (data.documentType === "quotation") {
    pushSection(sections, "Quotation Terms", [
      `Quotation validity: ${data.quotationValidityDays || "15"} days`,
      data.termsAndConditions
    ]);
  }

  if (data.documentType === "invoice") {
    pushSection(sections, "Invoice Details", [
      `Invoice number: ${data.invoiceNumber || "Not assigned"}`,
      data.invoiceDate ? `Invoice date: ${data.invoiceDate}` : "",
      data.dueDate ? `Due date: ${data.dueDate}` : "",
      data.notes
    ]);
  }

  if (data.documentType === "onboarding") {
    pushSection(sections, "Onboarding Checklist", [
      data.projectName ? `Project: ${data.projectName}` : "",
      data.serviceName ? `Service: ${data.serviceName}` : "",
      ...asBulletLines(data.onboardingItems)
    ]);
  }

  if (data.documentType === "project-brief") {
    pushSection(sections, "Project Objectives", [
      data.projectObjectives,
      ...asBulletLines(data.assumptions)
    ]);
  }

  if (["agreement", "contract"].includes(data.documentType)) {
    pushSection(sections, "Terms and Conditions", [
      data.termsAndConditions,
      data.notes
    ]);
  }

  pushSection(sections, "Prepared By", [
    data.senderName,
    data.senderTitle,
    data.senderEmail ? `Email: ${data.senderEmail}` : "",
    data.senderPhone ? `Phone: ${data.senderPhone}` : ""
  ]);

  return sections;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxChars = 92) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function createPdfBlob(title: string, sections: DocumentSection[], lineItems: DocumentLineItem[] = []) {
  const pageWidth = 595;
  const pageHeight = 842;
  const leftMargin = 48;
  const topMargin = 132;
  const bottomMargin = 72;
  const lineHeight = 15;
  const sectionGap = 16;
  const headerHeight = 88;
  const footerY = 36;
  const brandColor = "0.08 0.56 0.78";
  const brandSoft = "0.92 0.97 1";
  const textMuted = "0.39 0.45 0.54";

  const pages: string[][] = [];
  let currentPage: string[] = [];
  let pageNumber = 0;
  let y = pageHeight - topMargin;

  const startPage = () => {
    currentPage = [];
    pages.push(currentPage);
    pageNumber += 1;
    y = pageHeight - topMargin;

    currentPage.push(`${brandColor} rg 0 ${pageHeight - headerHeight} ${pageWidth} ${headerHeight} re f`);
    currentPage.push(`0.98 0.99 1 rg 0 ${pageHeight - headerHeight - 12} ${pageWidth} 12 re f`);
    currentPage.push(`BT /F2 24 Tf 1 0 0 1 ${leftMargin} ${pageHeight - 48} Tm (PixelKode OS) Tj ET`);
    currentPage.push(`BT /F1 11 Tf 1 0 0 1 ${leftMargin} ${pageHeight - 68} Tm (${escapePdfText(title)}) Tj ET`);
    currentPage.push(`${brandSoft} rg ${leftMargin} ${footerY + 18} ${pageWidth - leftMargin * 2} 1 re f`);
    currentPage.push(`0.45 0.52 0.62 rg BT /F1 9 Tf 1 0 0 1 ${leftMargin} ${footerY} Tm (Generated from PixelKode OS Documents Workspace) Tj ET`);
    currentPage.push(`0.45 0.52 0.62 rg BT /F1 9 Tf 1 0 0 1 ${pageWidth - 100} ${footerY} Tm (Page ${pageNumber}) Tj ET`);
  };

  const ensureSpace = (requiredHeight: number) => {
    if (pages.length === 0 || y - requiredHeight < bottomMargin) {
      startPage();
    }
  };

  const addText = (text: string, x: number, yPosition: number, fontSize = 11, font = "F1", color = "0.16 0.23 0.32") => {
    currentPage.push(`${color} rg BT /${font} ${fontSize} Tf 1 0 0 1 ${x} ${yPosition} Tm (${escapePdfText(text)}) Tj ET`);
  };

  sections.forEach((section) => {
    const wrappedLines = section.lines.flatMap((line) => wrapLine(line, 76));
    const sectionHeight = 42 + wrappedLines.length * lineHeight + 14;
    ensureSpace(sectionHeight + sectionGap);

    const boxY = y - sectionHeight + 8;
    currentPage.push(`${brandSoft} rg ${leftMargin} ${boxY} ${pageWidth - leftMargin * 2} ${sectionHeight} re f`);
    currentPage.push(`0.88 0.93 0.98 RG 1 w ${leftMargin} ${boxY} ${pageWidth - leftMargin * 2} ${sectionHeight} re S`);
    currentPage.push(`${brandColor} rg ${leftMargin} ${boxY + sectionHeight - 26} ${pageWidth - leftMargin * 2} 22 re f`);
    addText(section.heading, leftMargin + 12, boxY + sectionHeight - 20, 11, "F2", "1 1 1");

    let lineY = boxY + sectionHeight - 44;
    wrappedLines.forEach((line) => {
      addText(line, leftMargin + 14, lineY, 10.5, "F1", line.startsWith("- ") ? "0.22 0.28 0.37" : "0.18 0.24 0.32");
      lineY -= lineHeight;
    });

    y = boxY - sectionGap;
  });

  const printableLineItems = lineItems.filter((item) => item.description.trim() || item.rate.trim());
  if (printableLineItems.length > 0) {
    const colX = {
      desc: leftMargin + 12,
      qty: leftMargin + 290,
      rate: leftMargin + 350,
      amount: leftMargin + 445
    };
    const tableWidth = pageWidth - leftMargin * 2;
    const rowHeight = 22;
    const headerRowHeight = 26;
    const totalRowsHeight = headerRowHeight + printableLineItems.length * rowHeight + 34;
    ensureSpace(totalRowsHeight + 20);

    const tableTopY = y;
    currentPage.push(`${brandSoft} rg ${leftMargin} ${tableTopY - totalRowsHeight} ${tableWidth} ${totalRowsHeight} re f`);
    currentPage.push(`0.88 0.93 0.98 RG 1 w ${leftMargin} ${tableTopY - totalRowsHeight} ${tableWidth} ${totalRowsHeight} re S`);
    currentPage.push(`${brandColor} rg ${leftMargin} ${tableTopY - headerRowHeight} ${tableWidth} ${headerRowHeight} re f`);
    addText("Pricing Table", leftMargin + 12, tableTopY - 18, 11, "F2", "1 1 1");
    addText("Item", colX.desc, tableTopY - 42, 10, "F2");
    addText("Qty", colX.qty, tableTopY - 42, 10, "F2");
    addText("Rate", colX.rate, tableTopY - 42, 10, "F2");
    addText("Amount", colX.amount, tableTopY - 42, 10, "F2");

    let rowY = tableTopY - 62;
    printableLineItems.forEach((item) => {
      const quantity = parseMoney(item.quantity);
      const rate = parseMoney(item.rate);
      const amount = quantity * rate;
      currentPage.push(`0.88 0.93 0.98 RG 0.8 w ${leftMargin + 10} ${rowY - 6} ${tableWidth - 20} ${rowHeight} re S`);
      addText(item.description || "Item", colX.desc, rowY + 8, 10);
      addText(String(quantity || 0), colX.qty, rowY + 8, 10);
      addText(moneyLabel(String(rate)), colX.rate, rowY + 8, 10);
      addText(moneyLabel(String(amount)), colX.amount, rowY + 8, 10, "F2");
      rowY -= rowHeight;
    });

    const totalAmount = calculateLineItemTotal(printableLineItems);
    addText(`Grand Total: ${moneyLabel(String(totalAmount))}`, leftMargin + tableWidth - 160, rowY - 8, 11, "F2", "0.08 0.56 0.78");
    y = rowY - 24;
  }

  ensureSpace(86);
  currentPage.push(`0.93 0.97 1 rg ${leftMargin} ${y - 42} ${pageWidth - leftMargin * 2} 62 re f`);
  currentPage.push(`0.88 0.93 0.98 RG 1 w ${leftMargin} ${y - 42} ${pageWidth - leftMargin * 2} 62 re S`);
  addText("Authorized Signature", leftMargin + 14, y - 14, 11, "F2");
  currentPage.push(`0.70 0.78 0.88 RG 1 w ${leftMargin + 14} ${y - 32} 180 0 re S`);
  addText("Client Acceptance / Signature", pageWidth - leftMargin - 180, y - 14, 11, "F2");
  currentPage.push(`0.70 0.78 0.88 RG 1 w ${pageWidth - leftMargin - 180} ${y - 32} 166 0 re S`);

  const objects: string[] = [];
  const contentObjectIds: number[] = [];
  const pageObjectIds: number[] = [];
  let objectId = 1;

  const catalogId = objectId++;
  const pagesId = objectId++;
  const fontId = objectId++;
  const fontBoldId = objectId++;

  pages.forEach((pageLines) => {
    const contentId = objectId++;
    const pageId = objectId++;
    contentObjectIds.push(contentId);
    pageObjectIds.push(pageId);
    objects[contentId] = `<< /Length ${pageLines.join("\n").length} >>\nstream\n${pageLines.join("\n")}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fontBoldId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let index = 1; index < objects.length; index += 1) {
    const body = objects[index];
    if (!body) continue;
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < objects.length; index += 1) {
    const offset = offsets[index] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
