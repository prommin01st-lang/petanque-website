/** True only for a first visit to `/` in this session, with motion allowed and no automation. */
export function shouldBoot(pathname: string): boolean {
  if (pathname !== '/') return false;
  try {
    if (sessionStorage.getItem('booted')) return false;
  } catch {
    return false;
  }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    return false;
  }
  if (navigator.webdriver) return false;
  return true;
}
