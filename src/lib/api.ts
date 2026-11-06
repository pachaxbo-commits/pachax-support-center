import { isFirebaseConfigured } from './firebase';
import {
  firebaseRepository,
  getOperationalDateString,
  DailyGeneralLimitExceededError,
} from './repositories/firebaseRepository';
import { demoRepository } from './repositories/demoRepository';

export { getOperationalDateString, DailyGeneralLimitExceededError };

/**
 * Determines whether the application should operate using the isolated DemoRepository
 * or the real FirebaseRepository.
 *
 * STRICT RULE:
 * - In Production (`import.meta.env.PROD === true`) or whenever `VITE_APP_MODE !== 'demo'`,
 *   if Firebase is configured, the app ALWAYS uses `firebaseRepository` with ZERO fallback
 *   to demo data.
 * - `demoRepository` is ONLY used when `VITE_APP_MODE === 'demo'` in non-production environments
 *   or during offline unit tests where Firebase is not configured.
 */
export function isUsingDemoRepository(): boolean {
  if (import.meta.env.PROD) {
    return false;
  }
  if (import.meta.env.VITE_APP_MODE === 'demo') {
    return true;
  }
  return !isFirebaseConfigured();
}

function getRepo() {
  return isUsingDemoRepository() ? demoRepository : firebaseRepository;
}

export const api = {
  getDeveloperCompany: (...args: Parameters<typeof firebaseRepository.getDeveloperCompany>) =>
    getRepo().getDeveloperCompany(...args),
  upsertDeveloperCompany: (...args: Parameters<typeof firebaseRepository.upsertDeveloperCompany>) =>
    getRepo().upsertDeveloperCompany(...args),

  getClients: (...args: Parameters<typeof firebaseRepository.getClients>) =>
    getRepo().getClients(...args),
  createClient: (...args: Parameters<typeof firebaseRepository.createClient>) =>
    getRepo().createClient(...args),
  updateClient: (...args: Parameters<typeof firebaseRepository.updateClient>) =>
    getRepo().updateClient(...args),

  getProjects: (...args: Parameters<typeof firebaseRepository.getProjects>) =>
    getRepo().getProjects(...args),
  createProject: (...args: Parameters<typeof firebaseRepository.createProject>) =>
    getRepo().createProject(...args),
  updateProject: (...args: Parameters<typeof firebaseRepository.updateProject>) =>
    getRepo().updateProject(...args),

  getUsers: (...args: Parameters<typeof firebaseRepository.getUsers>) =>
    getRepo().getUsers(...args),
  getInvitations: (...args: Parameters<typeof firebaseRepository.getInvitations>) =>
    getRepo().getInvitations(...args),
  createInvitation: (...args: Parameters<typeof firebaseRepository.createInvitation>) =>
    getRepo().createInvitation(...args),
  updateUserStatus: (...args: Parameters<typeof firebaseRepository.updateUserStatus>) =>
    getRepo().updateUserStatus(...args),

  hasSubmittedGeneralReportToday: (
    ...args: Parameters<typeof firebaseRepository.hasSubmittedGeneralReportToday>
  ) => getRepo().hasSubmittedGeneralReportToday(...args),

  getIncidentReports: (...args: Parameters<typeof firebaseRepository.getIncidentReports>) =>
    getRepo().getIncidentReports(...args),
  getIncidentItems: (...args: Parameters<typeof firebaseRepository.getIncidentItems>) =>
    getRepo().getIncidentItems(...args),
  createIncidentReport: (...args: Parameters<typeof firebaseRepository.createIncidentReport>) =>
    getRepo().createIncidentReport(...args),
  updateIncidentItemStatus: (
    ...args: Parameters<typeof firebaseRepository.updateIncidentItemStatus>
  ) => getRepo().updateIncidentItemStatus(...args),
  assignIncidentItem: (...args: Parameters<typeof firebaseRepository.assignIncidentItem>) =>
    getRepo().assignIncidentItem(...args),
  addIncidentComment: (...args: Parameters<typeof firebaseRepository.addIncidentComment>) =>
    getRepo().addIncidentComment(...args),

  getFeatureRequests: (...args: Parameters<typeof firebaseRepository.getFeatureRequests>) =>
    getRepo().getFeatureRequests(...args),
  createFeatureRequest: (...args: Parameters<typeof firebaseRepository.createFeatureRequest>) =>
    getRepo().createFeatureRequest(...args),
  updateFeatureRequestStatus: (
    ...args: Parameters<typeof firebaseRepository.updateFeatureRequestStatus>
  ) => getRepo().updateFeatureRequestStatus(...args),

  getQuotes: (...args: Parameters<typeof firebaseRepository.getQuotes>) =>
    getRepo().getQuotes(...args),
  createQuote: (...args: Parameters<typeof firebaseRepository.createQuote>) =>
    getRepo().createQuote(...args),
  approveQuote: (...args: Parameters<typeof firebaseRepository.approveQuote>) =>
    getRepo().approveQuote(...args),
  rejectQuote: (...args: Parameters<typeof firebaseRepository.rejectQuote>) =>
    getRepo().rejectQuote(...args),

  getAiRepairRuns: (...args: Parameters<typeof firebaseRepository.getAiRepairRuns>) =>
    getRepo().getAiRepairRuns(...args),
  triggerAiRepair: (...args: Parameters<typeof firebaseRepository.triggerAiRepair>) =>
    getRepo().triggerAiRepair(...args),
};
