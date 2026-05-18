"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildDocumentSections,
  calculateLineItemTotal,
  createDefaultDocumentForm,
  createPdfBlob,
  documentTypeMeta,
  type DocumentFormData,
  type DocumentLineItem,
  type DocumentType
} from "@/lib/document-studio";
import { useBusinessStore } from "@/lib/store";

const docTypes = Object.keys(documentTypeMeta) as DocumentType[];
const presetStorageKey = "pixelkode_os_document_presets";
const numberingStorageKey = "pixelkode_os_document_numbering";

type SavedPreset = {
  id: string;
  name: string;
  documentType: DocumentType;
  form: DocumentFormData;
};

function sanitizeFileName(value: string) {
  return value.trim().replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "document";
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-fuchsia-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-500/50"
      />
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">{label}</span>
      <Input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function DocumentStudio() {
  const projects = useBusinessStore((state) => state.sheets.projects.rows);
  const services = useBusinessStore((state) => state.sheets.services.rows);
  const theme = useBusinessStore((state) => state.theme);
  const [form, setForm] = useState<DocumentFormData>(() => createDefaultDocumentForm());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(presetStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedPreset[];
      if (Array.isArray(parsed)) {
        setSavedPresets(parsed);
      }
    } catch {
      // Ignore local preset parse issues.
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find((item) => String(item.id) === selectedProjectId);
    if (!project) return;
    const matchingService = services.find((service) => String(service.serviceName ?? "").trim().toLowerCase() === String(project.category ?? "").trim().toLowerCase());

    const nextProjectName = String(project.projectName ?? "").trim();
    const nextClientName = String(project.clientName ?? "").trim();
    const nextServiceName = String(project.category ?? "").trim();
    const nextClientBusinessName = nextClientName;
    const nextAmount = String(project.projectValue ?? "").trim();
    const nextStartDate = String(project.startDate ?? "").trim();
    const nextDeliveryDate = String(project.deliveryDate ?? "").trim();
    const nextNotes = String(project.notes ?? "").trim();

    setForm((current) => ({
      ...current,
      projectName: nextProjectName || current.projectName,
      clientName: nextClientName || current.clientName,
      clientBusinessName: nextClientBusinessName || current.clientBusinessName,
      serviceName: nextServiceName || current.serviceName,
      startDate: nextStartDate || current.startDate,
      deliveryDate: nextDeliveryDate || current.deliveryDate,
      projectObjectives: nextNotes || current.projectObjectives,
      scopeOfWork:
        String(current.scopeOfWork ?? "").trim() ||
        `Deliver ${nextServiceName || "service"} for ${nextClientBusinessName || nextClientName || "this client"} with business-ready execution and approvals.`,
      deliverables:
        String(current.deliverables ?? "").trim() ||
        String(matchingService?.notes ?? "").trim(),
      timeline: String(matchingService?.estimatedTimeline ?? "").trim() || current.timeline,
      totalAmount: nextAmount || String(matchingService?.price ?? "").trim() || current.totalAmount,
      termsAndConditions:
        String(current.termsAndConditions ?? "").trim() ||
        `Timeline and delivery depend on timely approvals, content, and access from the client.${matchingService?.notes ? ` ${String(matchingService.notes).trim()}` : ""}`,
      lineItems:
        current.lineItems.some((item) => item.description.trim() || item.rate.trim())
          ? current.lineItems
          : [
              {
                description: nextServiceName || String(matchingService?.serviceName ?? "Primary service"),
                quantity: "1",
                rate: nextAmount || String(matchingService?.price ?? "")
              }
            ],
      fileName: sanitizeFileName(`${nextProjectName || "project"}-${current.documentType}`)
    }));
  }, [projects, selectedProjectId, services]);

  const sections = useMemo(() => buildDocumentSections(form), [form]);
  const activeMeta = documentTypeMeta[form.documentType];
  const lineItemTotal = useMemo(() => calculateLineItemTotal(form.lineItems), [form.lineItems]);
  const documentTitle = `${activeMeta.label.toUpperCase()}${form.projectName || form.clientBusinessName ? ` - ${form.projectName || form.clientBusinessName}` : ""}`;

  const updateField = <K extends keyof DocumentFormData>(key: K, value: DocumentFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const persistPresets = (nextPresets: SavedPreset[]) => {
    setSavedPresets(nextPresets);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(presetStorageKey, JSON.stringify(nextPresets));
    }
  };

  const savePreset = () => {
    const name = presetName.trim() || `${documentTypeMeta[form.documentType].label} preset`;
    const nextPreset: SavedPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      documentType: form.documentType,
      form
    };
    persistPresets([nextPreset, ...savedPresets].slice(0, 12));
    setPresetName("");
  };

  const applyServiceTemplate = (serviceName: string) => {
    const matchingService = services.find((service) => String(service.serviceName ?? "").trim() === serviceName);
    if (!matchingService) return;
    setForm((current) => ({
      ...current,
      serviceName,
      scopeOfWork:
        current.scopeOfWork ||
        `Deliver ${serviceName} for ${current.clientBusinessName || current.clientName || "this client"} with structured execution, approvals, and final handover.`,
      deliverables: String(matchingService.notes ?? "").trim() || current.deliverables,
      timeline: String(matchingService.estimatedTimeline ?? "").trim() || current.timeline,
      totalAmount: String(matchingService.price ?? "").trim() || current.totalAmount,
      lineItems:
        current.lineItems.some((item) => item.description.trim() || item.rate.trim())
          ? current.lineItems
          : [
              {
                description: serviceName,
                quantity: "1",
                rate: String(matchingService.price ?? "")
              }
            ]
    }));
  };

  const generateDocumentNumber = () => {
    const prefixes: Record<DocumentType, string> = {
      proposal: "PK-PRP",
      quotation: "PK-QTN",
      agreement: "PK-AGR",
      contract: "PK-CTR",
      invoice: "PK-INV",
      onboarding: "PK-ONB",
      "project-brief": "PK-BRF"
    };
    const now = new Date();
    const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const storageKey = `${form.documentType}-${period}`;
    let nextCount = 1;
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(numberingStorageKey);
      const currentMap = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      nextCount = (currentMap[storageKey] ?? 0) + 1;
      currentMap[storageKey] = nextCount;
      window.localStorage.setItem(numberingStorageKey, JSON.stringify(currentMap));
    }
    updateField("invoiceNumber", `${prefixes[form.documentType]}-${period}-${String(nextCount).padStart(3, "0")}`);
  };

  const runAiSuggestion = async (target: "scope" | "terms" | "payment" | "proposal") => {
    setIsAiLoading(true);
    try {
      const prompts = {
        scope: `Write a sharper scope of work for this project. Business: ${form.businessName}. Client: ${form.clientBusinessName}. Service: ${form.serviceName}. Project: ${form.projectName}. Current scope: ${form.scopeOfWork}. Deliverables: ${form.deliverables}. Return only the improved scope text.`,
        terms: `Write professional terms and conditions for this document. Business: ${form.businessName}. Client: ${form.clientBusinessName}. Service: ${form.serviceName}. Timeline: ${form.timeline}. Payment terms: ${form.paymentTerms}. Current terms: ${form.termsAndConditions}. Return only the improved terms text.`,
        payment: `Write clear payment terms for this project. Total amount: ${form.totalAmount || lineItemTotal}. Advance percent: ${form.advancePercent}. Milestone plan: ${form.milestonePlan}. Return only the improved payment terms text.`,
        proposal: `Improve this proposal/project objective wording for a client-facing document. Project: ${form.projectName}. Service: ${form.serviceName}. Objectives: ${form.projectObjectives}. Notes: ${form.notes}. Return only the improved text.`
      };

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompts[target],
          pathname: "/documents"
        })
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error ?? "AI suggestion failed.");
      }
      if (target === "scope") updateField("scopeOfWork", payload.message.trim());
      if (target === "terms") updateField("termsAndConditions", payload.message.trim());
      if (target === "payment") updateField("paymentTerms", payload.message.trim());
      if (target === "proposal") updateField("projectObjectives", payload.message.trim());
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateLineItem = (index: number, patch: Partial<DocumentLineItem>) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const addLineItem = () => {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, { description: "", quantity: "1", rate: "" }]
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.length <= 1 ? current.lineItems : current.lineItems.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const downloadPdf = () => {
    const title = `${activeMeta.label} - ${form.projectName || form.clientBusinessName || "Document"}`;
    const blob = createPdfBlob(title, sections, form.lineItems);
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${sanitizeFileName(form.fileName)}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(href);
  };

  return (
    <div className="space-y-6">
      <Card
        className={`overflow-hidden border p-0 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ${
          theme === "dark" ? "border-white/10 bg-slate-950/92" : "border-slate-200/80 bg-white/85"
        }`}
      >
        <div
          className={`border-b px-5 py-5 ${
            theme === "dark" ? "border-white/10 bg-slate-900/88" : "border-slate-200/80 bg-white/70"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-cyan-300">Documents Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Proposal, quotation, agreement, contract, invoice, onboarding, and project brief</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
                Fill the details once, then generate a cleaner, more formal document with clause-based sections, process details, commercials, and signature-ready layout.
              </p>
            </div>
            <Button type="button" className="rounded-2xl" onClick={downloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {docTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    updateField("documentType", type);
                    updateField("fileName", sanitizeFileName(`${form.projectName || "project"}-${type}`));
                  }}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    form.documentType === type
                      ? theme === "dark"
                        ? "border-cyan-400/40 bg-cyan-950/50 text-white shadow-sm"
                        : "border-fuchsia-300 bg-fuchsia-50 text-slate-900 shadow-sm"
                      : theme === "dark"
                        ? "border-white/10 bg-slate-950/76 text-zinc-300 hover:bg-slate-900/88"
                        : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white"
                    }`}
                >
                  <p className="text-sm font-semibold">{documentTypeMeta[type].label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{documentTypeMeta[type].description}</p>
                </button>
              ))}
            </div>

            <Card
              className={`rounded-[28px] border p-5 ${
                theme === "dark" ? "border-white/10 bg-slate-900/84" : "border-slate-200/80 bg-white/80"
              }`}
            >
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-500 dark:text-cyan-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Document Setup</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Linked project</span>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]"
                  >
                    <option value="">Manual entry</option>
                    {projects.map((project) => (
                      <option key={String(project.id)} value={String(project.id)}>
                        {String(project.projectName ?? "Project")} - {String(project.clientName ?? "Client")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Service template</span>
                  <select
                    value=""
                    onChange={(event) => {
                      if (event.target.value) applyServiceTemplate(event.target.value);
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]"
                  >
                    <option value="">Apply a service template</option>
                    {services.map((service) => (
                      <option key={String(service.id ?? service.serviceName ?? "")} value={String(service.serviceName ?? "")}>
                        {String(service.serviceName ?? "Service")}
                      </option>
                    ))}
                  </select>
                </label>
                <InputField label="PDF file name" value={form.fileName} onChange={(value) => updateField("fileName", value)} placeholder="my-custom-proposal" />
                <InputField label="Business name" value={form.businessName} onChange={(value) => updateField("businessName", value)} />
                <InputField label="Client business name" value={form.clientBusinessName} onChange={(value) => updateField("clientBusinessName", value)} />
                <InputField label="Primary contact" value={form.clientName} onChange={(value) => updateField("clientName", value)} />
                <InputField label="Project name" value={form.projectName} onChange={(value) => updateField("projectName", value)} />
                <InputField label="Service name" value={form.serviceName} onChange={(value) => updateField("serviceName", value)} />
                <InputField label="Total amount" value={form.totalAmount} onChange={(value) => updateField("totalAmount", value)} placeholder="150000" />
                <InputField label="Advance percent" value={form.advancePercent} onChange={(value) => updateField("advancePercent", value)} placeholder="50" />
                <InputField label="Start date" type="date" value={form.startDate} onChange={(value) => updateField("startDate", value)} />
                <InputField label="Delivery date" type="date" value={form.deliveryDate} onChange={(value) => updateField("deliveryDate", value)} />
                <InputField label="Timeline summary" value={form.timeline} onChange={(value) => updateField("timeline", value)} placeholder="4 weeks from approval" />
                <InputField label="Contract duration" value={form.contractDuration} onChange={(value) => updateField("contractDuration", value)} placeholder="60 days" />
                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Document number</span>
                  <div className="flex gap-2">
                    <Input value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} placeholder="PK-INV-202605-001" />
                    <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl" onClick={generateDocumentNumber}>
                      Auto
                    </Button>
                  </div>
                </div>
                <InputField label="Invoice date" type="date" value={form.invoiceDate} onChange={(value) => updateField("invoiceDate", value)} />
                <InputField label="Due date" type="date" value={form.dueDate} onChange={(value) => updateField("dueDate", value)} />
                <InputField label="Quotation validity (days)" value={form.quotationValidityDays} onChange={(value) => updateField("quotationValidityDays", value)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Save current format as preset" />
                <Button type="button" variant="outline" className="rounded-2xl" onClick={savePreset}>
                  Save preset
                </Button>
                <select
                  value=""
                  onChange={(event) => {
                    const preset = savedPresets.find((item) => item.id === event.target.value);
                    if (preset) {
                      setForm(preset.form);
                    }
                  }}
                  className="h-11 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]"
                >
                  <option value="">Load preset</option>
                  {savedPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card
              className={`rounded-[28px] border p-5 ${
                theme === "dark" ? "border-white/10 bg-slate-900/84" : "border-slate-200/80 bg-white/80"
              }`}
            >
              <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Business and Client Contact Details</p>
              <div className="grid gap-4 md:grid-cols-2">
                <TextAreaField label="Business address" value={form.businessAddress} onChange={(value) => updateField("businessAddress", value)} />
                <TextAreaField label="Client address" value={form.clientAddress} onChange={(value) => updateField("clientAddress", value)} />
                <InputField label="Business email" value={form.businessEmail} onChange={(value) => updateField("businessEmail", value)} />
                <InputField label="Business phone" value={form.businessPhone} onChange={(value) => updateField("businessPhone", value)} />
                <InputField label="Client email" value={form.clientEmail} onChange={(value) => updateField("clientEmail", value)} />
                <InputField label="Prepared by" value={form.senderName} onChange={(value) => updateField("senderName", value)} />
                <InputField label="Prepared by title" value={form.senderTitle} onChange={(value) => updateField("senderTitle", value)} />
                <InputField label="Prepared by email" value={form.senderEmail} onChange={(value) => updateField("senderEmail", value)} />
                <InputField label="Prepared by phone" value={form.senderPhone} onChange={(value) => updateField("senderPhone", value)} />
              </div>
            </Card>

            <Card
              className={`rounded-[28px] border p-5 ${
                theme === "dark" ? "border-white/10 bg-slate-900/84" : "border-slate-200/80 bg-white/80"
              }`}
            >
              <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Document Content</p>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => runAiSuggestion("scope")} disabled={isAiLoading}>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Suggest scope
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => runAiSuggestion("payment")} disabled={isAiLoading}>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Suggest payment terms
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => runAiSuggestion("terms")} disabled={isAiLoading}>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Suggest terms
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => runAiSuggestion("proposal")} disabled={isAiLoading}>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Improve proposal text
                </Button>
              </div>
              <div className="grid gap-4">
                <TextAreaField label="Scope of work" value={form.scopeOfWork} onChange={(value) => updateField("scopeOfWork", value)} placeholder="Describe what will be done for this client." />
                <TextAreaField label="Deliverables" value={form.deliverables} onChange={(value) => updateField("deliverables", value)} placeholder="Website design&#10;Admin panel&#10;Deployment support" />
                <TextAreaField label="Milestone plan" value={form.milestonePlan} onChange={(value) => updateField("milestonePlan", value)} placeholder="40% advance&#10;30% on design approval&#10;30% before launch" />
                <TextAreaField label="Payment terms" value={form.paymentTerms} onChange={(value) => updateField("paymentTerms", value)} placeholder="Payment is due..." />
                <TextAreaField label="Onboarding checklist" value={form.onboardingItems} onChange={(value) => updateField("onboardingItems", value)} placeholder="Logo files&#10;Brand guide&#10;Domain login" />
                <TextAreaField label="Project objectives" value={form.projectObjectives} onChange={(value) => updateField("projectObjectives", value)} placeholder="Increase inbound leads..." />
                <TextAreaField label="Assumptions / dependencies" value={form.assumptions} onChange={(value) => updateField("assumptions", value)} placeholder="Client will provide..." />
                <TextAreaField label="Terms and conditions" value={form.termsAndConditions} onChange={(value) => updateField("termsAndConditions", value)} placeholder="Work starts after advance payment..." />
                <TextAreaField label="Additional notes" value={form.notes} onChange={(value) => updateField("notes", value)} placeholder="Any project-specific clauses or notes." />
              </div>
            </Card>

            <Card
              className={`rounded-[28px] border p-5 ${
                theme === "dark" ? "border-white/10 bg-slate-900/84" : "border-slate-200/80 bg-white/80"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Pricing Table / Invoice Line Items</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Add service-wise rows so quotations, proposals, and invoices look client-ready.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={addLineItem}>
                  Add item
                </Button>
              </div>
              <div className="grid gap-3">
                {form.lineItems.map((item, index) => {
                  const quantity = Number(item.quantity || 0);
                  const rate = Number(item.rate || 0);
                  const total = Number.isFinite(quantity) && Number.isFinite(rate) ? quantity * rate : 0;
                  return (
                    <div
                      key={`line-item-${index}`}
                      className={`grid gap-3 rounded-[22px] border p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_120px_140px_140px_88px] ${
                        theme === "dark" ? "border-white/10 bg-slate-950/76" : "border-slate-200 bg-slate-50/80"
                      }`}
                    >
                      <InputField label="Description" value={item.description} onChange={(value) => updateLineItem(index, { description: value })} placeholder="Website design" />
                      <InputField label="Qty" value={item.quantity} onChange={(value) => updateLineItem(index, { quantity: value })} placeholder="1" />
                      <InputField label="Rate" value={item.rate} onChange={(value) => updateLineItem(index, { rate: value })} placeholder="40000" />
                      <div className="grid min-w-0 gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Amount</span>
                        <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
                          INR {Number.isFinite(total) ? total.toLocaleString("en-IN") : "0"}
                        </div>
                      </div>
                      <div className="flex min-w-0 items-end">
                        <Button type="button" variant="outline" size="sm" className="h-11 w-full rounded-2xl" onClick={() => removeLineItem(index)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[22px] border border-cyan-200 bg-cyan-50/70 px-4 py-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">Line item total</p>
                  <p className="mt-1 text-xs text-cyan-700/80 dark:text-cyan-100/80">If total amount above is empty, this table total becomes the document total automatically.</p>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-cyan-900 dark:text-white">INR {lineItemTotal.toLocaleString("en-IN")}</p>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card
              className={`rounded-[28px] border p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ${
                theme === "dark" ? "border-white/10 bg-slate-950/72" : "border-slate-200/80 bg-white/90"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Live Preview</p>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{activeMeta.description}</p>
              <div
                className={`mt-5 overflow-hidden rounded-[28px] border ${
                  theme === "dark" ? "border-white/10 bg-slate-950/76" : "border-slate-200 bg-stone-100/80"
                }`}
              >
                <div className={`mx-auto min-h-[980px] max-w-[760px] px-6 py-7 ${
                  theme === "dark" ? "bg-slate-900 text-zinc-100" : "bg-white text-slate-900"
                }`}>
                  <div className={`border-b pb-4 ${theme === "dark" ? "border-white/10" : "border-slate-300"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme === "dark" ? "text-white" : "text-black"}`}>
                      {form.businessName || "Your Business"}
                    </p>
                    <h2 className="mt-3 text-center text-2xl font-semibold tracking-[0.08em]">{documentTitle}</h2>
                    <div className={`mt-4 grid gap-3 text-sm sm:grid-cols-2 ${theme === "dark" ? "text-zinc-200" : "text-slate-800"}`}>
                      <p><span className="font-semibold">Client:</span> {form.clientBusinessName || form.clientName || "Not added"}</p>
                      <p><span className="font-semibold">Reference:</span> {form.invoiceNumber || "Not added"}</p>
                      <p><span className="font-semibold">Value:</span> {form.totalAmount ? `INR ${form.totalAmount}` : lineItemTotal > 0 ? `INR ${lineItemTotal.toLocaleString("en-IN")}` : "Not added"}</p>
                      <p><span className="font-semibold">Timeline:</span> {form.timeline || form.deliveryDate || "Not added"}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-6">
                  {sections.map((section) => (
                    <section key={section.heading}>
                      <p className={`border-b pb-2 text-sm font-semibold tracking-[0.08em] ${
                        theme === "dark" ? "border-white/10 text-white" : "border-slate-300 text-black"
                      }`}>
                        {section.heading}
                      </p>
                      <div className="mt-3 space-y-2">
                        {section.lines.map((line, index) => (
                          <p key={`${section.heading}-${index}`} className={`text-sm leading-7 ${theme === "dark" ? "text-zinc-200" : "text-slate-800"}`}>
                            {line.startsWith("- ") ? `- ${line.slice(2)}` : line}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                  {form.lineItems.some((item) => item.description.trim() || item.rate.trim()) ? (
                    <section>
                      <p className={`border-b pb-2 text-sm font-semibold tracking-[0.08em] ${
                        theme === "dark" ? "border-white/10 text-white" : "border-slate-300 text-black"
                      }`}>
                        Line Item Table
                      </p>
                      <div className="mt-3 overflow-hidden rounded-[10px] border border-slate-300 dark:border-white/10">
                      <div className="grid grid-cols-[minmax(0,1.5fr)_90px_120px_120px] bg-slate-100 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300">
                        <div className="px-3 py-3">Item</div>
                        <div className="px-3 py-3">Qty</div>
                        <div className="px-3 py-3">Rate</div>
                        <div className="px-3 py-3">Amount</div>
                      </div>
                      {form.lineItems
                        .filter((item) => item.description.trim() || item.rate.trim())
                        .map((item, index) => {
                          const quantity = Number(item.quantity || 0);
                          const rate = Number(item.rate || 0);
                          const total = Number.isFinite(quantity) && Number.isFinite(rate) ? quantity * rate : 0;
                          return (
                            <div key={`preview-line-${index}`} className="grid grid-cols-[minmax(0,1.5fr)_90px_120px_120px] border-t border-slate-200 text-sm text-slate-700 dark:border-white/10 dark:text-zinc-300">
                              <div className="px-3 py-3">{item.description || "Item"}</div>
                              <div className="px-3 py-3">{quantity || 0}</div>
                              <div className="px-3 py-3">INR {Number.isFinite(rate) ? rate.toLocaleString("en-IN") : "0"}</div>
                              <div className="px-3 py-3 font-semibold text-slate-900 dark:text-white">INR {total.toLocaleString("en-IN")}</div>
                            </div>
                          );
                        })}
                      <div className="grid grid-cols-[minmax(0,1.5fr)_90px_120px_120px] border-t border-slate-200 bg-slate-50/80 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="px-3 py-3 font-semibold text-slate-900 dark:text-white">Grand Total</div>
                        <div />
                        <div />
                        <div className="px-3 py-3 font-semibold text-slate-900 dark:text-white">INR {lineItemTotal.toLocaleString("en-IN")}</div>
                      </div>
                      </div>
                    </section>
                  ) : null}
                  <div className="grid gap-8 pt-6 sm:grid-cols-2">
                    <div>
                      <p className={`text-sm font-semibold ${theme === "dark" ? "text-zinc-200" : "text-slate-800"}`}>Authorized Signature</p>
                      <div className="mt-8 h-px bg-slate-400 dark:bg-white/20" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${theme === "dark" ? "text-zinc-200" : "text-slate-800"}`}>Client Acceptance / Signature</p>
                      <div className="mt-8 h-px bg-slate-400 dark:bg-white/20" />
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </Card>

            <Card
              className={`rounded-[28px] border p-5 ${
                theme === "dark" ? "border-white/10 bg-slate-950/72" : "border-slate-200/80 bg-white/90"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Recommended use</p>
              <div className="mt-3 grid gap-3">
                {[
                  "Use Proposal before the deal is finalized to pitch the solution and scope.",
                  "Use Quotation to send a clean price breakdown with validity and terms.",
                  "Use Agreement or Contract once the client accepts the deal and payment flow.",
                  "Use Invoice when you need advance, milestone, or final payment collection.",
                  "Use Onboarding after acceptance to collect assets, access, and approvals.",
                  "Use Project Brief for the internal execution team after closing the client."
                ].map((item) => (
                  <div
                    key={item}
                    className={`rounded-[20px] border px-4 py-3 text-sm ${
                      theme === "dark"
                        ? "border-white/10 bg-slate-950/76 text-zinc-300"
                        : "border-slate-200 bg-slate-50/80 text-slate-600"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
