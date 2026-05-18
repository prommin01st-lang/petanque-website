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
      greeting: "Hi, I'm",
      name: 'PROMMIN.L',
      tagline:
        'Full-Stack Developer & MCP-oriented engineer building real-time collaboration systems, enterprise backends, and developer automation.',
      ctaPrimary: 'View Projects',
      ctaSecondary: 'Contact Me',
    },

    // About
    about: {
      sectionLabel: '// ABOUT',
      title: 'ABOUT ME',
      bio1:
        'I am a Full-Stack Developer and MCP-oriented engineer working solo on several production and internal tools. I focus on building real-time collaboration features, robust backend APIs, and AI integrations via Model Context Protocol.',
      bio2:
        'My flagship project — a Kanban Task Management platform built with Next.js and .NET 10 — reduced manual task-management overhead by approximately 50% in day-to-day workflows through real-time drag & drop, Google Calendar sync, and 15+ live event types powered by SignalR.',
      bio3:
        "I'm always learning. Currently diving deep into AI agents, Model Context Protocol, and cloud-native architectures.",
      facts: {
        role: 'Role',
        roleValue: 'Solo Full-Stack Developer',
        focus: 'Focus',
        focusValue: 'Real-time Collaboration Systems',
        backend: 'Backend',
        backendValue: '.NET 10, C#, ASP.NET Core, EF Core, SignalR',
        frontend: 'Frontend',
        frontendValue: 'Next.js 14-16, React 19, TypeScript',
        databases: 'Databases',
        databasesValue: 'PostgreSQL, SQL Server',
        mcp: 'MCP',
        mcpValue: 'Model Context Protocol, AI Agents, LLM Integration',
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
        dataMcp: 'Data & MCP',
        cloudTools: 'Cloud & Tools',
      },
    },

    // Stats / Focus Areas
    stats: {
      sectionLabel: '// EXPERTISE',
      title: 'CORE FOCUS AREAS',
      areas: {
        realtime: {
          title: 'Real-Time Systems',
          description: 'Live collaboration with SignalR, WebSockets & drag-and-drop sync',
        },
        fullstack: {
          title: 'Full-Stack Architecture',
          description: 'End-to-end solutions: Next.js frontend + .NET backend',
        },
        cloudAi: {
          title: 'Cloud & AI Integration',
          description: 'Google APIs, Gemini AI, Cloudflare R2 & OAuth flows',
        },
      },
    },

    // Projects
    projects: {
      sectionLabel: '// WORK',
      title: 'FEATURED PROJECTS',
      flagship: 'FLAGSHIP',
      viewProject: 'View Project →',
      items: {
        kanban: {
          name: 'Kanban Task Management',
          description:
            'Real-time task board with drag & drop, SignalR live updates, Google Calendar sync. Reduced overhead by ~50%.',
        },
        contextgate: {
          name: 'ContextGate',
          description:
            'MCP (Model Context Protocol) gateway for organizations. Pluggable connectors, policy enforcement, audit trail, and admin dashboard. Connects AI agents to files, databases, and SaaS docs through a single endpoint.',
        },
        contextNexus: {
          name: 'Context Nexus',
          description:
            'Context management system with advanced search, tagging, and relationship mapping between knowledge nodes.',
        },
        domainViewer: {
          name: 'Domain Viewer',
          description:
            'Interactive domain analysis dashboard with visual tree navigation, DNS inspection, and monitoring alerts.',
        },
        queueBackend: {
          name: 'Queue Backend',
          description:
            'Robust message queue system with retry logic, dead letter handling, and 80%+ integration test coverage.',
        },
        realtimeChat: {
          name: 'Real-time Chat',
          description:
            'Socket-based chat template with room management, typing indicators, and message persistence.',
        },
        automationScripts: {
          name: 'Automation Scripts',
          description:
            'PowerShell CLI toolkit with 8+ commands for context management, environment switching, and interactive mode.',
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
      subtitle: 'Full-Stack Developer & MCP',
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
      greeting: 'สวัสดี ฉันชื่อ',
      name: 'PROMMIN.L',
      tagline:
        'นักพัฒนา Full-Stack & MCP-oriented สร้างระบบ real-time collaboration, enterprise backends และ developer automation',
      ctaPrimary: 'ดูผลงาน',
      ctaSecondary: 'ติดต่อฉัน',
    },

    // About
    about: {
      sectionLabel: '// เกี่ยวกับ',
      title: 'เกี่ยวกับฉัน',
      bio1:
        'ฉันเป็นนักพัฒนา Full-Stack และ MCP-oriented engineer ทำงานเดี่ยวบนโปรเจค production และ internal tools หลายตัว ฉันเน้นการสร้าง real-time collaboration features, backend APIs ที่แข็งแกร่ง และ AI integrations ผ่าน Model Context Protocol',
      bio2:
        'โปรเจคหลักของฉัน — แพลตฟอร์มจัดการงาน Kanban สร้างด้วย Next.js และ .NET 10 — ลดภาระการจัดการงานลงประมาณ 50% ใน workflows ประจำวันผ่าน real-time drag & drop, Google Calendar sync และ 15+ live event types ที่ขับเคลื่อนด้วย SignalR',
      bio3:
        'ฉันเรียนรู้ตลอดเวลา ปัจจุบันกำลังศึกษา AI agents, Model Context Protocol และ cloud-native architectures อย่างลึกซึ้ง',
      facts: {
        role: 'บทบาท',
        roleValue: 'นักพัฒนา Full-Stack เดี่ยว',
        focus: 'จุดโฟกัส',
        focusValue: 'ระบบ Collaboration แบบ Real-time',
        backend: 'แบ็กเอนด์',
        backendValue: '.NET 10, C#, ASP.NET Core, EF Core, SignalR',
        frontend: 'ฟรอนต์เอนด์',
        frontendValue: 'Next.js 14-16, React 19, TypeScript',
        databases: 'ฐานข้อมูล',
        databasesValue: 'PostgreSQL, SQL Server',
        mcp: 'MCP',
        mcpValue: 'Model Context Protocol, AI Agents, LLM Integration',
        location: 'ที่ตั้ง',
        locationValue: 'รีโมท / ทั่วโลก',
      },
    },

    // Skills
    skills: {
      sectionLabel: '// สกิล',
      title: 'อาวุธทางเทคนิค',
      categories: {
        backend: 'แบ็กเอนด์',
        frontend: 'ฟรอนต์เอนด์',
        dataMcp: 'ข้อมูล & MCP',
        cloudTools: 'คลาวด์ & เครื่องมือ',
      },
    },

    // Stats / Focus Areas
    stats: {
      sectionLabel: '// ความเชี่ยวชาญ',
      title: 'จุดโฟกัสหลัก',
      areas: {
        realtime: {
          title: 'ระบบ Real-Time',
          description: 'Live collaboration ด้วย SignalR, WebSockets & drag-and-drop sync',
        },
        fullstack: {
          title: 'สถาปัตยกรรม Full-Stack',
          description: 'โซลูชั่นครบวงจร: Next.js frontend + .NET backend',
        },
        cloudAi: {
          title: 'คลาวด์ & AI Integration',
          description: 'Google APIs, Gemini AI, Cloudflare R2 & OAuth flows',
        },
      },
    },

    // Projects
    projects: {
      sectionLabel: '// ผลงาน',
      title: 'ผลงานเด่น',
      flagship: 'ผลงานหลัก',
      viewProject: 'ดูผลงาน →',
      items: {
        kanban: {
          name: 'ระบบจัดการงาน Kanban',
          description:
            'บอร์ดจัดการงานแบบ real-time มี drag & drop, SignalR live updates, Google Calendar sync ลดภาระงานลง ~50%',
        },
        contextgate: {
          name: 'ContextGate',
          description:
            'MCP (Model Context Protocol) gateway สำหรับองค์กร มี pluggable connectors, policy enforcement, audit trail และ admin dashboard เชื่อม AI agents เข้ากับไฟล์ ฐานข้อมูล และ SaaS docs ผ่าน endpoint เดียว',
        },
        contextNexus: {
          name: 'Context Nexus',
          description:
            'ระบบจัดการ context มี advanced search, tagging และ relationship mapping ระหว่าง knowledge nodes',
        },
        domainViewer: {
          name: 'Domain Viewer',
          description:
            'แดชบอร์ดวิเคราะห์โดเมนแบบ interactive มี visual tree navigation, DNS inspection และ monitoring alerts',
        },
        queueBackend: {
          name: 'Queue Backend',
          description:
            'ระบบ message queue ที่แข็งแกร่ง มี retry logic, dead letter handling และ integration test coverage 80%+',
        },
        realtimeChat: {
          name: 'Real-time Chat',
          description:
            'เทมเพลตแชทแบบ socket มี room management, typing indicators และ message persistence',
        },
        automationScripts: {
          name: 'Automation Scripts',
          description:
            'PowerShell CLI toolkit มี 8+ commands สำหรับ context management, environment switching และ interactive mode',
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
        messagePlaceholder: 'เล่าให้ฉันฟังเกี่ยวกับโปรเจคของคุณ...',
        send: 'ส่งข้อความ',
        success: 'ส่งข้อความแล้ว! (เดโมเท่านั้น)',
      },
      direct: 'หรือติดต่อฉันโดยตรงที่',
    },

    // Footer
    footer: {
      title: 'PROMMIN.L',
      subtitle: 'นักพัฒนา Full-Stack & MCP',
      builtWith: 'สร้างด้วย',
      copyright: '© 2025 Prommin L.',
    },
  },
} as const;

export type Translations = typeof translations.en | typeof translations.th;
