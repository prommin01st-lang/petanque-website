import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import ProjectsSection from './sections/ProjectsSection';
import SkillsSection from './sections/SkillsSection';
import StatsSection from './sections/StatsSection';

function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <StatsSection />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
