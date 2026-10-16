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
    "I'm a software engineer who likes building things people actually use, then finding out exactly where they break.",
  personal:
    "When I'm not coding, I'm playing bullet chess (rated\u00a02000), at the gym, adding to a fragrance collection, or opening another Red Bull.",
  graduation: "Graduating December 2026.",
  availability: "Available full-time from January 2027",
  workAuth: "Canadian citizen, TN-eligible for US roles (no H-1B needed). Open to relocation.",
  /** The hero's mono fact strip: the same facts as above, in recruiter order. */
  facts: ["Software engineer", "Calgary, AB", "Grad Dec 2026", "Full-time Jan 2027", "Canadian \u00b7 TN"],
  /** The personal line above, set as a small spec sheet. Same words, nothing added. */
  offTheClock: [
    { label: "Chess", value: "Bullet, rated\u00a02000" },
    { label: "Training", value: "At the gym" },
    { label: "Collecting", value: "Fragrances" },
    { label: "Fuel", value: "Another Red Bull" },
  ],
  /** The contact nameplate's spec block, restating workAuth and availability. */
  plate: [
    { label: "Based", value: "Calgary, AB" },
    { label: "Available", value: "Jan 2027" },
    { label: "Works in", value: "Canada \u00b7 US (TN)" },
    { label: "Relocation", value: "Open" },
  ],
};

export type Link = { label: string; href: string; track?: string };

export type Shot = {
  /** Path under /public. Width and height are the file's real pixels. */
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Shown in the frame's address bar. */
  url: string;
  /** A light capture is dimmed slightly in the dark theme so it isn't a white slab. */
  tone?: "light" | "dark";
};

export type FeaturedProject = {
  slug: "cyd" | "systemlab";
  name: string;
  /** Short name and view for the mono label tab on the screenshot's mat. */
  tab: string;
  summary: string;
  role: string;
  facts: Array<{ value: string; label: string }>;
  hardPart: { title: string; body: string };
  stack: string[];
  links: Link[];
  shot: Shot;
  phone?: Shot;
};

export const featured: FeaturedProject[] = [
  {
    slug: "systemlab",
    name: "Systemlab",
    tab: "Systemlab \u00b7 lesson view",
    summary:
      "A system design trainer built on a discrete-event simulator I wrote. You design an architecture, estimate its latency and cost, then run it and see where it breaks.",
    role: "Solo project, open source",
    facts: [
      { value: "70", label: "lessons in 12 chapters" },
      { value: "948", label: "tests" },
      { value: "180K", label: "requests simulated in under 2 s" },
    ],
    hardPart: {
      title: "Answers that hold across seeds",
      body:
        "Each lesson's reference solution has to pass at every seed, not just the lucky one, so the engine is fully deterministic and runs in a Web Worker. Replication lag, quorums, retries, circuit breakers and region outages are all modelled.",
    },
    stack: ["TypeScript", "Next.js", "React Flow", "Web Workers", "Gemini", "Vitest"],
    links: [
      { label: "Try it", href: "https://system-design-playground-pi.vercel.app", track: "project:systemlab-live" },
      { label: "Code", href: "https://github.com/VVarrior1/systemlab", track: "project:systemlab-code" },
    ],
    shot: {
      src: "/work/systemlab-lesson.jpg",
      width: 2400,
      height: 1560,
      alt: "A Systemlab lesson after a run: traffic, API server and database on a canvas, with the API server at 100% utilization and p95 latency of 4.8 seconds.",
      url: "system-design-playground-pi.vercel.app/learn",
      tone: "light",
    },
  },
  {
    slug: "cyd",
    name: "CYD Soccer Academy platform",
    tab: "CYD \u00b7 venue picker",
    summary:
      "Registration, Stripe billing, SMS and email, and roster sync for a youth soccer academy in Calgary. Families sign up and pay without anyone entering data by hand.",
    role: "Sole engineer, May 2025 to now",
    facts: [
      { value: "~300", label: "active families" },
      { value: "5", label: "Calgary venues" },
      { value: "~90", label: "API routes" },
    ],
    hardPart: {
      title: "Text messages that cost what they should",
      body:
        "One curly apostrophe or emoji switches a whole SMS from GSM-7 to UCS-2, which cuts a billed segment from 160 characters to 70, so a 320-character notice went from 3 segments to 5 for every family. I added a sanitizer, a live segment and cost count in the broadcast composer, and the same check on the server.",
    },
    stack: ["Next.js", "TypeScript", "Stripe", "Twilio", "Resend", "Google Sheets API", "TeamSnap API"],
    links: [
      { label: "Case study", href: "https://github.com/VVarrior1/cyd-platform-case-study", track: "project:cyd-case-study" },
      { label: "Live site", href: "https://cydsoccer.com", track: "project:cyd-live" },
    ],
    shot: {
      src: "/work/cyd-venue-picker.jpg",
      width: 1662,
      height: 1110,
      alt: "The CYD venue picker: venues are filtered by the child's age, so a full group and a venue with no group for that age are shown but can't be picked.",
      url: "cydsoccer.com/register",
      tone: "dark",
    },
    phone: {
      src: "/work/cyd-register-phone.jpg",
      width: 1170,
      height: 2532,
      alt: "Step one of the CYD registration flow on a phone: parent details and whether the child is new or returning.",
      url: "cydsoccer.com/register",
    },
  }
];

export const otherProjects: Array<{ name: string; summary: string; href?: string; stack: string }> = [
  {
    name: "Road object detection",
    summary:
      "Fine-tuned YOLOv8 and YOLOv11 on a 12-class Egyptian traffic dataset, with tuk-tuks and street banners that Western benchmarks don't have. I owned the v11 training and the accuracy-versus-cost comparison.",
    stack: "Python, PyTorch, Ultralytics",
  },
  {
    name: "Vectorized Fashion AI",
    summary: "Multimodal product search with CLIP embeddings in FAISS and RAG-written descriptions.",
    href: "https://github.com/VVarrior1/Vectorized-fashion-ai",
    stack: "Python, FAISS, Streamlit",
  },
  {
    name: "KanDoIt",
    summary: "Kanban board with admin, manager and user roles.",
    href: "https://github.com/VVarrior1/KanDoIt",
    stack: "Next.js, Prisma, PostgreSQL, Docker",
  },
  {
    name: "Data bias detector",
    summary: "Upload a CSV and see class imbalance before you train on it.",
    href: "https://github.com/VVarrior1/Data_Bias_detector_and_Visualizer",
    stack: "Next.js, TypeScript",
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
      "Sole engineer on the academy's booking and payments platform: registration, Stripe billing, SMS and email, roster sync and the staff dashboard.",
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
