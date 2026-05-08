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
    monday: "Daily planning and inbox clear",
    tuesday: "Client follow-up calls",
    wednesday: "Deep work on delivery",
    thursday: "Proposal writing",
    friday: "Weekly planning",
    saturday: "Backlog cleanup",
    sunday: "Light personal planning"
  },
  {
    id: "slot-2",
    slotLabel: "Period 2",
    timeRange: "11:30 AM - 12:30 PM",
    monday: "Service page updates",
    tuesday: "Content edits",
    wednesday: "Internal review block",
    thursday: "Lead research",
    friday: "Client revisions",
    saturday: "System improvements",
    sunday: ""
  },
  {
    id: "slot-3",
    slotLabel: "Period 3",
    timeRange: "12:30 PM - 1:30 PM",
    monday: "Website build sprint",
    tuesday: "CRM delivery block",
    wednesday: "Landing page polish",
    thursday: "Automation setup",
    friday: "Pending task finish",
    saturday: "Learning and experimentation",
    sunday: ""
  },
  {
    id: "slot-4",
    slotLabel: "Lunch",
    timeRange: "1:30 PM - 2:00 PM",
    monday: "Lunch break",
    tuesday: "Lunch break",
    wednesday: "Lunch break",
    thursday: "Lunch break",
    friday: "Lunch break",
    saturday: "Lunch break",
    sunday: "Family time"
  },
  {
    id: "slot-5",
    slotLabel: "Period 4",
    timeRange: "2:00 PM - 3:00 PM",
    monday: "Client meeting block",
    tuesday: "Design review",
    wednesday: "Operations work",
    thursday: "Sales outreach",
    friday: "Finance review",
    saturday: "Admin work",
    sunday: ""
  },
  {
    id: "slot-6",
    slotLabel: "Period 5",
    timeRange: "3:00 PM - 4:00 PM",
    monday: "Development sprint",
    tuesday: "Content production",
    wednesday: "Development sprint",
    thursday: "Client call block",
    friday: "Team sync",
    saturday: "Template cleanup",
    sunday: ""
  },
  {
    id: "slot-7",
    slotLabel: "Period 6",
    timeRange: "4:00 PM - 5:00 PM",
    monday: "Testing and QA",
    tuesday: "Documentation",
    wednesday: "Testing and QA",
    thursday: "Revision block",
    friday: "Follow-up messages",
    saturday: "Catch-up work",
    sunday: ""
  },
  {
    id: "slot-8",
    slotLabel: "Break",
    timeRange: "5:00 PM - 5:30 PM",
    monday: "Tea break",
    tuesday: "Tea break",
    wednesday: "Tea break",
    thursday: "Tea break",
    friday: "Tea break",
    saturday: "Tea break",
    sunday: ""
  },
  {
    id: "slot-9",
    slotLabel: "Period 7",
    timeRange: "5:30 PM - 6:30 PM",
    monday: "Client support",
    tuesday: "Ad hoc tasks",
    wednesday: "Project fixes",
    thursday: "Client support",
    friday: "Loose-end cleanup",
    saturday: "Planning next week",
    sunday: ""
  },
  {
    id: "slot-10",
    slotLabel: "Period 8",
    timeRange: "6:30 PM - 7:30 PM",
    monday: "Second deep work block",
    tuesday: "Proposal and quote work",
    wednesday: "Second deep work block",
    thursday: "Content scheduling",
    friday: "Dashboard updates",
    saturday: "Personal admin",
    sunday: ""
  },
  {
    id: "slot-11",
    slotLabel: "Period 9",
    timeRange: "7:30 PM - 8:15 PM",
    monday: "Review active projects",
    tuesday: "Review pipeline",
    wednesday: "Review deliveries",
    thursday: "Review content plan",
    friday: "Weekly wrap-up",
    saturday: "Reflection notes",
    sunday: ""
  },
  {
    id: "slot-12",
    slotLabel: "Period 10",
    timeRange: "8:15 PM - 9:00 PM",
    monday: "Next-day planning",
    tuesday: "Next-day planning",
    wednesday: "Next-day planning",
    thursday: "Next-day planning",
    friday: "Shutdown routine",
    saturday: "Shutdown routine",
    sunday: "Prepare next week"
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
    rows: [
      {
        id: "project-1",
        projectName: "Taste & Table Website",
        clientName: "Ravi Menon",
        sector: "Food",
        category: "Website",
        domain: "Restaurant",
        address: "Bengaluru",
        projectStatus: "In Progress",
        paymentStatus: "Partially Paid",
        projectValue: 85000,
        amountReceived: 45000,
        pendingAmount: 40000,
        completionPercent: 68,
        startDate: "2026-04-10",
        deliveryDate: "2026-05-20",
        notes: "Homepage and menu flow approved"
      },
      {
        id: "project-2",
        projectName: "Northline CRM",
        clientName: "Sara James",
        sector: "Creative",
        category: "CRM",
        domain: "Studio",
        address: "Remote",
        projectStatus: "Completed",
        paymentStatus: "Paid",
        projectValue: 165000,
        amountReceived: 165000,
        pendingAmount: 0,
        completionPercent: 100,
        startDate: "2026-02-01",
        deliveryDate: "2026-03-15",
        notes: "Delivered and retained for support"
      }
    ]
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
    rows: [
      {
        id: "lead-1",
        businessName: "Alto Legal",
        contactName: "Nina Patel",
        category: "Legal",
        servicePitch: "Client portal + automation",
        callStatus: "Connected",
        leadStatus: "Follow-up",
        followUpDate: "2026-05-10",
        expectedValue: 120000,
        callCount: 2,
        notes: "Asked for pricing details"
      },
      {
        id: "lead-2",
        businessName: "Bloomline",
        contactName: "Keerthi Anand",
        category: "Fashion",
        servicePitch: "Content system + landing page",
        callStatus: "Interested",
        leadStatus: "Proposal Sent",
        followUpDate: "2026-05-11",
        expectedValue: 55000,
        callCount: 3,
        notes: "Waiting for internal decision"
      }
    ]
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
    rows: [
      {
        id: "revenue-1",
        entryDate: "2026-05-01",
        entryType: "Income",
        sourceName: "Northline CRM",
        sector: "Creative",
        category: "CRM",
        amount: 165000,
        paymentMode: "Bank Transfer",
        remarks: "Final payment received"
      },
      {
        id: "revenue-2",
        entryDate: "2026-05-03",
        entryType: "Expense",
        sourceName: "Hosting + tools",
        sector: "Operations",
        category: "Software",
        amount: 18500,
        paymentMode: "Card",
        remarks: "Subscriptions and VPS"
      },
      {
        id: "revenue-3",
        entryDate: "2026-05-04",
        entryType: "Personal Use",
        sourceName: "Owner withdrawal",
        sector: "Personal",
        category: "Drawings",
        amount: 12000,
        paymentMode: "UPI",
        remarks: "Personal spend"
      }
    ]
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
    rows: [
      {
        id: "team-1",
        memberName: "Karthik",
        role: "Founder",
        availability: "Busy",
        notes: "Handles strategy, sales, and delivery"
      },
      {
        id: "team-2",
        memberName: "Partner",
        role: "Operations",
        availability: "Available",
        notes: "Handles coordination and finance tracking"
      }
    ]
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
    rows: [
      {
        id: "content-1",
        contentTitle: "How we build business websites",
        platform: "Instagram",
        stage: "Scheduled",
        publishDate: "2026-05-09",
        owner: "Karthik",
        goal: "Get local business leads",
        leadsGenerated: 3,
        notes: "Use before/after screenshots"
      }
    ]
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
    rows: [
      {
        id: "service-1",
        serviceName: "Business Website",
        price: 85000,
        estimatedTimeline: "3 weeks",
        projectsDone: 18,
        avgDeliveryDays: 21,
        monthlyLeads: 14,
        status: "Core Offer",
        notes: "Most common starter offer for local brands"
      },
      {
        id: "service-2",
        serviceName: "CRM Automation",
        price: 165000,
        estimatedTimeline: "5 weeks",
        projectsDone: 7,
        avgDeliveryDays: 34,
        monthlyLeads: 6,
        status: "High Demand",
        notes: "Higher ticket setup with better retention"
      },
      {
        id: "service-3",
        serviceName: "Content Growth System",
        price: 55000,
        estimatedTimeline: "2 weeks",
        projectsDone: 12,
        avgDeliveryDays: 14,
        monthlyLeads: 10,
        status: "Core Offer",
        notes: "Pairs well with website upsells"
      }
    ]
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
    rows: [
      {
        id: "shopping-1",
        itemName: "Wireless Mouse",
        listType: "Company",
        category: "Office Setup",
        quantity: 2,
        estimatedCost: 2400,
        priority: "Medium",
        neededBy: "2026-05-12",
        purchaseStatus: "To Buy",
        notes: "One for editing desk and one spare"
      },
      {
        id: "shopping-2",
        itemName: "Notebook and pens",
        listType: "Personal",
        category: "Stationery",
        quantity: 1,
        estimatedCost: 450,
        priority: "Low",
        neededBy: "2026-05-15",
        purchaseStatus: "Bought",
        notes: "For daily planning and rough notes"
      }
    ]
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
    rows: [
      {
        id: "server-1",
        serverName: "web-01",
        ipAddress: "192.168.10.21",
        environment: "Production",
        serverRole: "Web",
        projectName: "Pixelkode Website",
        mailServer: "mail.pixelkode.com",
        status: "Healthy",
        ownerEmail: "ops@pixelkode.com",
        businessName: "PixelKode",
        notes: "Primary web server behind load balancer"
      },
      {
        id: "server-2",
        serverName: "app-01",
        ipAddress: "192.168.10.22",
        environment: "Production",
        serverRole: "Application",
        projectName: "Northline CRM",
        mailServer: "smtp.northline.internal",
        status: "Healthy",
        ownerEmail: "devops@pixelkode.com",
        businessName: "Northline",
        notes: "Application server running Node services"
      },
      {
        id: "server-3",
        serverName: "db-01",
        ipAddress: "192.168.10.30",
        environment: "Production",
        serverRole: "Database",
        projectName: "Pixelkode Core",
        mailServer: "",
        status: "Healthy",
        ownerEmail: "dba@pixelkode.com",
        businessName: "PixelKode",
        notes: "Primary Postgres instance"
      }
    ]
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
    rows: [
      {
        id: "db-1",
        dbName: "pixelkode_prod",
        host: "db.prod.pixelkode.internal",
        port: 5432,
        engine: "Postgres",
        projectName: "Pixelkode Core",
        adminEmail: "dba@pixelkode.com",
        connString: "postgres://readonly:***@db.prod.pixelkode.internal:5432/pixelkode_prod",
        ownerEmail: "dba@pixelkode.com",
        businessName: "PixelKode",
        notes: "Production primary database"
      },
      {
        id: "db-2",
        dbName: "northline_crm",
        host: "db.crm.northline.internal",
        port: 3306,
        engine: "MySQL",
        projectName: "Northline CRM",
        adminEmail: "dba@northline.com",
        connString: "mysql://admin:***@db.crm.northline.internal:3306/northline_crm",
        ownerEmail: "dba@northline.com",
        businessName: "Northline",
        notes: "CRM database for Northline project"
      }
    ]
  }
};

export function createDefaultSheets(): Record<SheetKey, SheetData> {
  return JSON.parse(JSON.stringify(defaultSheets)) as Record<SheetKey, SheetData>;
}
