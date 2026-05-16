import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4;
  icon: React.ReactNode;
}

const skillsData: Skill[][] = [
  /* Row 1 — Backend (all expert = 4) */
  [
    { name: '.NET 10', level: 4, icon: <DotNetIcon /> },
    { name: 'C#', level: 4, icon: <CSharpIcon /> },
    { name: 'ASP.NET Core', level: 4, icon: <WebIcon /> },
    { name: 'EF Core', level: 4, icon: <DatabaseIcon /> },
    { name: 'SignalR', level: 4, icon: <SignalIcon /> },
    { name: 'REST APIs', level: 4, icon: <ApiIcon /> },
  ],
  /* Row 2 — Frontend */
  [
    { name: 'Next.js', level: 4, icon: <NextJsIcon /> },
    { name: 'React 19', level: 4, icon: <ReactIcon /> },
    { name: 'TypeScript', level: 4, icon: <TypeScriptIcon /> },
    { name: 'Tailwind CSS', level: 3, icon: <CssIcon /> },
    { name: 'Material UI', level: 3, icon: <PaletteIcon /> },
    { name: 'HTML/CSS', level: 3, icon: <HtmlIcon /> },
  ],
  /* Row 3 — Data & MCP */
  [
    { name: 'PostgreSQL', level: 4, icon: <DatabaseIcon /> },
    { name: 'SQL Server', level: 3, icon: <ServerIcon /> },
    { name: 'Docker', level: 3, icon: <DockerIcon /> },
    { name: 'MCP', level: 3, icon: <McpIcon /> },
    { name: 'Testcontainers', level: 3, icon: <BoxIcon /> },
    { name: 'xUnit', level: 3, icon: <TestIcon /> },
  ],
  /* Row 4 — Cloud & Tools */
  [
    { name: 'Cloudflare R2', level: 3, icon: <CloudIcon /> },
    { name: 'Google OAuth', level: 3, icon: <LockIcon /> },
    { name: 'Gmail SMTP', level: 3, icon: <MailIcon /> },
    { name: 'Gemini API', level: 2, icon: <SparkleIcon /> },
    { name: 'Bruno', level: 2, icon: <RocketIcon /> },
    { name: 'GitHub Actions', level: 3, icon: <WorkflowIcon /> },
  ],
];

/* ------------------------------------------------------------------ */
/*  PIXEL SVG ICONS (simple geometric shapes)                          */
/* ------------------------------------------------------------------ */

function DotNetIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <text x="16" y="21" textAnchor="middle" fill="#6C5CE7" fontSize="14" fontWeight="bold" fontFamily="monospace">N</text>
    </svg>
  );
}
function CSharpIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 4L28 10v12L16 28 4 22V10z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <text x="16" y="21" textAnchor="middle" fill="#6C5CE7" fontSize="12" fontWeight="bold" fontFamily="monospace">C</text>
    </svg>
  );
}
function WebIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="12" stroke="#6C5CE7" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="6" ry="12" stroke="#6C5CE7" strokeWidth="2" />
      <line x1="4" y1="16" x2="28" y2="16" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function DatabaseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="9" rx="10" ry="5" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M6 9v14c0 2.76 4.48 5 10 5s10-2.24 10-5V9" stroke="#6C5CE7" strokeWidth="2" />
      <line x1="26" y1="16" x2="6" y2="16" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function SignalIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3" fill="#6C5CE7" />
      <path d="M16 6v4M16 22v4M6 16h4M22 16h4M9 9l3 3M20 20l3 3M9 23l3-3M20 12l3-3" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ApiIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="12" width="10" height="14" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="18" y="6" width="10" height="14" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <line x1="14" y1="19" x2="18" y2="13" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function NextJsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="12" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M12 22V10l8 12V10" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ReactIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3" fill="#6C5CE7" />
      <ellipse cx="16" cy="16" rx="12" ry="5" stroke="#6C5CE7" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="12" ry="5" stroke="#6C5CE7" strokeWidth="1.5" transform="rotate(60 16 16)" />
      <ellipse cx="16" cy="16" rx="12" ry="5" stroke="#6C5CE7" strokeWidth="1.5" transform="rotate(120 16 16)" />
    </svg>
  );
}
function TypeScriptIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="24" height="24" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <text x="16" y="22" textAnchor="middle" fill="#6C5CE7" fontSize="14" fontWeight="bold" fontFamily="monospace">T</text>
    </svg>
  );
}
function CssIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 6l3 20 9 3 9-3 3-20z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <path d="M10 12h12M10 16h12M10 20h6" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function PaletteIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="12" stroke="#6C5CE7" strokeWidth="2" />
      <circle cx="12" cy="13" r="2" fill="#6C5CE7" />
      <circle cx="20" cy="13" r="2" fill="#6C5CE7" />
      <circle cx="16" cy="21" r="2" fill="#6C5CE7" />
    </svg>
  );
}
function HtmlIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 6l3 20 9 3 9-3 3-20z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <path d="M11 12l5 8 5-8" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ServerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="24" height="8" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="4" y="12" width="24" height="8" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="4" y="20" width="24" height="8" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <circle cx="24" cy="8" r="1.5" fill="#6C5CE7" />
      <circle cx="24" cy="16" r="1.5" fill="#6C5CE7" />
      <circle cx="24" cy="24" r="1.5" fill="#6C5CE7" />
    </svg>
  );
}
function DockerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="6" y="14" width="6" height="6" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="14" y="14" width="6" height="6" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="22" y="14" width="6" height="6" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="10" y="6" width="6" height="6" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M4 22h28v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function McpIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="10" width="10" height="12" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="18" y="10" width="10" height="12" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M14 16h4" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="16" r="2" fill="#6C5CE7" />
      <circle cx="23" cy="16" r="2" fill="#6C5CE7" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 2L4 9v14l12 7 12-7V9z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <path d="M16 2v14M16 16l12-7M16 16L4 9" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function TestIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="24" height="24" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M10 16l4 4 8-8" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloudIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M8 24a6 6 0 0 1-2-11.66A8 8 0 0 1 24 10a6 6 0 0 1-2 14z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="6" y="14" width="20" height="14" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M10 14V10a6 6 0 0 1 12 0v4" stroke="#6C5CE7" strokeWidth="2" />
      <circle cx="16" cy="21" r="2" fill="#6C5CE7" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="6" width="24" height="20" rx="2" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M4 6l12 10L28 6" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
    </svg>
  );
}
function RocketIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M8 24l4-4 2 2-4 4z" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M24 8l-2 8-6 6-4-4 6-6z" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <circle cx="18" cy="14" r="2" stroke="#6C5CE7" strokeWidth="2" />
    </svg>
  );
}
function WorkflowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="10" height="10" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <rect x="18" y="18" width="10" height="10" rx="1" stroke="#6C5CE7" strokeWidth="2" />
      <path d="M14 9h4v4h4" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <path d="M14 9l4-2v4h4" stroke="#6C5CE7" strokeWidth="2" fill="none" />
      <path d="M14 9h4v4h4" stroke="#6C5CE7" strokeWidth="2" fill="none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SKILL BLOCK COMPONENT                                              */
