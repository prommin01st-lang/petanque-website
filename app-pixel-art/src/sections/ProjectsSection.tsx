import React from 'react'
import { ExternalLink, Github } from 'lucide-react'

interface Project {
  title: string
  description: string
  image: string
  tags: string[]
  liveUrl: string
  repoUrl: string
  accent: 'cyan' | 'magenta' | 'gold'
}

const projects: Project[] = [
  {
    title: 'Pixel Commerce',
    description:
      'A full-stack e-commerce platform built with Next.js, Stripe payments, and a custom CMS. Features real-time inventory and admin dashboard.',
    image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=600&h=400&fit=crop',
    tags: ['Next.js', 'TypeScript', 'Stripe', 'Prisma'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'cyan',
  },
  {
    title: 'TaskMaster Pro',
    description:
      'Collaborative project management tool with real-time updates, drag-and-drop kanban boards, and team analytics.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
    tags: ['React', 'Node.js', 'Socket.io', 'MongoDB'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'magenta',
  },
  {
    title: 'CryptoDash',
    description:
      'Real-time cryptocurrency dashboard with price tracking, portfolio management, and interactive charts.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
    tags: ['React', 'D3.js', 'CoinGecko API', 'Tailwind'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'gold',
  },
  {
    title: 'DevBlog',
    description:
      'A developer-focused blogging platform with Markdown support, syntax highlighting, and newsletter subscriptions.',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop',
    tags: ['Next.js', 'MDX', 'Vercel', 'PostgreSQL'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'cyan',
  },
  {
    title: 'WeatherPixel',
    description:
      'A retro-styled weather application with 7-day forecasts, location search, and pixel-art weather icons.',
    image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=600&h=400&fit=crop',
    tags: ['React', 'OpenWeather API', 'Canvas', 'PWA'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'magenta',
  },
  {
    title: 'ChatStream',
    description:
      'Real-time chat application with emoji reactions, file sharing, and end-to-end encryption.',
    image: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=600&h=400&fit=crop',
    tags: ['React', 'Firebase', 'TypeScript', 'Tailwind'],
    liveUrl: '#',
    repoUrl: '#',
    accent: 'gold',
  },
]

const accentTextMap = {
  cyan: 'var(--accent-cyan)',
  magenta: 'var(--accent-magenta)',
  gold: 'var(--accent-gold)',
}

const ProjectsSection: React.FC = () => {
  return (
    <section
      id="projects"
      style={{ background: 'var(--surface)', paddingTop: '96px', paddingBottom: '96px' }}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <p className="badge-pixel-alt" style={{ marginBottom: '16px', display: 'inline-block' }}>
            &gt; PROJECTS
          </p>
          <h2
            className="text-text"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '24px',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
            }}
          >
            Featured Work
          </h2>
          <p
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '20px',
              marginTop: '16px',
            }}
          >
            A selection of projects I&apos;ve built
          </p>
        </div>

        {/* Projects Grid - flat horizontal layout */}
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '32px' }}
        >
          {projects.map((project) => (
            <div
              key={project.title}
              className="card-pixel group overflow-hidden"
              style={{ padding: '0px' }}
            >
              {/* Project Image */}
              <div
                className="relative overflow-hidden"
                style={{
                  height: '192px',
                  borderBottom: '2px solid var(--border)',
                }}
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="pixel-art h-full w-full object-cover"
                  style={{
                    imageRendering: 'pixelated',
                    transition: 'none',
                  }}
                />
                {/* Accent overlay on hover - instant, no transition */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-20"
                  style={{
                    backgroundColor: accentTextMap[project.accent],
                    transition: 'none',
                  }}
                />
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '12px',
                    letterSpacing: '0.02em',
                    color: accentTextMap[project.accent],
                    marginBottom: '8px',
                  }}
                >
                  {project.title}
                </h3>
                <p
                  className="text-text-dim"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    marginBottom: '16px',
                  }}
                >
                  {project.description}
                </p>

                {/* Tags */}
                <div
                  className="flex flex-wrap"
                  style={{ gap: '8px', marginBottom: '16px' }}
                >
                  {project.tags.map((tag) => (
                    <span key={tag} className="tag-pixel">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Links - instant color swap, no fade */}
                <div className="flex" style={{ gap: '16px' }}>
                  <a
                    href={project.liveUrl}
                    className="flex items-center"
                    style={{
                      gap: '4px',
                      fontFamily: 'var(--font-label)',
                      fontSize: '18px',
                      color: accentTextMap[project.accent],
                      textDecoration: 'none',
                      transition: 'none',
                    }}
                  >
                    <ExternalLink
                      size={16}
                      className="pixel-art"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    Live
                  </a>
                  <a
                    href={project.repoUrl}
                    className="flex items-center"
                    style={{
                      gap: '4px',
                      fontFamily: 'var(--font-label)',
                      fontSize: '18px',
                      color: 'var(--text-dim)',
                      textDecoration: 'none',
                      transition: 'none',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.target as HTMLElement).style.color = 'var(--accent-cyan)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.target as HTMLElement).style.color = 'var(--text-dim)'
                    }}
                  >
                    <Github
                      size={16}
                      className="pixel-art"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    Code
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectsSection
