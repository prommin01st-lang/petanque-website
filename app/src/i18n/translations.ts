export type Language = 'en' | 'th';

export const translations = {
  en: {
    // Navbar
    nav: {
      home: 'Home',
      about: 'About',
      skills: 'Skills',
      projects: 'Projects',
      contact: 'Contact',
    },

    // Hero
    hero: {
      greeting: '> whoami',
      name: 'PROMMIN.L',
      tagline:
        'Full-Stack Developer & DevOps-oriented engineer building real-time collaboration systems, enterprise backends, and developer automation — solo.',
      ctaPrimary: 'View Projects',
      ctaSecondary: 'Contact Me',
      statusLabel: 'status',
      statusValue: 'online — open for collaboration',
      stats: [
        { value: '10+', label: 'Projects Shipped' },
        { value: '~50%', label: 'Overhead Reduced' },
        { value: '<100ms', label: 'Real-time Latency' },
      ],
    },

    // About
    about: {
      sectionLabel: '// ABOUT',
      title: 'ABOUT ME',
      bio1:
        'I am a Full-Stack Developer and DevOps-oriented engineer working solo on several production and internal tools. I focus on building real-time collaboration features, robust backend APIs, and developer automation.',
      bio2:
        'My flagship project — a Kanban Task Management platform built with Next.js and .NET 10 — reduced manual task-management overhead by approximately 50% and cut the weekly task cycle from 8 hours to 2, through real-time drag & drop, Google Calendar sync, and 15+ live event types powered by SignalR.',
      bio3:
        'I actively build AI-powered applications, integrating RAG (Retrieval-Augmented Generation), Model Context Protocol, and custom LLM fine-tuning.',
      factsTitle: 'quick_facts.yaml',
      facts: {
        role: 'Role',
        roleValue: 'Solo Full-Stack Developer',
        focus: 'Focus',
        focusValue: 'Real-time Collaboration Systems',
        backend: 'Backend',
        backendValue: '.NET 10, C#, ASP.NET Core, EF Core 10, SignalR',
        frontend: 'Frontend',
        frontendValue: 'Next.js 14-16, React 19, TypeScript, Material UI, Tailwind CSS',
        databases: 'Databases',
        databasesValue: 'PostgreSQL, SQL Server, Redis',
        devops: 'DevOps & Testing',
        devopsValue: 'Docker, PowerShell, xUnit, Testcontainers, Bruno',
        cloud: 'Cloud & Integrations',
        cloudValue: 'Cloudflare R2, Google OAuth/Calendar, Gmail SMTP, Gemini API',
        location: 'Location',
        locationValue: 'Remote / Worldwide',
      },
    },

    // Skills
    skills: {
      sectionLabel: '// STACK',
      title: 'TECHNICAL ARSENAL',
      categories: {
        backend: 'Backend',
        frontend: 'Frontend',
        databases: 'Databases',
        devopsTesting: 'DevOps & Testing',
        cloudIntegrations: 'Cloud & Integrations',
      },
    },

    // Stats / Focus Areas
    stats: {
      sectionLabel: '// EXPERTISE',
      title: 'CORE FOCUS AREAS',
      areas: {
        realtime: {
          title: 'Real-Time Systems',
          description: 'Live collaboration with SignalR hubs, WebSockets & drag-and-drop sync (<100ms)',
        },
        fullstack: {
          title: 'Full-Stack Architecture',
          description: 'End-to-end delivery: Next.js frontend + .NET 10 backend + PostgreSQL',
        },
        cloudAi: {
          title: 'Cloud, AI & DevOps',
          description: 'Google APIs, Gemini AI, Cloudflare R2, Docker & test automation',
        },
      },
    },

    // Projects
    projects: {
      sectionLabel: '// WORK',
      title: 'FEATURED PROJECTS',
      subtitle: 'Production tools, templates, and experiments — designed, built, and shipped solo.',
      flagship: 'FLAGSHIP',
      viewRepo: 'View Repo →',
      items: {
        kanban: {
          name: 'Kanban Task Management',
          description:
            'Real-time board with 35+ REST endpoints, 2 SignalR hubs, Google Calendar two-way sync, and a Gemini AI assistant. Cut manual overhead by ~50% — weekly cycle time dropped from 8h to 2h.',
        },
        contextgate: {
          name: 'ContextGate',
          description:
            'Open-source MCP gateway for organizations: pluggable connectors, default-deny policies, per-agent API keys, full audit trail, and a React admin dashboard. Hono + Drizzle + PostgreSQL in a pnpm/Turbo monorepo.',
        },
        contextNexus: {
          name: 'Context Nexus',
          description:
            'Centralized Context API that stores and syncs .md/.txt knowledge files as a source of truth — indexed in PostgreSQL with optional auto-sync to GitHub.',
        },
        domainViewer: {
          name: 'Domain Viewer',
          description:
            'Full-stack domain management: expiration tracking, CSV import/export, role-based access, and scheduled Gmail SMTP alerts. Next.js 16 + .NET 10 API with Quartz.NET background jobs.',
        },
        queueBackend: {
          name: 'Queue Backend',
          description:
            'Job queue backend (.NET 10, PostgreSQL, Redis) built test-first: WebApplicationFactory + Testcontainers harness with 80%+ integration coverage via xUnit + FluentAssertions.',
        },
        realtimeChat: {
          name: 'Real-time Chat',
          description:
            'Reusable .NET 10 + SignalR chat template: auto-created 1-1 rooms, persistent history, JWT auth, rate limiting, and health checks.',
        },
        automationScripts: {
          name: 'Automation Scripts',
          description:
            'PowerShell 7+ CLI (nx-*) for the Context Nexus API: upload/download files, manage projects, and interactive mode with 8+ commands.',
        },
        ironCoachTh: {
          name: 'Iron Coach TH',
          description:
            'Thai fitness-coach LLM fine-tuned from Qwen2.5-1.5B with 4-bit QLoRA on a consumer RTX 2060 — 76% PASS on the eval harness (base ~45%), with out-of-domain refusals. Published on Hugging Face.',
        },
        mcpControlTower: {
          name: 'MCP Control Tower',
          description:
            'VS Code extension for managing MCP servers: TreeView control, React monitoring dashboard, multi-transport (stdio/SSE/HTTP), 3-level health checks, and auto-healing restarts.',
        },
        sarabunOcr: {
          name: 'Sarabun OCR',
          description:
            'Telegram document-intelligence bot: Thai OCR (PaddleOCR), smart extractors for PDF/Office/images, and local RAG Q&A via Ollama + ChromaDB — fully offline on 8GB RAM.',
        },
        flowForge: {
          name: 'Flow Forge',
          description:
            'Pastel Mermaid diagram editor with a Thai prompt→Mermaid fine-tuned model (8 diagram types, QLoRA Qwen2.5-1.5B) hosted on Hugging Face.',
        },
      },
    },

    // Contact
    contact: {
      sectionLabel: '// CONNECT',
      title1: "LET'S BUILD SOMETHING",
      title2: 'TOGETHER',
      subtitle: "I'm open to collaboration on real-time systems, enterprise tools, and developer automation projects.",
      form: {
        name: 'NAME',
        email: 'EMAIL',
        message: 'MESSAGE',
        namePlaceholder: 'Your Name',
        emailPlaceholder: 'your@email.com',
        messagePlaceholder: 'Tell me about your project...',
        send: 'Send Message',
        success: 'Message sent! (Demo only)',
      },
      direct: 'Or reach me directly at',
    },

    // Footer
    footer: {
      title: 'PROMMIN.L',
      subtitle: 'Full-Stack Developer & DevOps',
      builtWith: 'Built with',
      copyright: '© 2025 Prommin L.',
    },
  },

  th: {
    // Navbar
    nav: {
      home: 'หน้าแรก',
      about: 'เกี่ยวกับ',
      skills: 'ทักษะ',
      projects: 'ผลงาน',
      contact: 'ติดต่อ',
    },

    // Hero
    hero: {
      greeting: '> whoami',
      name: 'PROMMIN.L',
      tagline:
        'นักพัฒนา Full-Stack & DevOps-oriented สร้างระบบ real-time collaboration, enterprise backends และ developer automation — แบบเดี่ยว',
      ctaPrimary: 'ดูผลงาน',
      ctaSecondary: 'ติดต่อฉัน',
      statusLabel: 'สถานะ',
      statusValue: 'ออนไลน์ — พร้อมรับงานร่วมกัน',
      stats: [
        { value: '10+', label: 'โปรเจกต์ที่ส่งมอบ' },
        { value: '~50%', label: 'ลดภาระงาน' },
        { value: '<100ms', label: 'เลเทนซีเรียลไทม์' },
      ],
    },

    // About
    about: {
      sectionLabel: '// เกี่ยวกับ',
      title: 'เกี่ยวกับฉัน',
      bio1:
        'ฉันเป็นนักพัฒนา Full-Stack และ DevOps-oriented engineer ทำงานเดี่ยวบนโปรเจกต์ production และ internal tools หลายตัว โฟกัสที่การสร้าง real-time collaboration features, backend APIs ที่แข็งแกร่ง และ developer automation',
      bio2:
        'โปรเจกต์หลักของฉัน — แพลตฟอร์มจัดการงาน Kanban ที่สร้างด้วย Next.js และ .NET 10 — ลดภาระการจัดการงานลงประมาณ 50% และลด cycle time รายสัปดาห์จาก 8 ชั่วโมงเหลือ 2 ชั่วโมง ผ่าน real-time drag & drop, Google Calendar sync และ 15+ live event types ที่ขับเคลื่อนด้วย SignalR',
      bio3:
        'ฉันพัฒนาแอปพลิเคชันที่ขับเคลื่อนด้วย AI โดยนำ RAG (Retrieval-Augmented Generation), Model Context Protocol และการ Fine-tuning LLM มาประยุกต์ใช้งานจริง',
      factsTitle: 'quick_facts.yaml',
      facts: {
        role: 'บทบาท',
        roleValue: 'นักพัฒนา Full-Stack เดี่ยว',
        focus: 'จุดโฟกัส',
        focusValue: 'ระบบ Collaboration แบบ Real-time',
        backend: 'แบ็กเอนด์',
        backendValue: '.NET 10, C#, ASP.NET Core, EF Core 10, SignalR',
        frontend: 'ฟรอนต์เอนด์',
        frontendValue: 'Next.js 14-16, React 19, TypeScript, Material UI, Tailwind CSS',
        databases: 'ฐานข้อมูล',
        databasesValue: 'PostgreSQL, SQL Server, Redis',
        devops: 'DevOps & เทสต์',
        devopsValue: 'Docker, PowerShell, xUnit, Testcontainers, Bruno',
        cloud: 'คลาวด์ & Integrations',
        cloudValue: 'Cloudflare R2, Google OAuth/Calendar, Gmail SMTP, Gemini API',
        location: 'ที่ตั้ง',
        locationValue: 'รีโมท / ทั่วโลก',
      },
    },

    // Skills
    skills: {
      sectionLabel: '// สแตก',
      title: 'อาวุธทางเทคนิค',
      categories: {
        backend: 'แบ็กเอนด์',
        frontend: 'ฟรอนต์เอนด์',
        databases: 'ฐานข้อมูล',
        devopsTesting: 'DevOps & เทสต์',
        cloudIntegrations: 'คลาวด์ & Integrations',
      },
    },

    // Stats / Focus Areas
    stats: {
      sectionLabel: '// ความเชี่ยวชาญ',
      title: 'จุดโฟกัสหลัก',
      areas: {
        realtime: {
          title: 'ระบบ Real-Time',
          description: 'Live collaboration ด้วย SignalR hubs, WebSockets & drag-and-drop sync (<100ms)',
        },
        fullstack: {
          title: 'สถาปัตยกรรม Full-Stack',
          description: 'ส่งมอบครบวงจร: Next.js frontend + .NET 10 backend + PostgreSQL',
        },
        cloudAi: {
          title: 'คลาวด์, AI & DevOps',
          description: 'Google APIs, Gemini AI, Cloudflare R2, Docker & test automation',
        },
      },
    },

    // Projects
    projects: {
      sectionLabel: '// ผลงาน',
      title: 'ผลงานเด่น',
      subtitle: 'เครื่องมือ production, เทมเพลต และการทดลอง — ออกแบบ พัฒนา และส่งมอบเองทั้งหมด',
      flagship: 'ผลงานหลัก',
      viewRepo: 'ดู repo →',
      items: {
        kanban: {
          name: 'ระบบจัดการงาน Kanban',
          description:
            'บอร์ดงาน real-time มี 35+ REST endpoints, 2 SignalR hubs, sync Google Calendar สองทาง และผู้ช่วย Gemini AI ลดภาระงาน ~50% — cycle time รายสัปดาห์จาก 8 ชม. เหลือ 2 ชม.',
        },
        contextgate: {
          name: 'ContextGate',
          description:
            'MCP gateway โอเพนซอร์สสำหรับองค์กร: pluggable connectors, นโยบาย default-deny, API key ต่อ agent, audit trail ครบถ้วน และแดชบอร์ด React — Hono + Drizzle + PostgreSQL ใน monorepo pnpm/Turbo',
        },
        contextNexus: {
          name: 'Context Nexus',
          description:
            'Context API กลางสำหรับเก็บและ sync ไฟล์ .md/.txt เป็น source of truth — index ด้วย PostgreSQL พร้อมตัวเลือก auto-sync ขึ้น GitHub',
        },
        domainViewer: {
          name: 'Domain Viewer',
          description:
            'ระบบจัดการโดเมนแบบ full-stack: ติดตามวันหมดอายุ, import/export CSV, สิทธิ์แบบ role-based และแจ้งเตือนอีเมลตามเวลา — Next.js 16 + .NET 10 API พร้อม Quartz.NET background jobs',
        },
        queueBackend: {
          name: 'Queue Backend',
          description:
            'แบ็กเอนด์ job queue (.NET 10, PostgreSQL, Redis) พัฒนาแบบ test-first: WebApplicationFactory + Testcontainers ครอบคลุม integration test 80%+ ด้วย xUnit + FluentAssertions',
        },
        realtimeChat: {
          name: 'Real-time Chat',
          description:
            'เทมเพลตแชท .NET 10 + SignalR ใช้ซ้ำได้: ห้อง 1-1 สร้างอัตโนมัติ, เก็บประวัติข้อความ, JWT auth, rate limiting และ health checks',
        },
        automationScripts: {
          name: 'Automation Scripts',
          description:
            'CLI PowerShell 7+ (คำสั่ง nx-*) สำหรับ Context Nexus API: อัปโหลด/ดาวน์โหลดไฟล์, จัดการโปรเจกต์ และ interactive mode รวม 8+ คำสั่ง',
        },
        ironCoachTh: {
          name: 'Iron Coach TH',
          description:
            'LLM เทรนเนอร์ฟิตเนสภาษาไทย fine-tune จาก Qwen2.5-1.5B ด้วย QLoRA 4-bit บน RTX 2060 ทั่วไป — ผ่าน eval 76% (base ~45%) พร้อมระบบปฏิเสธคำถามนอกขอบเขต เผยแพร่บน Hugging Face',
        },
        mcpControlTower: {
          name: 'MCP Control Tower',
          description:
            'VS Code extension จัดการ MCP servers: ควบคุมผ่าน TreeView, แดชบอร์ด React แบบ real-time, รองรับหลาย transport (stdio/SSE/HTTP), health check 3 ระดับ และ auto-healing restart',
        },
        sarabunOcr: {
          name: 'Sarabun OCR',
          description:
            'บอท Telegram อัจฉริยะสำหรับเอกสาร: OCR ภาษาไทย (PaddleOCR), ตัวสกัด PDF/Office/รูปภาพ และถาม-ตอบด้วย RAG บน Ollama + ChromaDB — ออฟไลน์เต็มรูปแบบบน RAM 8GB',
        },
        flowForge: {
          name: 'Flow Forge',
          description:
            'โปรแกรมแก้ไขไดอะแกรม Mermaid โทนพาสเทล พร้อมโมเดล AI ภาษาไทย (Qwen2.5-1.5B + QLoRA adapter) ช่วยวาดไดอะแกรม 8 ชนิดจาก Prompt ภาษาไทย เผยแพร่บน Hugging Face',
        },
      },
    },

    // Contact
    contact: {
      sectionLabel: '// ติดต่อ',
      title1: 'มาสร้างอะไรสักอย่าง',
      title2: 'ร่วมกัน',
      subtitle: 'ฉันเปิดรับ collaboration บนระบบ real-time, enterprise tools และ developer automation projects',
      form: {
        name: 'ชื่อ',
        email: 'อีเมล',
        message: 'ข้อความ',
        namePlaceholder: 'ชื่อของคุณ',
        emailPlaceholder: 'your@email.com',
        messagePlaceholder: 'เล่าให้ฉันฟังเกี่ยวกับโปรเจกต์ของคุณ...',
        send: 'ส่งข้อความ',
        success: 'ส่งข้อความแล้ว! (เดโมเท่านั้น)',
      },
      direct: 'หรือติดต่อฉันโดยตรงที่',
    },

    // Footer
    footer: {
      title: 'PROMMIN.L',
      subtitle: 'นักพัฒนา Full-Stack & DevOps',
      builtWith: 'สร้างด้วย',
      copyright: '© 2025 Prommin L.',
    },
  },
} as const;

export type Translations = typeof translations.en | typeof translations.th;
