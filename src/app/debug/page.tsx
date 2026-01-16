export default function DebugPage() {
    const routes = {
        "Public Routes": [
            { path: "/", label: "Landing Page" },
            { path: "/admin/login", label: "Platform Admin Login" },
        ],
        "Platform Admin Routes": [
            { path: "/admin", label: "Platform Dashboard" },
            { path: "/admin/organizations", label: "Organizations List" },
            { path: "/admin/organizations/new", label: "Create Organization" },
            { path: "/admin/organizations/lgePANDUTLP3ug8plqGD", label: "Org Details (Example)" },
            { path: "/admin/audit-logs", label: "Audit Logs" },
        ],
        "Organization Routes (slug: sist)": [
            { path: "/sist/login", label: "Org Login" },
            { path: "/sist/admin", label: "Org Admin Dashboard" },
            { path: "/sist/admin/students", label: "Students List" },
            { path: "/sist/admin/register", label: "Register Students" },
            { path: "/sist/admin/settings", label: "Org Settings" },
            { path: "/sist/student", label: "Student Dashboard" },
            { path: "/sist/student/profile", label: "Student Profile" },
            { path: "/sist/student/new-interview", label: "New Interview" },
        ],
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Route Verification Debug Page</h1>
                <p className="text-muted-foreground mb-8">
                    Click any link below to test if the route loads correctly. Check browser console for
                    <code className="mx-1 px-2 py-1 bg-muted rounded">[OrgLayout]</code> and
                    <code className="mx-1 px-2 py-1 bg-muted rounded">[Firestore]</code> messages.
                </p>

                {Object.entries(routes).map(([category, links]) => (
                    <div key={category} className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">{category}</h2>
                        <div className="grid gap-2">
                            {links.map((link) => (
                                <a
                                    key={link.path}
                                    href={link.path}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="font-mono text-sm">{link.path}</span>
                                    <span className="text-muted-foreground text-sm">{link.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-yellow-600 dark:text-yellow-400">
                        Known Issue: Organization Slug Resolution
                    </h3>
                    <p className="text-sm mb-4">
                        If org routes show "Organization Not Found", check browser console for:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li><code>[Firestore] getOrganizationBySlug called with slug: sist</code></li>
                        <li><code>[Firestore] Slug document exists: false</code> ← This means slug mapping is missing</li>
                        <li>Check Firestore console: <code>orgSlugs/sist</code> document should exist</li>
                    </ul>
                </div>

                <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400">
                        Quick Firestore Check
                    </h3>
                    <p className="text-sm mb-2">
                        Open browser console and run:
                    </p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`// Check if slug mapping exists
const db = firebase.firestore();
const slugDoc = await db.collection('orgSlugs').doc('sist').get();
console.log('Slug exists:', slugDoc.exists());
console.log('Slug data:', slugDoc.data());

// If it exists, check the org document
if (slugDoc.exists()) {
  const orgId = slugDoc.data().orgId;
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  console.log('Org exists:', orgDoc.exists());
  console.log('Org data:', orgDoc.data());
}`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
