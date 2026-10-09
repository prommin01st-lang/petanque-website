export interface SkillCategory {
  key: 'backend' | 'frontend' | 'databases' | 'devopsTesting' | 'cloudIntegrations';
  dir: string;
  skills: string[];
}

export const SKILL_CATEGORIES: readonly SkillCategory[] = [
  { key: 'backend', dir: 'backend', skills: ['.NET 10', 'C#', 'ASP.NET Core', 'EF Core 10', 'SignalR', 'REST APIs'] },
  { key: 'frontend', dir: 'frontend', skills: ['Next.js 14-16', 'React 19', 'TypeScript', 'Material UI', 'Tailwind CSS'] },
  { key: 'databases', dir: 'databases', skills: ['PostgreSQL', 'SQL Server', 'Redis'] },
  { key: 'devopsTesting', dir: 'devops-testing', skills: ['Docker', 'PowerShell', 'xUnit', 'Testcontainers', 'FluentAssertions', 'Bruno'] },
  { key: 'cloudIntegrations', dir: 'cloud-integrations', skills: ['Cloudflare R2', 'Google OAuth/Calendar', 'Gmail SMTP', 'Gemini API', 'RAG', 'LLM Fine-tuning'] },
];
