import { parseDateValue, startOfLocalDay } from "@/lib/date";
import type { OperationAlert, SheetData, SheetKey, SheetRow } from "@/lib/types";

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
}

function parseDate(value: unknown) {
  return parseDateValue(toText(value));
}

function dayDiff(target: Date, reference: Date) {
  const diff = startOfLocalDay(target).getTime() - startOfLocalDay(reference).getTime();
  return Math.round(diff / 86400000);
}

function makeAlertId(sheet: SheetKey, rowId: string, kind: string) {
  return `${sheet}:${rowId}:${kind}`;
}

function pushAlert(alerts: OperationAlert[], alert: OperationAlert) {
  if (!alerts.some((item) => item.id === alert.id)) {
    alerts.push(alert);
  }
}

function addProjectAlerts(alerts: OperationAlert[], rows: SheetRow[], today: Date) {
  rows.forEach((row) => {
    const rowId = String(row.id ?? "");
    const projectName = toText(row.projectName) || "Untitled project";
    const clientName = toText(row.clientName) || "Unknown client";
    const deliveryDate = parseDate(row.deliveryDate);
    const pendingAmount = toNumber(row.pendingAmount);
    const completionPercent = toNumber(row.completionPercent);
    const status = toText(row.projectStatus);

    if (deliveryDate && completionPercent < 100 && status !== "Completed") {
      const days = dayDiff(deliveryDate, today);

      if (days < 0) {
        pushAlert(alerts, {
          id: makeAlertId("projects", rowId, "overdue-delivery"),
          title: `${projectName} is overdue`,
          message: `${clientName} delivery slipped by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}.`,
          severity: "high",
          sheet: "projects",
          rowId,
          dueDate: toText(row.deliveryDate),
          actionLabel: "Review delivery"
        });
      } else if (days <= 3) {
        pushAlert(alerts, {
          id: makeAlertId("projects", rowId, "due-soon"),
          title: `${projectName} is due soon`,
          message: `${clientName} delivery is due in ${days} day${days === 1 ? "" : "s"}.`,
          severity: "medium",
          sheet: "projects",
          rowId,
          dueDate: toText(row.deliveryDate),
          actionLabel: "Check progress"
        });
      }
    }

    if (pendingAmount > 0 && deliveryDate && dayDiff(deliveryDate, today) < 0) {
      pushAlert(alerts, {
        id: makeAlertId("projects", rowId, "payment-pending"),
        title: `${projectName} has pending collection`,
          message: `Rs ${pendingAmount.toLocaleString("en-IN")} is still pending after delivery.`,
        severity: "high",
        sheet: "projects",
        rowId,
        dueDate: toText(row.deliveryDate),
        actionLabel: "Collect payment"
      });
    }
  });
}

function addLeadAlerts(alerts: OperationAlert[], rows: SheetRow[], today: Date) {
  rows.forEach((row) => {
    const rowId = String(row.id ?? "");
    const businessName = toText(row.businessName) || "Unnamed lead";
    const followUpDate = parseDate(row.followUpDate);
    const leadStatus = toText(row.leadStatus);

    if (leadStatus === "Converted") {
      pushAlert(alerts, {
        id: makeAlertId("leads", rowId, "converted"),
        title: `${businessName} was converted`,
        message: "Create a project row and start delivery tracking for this lead.",
        severity: "medium",
        sheet: "leads",
        rowId,
        dueDate: toText(row.followUpDate),
        actionLabel: "Create project"
      });
    }

    if (!followUpDate || !["Follow-up", "Proposal Sent"].includes(leadStatus)) {
      return;
    }

    const days = dayDiff(followUpDate, today);

    if (days < 0) {
      pushAlert(alerts, {
        id: makeAlertId("leads", rowId, "follow-up-overdue"),
        title: `${businessName} follow-up is overdue`,
        message: `This lead needed attention ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`,
        severity: "high",
        sheet: "leads",
        rowId,
        dueDate: toText(row.followUpDate),
        actionLabel: "Follow up now"
      });
    } else if (days === 0) {
      pushAlert(alerts, {
        id: makeAlertId("leads", rowId, "follow-up-today"),
        title: `${businessName} needs follow-up today`,
        message: `${leadStatus} is scheduled for today.`,
        severity: "medium",
        sheet: "leads",
        rowId,
        dueDate: toText(row.followUpDate),
        actionLabel: "Call lead"
      });
    } else if (days <= 2) {
      pushAlert(alerts, {
        id: makeAlertId("leads", rowId, "follow-up-soon"),
        title: `${businessName} follow-up is coming up`,
        message: `Next follow-up is in ${days} day${days === 1 ? "" : "s"}.`,
        severity: "low",
        sheet: "leads",
        rowId,
        dueDate: toText(row.followUpDate),
        actionLabel: "Prepare reply"
      });
    }
  });
}

function addContentAlerts(alerts: OperationAlert[], rows: SheetRow[], today: Date) {
  rows.forEach((row) => {
    const rowId = String(row.id ?? "");
    const contentTitle = toText(row.contentTitle) || "Untitled content";
    const publishDate = parseDate(row.publishDate);
    const stage = toText(row.stage);

    if (!publishDate || !["Scheduled", "Draft", "Designing"].includes(stage)) {
      return;
    }

    const days = dayDiff(publishDate, today);

    if (days < 0 && stage !== "Posted") {
      pushAlert(alerts, {
        id: makeAlertId("content", rowId, "publish-overdue"),
        title: `${contentTitle} missed publish date`,
        message: `Content is ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late.`,
        severity: "medium",
        sheet: "content",
        rowId,
        dueDate: toText(row.publishDate),
        actionLabel: "Publish content"
      });
    } else if (days === 0) {
      pushAlert(alerts, {
        id: makeAlertId("content", rowId, "publish-today"),
        title: `${contentTitle} is scheduled today`,
        message: "Publishing is due today.",
        severity: "low",
        sheet: "content",
        rowId,
        dueDate: toText(row.publishDate),
        actionLabel: "Review content"
      });
    }
  });
}

function addTeamAlerts(alerts: OperationAlert[], rows: SheetRow[]) {
  const busyRows = rows.filter((row) => toText(row.availability) === "Busy");

  if (busyRows.length >= Math.max(2, Math.ceil(rows.length * 0.6))) {
    pushAlert(alerts, {
      id: "team:capacity:busy",
      title: "Team capacity is under pressure",
      message: `${busyRows.length} team member${busyRows.length === 1 ? " is" : "s are"} marked busy right now.`,
      severity: "medium",
      sheet: "team",
      actionLabel: "Check workload"
    });
  }
}

export function deriveOperationalAlerts(sheets: Record<SheetKey, SheetData>) {
  const alerts: OperationAlert[] = [];
  const today = new Date();

  addProjectAlerts(alerts, sheets.projects?.rows ?? [], today);
  addLeadAlerts(alerts, sheets.leads?.rows ?? [], today);
  addContentAlerts(alerts, sheets.content?.rows ?? [], today);
  addTeamAlerts(alerts, sheets.team?.rows ?? []);

  return alerts.sort((left, right) => {
    const severityScore = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityScore[left.severity] - severityScore[right.severity];
    if (severityDiff !== 0) return severityDiff;

    const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}
