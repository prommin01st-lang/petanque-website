import React from 'react'
import Layout from './components/Layout'
import HeroSection from './sections/HeroSection'
import AboutSection from './sections/AboutSection'
import ProjectsSection from './sections/ProjectsSection'
import SkillsSection from './sections/SkillsSection'
import StatsSection from './sections/StatsSection'
import ContactSection from './sections/ContactSection'

const App: React.FC = () => {
  return (
    <Layout>
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <StatsSection />
      <ContactSection />
    </Layout>
  )
}

export default App
