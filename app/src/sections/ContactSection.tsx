import { useRef, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  ICONS                                                              */
/* ------------------------------------------------------------------ */

function GitHubIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.48v-1.7C6.73 20.4 5.8 18.4 5.8 18.4s-.75-1.9-1.84-2.4c0 0-1.5-1.03.1-1.01 0 0 1.64.13 2.54 1.7 1.44 2.53 3.85 1.8 4.79 1.37.15-1.05.58-1.8 1.05-2.23-3.68-.42-7.55-1.84-7.55-8.18 0-1.81.64-3.28 1.7-4.44-.17-.42-.74-2.1.16-4.37 1.35-.42 4.46 1.69 4.46 1.69a15.3 15.3 0 0 1 8.02 0s3.11-2.11 4.46-1.69c.9 2.27.33 3.95.16 4.37 1.05 1.16 1.7 2.63 1.7 4.44 0 6.36-3.88 7.75-7.57 8.17.6.52 1.12 1.54 1.12 3.1v4.57c0 .36.18.69.68.57C19.14 20.6 22 16.76 22 12.26 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LinkedInIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S.02 4.88.02 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm8 0H8v16h5v-8.5c0-4.2 6-4.5 6 0V24h5v-10.5c0-8.1-9-7.8-11-3.8V8z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                       */
/* ------------------------------------------------------------------ */

export default function ContactSection() {
  const { t } = useI18n();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast.success(t.contact.form.success);
    /* Reset uncontrolled inputs */
    if (nameRef.current) nameRef.current.value = '';
    if (emailRef.current) emailRef.current.value = '';
    if (messageRef.current) messageRef.current.value = '';
  };

  return (
    <section
      id="contact"
      className="pointer-events-none"
      style={{
        padding: '120px 24px',
        maxWidth: '700px',
        margin: '0 auto',
      }}
    >
      {/* Section title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="text-center pointer-events-auto"
      >
        <span className="font-mono text-[13px] text-neon-cyan block mb-3">
          {t.contact.sectionLabel}
        </span>
        <h2 className="font-mono font-bold text-[26px] md:text-[34px] leading-tight text-text text-glow-cyan">
          {t.contact.title1}
        </h2>
        <h2 className="font-mono font-bold text-[26px] md:text-[34px] leading-tight mt-2 text-hud-purple text-glow-purple">
          {t.contact.title2}
        </h2>
        <p className="font-body text-[16px] font-light mt-5 text-text-dim">
          {t.contact.subtitle}
        </p>
      </motion.div>

      {/* Contact form — terminal window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-12 term-window pointer-events-auto"
      >
        {/* Title bar */}
        <div className="term-window-header">
          <span className="term-dot term-dot-red" />
          <span className="term-dot term-dot-amber" />
          <span className="term-dot term-dot-green" />
          <span className="ml-2">$ send-message --new</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-8">
          {/* Name field */}
          <div>
            <label
              htmlFor="contact-name"
              className="font-mono text-[12px] block mb-2 text-text-dim"
            >
              <span className="text-terminal-green">--name</span>{' '}
              <span className="text-text-dim">=</span>{' '}
              <span className="text-neon-cyan">"{t.contact.form.name}"</span>
            </label>
            <input
              ref={nameRef}
              id="contact-name"
              type="text"
              name="name"
              placeholder={t.contact.form.namePlaceholder}
              className="input-hud"
            />
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="contact-email"
              className="font-mono text-[12px] block mb-2 text-text-dim"
            >
              <span className="text-terminal-green">--email</span>{' '}
              <span className="text-text-dim">=</span>{' '}
              <span className="text-neon-cyan">"{t.contact.form.email}"</span>
            </label>
            <input
              ref={emailRef}
              id="contact-email"
              type="email"
              name="email"
              placeholder={t.contact.form.emailPlaceholder}
              className="input-hud"
            />
          </div>

          {/* Message field */}
          <div>
            <label
              htmlFor="contact-message"
              className="font-mono text-[12px] block mb-2 text-text-dim"
            >
              <span className="text-terminal-green">--message</span>{' '}
              <span className="text-text-dim">=</span>{' '}
              <span className="text-neon-cyan">"{t.contact.form.message}"</span>
            </label>
            <textarea
              ref={messageRef}
              id="contact-message"
              name="message"
              placeholder={t.contact.form.messagePlaceholder}
              className="textarea-hud"
              style={{ minHeight: '140px' }}
            />
          </div>

          {/* Submit button */}
          <button type="submit" className="btn-neon w-full">
            {t.contact.form.send} ↵
          </button>
        </form>
      </motion.div>

      {/* Alternative contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center mt-8 pointer-events-auto"
      >
        <p className="font-mono text-[13px] text-text-dim">
          {t.contact.direct}{' '}
          <a
            href="https://github.com/prommin01st-lang"
            target="_blank"
            rel="noopener noreferrer"
            className="link-neon"
          >
            github.com/prommin01st-lang
          </a>
        </p>

        {/* Social icons */}
        <div className="flex items-center justify-center mt-5 gap-5">
          <a
            href="https://github.com/prommin01st-lang"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-text-dim hover:text-neon-cyan transition-colors duration-200"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://linkedin.com/in/prommin-l"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-text-dim hover:text-neon-cyan transition-colors duration-200"
          >
            <LinkedInIcon />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
