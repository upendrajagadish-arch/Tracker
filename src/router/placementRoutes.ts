import { createRoute } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { AdminHomePage, TpoHomePage, ClassicPremiumDashboardPage } from '@/pages/placement/PlacementDashboardPage'
import { FacultyDashboardPage, FacultyClassicDashboardPage } from '@/pages/placement/FacultyDashboardPage'
import { InterviewerHomePage } from '@/pages/placement/InterviewerHomePage'
import { StudentsPage } from '@/pages/placement/StudentsPage'
import { StudentDetailPage } from '@/pages/placement/StudentDetailPage'
import { StudentFormPage } from '@/pages/placement/StudentFormPage'
import { StudentImportPage } from '@/pages/placement/StudentImportPage'
import { StudentBulkAssignPage } from '@/pages/placement/StudentBulkAssignPage'
import { ResumesPage } from '@/pages/placement/ResumesPage'
import { TechStackPage } from '@/pages/placement/TechStackPage'
import { TechStackStudentsPage } from '@/pages/placement/TechStackStudentsPage'
import { TechStackEvaluatePage } from '@/pages/placement/TechStackEvaluatePage'
import { TechStackImportPage } from '@/pages/placement/TechStackImportPage'
import { ReadinessPage } from '@/pages/placement/ReadinessPage'
import { RequirementsPage } from '@/pages/placement/RequirementsPage'
import { RequirementDetailPage } from '@/pages/placement/RequirementDetailPage'
import { ResumeBooksPage } from '@/pages/placement/ResumeBooksPage'
import { ResumeBookCreatePage } from '@/pages/placement/ResumeBookCreatePage'
import { ResumeBookViewPage } from '@/pages/placement/ResumeBookViewPage'
import { SharedStudentsPage } from '@/pages/placement/SharedStudentsPage'
import { CommunicationDashboardPage } from '@/pages/placement/CommunicationDashboardPage'
import { CommunicationEvaluationsPage } from '@/pages/placement/CommunicationEvaluationsPage'
import { CommunicationBadgeStudentsPage } from '@/pages/placement/CommunicationBadgeStudentsPage'
import { CommunicationAnalyticsPage } from '@/pages/placement/CommunicationAnalyticsPage'
import { CommunicationEvaluationFormPage } from '@/pages/placement/CommunicationEvaluationFormPage'
import { CommunicationEvaluationImportPage } from '@/pages/placement/CommunicationEvaluationImportPage'
import {
  AptitudeScoresPage,
  VerbalScoresPage,
} from '@/pages/placement/AssessmentScoresPage'
import {
  AptitudeImportPage,
  VerbalImportPage,
} from '@/pages/placement/AssessmentImportPage'
import { CodeNowScoresPage } from '@/pages/placement/CodeNowScoresPage'
import { CodeNowImportPage } from '@/pages/placement/CodeNowImportPage'
import { RemovedPlacementRedirectPage } from '@/pages/placement/RemovedPlacementRedirectPage'
import { PublicResumeBookPage } from '@/pages/public/PublicResumeBookPage'
import { StudentUpdateCampaignsPage } from '@/pages/placement/StudentUpdateCampaignsPage'
import { StudentUpdateCampaignCreatePage } from '@/pages/placement/StudentUpdateCampaignCreatePage'
import { StudentUpdateCampaignDetailPage } from '@/pages/placement/StudentUpdateCampaignDetailPage'
import { PlacementOperationsPage } from '@/pages/placement/PlacementOperationsPage'

const REMOVED_PLACEMENT_PATHS = [
  'companies',
  'companies/$id',
  'hr-talent-room',
  'placement-passport',
  'management-summary',
  'audit-logs',
  'reports',
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
  const Dashboard =
    prefix === 'faculty'
      ? FacultyDashboardPage
      : prefix === 'tpo'
        ? TpoHomePage
        : prefix === 'admin'
          ? AdminHomePage
          : InterviewerHomePage
  return [
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement`,
      component: Dashboard,
    }),
    ...(prefix === 'admin' || prefix === 'tpo'
      ? [
          createRoute({
            getParentRoute: () => parent,
            path: `${prefix}/placement/dashboard`,
            component: ClassicPremiumDashboardPage,
          }),
        ]
      : prefix === 'faculty'
        ? [
            createRoute({
              getParentRoute: () => parent,
              path: `${prefix}/placement/dashboard`,
              component: FacultyClassicDashboardPage,
            }),
          ]
        : []),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/operations`,
      component: PlacementOperationsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/students`,
      component: StudentsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/student-update-campaigns`,
      component: StudentUpdateCampaignsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/student-update-campaigns/new`,
      component: StudentUpdateCampaignCreatePage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/student-update-campaigns/$id`,
      component: StudentUpdateCampaignDetailPage,
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
      path: `${prefix}/placement/tech-stack/students`,
      component: TechStackStudentsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/tech-stack/evaluate`,
      component: TechStackEvaluatePage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/tech-stack/import`,
      component: TechStackImportPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/readiness`,
      component: ReadinessPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication`,
      component: CommunicationDashboardPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/students`,
      component: CommunicationEvaluationsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/analytics`,
      component: CommunicationAnalyticsPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/communication/badge/$badge`,
      component: CommunicationBadgeStudentsPage,
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
      path: `${prefix}/placement/aptitude`,
      component: AptitudeScoresPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/aptitude/import`,
      component: AptitudeImportPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/verbal`,
      component: VerbalScoresPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/verbal/import`,
      component: VerbalImportPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/codenow`,
      component: CodeNowScoresPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: `${prefix}/placement/codenow/import`,
      component: CodeNowImportPage,
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
