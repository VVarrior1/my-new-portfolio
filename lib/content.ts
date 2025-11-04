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
  title: "Software Developer",
  summary:
    "Co-founder at GenLabs. I build web apps, work with data, and solve problems with code.",
  location: "Calgary, AB",
  availability: "Open to full-time software roles for 2025",
  spotlight: {
    label: "Working on AI tools at GenLabs",
    href: "https://genlabs.ca",
  },
  typewriterLines: [
    "> building web applications",
    "> working with databases and APIs",
    "> writing Python and TypeScript",
    "> solving real problems with code",
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
      "Co-founded a startup building AI tools for businesses.",
      "Lead product development and technical implementation.",
      "Manage a team of 4 people.",
    ],
  },
  {
    company: "Google Innovate Program – Customer Maps",
    role: "Software Intern",
    start: "Mar 2025",
    end: "Jun 2025",
    location: "Calgary, AB",
    bullets: [
      "Built AI tools that reduced reporting time by 60%.",
      "Built data systems handling 100K+ records.",
      "Created dashboards to display insights.",
    ],
  },
  {
    company: "DATech",
    role: "Prompt Engineer",
    start: "Apr 2024",
    end: "Jun 2025",
    location: "Remote (New York, NY)",
    bullets: [
      "Reviewed 1,000+ AI code samples to improve model accuracy by 20%.",
      "Improved AI training through systematic testing and feedback.",
      "Wrote documentation that improved team consistency.",
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
      "Website for a soccer academy with program listings, Stripe payments, and automated enrollment tracking.",
    highlights: [
      "Built a responsive site where families can browse programs and sign up.",
      "Set up Stripe payments that sync to Google Sheets. Processed $15K+ with 3K monthly visitors.",
    ],
  },
  {
    name: "Ascendr",
    tech: ["Next.js", "Firebase", "Tailwind", "TypeScript"],
    link: "https://ascendr.quest",
    description:
      "Productivity app with game-like rewards and real-time syncing.",
    highlights: [
      "Built authentication and real-time features using Firebase.",
      "Created a quest system with rewards to keep users engaged.",
    ],
  },
  {
    name: "GenLabs – AI Tools",
    tech: ["Python", "Vertex AI", "Cloud Run", "BigQuery"],
    link: "https://genlabs.ca",
    description:
      "AI tools that handle voice and text requests, with search and automated reports.",
    highlights: [
      "Built AI that handles voice and chat, routing requests to the right tools.",
      "Built search that helps teams find answers quickly.",
    ],
  },
  {
    name: "KanDoIt – Project Management",
    tech: ["Next.js", "Prisma", "PostgreSQL", "Docker"],
    link: "https://github.com/VVarrior1/KanDoIt",
    description:
      "Team project management tool with user permissions and Docker deployment.",
    highlights: [
      "Built APIs with Prisma and PostgreSQL.",
      "Set up Docker for easy local development.",
    ],
  },
  {
    name: "AI Fashion Recommendations",
    tech: ["Python", "Faiss", "Vertex AI"],
    link: "https://github.com/VVarrior1/Vectorized-fashion-ai",
    description:
      "AI-powered fashion recommendation system.",
    highlights: [
      "Built fast search across clothing catalogs using AI.",
      "Added conversational AI for personalized style advice.",
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

export const stats: Array<{ label: string; value: string }> = [];

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
