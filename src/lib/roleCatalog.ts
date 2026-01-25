/**
 * Role Catalog for Student Onboarding
 * Students select up to 3 roles from this fixed list during their first login.
 */

export interface RoleCategory {
    name: string;
    roles: string[];
}

export const ROLE_CATALOG: RoleCategory[] = [
    {
        name: "Data Roles",
        roles: [
            "AI/Machine Learning Engineer",
            "Data Architect",
            "Analytics Engineer",
            "Data Operations Engineer (DataOps)",
            "Principal Data Scientist",
        ],
    },
    {
        name: "Full Stack Roles",
        roles: [
            "Full Stack Software Engineer",
            "Full Stack Application Developer",
            "Full Stack Web Developer",
            "Full Stack Solutions Architect",
            "Full Stack Cloud Developer",
        ],
    },
    {
        name: "Software Engineering Roles",
        roles: [
            "Backend Systems Engineer",
            "Frontend Engineer",
            "Embedded Software Engineer",
            "Software Development Engineer in Test (SDET)",
            "Mobile Software Engineer (iOS/Android)",
        ],
    },
    {
        name: "Other Technical Roles",
        roles: [
            "Platform Engineer",
            "Cloud Infrastructure Architect",
            "Cybersecurity Engineer",
            "Technical Product Manager (TPM)",
            "Site Reliability Engineer (SRE)",
        ],
    },
];

// Flat list of all valid roles for validation
export const ALL_ROLES: string[] = ROLE_CATALOG.flatMap((cat) => cat.roles);

// Maximum number of roles a student can select
export const MAX_TARGET_ROLES = 3;

/**
 * Validates that the provided roles are valid and within limits.
 */
export function validateTargetRoles(roles: string[]): { valid: boolean; error?: string } {
    if (!Array.isArray(roles)) {
        return { valid: false, error: "Roles must be an array" };
    }
    if (roles.length === 0) {
        return { valid: false, error: "At least one role must be selected" };
    }
    if (roles.length > MAX_TARGET_ROLES) {
        return { valid: false, error: `Maximum ${MAX_TARGET_ROLES} roles allowed` };
    }
    for (const role of roles) {
        if (!ALL_ROLES.includes(role)) {
            return { valid: false, error: `Invalid role: ${role}` };
        }
    }
    return { valid: true };
}
