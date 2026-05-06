import type { SheetData, SheetKey } from "@/lib/types";

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
      { id: "servicePitch", label: "Service To Offer", type: "text", width: "180px" },
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
  }
};

export function createDefaultSheets(): Record<SheetKey, SheetData> {
  return JSON.parse(JSON.stringify(defaultSheets)) as Record<SheetKey, SheetData>;
}
