// All profile content in one place. Source of truth: the October 2026 résumés
// and the CYD platform case study (github.com/VVarrior1/cyd-platform-case-study).

export const SITE_URL = "https://abdelrahmanmohamed1.netlify.app";
export const RESUME_PATH = "/Abdelrahman_Mohamed_Resume.pdf";

export const profile = {
  name: "Abdelrahman Mohamed",
  firstName: "Abdelrahman",
  lastName: "Mohamed",
  role: "Full-stack and AI engineer",
  location: "Calgary, Alberta",
  email: "abdel.mohamed.engineer@gmail.com",
  github: "https://github.com/VVarrior1",
  linkedin: "https://www.linkedin.com/in/abdelrahman-mohamed-080488197/",
  intro:
    "I build software that real businesses run on. Since May 2025 I've been the only engineer behind the booking, payments and messaging platform of a Calgary youth soccer academy.",
  availability: "Graduating December 2026. Available full-time from January 2027.",
  workAuth: "Canadian citizen, TN-eligible for US roles (no H-1B needed). Open to relocation.",
};

export type TraceStep = {
  service: string;
  detail: string;
};

/** The hero animation: one paid registration on cydsoccer.com, end to end. */
export const signupTrace: TraceStep[] = [
  { service: "Next.js", detail: "Parent finishes the three-step registration form" },
  { service: "Stripe", detail: "Checkout session for a one-time, instalment or monthly plan" },
  { service: "Stripe", detail: "Payment confirmed, session id returned" },
  { service: "Sheets", detail: "Registration row written to the primary sheet and its backup" },
  { service: "Twilio", detail: "Confirmation SMS, kept in GSM-7 so it bills as fewer segments" },
  { service: "Resend", detail: "Confirmation email with venue, schedule and plan" },
  { service: "TeamSnap", detail: "Player added to the right team and sent an invite" },
];

export type Link = { label: string; href: string; track?: string };

export type FeaturedProject = {
  slug: string;
  name: string;
  summary: string;
  role: string;
  period: string;
  stack: string[];
  facts: Array<{ value: string; label: string }>;
  built: string[];
  decisions: Array<{ title: string; body: string }>;
  links: Link[];
};

export const flagship: FeaturedProject = {
  slug: "cyd",
  name: "CYD Soccer Academy platform",
  summary:
    "Registration, payments, roster sync and parent messaging for a youth soccer academy. The owner and staff run the business from it, and families register and pay without anyone entering data by hand.",
  role: "Sole engineer: design, build, deploy, operate",
  period: "May 2025 to now",
  stack: ["Next.js 15", "TypeScript", "Vercel", "Stripe", "Twilio", "Resend", "Google Sheets API", "TeamSnap API", "Gemini"],
  facts: [
    { value: "~300", label: "active families across 5 Calgary venues" },
    { value: "1,000+", label: "commits, about 90 API routes" },
    { value: "up to 40%", label: "fewer SMS segments on longer notices" },
    { value: "$0–15", label: "a month for messaging, against a $97 floor for the CRM I evaluated" },
  ],
  built: [
    "A three-step registration flow that only offers venues, groups and payment plans that fit the child's age and the venue's schedule.",
    "Stripe Checkout for pay-in-full, fixed instalments and open monthly subscriptions, plus payment links and a manual screen for families who pay in person.",
    "Automatic TeamSnap roster sync, so coaches see a new player as soon as they've paid.",
    "Email and SMS confirmations, reminders and abandoned-checkout sequences, with a broadcast composer that shows segment count and cost before sending.",
    "Self-serve rescheduling with SMS verification, and an operations dashboard with registrations, rosters and marketing attribution carried through to Stripe.",
  ],
  decisions: [
    {
      title: "Pull, don't wait for a push",
      body:
        "Stripe can't stop a subscription after exactly N payments, and the webhook that did it failed silently, so some plans billed past their end date. I replaced it with a daily job that asks Stripe which plans are finished. It ran in report-only mode until its reports matched what I expected.",
    },
    {
      title: "Smart quotes were doubling the SMS bill",
      body:
        "One curly apostrophe or emoji pushes a message out of GSM-7 into UCS-2, which halves the characters per billed segment. Sanitizing input and estimating segments before sending cut long notices by up to 40%.",
    },
    {
      title: "Google Sheets as the database",
      body:
        "Staff already ran the business from a spreadsheet, so a Postgres copy only drifted out of sync. I removed it, kept a live backup sheet, and made anything that moves money read Stripe rather than a cell.",
    },
  ],
  links: [
    { label: "Read the case study", href: "https://github.com/VVarrior1/cyd-platform-case-study", track: "project:cyd-case-study" },
    { label: "cydsoccer.com", href: "https://cydsoccer.com", track: "project:cyd-live" },
  ],
};

export type Project = {
  name: string;
  summary: string;
  detail: string;
  stack: string[];
  links: Link[];
};

