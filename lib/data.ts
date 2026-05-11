import type { SheetData, SheetKey, SheetRow } from "@/lib/types";

const timetableColumnTemplate = [
  { id: "slotLabel", label: "Period", type: "text", width: "110px" },
  { id: "timeRange", label: "Time", type: "text", width: "170px" },
  { id: "monday", label: "Monday", type: "text", width: "180px" },
  { id: "tuesday", label: "Tuesday", type: "text", width: "180px" },
  { id: "wednesday", label: "Wednesday", type: "text", width: "180px" },
  { id: "thursday", label: "Thursday", type: "text", width: "180px" },
  { id: "friday", label: "Friday", type: "text", width: "180px" },
  { id: "saturday", label: "Saturday", type: "text", width: "180px" },
  { id: "sunday", label: "Sunday", type: "text", width: "180px" }
] as const;

const timetableRowTemplate = [
  {
    id: "slot-1",
    slotLabel: "Period 1",
    timeRange: "10:30 AM - 11:30 AM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-2",
    slotLabel: "Period 2",
    timeRange: "11:30 AM - 12:30 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-3",
    slotLabel: "Period 3",
    timeRange: "12:30 PM - 1:30 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-4",
    slotLabel: "Lunch",
    timeRange: "1:30 PM - 2:00 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-5",
    slotLabel: "Period 4",
    timeRange: "2:00 PM - 3:00 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-6",
    slotLabel: "Period 5",
    timeRange: "3:00 PM - 4:00 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-7",
    slotLabel: "Period 6",
    timeRange: "4:00 PM - 5:00 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-8",
    slotLabel: "Break",
    timeRange: "5:00 PM - 5:30 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-9",
    slotLabel: "Period 7",
    timeRange: "5:30 PM - 6:30 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-10",
    slotLabel: "Period 8",
    timeRange: "6:30 PM - 7:30 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-11",
    slotLabel: "Period 9",
    timeRange: "7:30 PM - 8:15 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  },
  {
    id: "slot-12",
    slotLabel: "Period 10",
    timeRange: "8:15 PM - 9:00 PM",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: ""
  }
] as const;

const legacyTimetableDayMap: Record<string, keyof SheetRow> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday"
};

export const timetableDayColumnIds = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export function createSchoolDiaryTimetableSheet(): SheetData {
  return {
    columns: timetableColumnTemplate.map((column) => ({ ...column })),
    rows: timetableRowTemplate.map((row) => ({ ...row }))
  };
}

export function normalizeTimetableSheet(sheet: SheetData | null | undefined): SheetData {
  const template = createSchoolDiaryTimetableSheet();
  if (!sheet) return template;

  const columnIds = new Set(sheet.columns.map((column) => column.id));
  const isSchoolDiaryShape = template.columns.every((column) => columnIds.has(column.id));

  if (isSchoolDiaryShape) {
    const rowMap = new Map(sheet.rows.map((row) => [String(row.id), row]));
    return {
      columns: template.columns,
      rows: template.rows.map((row) => ({
        ...row,
        ...(rowMap.get(String(row.id)) ?? {})
      }))
    };
  }

  const looksLegacy =
    columnIds.has("day") ||
    columnIds.has("startTime") ||
    columnIds.has("endTime") ||
    columnIds.has("blockType") ||
    columnIds.has("title");

  if (!looksLegacy) {
    return template;
  }

  const migratedRows = template.rows.map((row) => ({ ...row }));
  const nextIndexByDay: Record<string, number> = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0
  };

  sheet.rows.forEach((row) => {
    const rawDay = String(row.day ?? "").trim().toLowerCase();
    const dayKey = legacyTimetableDayMap[rawDay];
    if (!dayKey) return;

    const rowIndex = nextIndexByDay[rawDay];
    if (rowIndex == null || rowIndex >= migratedRows.length) return;

    const title = String(row.title ?? "").trim();
    const blockType = String(row.blockType ?? "").trim();
    const location = String(row.location ?? "").trim();
    const notes = String(row.notes ?? "").trim();
    const startTime = String(row.startTime ?? "").trim();
    const endTime = String(row.endTime ?? "").trim();

    const parts = [
      title,
      blockType ? `(${blockType})` : "",
      startTime || endTime ? `${startTime}${startTime && endTime ? " - " : ""}${endTime}` : "",
      location ? `@ ${location}` : "",
      notes ? `- ${notes}` : ""
    ].filter(Boolean);

    migratedRows[rowIndex][dayKey] = parts.join(" ").trim();
    nextIndexByDay[rawDay] += 1;
  });

  return {
    columns: template.columns,
    rows: migratedRows
  };
}

