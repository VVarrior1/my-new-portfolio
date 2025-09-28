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
    name: "CYD Soccer Academy Programs",
    tech: ["Next.js", "TypeScript", "Supabase", "Tailwind"],
    link: "https://cydsoccer.com",
    description:
      "Customer-facing site for CYD Soccer Academy that showcases training programs, handles plan purchases with Stripe, and syncs signups into Google Sheets via GCP automations.",
    highlights: [
      "Crafted responsive program catalog, testimonials, and FAQ so families can explore plans and enroll from any device.",
      "Integrated Stripe checkout with GCP automations that log enrollments to Google Sheets—processing $15K+ while maintaining a 100% performance score for 3K monthly visitors.",
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
    name: "GenLabs – AI Agents",
    tech: ["Python", "Vertex AI", "Cloud Run", "BigQuery"],
    link: "https://genlabs.ca",
    description:
      "Production AI agents with voice + text orchestration, embedding search, and automated reporting for GenLabs clients.",
    highlights: [
      "Built multi-modal agents that handle voice or chat requests, route tools, and trigger automations over Vertex AI.",
      "Shipped an AI search that blends embeddings, similarity search, and structured data so teams find answers instantly.",
    ],
  },
  {
    name: "KanDoIt – KanBan Suite",
    tech: ["Next.js", "Prisma", "PostgreSQL", "Docker"],
    link: "https://github.com/VVarrior1/KanDoIt",
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
    link: "https://github.com/VVarrior1/Vectorized-fashion-ai",
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
