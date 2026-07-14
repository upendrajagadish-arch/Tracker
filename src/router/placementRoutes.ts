import { createRoute } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { PlacementDashboardPage } from '@/pages/placement/PlacementDashboardPage'
import { StudentsPage } from '@/pages/placement/StudentsPage'
import { StudentDetailPage } from '@/pages/placement/StudentDetailPage'
import { StudentFormPage } from '@/pages/placement/StudentFormPage'
import { StudentImportPage } from '@/pages/placement/StudentImportPage'
import { StudentBulkAssignPage } from '@/pages/placement/StudentBulkAssignPage'
import { ResumesPage } from '@/pages/placement/ResumesPage'
import { TechStackPage } from '@/pages/placement/TechStackPage'
import { ReadinessPage } from '@/pages/placement/ReadinessPage'
import { RequirementsPage } from '@/pages/placement/RequirementsPage'
import { RequirementDetailPage } from '@/pages/placement/RequirementDetailPage'
import { ResumeBooksPage } from '@/pages/placement/ResumeBooksPage'
import { ResumeBookCreatePage } from '@/pages/placement/ResumeBookCreatePage'
import { ResumeBookViewPage } from '@/pages/placement/ResumeBookViewPage'
import { ReportsPage } from '@/pages/placement/ReportsPage'
import { SharedStudentsPage } from '@/pages/placement/SharedStudentsPage'
import { CommunicationEvaluationsPage } from '@/pages/placement/CommunicationEvaluationsPage'
import { CommunicationEvaluationFormPage } from '@/pages/placement/CommunicationEvaluationFormPage'
import { CommunicationEvaluationImportPage } from '@/pages/placement/CommunicationEvaluationImportPage'
import { RemovedPlacementRedirectPage } from '@/pages/placement/RemovedPlacementRedirectPage'
import { PublicResumeBookPage } from '@/pages/public/PublicResumeBookPage'

const REMOVED_PLACEMENT_PATHS = [
  'companies',
  'companies/$id',
  'hr-talent-room',
  'placement-passport',
  'management-summary',
  'audit-logs',
] as const

function createRemovedPlacementRoutes(parent: AnyRoute, prefix: 'admin' | 'tpo' | 'faculty' | 'interviewer') {
  return REMOVED_PLACEMENT_PATHS.map((segment) =>
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/${segment}`,
      component: RemovedPlacementRedirectPage,
    }),
  )
}

function createStaffPlacementRoutes(parent: AnyRoute, prefix: 'admin' | 'tpo' | 'faculty') {
  return [
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/shared-students`,
      component: SharedStudentsPage,
    }),
  ]
}

function createRolePlacementRoutes(parent: AnyRoute, prefix: 'admin' | 'tpo' | 'faculty' | 'interviewer') {
  return [
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement`,
      component: PlacementDashboardPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students`,
      component: StudentsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students/import`,
      component: StudentImportPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students/bulk-assign`,
      component: StudentBulkAssignPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students/new`,
      component: StudentFormPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students/$id/edit`,
      component: StudentFormPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students/$id`,
      component: StudentDetailPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/resumes`,
      component: ResumesPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/tech-stack`,
      component: TechStackPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/readiness`,
      component: ReadinessPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication`,
      component: CommunicationEvaluationsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/new`,
      component: CommunicationEvaluationFormPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/import`,
      component: CommunicationEvaluationImportPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/$studentProfileId/edit`,
      component: CommunicationEvaluationFormPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/requirements`,
      component: RequirementsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/requirements/$id`,
      component: RequirementDetailPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/resume-books`,
      component: ResumeBooksPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/resume-books/create`,
      component: ResumeBookCreatePage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/resume-books/$id`,
      component: ResumeBookViewPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/reports`,
      component: ReportsPage,
    }),
  ]
}

export function createPlacementRoutes(parent: AnyRoute) {
  return [
    ...createRolePlacementRoutes(parent, 'admin'),
    ...createRolePlacementRoutes(parent, 'tpo'),
    ...createRolePlacementRoutes(parent, 'faculty'),
    ...createRolePlacementRoutes(parent, 'interviewer'),
    ...createRemovedPlacementRoutes(parent, 'admin'),
    ...createRemovedPlacementRoutes(parent, 'tpo'),
    ...createRemovedPlacementRoutes(parent, 'faculty'),
    ...createRemovedPlacementRoutes(parent, 'interviewer'),
    ...createStaffPlacementRoutes(parent, 'admin'),
    ...createStaffPlacementRoutes(parent, 'tpo'),
    ...createStaffPlacementRoutes(parent, 'faculty'),
    createRoute({
      getParentRoute: () => parent,
      path: 'admin/tech-stack',
      component: TechStackPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: 'tpo/tech-stack',
      component: TechStackPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: 'faculty/tech-stack',
      component: TechStackPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: 'public/resume-books/$token',
      component: PublicResumeBookPage,
    }),
  ]
}
