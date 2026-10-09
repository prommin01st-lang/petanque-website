import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import HeroSection from '@/sections/HeroSection';
import AboutSection from '@/sections/AboutSection';
import ProjectsSection from '@/sections/ProjectsSection';
import SkillsSection from '@/sections/SkillsSection';
import StatsSection from '@/sections/StatsSection';
import LatestPostsSection from '@/sections/LatestPostsSection';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function HomePage() {
  const { hash } = useLocation();
  useDocumentTitle('');

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <StatsSection />
      <LatestPostsSection />
    </>
  );
}
