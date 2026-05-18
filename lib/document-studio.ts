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

function asPlainLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinSentences(parts: Array<string | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function formatDateLabel(value: string, fallback: string) {
  return value.trim() || fallback;
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
  const businessName = data.businessName || "Your Business";
  const clientName = data.clientBusinessName || data.clientName || "Client";
  const projectName = data.projectName || "Untitled Project";
  const serviceName = data.serviceName || "Requested services";
  const startDate = formatDateLabel(data.startDate, "to be finalized");
  const deliveryDate = formatDateLabel(data.deliveryDate, "as per execution timeline");
  const dueDate = formatDateLabel(data.dueDate, "as per agreed payment terms");
  const invoiceDate = formatDateLabel(data.invoiceDate, "Not specified");
  const duration = formatDateLabel(data.contractDuration, "valid for the active project term");
  const objectiveText = joinSentences([
    data.projectObjectives,
    data.notes ? `Context: ${data.notes}` : ""
  ]);
  const assumptions = asBulletLines(data.assumptions);
  const deliverables = asBulletLines(data.deliverables);
  const onboardingItems = asBulletLines(data.onboardingItems);
  const formalDate = data.startDate || data.invoiceDate || "the date of issue";
  const baseCommercials = [
    `Project / service value: ${effectiveTotal}`,
    data.advancePercent ? `Advance payable before commencement: ${data.advancePercent}%` : "",
    data.milestonePlan ? `Milestone / split payment plan: ${data.milestonePlan}` : "",
    data.paymentTerms ? `Payment terms: ${data.paymentTerms}` : ""
  ];

  switch (data.documentType) {
    case "proposal":
      pushSection(sections, "1. Proposal Overview", [
        `This proposal is submitted by ${businessName} to ${clientName} in relation to ${projectName}.`,
        joinSentences([
          `The proposed engagement covers ${serviceName}.`,
          data.scopeOfWork || "",
          objectiveText || ""
        ]),
        data.invoiceNumber ? `Reference number: ${data.invoiceNumber}.` : ""
      ]);
      pushSection(sections, "2. Scope of Work and Deliverables", [
        `Based on the discussions and project requirements shared by the client, ${businessName} proposes to execute the following scope of work.`,
        data.scopeOfWork,
        ...deliverables
      ]);
      pushSection(sections, "3. Delivery Approach and Process", [
        `The work is proposed to commence on ${startDate} and shall progress through planning, execution, internal review, client review, revision, approval, and final handover.`,
        data.timeline ? `Estimated execution timeline: ${data.timeline}` : "",
        data.deliveryDate ? `Target completion / delivery date: ${deliveryDate}` : "",
        `The client shall provide timely feedback, approvals, content, and required access details so that the execution timeline can be maintained without unnecessary delay.`
      ]);
      pushSection(sections, "4. Commercial Proposal", baseCommercials);
      pushSection(sections, "5. Assumptions, Dependencies, and Conditions", [
        ...assumptions,
        data.termsAndConditions,
        data.notes
      ]);
      break;
    case "quotation":
      pushSection(sections, "1. Quotation Summary", [
        `This quotation is issued by ${businessName} to ${clientName} for ${projectName}.`,
        `Quoted service category: ${serviceName}.`,
        data.invoiceNumber ? `Quotation reference: ${data.invoiceNumber}` : "",
        `Quotation validity: ${data.quotationValidityDays || "15"} days from the date of issue.`
      ]);
      pushSection(sections, "2. Scope and Deliverables", [
        `The quotation has been prepared based on the scope, discussions, and deliverable expectations approved by the client.`,
        data.scopeOfWork,
        ...deliverables
      ]);
      pushSection(sections, "3. Commercial Breakdown", baseCommercials);
      pushSection(sections, "4. Delivery Schedule", [
        data.timeline,
        `Expected start date: ${startDate}`,
        data.deliveryDate ? `Expected completion date: ${deliveryDate}` : "",
        `Delivery dates are subject to timely approvals, content submission, and client-side dependencies.`
      ]);
      pushSection(sections, "5. Quotation Terms", [
        data.termsAndConditions,
        `Any scope addition, redesign, additional feature, or extra requirement outside the approved quotation shall be estimated separately and billed as additional work.`,
        data.notes
      ]);
      break;
    case "agreement":
    case "contract":
      pushSection(sections, "1. Parties and Purpose", [
        `This ${docMeta.label.toLowerCase()} is made on ${formalDate} between ${businessName} (hereinafter referred to as the Service Provider) and ${clientName} (hereinafter referred to as the Client).`,
        joinSentences([
          `The engagement includes ${serviceName}.`,
          data.scopeOfWork || ""
        ]),
        `The purpose of this document is to record the scope, commercials, responsibilities, and working terms related to ${projectName}. Effective start date: ${startDate}.${data.contractDuration ? ` Engagement duration: ${duration}.` : ""}`
      ]);
      pushSection(sections, "2. Scope, Deliverables, and Work Coverage", [
        `${businessName} agrees to provide the approved services and deliverables in accordance with the discussions, approvals, and business requirements shared by the Client.`,
        data.scopeOfWork,
        ...deliverables,
        `Any deliverable, revision, module, integration, or activity outside the above scope shall be treated as additional work and may require separate approval, pricing, and timeline.`
      ]);
      pushSection(sections, "3. Commercial Terms and Payment Process", [
        ...baseCommercials,
        `All approved payments shall be cleared strictly as per the agreed milestone flow, and any balance amount shall be paid before final handover wherever applicable.`,
        `If any future additional work is requested by the Client, the same shall follow the official payment terms of ${businessName} and may require advance payment before commencement.`
      ]);
      pushSection(sections, "4. Execution Timeline and Working Process", [
        data.timeline ? `Planned execution timeline: ${data.timeline}` : "",
        `Work is expected to commence on ${startDate}${data.deliveryDate ? ` and the target delivery is ${deliveryDate}` : ""}.`,
        `All timelines mentioned in this document shall be calculated on business working days only and may shift if approvals, inputs, or dependencies are delayed from the Client side.`
      ]);
      pushSection(sections, "5. Client Responsibilities and Approvals", [
        `The Client shall provide required content, branding assets, access credentials, technical information, and timely approvals necessary for smooth project execution.`,
        `Review feedback should be consolidated wherever possible so that corrections and revisions can be handled efficiently and without confusion.`,
        ...assumptions
      ]);
      pushSection(sections, "6. Revisions, Additional Work, and Change Requests", [
        `Reasonable revisions within the approved scope shall be handled during the active delivery cycle subject to practical limits and agreed review rounds.`,
        `Any new page, feature, redesign, integration, content population, modification, or post-approval change request beyond the current scope may attract additional cost and additional timeline.`,
        data.notes
      ]);
      pushSection(sections, "7. Ownership, Confidentiality, and Usage Rights", [
        `Upon receipt of all outstanding dues, the final approved project assets and deliverables shall belong to the Client unless otherwise agreed in writing.`,
        `Both parties agree to maintain confidentiality regarding commercial details, access credentials, project data, internal communication, and other sensitive information related to the work.`,
        `${businessName} reserves the right to showcase non-confidential parts of the completed work in its portfolio, presentations, or promotional materials unless restricted in writing by the Client.`
      ]);
      pushSection(sections, "8. Support, Maintenance, and General Terms", [
        `${businessName} shall provide project-related support and assistance as mutually agreed. Ongoing maintenance, upgrades, technical support, or retainer work shall be governed by the agreed service plan wherever applicable.`,
        data.termsAndConditions,
        `By signing this document, both parties confirm that they have read, understood, and agreed to all the terms and conditions stated above.`
      ]);
      break;
    case "invoice":
      pushSection(sections, "1. Invoice Summary", [
        `Invoice number: ${data.invoiceNumber || "Not assigned"}`,
        `Invoice date: ${invoiceDate}`,
        `Bill issued by ${businessName} for ${clientName}`,
        `Project / service: ${projectName} - ${serviceName}`,
        `Total payable amount: ${effectiveTotal}`
      ]);
      pushSection(sections, "2. Billing and Payment Details", [
        `Payment due date: ${dueDate}`,
        data.paymentTerms ? `Payment instructions: ${data.paymentTerms}` : "",
        data.milestonePlan ? `Billing stage / milestone note: ${data.milestonePlan}` : "",
        `The above amount is payable against the approved scope and billing stage mentioned in this invoice.`,
        data.notes
      ]);
      break;
    case "onboarding":
      pushSection(sections, "1. Engagement Kickoff Summary", [
        `${businessName} is preparing to begin ${projectName} for ${clientName}.`,
        `Primary service / engagement area: ${serviceName}.`,
        data.scopeOfWork,
        data.timeline ? `Initial delivery expectation: ${data.timeline}` : ""
      ]);
      pushSection(sections, "2. Required Inputs, Assets, and Access", onboardingItems);
      pushSection(sections, "3. Delivery Workflow and Communication Process", [
        `The project shall move through kickoff, requirement alignment, execution, review, revision, approval, and final handover.`,
        `The Client should nominate the primary point of contact for approvals, consolidated feedback, milestone confirmations, and day-to-day communication.`,
        data.notes
      ]);
      pushSection(sections, "4. Important Dependencies", [
        ...assumptions,
        data.termsAndConditions
      ]);
      break;
    case "project-brief":
      pushSection(sections, "1. Project Background", [
        `${projectName} is being executed for ${clientName} under ${businessName}.`,
        `Service category: ${serviceName}.`,
        data.scopeOfWork,
        objectiveText
      ]);
      pushSection(sections, "2. Objectives and Success Direction", [
        data.projectObjectives,
        `The execution team should align design, development, content, and delivery decisions with the approved client goal and business outcome.`
      ]);
      pushSection(sections, "3. Approved Scope and Deliverables", deliverables);
      pushSection(sections, "4. Execution Plan and Timeline", [
        data.timeline,
        `Start date: ${startDate}`,
        data.deliveryDate ? `Target delivery date: ${deliveryDate}` : "",
        `All work should follow milestone review, approval checkpoints, and final handover discipline.`
      ]);
      pushSection(sections, "5. Dependencies, Assumptions, and Risks", [
        ...assumptions,
        data.termsAndConditions,
        data.notes
      ]);
      pushSection(sections, "6. Commercial Snapshot", baseCommercials);
      break;
  }

  if (data.lineItems.some((item) => item.description.trim() || item.rate.trim())) {
    pushSection(
      sections,
      data.documentType === "invoice" ? "3. Line Item Breakdown" : "Detailed Line Item Breakdown",
      data.lineItems
        .filter((item) => item.description.trim() || item.rate.trim())
        .map((item) => {
          const quantity = parseMoney(item.quantity) || 0;
          const rate = parseMoney(item.rate) || 0;
          return `${item.description || "Item"} - ${quantity} x ${moneyLabel(String(rate))} = ${moneyLabel(String(quantity * rate))}`;
        })
    );
  }

  pushSection(sections, "Prepared By", [
    data.senderName || businessName,
    data.senderTitle,
    data.senderEmail ? `Email: ${data.senderEmail}` : data.businessEmail ? `Email: ${data.businessEmail}` : "",
    data.senderPhone ? `Phone: ${data.senderPhone}` : data.businessPhone ? `Phone: ${data.businessPhone}` : ""
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
  const leftMargin = 56;
  const topMargin = 116;
  const bottomMargin = 68;
  const lineHeight = 15;
  const sectionGap = 14;
  const footerY = 34;
  const brandColor = "0 0 0";
  const textColor = "0 0 0";
  const mutedColor = "0.35 0.35 0.35";

  const pages: string[][] = [];
  let currentPage: string[] = [];
  let pageNumber = 0;
  let y = pageHeight - topMargin;

  const startPage = () => {
    currentPage = [];
    pages.push(currentPage);
    pageNumber += 1;
    y = pageHeight - topMargin;

    currentPage.push(`${brandColor} rg ${leftMargin} ${pageHeight - 44} ${pageWidth - leftMargin * 2} 2 re f`);
    currentPage.push(`BT /F2 13 Tf 1 0 0 1 ${leftMargin} ${pageHeight - 62} Tm (PixelKode OS) Tj ET`);
    currentPage.push(`BT /F2 20 Tf 1 0 0 1 ${leftMargin} ${pageHeight - 88} Tm (${escapePdfText(title)}) Tj ET`);
    currentPage.push(`${brandColor} rg ${leftMargin} ${pageHeight - 98} ${pageWidth - leftMargin * 2} 1 re f`);
    currentPage.push(`${mutedColor} rg BT /F1 9 Tf 1 0 0 1 ${leftMargin} ${footerY} Tm (Generated from PixelKode OS Documents Workspace) Tj ET`);
    currentPage.push(`${mutedColor} rg BT /F1 9 Tf 1 0 0 1 ${pageWidth - 96} ${footerY} Tm (Page ${pageNumber}) Tj ET`);
  };

  const ensureSpace = (requiredHeight: number) => {
    if (pages.length === 0 || y - requiredHeight < bottomMargin) {
      startPage();
    }
  };

  const addText = (text: string, x: number, yPosition: number, fontSize = 11, font = "F1", color = textColor) => {
    currentPage.push(`${color} rg BT /${font} ${fontSize} Tf 1 0 0 1 ${x} ${yPosition} Tm (${escapePdfText(text)}) Tj ET`);
  };

  sections.forEach((section) => {
    const wrappedLines = section.lines.flatMap((line) => wrapLine(line, line.startsWith("- ") ? 78 : 86));
    const sectionHeight = 26 + wrappedLines.length * lineHeight + 8;
    ensureSpace(sectionHeight + sectionGap);

    addText(section.heading, leftMargin, y, 11.5, "F2", brandColor);
    currentPage.push(`${brandColor} rg ${leftMargin} ${y - 6} ${pageWidth - leftMargin * 2} 0.8 re f`);

    let lineY = y - 22;
    wrappedLines.forEach((line) => {
      const isBullet = line.startsWith("- ");
      addText(isBullet ? `- ${line.slice(2)}` : line, leftMargin + (isBullet ? 8 : 0), lineY, 10.4, "F1", textColor);
      lineY -= lineHeight;
    });

    y = lineY - 2 - sectionGap;
  });

  const printableLineItems = lineItems.filter((item) => item.description.trim() || item.rate.trim());
  if (printableLineItems.length > 0) {
    const colX = {
      desc: leftMargin + 10,
      qty: leftMargin + 292,
      rate: leftMargin + 352,
      amount: leftMargin + 444
    };
    const tableWidth = pageWidth - leftMargin * 2;
    const rowHeight = 21;
    const headerRowHeight = 24;
    const totalRowsHeight = headerRowHeight + printableLineItems.length * rowHeight + 30;
    ensureSpace(totalRowsHeight + 20);

    const tableTopY = y;
    addText("Line Item Table", leftMargin, tableTopY, 11.5, "F2", brandColor);
    currentPage.push(`${brandColor} rg ${leftMargin} ${tableTopY - 18} ${tableWidth} 0.8 re f`);
    addText("Item", colX.desc, tableTopY - 36, 10, "F2");
    addText("Qty", colX.qty, tableTopY - 36, 10, "F2");
    addText("Rate", colX.rate, tableTopY - 36, 10, "F2");
    addText("Amount", colX.amount, tableTopY - 36, 10, "F2");

    let rowY = tableTopY - 52;
    printableLineItems.forEach((item) => {
      const quantity = parseMoney(item.quantity);
      const rate = parseMoney(item.rate);
      const amount = quantity * rate;
      currentPage.push(`0.84 0.87 0.92 RG 0.7 w ${leftMargin} ${rowY - 8} ${tableWidth} ${rowHeight} re S`);
      addText(item.description || "Item", colX.desc, rowY + 6, 10);
      addText(String(quantity || 0), colX.qty, rowY + 6, 10);
      addText(moneyLabel(String(rate)), colX.rate, rowY + 6, 10);
      addText(moneyLabel(String(amount)), colX.amount, rowY + 6, 10, "F2");
      rowY -= rowHeight;
    });

    const totalAmount = calculateLineItemTotal(printableLineItems);
    addText(`Grand Total: ${moneyLabel(String(totalAmount))}`, leftMargin + tableWidth - 172, rowY - 6, 11, "F2", brandColor);
    y = rowY - 22;
  }

  ensureSpace(86);
  addText("Authorized Signature", leftMargin, y - 10, 11, "F2", brandColor);
  currentPage.push(`0.68 0.72 0.78 RG 1 w ${leftMargin} ${y - 28} 180 0 re S`);
  addText("Client Acceptance / Signature", pageWidth - leftMargin - 170, y - 10, 11, "F2", brandColor);
  currentPage.push(`0.68 0.72 0.78 RG 1 w ${pageWidth - leftMargin - 170} ${y - 28} 170 0 re S`);

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
