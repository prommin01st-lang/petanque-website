import React, { useState, type FormEvent } from 'react'
import { Send, Mail, MapPin, Phone } from 'lucide-react'

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', message: '' })
    }, 3000)
  }

  return (
    <section id="contact" className="bg-bg" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <p className="badge-pixel-alt" style={{ marginBottom: '16px', display: 'inline-block' }}>
            &gt; CONTACT
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
            Let&apos;s Connect
          </h2>
          <p
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '20px',
              marginTop: '16px',
            }}
          >
            Have a project in mind? Let&apos;s talk!
          </p>
        </div>

        <div
          className="flex flex-col md:flex-row"
          style={{ gap: '64px' }}
        >
          {/* Left: Contact Info */}
          <div className="flex flex-1 flex-col" style={{ gap: '24px' }}>
            <div className="card-pixel">
              <h3
                className="text-accent-cyan"
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '12px',
                  letterSpacing: '0.02em',
                  marginBottom: '24px',
                }}
              >
                Contact Info
              </h3>

              <div className="flex flex-col" style={{ gap: '16px' }}>
                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex flex-shrink-0 items-center justify-center bg-surface"
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '2px solid var(--border)',
                      borderRadius: '0px',
                    }}
                  >
                    <Mail
                      size={24}
                      style={{
                        color: 'var(--accent-cyan)',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '16px',
                      }}
                    >
                      Email
                    </p>
                    <a
                      href="mailto:alex@example.com"
                      className="link-pixel"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '20px',
                      }}
                    >
                      alex@example.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex flex-shrink-0 items-center justify-center bg-surface"
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '2px solid var(--border)',
                      borderRadius: '0px',
                    }}
                  >
                    <Phone
                      size={24}
                      style={{
                        color: 'var(--accent-magenta)',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '16px',
                      }}
                    >
                      Phone
                    </p>
                    <p
                      className="text-text"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '20px',
                      }}
                    >
                      +1 (555) 123-4567
                    </p>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: '16px' }}>
                  <div
                    className="flex flex-shrink-0 items-center justify-center bg-surface"
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '2px solid var(--border)',
                      borderRadius: '0px',
                    }}
                  >
                    <MapPin
                      size={24}
                      style={{
                        color: 'var(--accent-gold)',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '16px',
                      }}
                    >
                      Location
                    </p>
                    <p
                      className="text-text"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '20px',
                      }}
                    >
                      San Francisco, CA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Badge */}
            <div
              className="flex items-center bg-surface"
              style={{
                gap: '12px',
                padding: '16px',
                border: '2px solid var(--accent-cyan)',
                borderRadius: '0px',
                boxShadow: '4px 4px 0px 0px var(--shadow)',
              }}
            >
              <div
                className="relative"
                style={{ width: '16px', height: '16px' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: 'var(--accent-cyan)',
                    animation: 'pulse-accent 1s steps(2) infinite',
                  }}
                />
              </div>
              <p
                className="text-accent-cyan"
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '20px',
                }}
              >
                Available for freelance work
              </p>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="flex-1">
            <div className="card-pixel">
              <h3
                className="text-accent-magenta"
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '12px',
                  letterSpacing: '0.02em',
                  marginBottom: '24px',
                }}
              >
                Send a Message
              </h3>

              {submitted ? (
                <div
                  className="flex flex-col items-center text-center"
                  style={{ gap: '16px', paddingTop: '48px', paddingBottom: '48px' }}
                >
                  <div
                    className="bg-surface"
                    style={{
                      width: '64px',
                      height: '64px',
                      border: '4px solid var(--accent-cyan)',
                      borderRadius: '0px',
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      <span
                        className="text-accent-cyan"
                        style={{ fontFamily: 'var(--font-pixel)', fontSize: '18px' }}
                      >
                        OK
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-accent-cyan"
                    style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px' }}
                  >
                    Message Sent!
                  </p>
                  <p
                    className="text-text-dim"
                    style={{ fontFamily: 'var(--font-label)', fontSize: '18px' }}
                  >
                    I&apos;ll get back to you soon.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col"
                  style={{ gap: '24px' }}
                >
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '18px',
                        marginBottom: '8px',
                      }}
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input-pixel"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '18px',
                        marginBottom: '8px',
                      }}
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input-pixel"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '18px',
                        marginBottom: '8px',
                      }}
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="textarea-pixel"
                      placeholder="Tell me about your project..."
                    />
                  </div>

                  <button type="submit" className="btn-pixel-primary w-full">
                    <Send
                      size={20}
                      className="pixel-art"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
