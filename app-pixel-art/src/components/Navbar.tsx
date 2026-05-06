import React, { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Stats', href: '#stats' },
  { label: 'Contact', href: '#contact' },
]

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map((l) => l.href.replace('#', ''))
      const scrollPos = window.scrollY + 120

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b-2"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
        boxShadow: '0 4px 0px 0px var(--shadow)',
      }}
    >
      <div
        className="mx-auto flex max-w-6xl items-center justify-between px-6"
        style={{ paddingTop: '16px', paddingBottom: '16px' }}
      >
        {/* Logo */}
        <a
          href="#hero"
          className="text-accent-cyan"
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: '12px',
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          PETANQUE
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center md:flex" style={{ gap: '4px' }}>
          {navLinks.map((link) => {
            const sectionId = link.href.replace('#', '')
            const isActive = activeSection === sectionId
            return (
              <a
                key={link.label}
                href={link.href}
                className={
                  isActive
                    ? 'text-accent-cyan'
                    : 'text-text-dim hover:text-accent-cyan'
                }
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '20px',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '4px 8px',
                  border: isActive ? '2px solid var(--border)' : '2px solid transparent',
                  borderRadius: '0px',
                  transition: 'color 0s, border-color 0s',
                }}
              >
                {link.label}
              </a>
            )
          })}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="btn-pixel md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          style={{ padding: '8px' }}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div
          className="border-t-2 md:hidden"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
          }}
        >
          <div
            className="flex flex-col px-6"
            style={{ gap: '4px', paddingTop: '16px', paddingBottom: '16px' }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-text-dim hover:text-accent-cyan"
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '20px',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '4px 8px',
                  border: '2px solid transparent',
                  borderRadius: '0px',
                  transition: 'color 0s, border-color 0s',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
