'use client';

/**
 * src/app/projects/page.tsx
 *
 * Projects List Page – renders the main project management interface
 * with filtering, pagination, and creation capabilities.
 */

import MainLayout from '@/components/layout/main-layout';
import ProjectList from '@/components/project/project-list';

export default function ProjectsPage() {
  return (
    <MainLayout pageTitle="Projects">
      <ProjectList />
    </MainLayout>
  );
}