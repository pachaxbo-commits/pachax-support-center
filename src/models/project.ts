export interface Project {
  id: string;
  clientCompanyId: string;
  developerCompanyId: string;
  name: string;
  code: string; // e.g. "SANJOSE-APP", "QB-ADMIN"
  description?: string;
  repositoryUrl?: string; // Authorized GitHub repo (e.g. pachaxbo-commits/...)
  activeBranch?: string;  // e.g. "main"
  environment: 'production' | 'staging' | 'development';
  techStack: ('react' | 'vite' | 'android' | 'flutter' | 'node' | 'firebase' | 'nextjs')[];
  status: 'active' | 'maintenance' | 'archived';
  publicKey: string;      // Public token for SDK handshakes
  appCheckEnabled: boolean;
  createdAt: string;
}

export interface AppInstallation {
  id: string;
  projectId: string;
  clientCompanyId: string;
  developerCompanyId: string;
  platform: 'android' | 'ios' | 'web' | 'desktop';
  sdkVersion: string;
  appVersion: string;
  deviceModel?: string;
  osVersion?: string;
  ipAddress?: string;
  lastPingAt: string;
  status: 'active' | 'revoked';
}