export const projects: Project[] = [
  {
    name: "Systemlab",
    summary: "A system design trainer built on a discrete-event simulator I wrote.",
    detail:
      "70 lessons where you build an architecture, estimate its latency and cost, then run it against a seeded simulation of replication lag, quorums, sharding, retries, circuit breakers and region outages. It simulates 180,000 requests in under two seconds in a Web Worker, and every reference solution is checked by 948 tests. There's also a voice mock interview graded by Gemini.",
    stack: ["TypeScript", "Next.js", "React Flow", "Web Workers", "Gemini", "Supabase", "Vitest"],
    links: [
      { label: "Try it", href: "https://system-design-playground-pi.vercel.app", track: "project:systemlab-live" },
      { label: "Code", href: "https://github.com/VVarrior1/systemlab", track: "project:systemlab-code" },
    ],
  },
  {
    name: "ApplyOps",
    summary: "An LLM pipeline that isn't allowed to make things up.",
    detail:
      "It tailors résumés, and every generated line has to cite a fact from a verified store or it's stripped before the PDF renders. A 39-item golden set holds the hallucination rate at 0.28%, and a GitHub Actions gate re-runs it on every pull request, blocking changes that make the output worse. A public benchmark picks the cheapest model that isn't measurably worse.",
    stack: ["TypeScript", "Next.js", "Postgres", "Drizzle", "Vercel AI SDK", "GitHub Actions"],
    links: [
      { label: "Try it", href: "https://applyops-two.vercel.app", track: "project:applyops-live" },
      { label: "Code", href: "https://github.com/VVarrior1/applyops", track: "project:applyops-code" },
    ],
  },
  {
    name: "Road object detection",
    summary: "YOLOv8 vs YOLOv11 on Egyptian street traffic.",
    detail:
      "A team of three fine-tuning detectors on a 12-class dataset with things Western driving benchmarks don't have, like tuk-tuks and street banners. I owned the YOLOv11 training and the accuracy-versus-cost comparison (parameters, FLOPs, latency) behind the model we recommended.",
    stack: ["Python", "PyTorch", "Ultralytics YOLOv8/v11"],
    links: [],
  },
];

export const smallerProjects: Array<{ name: string; summary: string; href: string }> = [
  {
    name: "Vectorized Fashion AI",
    summary: "Multimodal product search with CLIP embeddings in FAISS and RAG-written descriptions.",
    href: "https://github.com/VVarrior1/Vectorized-fashion-ai",
  },
  {
    name: "KanDoIt",
    summary: "Kanban board with admin, manager and user roles. Next.js, Prisma, PostgreSQL, Docker.",
    href: "https://github.com/VVarrior1/KanDoIt",
  },
  {
    name: "Data bias detector",
    summary: "Upload a CSV and see class imbalance before you train on it.",
    href: "https://github.com/VVarrior1/Data_Bias_detector_and_Visualizer",
  },
  {
    name: "Apple Health analyzer",
    summary: "Explore steps, heart rate, workouts and sleep from an Apple Watch export.",
    href: "https://github.com/VVarrior1/Health_Tracker_data",
  },
];

export type Experience = {
  company: string;
  role: string;
  start: string;
  end: string;
  place: string;
  summary: string;
  link?: string;
};

export const experience: Experience[] = [
  {
    company: "CYD Soccer Academy",
    role: "Software engineer and technical partner",
    start: "May 2025",
    end: "Now",
    place: "Calgary",
    link: "https://cydsoccer.com",
    summary:
      "Sole engineer on the platform described above: registration, Stripe billing, SMS and email, roster sync and the staff dashboard.",
  },
  {
    company: "City of Calgary",
    role: "Software engineer, capstone project",
    start: "Sep 2025",
    end: "Apr 2026",
    place: "Calgary",
    summary:
      "Built a Python ETL pipeline on Azure that pulls greenhouse-gas activity data from four business units into SQL Server, replacing a manual spreadsheet process, with validation that flags bad source data and Power BI reporting for staff.",
  },
  {
    company: "Mercor",
    role: "Software engineering expert, AI training",
    start: "Nov 2025",
    end: "Jan 2026",
    place: "Remote",
    summary:
      "Wrote agentic coding evaluations from real GitHub repositories (CLI tools, data science, full-stack apps) and scored model attempts for correctness and performance.",
  },
  {
    company: "Customer Maps",
    role: "AI/ML intern, Google Innovate Program",
    start: "Mar 2025",
    end: "Jun 2025",
    place: "Calgary",
    summary:
      "Built retail AI agents on Vertex AI and Google's Agent Development Kit to automate a recurring reporting workflow, with BigQuery pipelines over 100K+ records and React dashboards.",
  },
  {
    company: "DATech",
    role: "AI evaluation contractor (RLHF)",
    start: "Apr 2024",
    end: "Mar 2025",
    place: "Remote",
    summary:
      "Reviewed and scored 1,000+ model-written code samples in Python, JavaScript and SQL for correctness, security and style, producing preference data for RLHF training.",
  },
];

export const education = {
  school: "University of Calgary",
  degree: "BSc in Computer Science",
  graduation: "December 2026",
  honours: "Dean's List, Faculty of Science (Winter 2023)",
  coursework: [
    "Web-based systems",
    "Database management",
    "Data structures and algorithms",
    "Design and analysis of algorithms",
    "Deep learning for vision",
    "Operating systems",
    "Computer networks",
  ],
};

export const skills: Array<{ group: string; items: string }> = [
  { group: "Languages", items: "TypeScript, Python, SQL, Java" },
  { group: "Web and data", items: "Next.js, React, Node.js, PostgreSQL, Supabase, SQL Server, Prisma, Stripe" },
  { group: "AI and ML", items: "LLM pipelines and evals, RAG and vector search, Vertex AI, Gemini, PyTorch, YOLO" },
  { group: "Cloud and tools", items: "Vercel, GCP, BigQuery, Azure, Docker, GitHub Actions, Power BI" },
];
