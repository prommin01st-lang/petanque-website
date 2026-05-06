import { useRef, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  PIXEL-ART SVG ICONS                                                */
/* ------------------------------------------------------------------ */

function GitHubIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.48v-1.7C6.73 20.4 5.8 18.4 5.8 18.4s-.75-1.9-1.84-2.4c0 0-1.5-1.03.1-1.01 0 0 1.64.13 2.54 1.7 1.44 2.53 3.85 1.8 4.79 1.37.15-1.05.58-1.8 1.05-2.23-3.68-.42-7.55-1.84-7.55-8.18 0-1.81.64-3.28 1.7-4.44-.17-.42-.74-2.1.16-4.37 1.35-.42 4.46 1.69 4.46 1.69a15.3 15.3 0 0 1 8.02 0s3.11-2.11 4.46-1.69c.9 2.27.33 3.95.16 4.37 1.05 1.16 1.7 2.63 1.7 4.44 0 6.36-3.88 7.75-7.57 8.17.6.52 1.12 1.54 1.12 3.1v4.57c0 .36.18.69.68.57C19.14 20.6 22 16.76 22 12.26 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LinkedInIcon({ size = 28 }: { size?: number }) {
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
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast.success('Message sent! (Demo only)');
    /* Reset uncontrolled inputs */
    if (nameRef.current) nameRef.current.value = '';
    if (emailRef.current) emailRef.current.value = '';
    if (messageRef.current) messageRef.current.value = '';
  };

  return (
    <section
      id="contact"
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
        className="text-center"
      >
        <span
          className="font-pixel text-[14px] block mb-4"
          style={{ color: '#00E5FF' }}
        >
          // CONNECT
        </span>
        <h2
          className="font-pixel text-[36px] leading-tight"
          style={{ color: '#F0EDE4' }}
        >
          LET&apos;S BUILD SOMETHING
        </h2>
        <h2
          className="font-pixel text-[36px] leading-tight mt-2"
          style={{ color: '#6C5CE7' }}
        >
          TOGETHER
        </h2>
        <p
          className="font-body text-[18px] mt-5"
          style={{ color: '#8A8598' }}
        >
          I&apos;m open to collaboration on real-time systems, enterprise tools, and developer automation projects.
        </p>
      </motion.div>

      {/* Contact form */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-12"
        style={{
          backgroundColor: '#1A1A2E',
          border: '2px solid rgba(108, 92, 231, 0.25)',
          borderRadius: '8px',
          padding: '48px',
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
          style={{ gap: '24px' }}
        >
          {/* Name field */}
          <div>
            <label
              htmlFor="contact-name"
              className="font-mono-labels text-[14px] block mb-2"
              style={{ color: '#8A8598' }}
            >
              NAME:
            </label>
            <input
              ref={nameRef}
              id="contact-name"
              type="text"
              name="name"
              placeholder="Your Name"
              className="w-full outline-none transition-all duration-200"
              style={{
                height: '52px',
                backgroundColor: '#0D0D14',
                border: '2px solid rgba(138, 133, 152, 0.25)',
                borderRadius: '6px',
                padding: '0 16px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                color: '#F0EDE4',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00E5FF';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(138, 133, 152, 0.25)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="contact-email"
              className="font-mono-labels text-[14px] block mb-2"
              style={{ color: '#8A8598' }}
            >
              EMAIL:
            </label>
            <input
              ref={emailRef}
              id="contact-email"
              type="email"
              name="email"
              placeholder="your@email.com"
              className="w-full outline-none transition-all duration-200"
              style={{
                height: '52px',
                backgroundColor: '#0D0D14',
                border: '2px solid rgba(138, 133, 152, 0.25)',
                borderRadius: '6px',
                padding: '0 16px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                color: '#F0EDE4',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00E5FF';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(138, 133, 152, 0.25)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Message field */}
          <div>
            <label
              htmlFor="contact-message"
              className="font-mono-labels text-[14px] block mb-2"
              style={{ color: '#8A8598' }}
            >
              MESSAGE:
            </label>
            <textarea
              ref={messageRef}
              id="contact-message"
              name="message"
              placeholder="Tell me about your project..."
              className="w-full outline-none resize-none transition-all duration-200"
              style={{
                height: '160px',
                backgroundColor: '#0D0D14',
                border: '2px solid rgba(138, 133, 152, 0.25)',
                borderRadius: '6px',
                padding: '12px 16px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                color: '#F0EDE4',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00E5FF';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 229, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(138, 133, 152, 0.25)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="contact-submit-btn w-full cursor-pointer outline-none"
            style={{
              height: '56px',
              backgroundColor: '#6C5CE7',
              color: '#F0EDE4',
              border: 'none',
              borderRadius: '6px',
              fontFamily: '"VT323", monospace',
              fontSize: '22px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 0 #4834A0, 0 6px 20px rgba(108, 92, 231, 0.3)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #4834A0, 0 8px 24px rgba(108, 92, 231, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #4834A0, 0 6px 20px rgba(108, 92, 231, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #4834A0';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #4834A0, 0 8px 24px rgba(108, 92, 231, 0.4)';
            }}
          >
            Send Message
          </button>
        </form>
      </motion.div>

      {/* Alternative contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center mt-8"
      >
        <p
          className="font-mono-labels text-[18px]"
          style={{ color: '#8A8598' }}
        >
          Or reach me directly at{' '}
          <a
            href="https://github.com/prommin01st-lang"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200"
            style={{ color: '#00E5FF' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            github.com/prommin01st-lang
          </a>
        </p>

        {/* Social icons */}
        <div className="flex items-center justify-center mt-4" style={{ gap: '20px' }}>
          <a
            href="https://github.com/prommin01st-lang"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="transition-colors duration-200"
            style={{ color: '#8A8598' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00E5FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8A8598';
            }}
          >
            <GitHubIcon size={28} />
          </a>
          <a
            href="https://linkedin.com/in/prommin-l"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="transition-colors duration-200"
            style={{ color: '#8A8598' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00E5FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8A8598';
            }}
          >
            <LinkedInIcon size={28} />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