/* ------------------------------------------------------------------ */

function SkillBlock({
  skill,
  index,
  isMobile,
}: {
  skill: Skill;
  index: number;
  isMobile: boolean;
}) {
  const size = isMobile ? { w: 100, h: 100, fontSize: 14, iconScale: 0.75 } : { w: 140, h: 140, fontSize: 18, iconScale: 1 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.4,
        delay: 0.2 + index * 0.06,
        type: 'spring',
        bounce: 0.4,
      }}
      className="skill-block relative flex flex-col items-center justify-center gap-2 select-none cursor-default"
      style={{
        width: `${size.w}px`,
        height: `${size.h}px`,
        backgroundColor: '#1A1A2E',
        border: '2px solid rgba(108, 92, 231, 0.3)',
        borderRadius: '6px',
        transformStyle: 'preserve-3d',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* Skill name */}
      <span
        className="font-mono-labels text-center px-1 leading-tight"
        style={{ fontSize: size.fontSize, color: '#F0EDE4' }}
      >
        {skill.name}
      </span>

      {/* Icon */}
      <div style={{ color: '#6C5CE7', transform: `scale(${size.iconScale})` }}>
        {skill.icon}
      </div>

      {/* Proficiency dots */}
      <div className="flex gap-1 mt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: isMobile ? '5px' : '6px',
              height: isMobile ? '5px' : '6px',
              borderRadius: '1px',
              backgroundColor: i < skill.level ? '#6C5CE7' : '#2A2A3E',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                       */
/* ------------------------------------------------------------------ */

export default function SkillsSection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <section
      id="skills"
      style={{
        padding: '120px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Section title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <span
          className="font-pixel text-[14px] block mb-4"
          style={{ color: '#00E5FF' }}
        >
          // STACK
        </span>
        <h2
          className="font-pixel text-[36px] leading-tight section-title-glow"
          style={{ color: '#F0EDE4' }}
        >
          TECHNICAL ARSENAL
        </h2>
      </motion.div>

      {/* Category labels + Skill grids */}
      <div className="flex flex-col gap-12">
        {skillsData.map((row, rowIndex) => {
          const categoryNames = ['Backend', 'Frontend', 'Data & MCP', 'Cloud & Tools'];
          return (
            <div key={rowIndex}>
              {/* Category name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-4 flex items-center gap-3"
              >
                <span
                  className="inline-block w-3 h-3"
                  style={{ backgroundColor: '#6C5CE7', borderRadius: '2px' }}
                />
                <span
                  className="font-mono-labels text-[20px] tracking-wider uppercase"
                  style={{ color: '#6C5CE7' }}
                >
                  {categoryNames[rowIndex]}
                </span>
                <div
                  className="flex-1 h-[1px]"
                  style={{ backgroundColor: 'rgba(108, 92, 231, 0.2)' }}
                />
              </motion.div>

              {/* Skills grid for this category */}
              <div
                className="flex flex-wrap gap-4 justify-center md:justify-start"
                style={{ perspective: '1000px' }}
              >
                {row.map((skill, i) => (
                  <SkillBlock
                    key={skill.name}
                    skill={skill}
                    index={rowIndex * 6 + i}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover styles */}
      <style>{`
        .skill-block:hover {
          border-color: #00E5FF !important;
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.3), 0 8px 24px rgba(0, 229, 255, 0.1) !important;
          transform: translateY(-4px) translateZ(20px) !important;
        }
      `}</style>
    </section>
  );
}
