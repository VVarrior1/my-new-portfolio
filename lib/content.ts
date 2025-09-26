type HeroAction = {
  label: string;
  href: string;
  download?: boolean;
};

export const hero: {
  name: string;
  title: string;
  summary: string;
  location: string;
  availability: string;
  spotlight: {
    label: string;
    href?: string;
  };
  typewriterLines: string[];
  actions: HeroAction[];
} = {
  name: "Abdelrahman Mohamed",
  title: "AI Engineer & Full-Stack Developer",
  summary:
    "Co-founder shipping AI automation at GenLabs, building data-driven products that blend modern frontend craft with production-grade ML systems.",
  location: "Calgary, AB",
  availability: "Open to full-time Software Engineer and AI/ML roles for 2025",
  spotlight: {
    label: "Currently launching Vertex AI agents at GenLabs",
    href: "https://genlabs.ca",
  },
  typewriterLines: [
    "> deploying Vertex AI agents to production",
    "> analysing 100k+ row datasets with Python",
    "> leading co-founder sprints at GenLabs",
    "> building full-stack platforms with Next.js",
  ],
  actions: [
    {
      label: "Email",
      href: "mailto:abdel.mohamed.engineer@gmail.com",
    },
    {
      label: "View Résumé",
      href: "/Abdelrahman_Mohamed_Resume.pdf",
      download: true,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/abdelrahman-mohamed-080488197/",
    },
    {
      label: "GitHub",
      href: "https://github.com/VVarrior1",
    },
  ],
};

export type SkillCategory = {
  name: string;
  items: string[];
};

export const skillCategories: SkillCategory[] = [
  {
    name: "Deep Expertise",
    items: [
      "Claude Code",
      "Python",
      "SQL",
      "TypeScript",
      "Next.js",
      "Docker",
      "TensorFlow",
      "Vertex AI",
      "GCP",
      "Data Structures & Algorithms",
    ],
  },
  {
    name: "Product & Platform",
    items: [
      "System Design",
      "REST APIs",
      "React",
      "Firebase",
      "Prisma",
      "PostgreSQL",
      "Tailwind CSS",
      "BigQuery",
      "Azure",
      "Git",
    ],
  },
  {
    name: "Additional Tools",
    items: [
      "C",
      "C++",
      "C#",
      "AWS",
      "CI/CD",
      "Agile",
      "UX/UI Principles",
      "RAG Pipelines",
      "Faiss",
      "Vector Databases",
    ],
  },
];

export type Experience = {
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  bullets: string[];
  link?: string;
};

export const experiences: Experience[] = [
  {
    company: "GenLabs Inc.",
    role: "Co-Founder",
    start: "Jun 2025",
    end: "Present",
    location: "Calgary, AB",
    link: "https://genlabs.ca",
    bullets: [
      "Co-founded an AI agents startup delivering Google Cloud automation across industries.",
      "Led product vision and Vertex AI implementations powering end-to-end automation workflows.",
      "Coordinated roadmap, discovery, and technical execution for a four-person product team.",
    ],
  },
  {
    company: "Google Innovate Program – Customer Maps",
    role: "AI/ML Intern",
    start: "Mar 2025",
    end: "Jun 2025",
    location: "Calgary, AB",
    bullets: [
      "Built retail-focused AI agents with Vertex AI & ADK, cutting reporting time by 60%.",
      "Designed secure data pipelines across BigQuery + GCS for 100K+ records.",
      "Delivered React dashboards surfacing agent insights to non-technical stakeholders.",
    ],
  },
  {
    company: "DATech",
    role: "Prompt Engineer",
    start: "Apr 2024",
    end: "Jun 2025",
    location: "Remote (New York, NY)",
    bullets: [
      "Evaluated 1,000+ AI-generated code samples to improve LLM accuracy by 20%+.",
      "Enhanced RLHF pipelines through structured analysis of model behavior and prompts.",
      "Authored prompt/playbook updates that lifted consistency across global annotation teams.",
    ],
  },
];

export type Project = {
  name: string;
  tech: string[];
  description: string;
  highlights: string[];
  link?: string;
};

export const projects: Project[] = [
  {
    name: "CYD Soccer Performance Hub",
    tech: ["Next.js", "TypeScript", "Supabase", "Tailwind"],
    description:
      "Data-powered club platform tracking player metrics, fixtures, and operational workflows for a Calgary youth program.",
    highlights: [
      "Built real-time dashboards for coaches to review match metrics, attendance, and progress using Supabase live queries.",
      "Shipped roster management tools, training plans, and automated email updates to families and volunteers.",
    ],
  },
  {
    name: "Ascendr",
    tech: ["Next.js", "Firebase", "Tailwind", "TypeScript"],
    link: "https://ascendr.quest",
    description:
      "Gamified productivity platform that blends behavioral design with real-time sync.",
    highlights: [
      "Architected auth, Firestore, and hosting, delivering real-time multiplayer state via Firebase services.",
      "Created modular quests, XP rewards, and progression engine powering stickiness and retention.",
    ],
  },
  {
    name: "Founder Ops – Vertex AI Agent Suite",
    tech: ["Python", "Vertex AI", "Cloud Run", "BigQuery"],
    description:
      "Internal GenLabs stack orchestrating retrieval, tool use, and reporting pipelines for production AI agents.",
    highlights: [
      "Designed modular agent graph with Vertex AI Extensions and Cloud Functions to automate B2B workflows.",
      "Implemented metrics ingestion and cost dashboards on BigQuery + Looker to keep stakeholders aligned in weekly sprints.",
    ],
  },
  {
    name: "KanDoIt – KanBan Suite",
    tech: ["Next.js", "Prisma", "PostgreSQL", "Docker"],
    description:
      "Team KanBan tool with RBAC, collaborative workflows, and production-ready DevOps.",
    highlights: [
      "Designed REST APIs backed by Prisma ORM and PostgreSQL for reliable project operations.",
      "Containerized stack with Docker for a frictionless onboarding flow across contributors.",
    ],
  },
  {
    name: "AI Fashion Recommendation Engine",
    tech: ["Python", "Faiss", "Vertex AI", "RAG"],
    description:
      "Vector search system surfacing hyper-personalized apparel recommendations.",
    highlights: [
      "Generated dense embeddings and tuned ANN search for millisecond retrieval across catalog data.",
      "Layered RAG workflows with LLMs to deliver contextual, conversational styling suggestions.",
    ],
  },
];

export const education = {
  school: "University of Calgary",
  degree: "B.Sc. Computer Science",
  graduation: "Apr 2026",
  location: "Calgary, AB",
  highlights: [
    "Relevant coursework: Database Systems, Software Engineering, Operating Systems, Networks",
    "Certifications: Microsoft Azure Fundamentals, Machine Learning (Coursera), Full Stack Web Development (Udemy)",
  ],
};

export const stats = [
  {
    label: "AI code reviews delivered",
    value: "1k+",
  },
  {
    label: "Production ML launches",
    value: "10",
  },
  {
    label: "Years shipping software",
    value: "4",
  },
];

export const contact = {
  email: "abdel.mohamed.engineer@gmail.com",
  phone: "+1 (587) 891-6940",
  location: "Calgary, AB",
  socials: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/abdelrahman-mohamed-080488197/",
    },
    {
      label: "GitHub",
      href: "https://github.com/VVarrior1",
    },
    {
      label: "Portfolio",
      href: "https://abdelrahmanmohamed1.netlify.app/",
    },
  ],
};
