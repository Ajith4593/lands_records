import {
  ShieldCheck,
  Database,
  FileCheck2,
  FileText,
  Layers,
  History,
  FlaskConical,
  Users,
  Settings,
  PlusCircle,
  Home,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

export const ROLES = {
  ADMIN: 'administrator',
  OFFICER: 'registration_officer',
  AUDITOR: 'auditor',
  CUSTOMER: 'customer',
};

export const ROLE_METADATA = {
  [ROLES.ADMIN]: {
    label: 'Administrator',
    shortLabel: 'Admin',
    badgeClass: 'badge-admin',
    color: '#1B4332',
    accentBg: 'rgba(27, 67, 50, 0.1)',
    description: 'Full system control, user governance, security lab, tamper simulation & audit authority.',
  },
  [ROLES.OFFICER]: {
    label: 'Registration Officer',
    shortLabel: 'Reg. Officer',
    badgeClass: 'badge-officer',
    color: '#1565C0',
    accentBg: 'rgba(21, 101, 192, 0.1)',
    description: 'Create & register new land parcels, upload official title deeds, digitally sign records.',
  },
  [ROLES.AUDITOR]: {
    label: 'Independent Auditor',
    shortLabel: 'Auditor',
    badgeClass: 'badge-auditor',
    color: '#E65100',
    accentBg: 'rgba(230, 81, 0, 0.1)',
    description: 'Independent verification of SHA-256 hashes, digital signatures, ledger chain integrity & audit trails.',
  },
  [ROLES.CUSTOMER]: {
    label: 'Citizen / Customer',
    shortLabel: 'Customer',
    badgeClass: 'badge-customer',
    color: '#2E7D32',
    accentBg: 'rgba(46, 125, 50, 0.1)',
    description: 'View registered properties, upload personal title documents for cryptographic verification & download certificates.',
  },
};

/**
 * Returns clean navigation items tailored exclusively to the authenticated user's role.
 */
export function getNavItems(role) {
  switch (role) {
    case ROLES.ADMIN:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
        { id: 'records', label: 'Land Records', icon: Database },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'ledger', label: 'Ledger Explorer', icon: Layers },
        { id: 'audit', label: 'Audit Trail', icon: History },
        { id: 'security-testing', label: 'Security Testing', icon: FlaskConical, danger: true },
        { id: 'user-management', label: 'User Management', icon: Users },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ];

    case ROLES.OFFICER:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
        { id: 'register-land', label: 'Register Land', icon: PlusCircle, highlight: true },
        { id: 'records', label: 'Land Records', icon: Database },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'verify', label: 'Verification Engine', icon: FileCheck2 },
      ];

    case ROLES.AUDITOR:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
        { id: 'records', label: 'Land Records', icon: Database },
        { id: 'documents', label: 'Doc Verification', icon: FileText },
        { id: 'ledger', label: 'Ledger Verification', icon: Layers },
        { id: 'audit', label: 'Audit Trail', icon: History },
        { id: 'security-reports', label: 'Security Reports', icon: AlertTriangle },
      ];

    case ROLES.CUSTOMER:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
        { id: 'my-properties', label: 'My Properties', icon: Home, highlight: true },
        { id: 'my-documents', label: 'My Documents', icon: FileSpreadsheet },
        { id: 'documents', label: 'Verify Document', icon: FileText },
        { id: 'verify', label: 'Verification Results', icon: FileCheck2 },
      ];

    default:
      return [
        { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
      ];
  }
}

/**
 * Checks if a role is permitted to perform an action or view a section.
 */
export function hasPermission(role, action) {
  const permissions = {
    viewAllRecords: [ROLES.ADMIN, ROLES.OFFICER, ROLES.AUDITOR],
    registerRecord: [ROLES.ADMIN, ROLES.OFFICER],
    signRecord: [ROLES.ADMIN, ROLES.OFFICER],
    verifyRecord: [ROLES.ADMIN, ROLES.OFFICER, ROLES.AUDITOR, ROLES.CUSTOMER],
    viewLedger: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.OFFICER],
    viewAuditTrail: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.OFFICER],
    manageUsers: [ROLES.ADMIN],
    tamperSimulation: [ROLES.ADMIN],
    systemSettings: [ROLES.ADMIN],
    viewSecurityReports: [ROLES.ADMIN, ROLES.AUDITOR],
    viewCustomerPortal: [ROLES.CUSTOMER, ROLES.ADMIN],
  };

  const allowed = permissions[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