export const sheetTitles: Record<SheetKey, { title: string; description: string }> = {
  projects: {
    title: "Projects",
    description: "Every client project you are handling, with payment and completion tracking."
  },
  leads: {
    title: "Leads",
    description: "Weekly call list, follow-ups, rejection status, and service interest."
  },
  revenue: {
    title: "Revenue",
    description: "Income, expenses, payroll, personal use, and profit tracking for the business."
  },
  team: {
    title: "Team",
    description: "Your team members, roles, payouts, active work, and availability."
  },
  content: {
    title: "Content",
    description: "Content planning sheet for reels, posts, blogs, and publishing workflow."
  },
  services: {
    title: "Services",
    description: "Service catalog with pricing, turnaround, delivery expectations, and proof of execution."
  },
  shopping: {
    title: "Shopping List",
    description: "Track things to buy for company work or personal use, with priorities and purchase status."
  },
  timetable: {
    title: "Timetable",
    description: "A school-diary style daily timetable with fixed work slots from 10:30 AM to 9:00 PM."
  },
  servers: {
    title: "Servers",
    description: "Inventory of servers with hostnames, IPs, environment, owner contact, and status."
  },
  databases: {
    title: "Databases",
    description: "Database instances and connection info with owner contact and business mappings."
  }
};

export const defaultSheets: Record<SheetKey, SheetData> = {
  projects: {
    columns: [
      { id: "projectName", label: "Project Name", type: "text", width: "180px" },
      { id: "clientName", label: "Client Name", type: "text", width: "170px" },
      { id: "sector", label: "Sector", type: "text", width: "130px" },
      { id: "category", label: "Category", type: "text", width: "130px" },
      { id: "domain", label: "Domain", type: "text", width: "150px" },
      { id: "address", label: "Address", type: "text", width: "180px" },
      {
        id: "projectStatus",
        label: "Project Status",
        type: "select",
        options: ["Not Started", "In Progress", "Partially Completed", "Completed"],
        width: "150px"
      },
      {
        id: "paymentStatus",
        label: "Payment Status",
        type: "select",
        options: ["Pending", "Partially Paid", "Paid"],
        width: "145px"
      },
      { id: "projectValue", label: "Project Value", type: "number", width: "130px" },
      { id: "amountReceived", label: "Amount Received", type: "number", width: "130px" },
      { id: "pendingAmount", label: "Pending Amount", type: "number", width: "130px" },
      { id: "completionPercent", label: "Completion %", type: "number", width: "120px" },
      { id: "startDate", label: "Start Date", type: "date", width: "130px" },
      { id: "deliveryDate", label: "Delivery Date", type: "date", width: "130px" },
      { id: "notes", label: "Notes", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  leads: {
    columns: [
      { id: "businessName", label: "Business Name", type: "text", width: "180px" },
      { id: "contactName", label: "Contact Name", type: "text", width: "150px" },
      { id: "category", label: "Category", type: "text", width: "130px" },
      {
        id: "servicePitch",
        label: "Service To Offer",
        type: "select",
        options: ["Business Website", "CRM Automation", "Content Growth System"],
        width: "190px"
      },
      {
        id: "callStatus",
        label: "Call Status",
        type: "select",
        options: ["Not Called", "Connected", "Rejected", "No Response", "Interested"],
        width: "125px"
      },
      {
        id: "leadStatus",
        label: "Lead Status",
        type: "select",
        options: ["Fresh", "Follow-up", "Proposal Sent", "Converted", "Dropped"],
        width: "135px"
      },
      { id: "followUpDate", label: "Follow-up Date", type: "date", width: "130px" },
      { id: "expectedValue", label: "Expected Value", type: "number", width: "130px" },
      { id: "callCount", label: "Call Count", type: "number", width: "110px" },
      { id: "notes", label: "Notes", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  revenue: {
    columns: [
      { id: "entryDate", label: "Date", type: "date", width: "120px" },
      {
        id: "entryType",
        label: "Entry Type",
        type: "select",
        options: ["Income", "Expense", "Payroll", "Personal Use"],
        width: "130px"
      },
      { id: "sourceName", label: "Project / Source", type: "text", width: "180px" },
      { id: "sector", label: "Sector", type: "text", width: "120px" },
      { id: "category", label: "Category", type: "text", width: "120px" },
      { id: "amount", label: "Amount", type: "number", width: "120px" },
      { id: "paymentMode", label: "Payment Mode", type: "text", width: "130px" },
      { id: "remarks", label: "Remarks", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  team: {
    columns: [
      { id: "memberName", label: "Member Name", type: "text", width: "160px" },
      { id: "role", label: "Role", type: "text", width: "130px" },
      {
        id: "availability",
        label: "Availability",
        type: "select",
        options: ["Available", "Busy", "On Hold"],
        width: "120px"
      },
      { id: "notes", label: "Notes", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  content: {
    columns: [
      { id: "contentTitle", label: "Content Title", type: "text", width: "190px" },
      {
        id: "platform",
        label: "Platform",
        type: "select",
        options: ["Instagram", "LinkedIn", "YouTube", "Blog", "Reels"],
        width: "120px"
      },
      {
        id: "stage",
        label: "Stage",
        type: "select",
        options: ["Idea", "Draft", "Designing", "Scheduled", "Posted"],
        width: "125px"
      },
      { id: "publishDate", label: "Publish Date", type: "date", width: "130px" },
      { id: "owner", label: "Owner", type: "text", width: "120px" },
      { id: "goal", label: "Goal", type: "text", width: "180px" },
      { id: "leadsGenerated", label: "Leads Generated", type: "number", width: "130px" },
      { id: "notes", label: "Notes", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  services: {
    columns: [
      { id: "serviceName", label: "Service Name", type: "text", width: "180px" },
      { id: "price", label: "Price", type: "number", width: "120px" },
      { id: "estimatedTimeline", label: "Estimated Timeline", type: "text", width: "150px" },
      { id: "projectsDone", label: "Projects Done", type: "number", width: "120px" },
      { id: "avgDeliveryDays", label: "Avg Delivery (Days)", type: "number", width: "140px" },
      { id: "monthlyLeads", label: "Monthly Leads", type: "number", width: "120px" },
      {
        id: "status",
        label: "Status",
        type: "select",
        options: ["Core Offer", "High Demand", "Seasonal", "Paused"],
        width: "120px"
      },
      { id: "notes", label: "Notes", type: "textarea", width: "140px" }
    ],
    rows: []
  },
  shopping: {
    columns: [
      { id: "itemName", label: "Item Name", type: "text", width: "190px" },
      {
        id: "listType",
        label: "For",
        type: "select",
        options: ["Company", "Personal"],
        width: "120px"
      },
      { id: "category", label: "Category", type: "text", width: "140px" },
      { id: "quantity", label: "Qty", type: "number", width: "90px" },
      { id: "estimatedCost", label: "Estimated Cost", type: "number", width: "140px" },
      {
        id: "priority",
        label: "Priority",
        type: "select",
        options: ["Low", "Medium", "High", "Urgent"],
        width: "120px"
      },
      { id: "neededBy", label: "Needed By", type: "date", width: "130px" },
      {
        id: "purchaseStatus",
        label: "Status",
        type: "select",
        options: ["To Buy", "Ordered", "Bought", "Deferred"],
        width: "130px"
      },
      { id: "notes", label: "Notes", type: "textarea", width: "180px" }
    ],
    rows: []
  },
  timetable: createSchoolDiaryTimetableSheet(),
  servers: {
    columns: [
      { id: "serverName", label: "Server Name", type: "text", width: "180px" },
      { id: "ipAddress", label: "IP Address", type: "text", width: "140px" },
      { id: "environment", label: "Environment", type: "select", options: ["Production", "Staging", "Development"], width: "140px" },
      { id: "serverRole", label: "Role", type: "select", options: ["Web", "Application", "Database", "Cache", "Worker"], width: "130px" },
      { id: "projectName", label: "Project Name", type: "text", width: "170px" },
      { id: "mailServer", label: "Mail Server", type: "text", width: "170px" },
      { id: "status", label: "Status", type: "select", options: ["Healthy", "Warning", "Down"], width: "120px" },
      { id: "ownerEmail", label: "Owner Email", type: "text", width: "200px" },
      { id: "businessName", label: "Business Name", type: "text", width: "180px" },
      { id: "notes", label: "Notes", type: "textarea", width: "160px" }
    ],
    rows: []
  },
  databases: {
    columns: [
      { id: "dbName", label: "Database Name", type: "text", width: "180px" },
      { id: "host", label: "Host", type: "text", width: "180px" },
      { id: "port", label: "Port", type: "number", width: "110px" },
      { id: "engine", label: "Engine", type: "select", options: ["Postgres", "MySQL", "MongoDB", "MSSQL"], width: "130px" },
      { id: "projectName", label: "Project Name", type: "text", width: "170px" },
      { id: "adminEmail", label: "Admin Email", type: "text", width: "200px" },
      { id: "connString", label: "Connection Info", type: "textarea", width: "220px" },
      { id: "ownerEmail", label: "Owner Email", type: "text", width: "200px" },
      { id: "businessName", label: "Business Name", type: "text", width: "180px" },
      { id: "notes", label: "Notes", type: "textarea", width: "160px" }
    ],
    rows: []
  }
};

export function createDefaultSheets(): Record<SheetKey, SheetData> {
  return JSON.parse(JSON.stringify(defaultSheets)) as Record<SheetKey, SheetData>;
}
