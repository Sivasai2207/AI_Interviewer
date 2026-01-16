import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Brain,
    Target,
    Clock,
    FileText,
    Zap,
    Shield,
    GraduationCap,
    Building2,
} from "lucide-react";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Brain className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold">AI Interviewer</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/admin/login">
                            <Button variant="ghost" size="sm">
                                Platform Admin
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="container mx-auto px-4 pt-32 pb-20">
                <div className="mx-auto max-w-4xl text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <span>Multi-Tenant Placement Training Platform</span>
                    </div>

                    <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
                        AI-Powered
                        <span className="text-gradient"> Placement </span>
                        Training
                    </h1>

                    <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
                        The complete platform for colleges to train students with AI mock interviews.
                        Each institution gets their own branded portal with full administrative control.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <div className="glass-card rounded-xl p-6 text-left max-w-sm">
                            <Building2 className="h-8 w-8 text-primary mb-3" />
                            <h3 className="font-semibold mb-2">For Colleges</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Get your own branded portal. Register students and staff. Track performance.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Access your portal at: <code className="bg-muted px-1 rounded">/your-college/login</code>
                            </p>
                        </div>
                        <div className="glass-card rounded-xl p-6 text-left max-w-sm">
                            <Shield className="h-8 w-8 text-primary mb-3" />
                            <h3 className="font-semibold mb-2">Platform Owners</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Manage all organizations from a central admin panel.
                            </p>
                            <Link href="/admin/login">
                                <Button size="sm" variant="outline">
                                    Platform Admin Login
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="border-t bg-muted/30 py-20">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                            Everything You Need
                        </h2>
                        <p className="mx-auto max-w-2xl text-muted-foreground">
                            A complete solution for placement training at scale.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon={<Building2 className="h-6 w-6" />}
                            title="Multi-Tenant Architecture"
                            description="Each college gets their own isolated portal with custom branding options."
                        />
                        <FeatureCard
                            icon={<Target className="h-6 w-6" />}
                            title="Resume-Based Questions"
                            description="AI tailors questions based on student resumes and target roles."
                        />
                        <FeatureCard
                            icon={<Brain className="h-6 w-6" />}
                            title="Adaptive AI Interviewer"
                            description="Follow-up questions drill into vague answers. No escape from depth."
                        />
                        <FeatureCard
                            icon={<Clock className="h-6 w-6" />}
                            title="Timed Sessions"
                            description="Simulate real interview pressure with configurable time limits."
                        />
                        <FeatureCard
                            icon={<FileText className="h-6 w-6" />}
                            title="Detailed Reports"
                            description="Comprehensive feedback with scores, strengths, weaknesses, and action plans."
                        />
                        <FeatureCard
                            icon={<Zap className="h-6 w-6" />}
                            title="Faculty Dashboard"
                            description="Staff can monitor student progress and identify struggling students."
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                            How It Works
                        </h2>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">
                                1
                            </div>
                            <h3 className="font-semibold mb-2">Create Organization</h3>
                            <p className="text-sm text-muted-foreground">
                                Platform admin creates a college organization with a unique URL slug.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">
                                2
                            </div>
                            <h3 className="font-semibold mb-2">Register Students</h3>
                            <p className="text-sm text-muted-foreground">
                                College admin registers students via single form or bulk Excel upload.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">
                                3
                            </div>
                            <h3 className="font-semibold mb-2">Students Practice</h3>
                            <p className="text-sm text-muted-foreground">
                                Students log in and take AI-powered mock interviews. Faculty tracks progress.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-8">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        <span>AI Interviewer - Multi-Tenant Platform</span>
                    </div>
                    <p>© 2024 AI Interviewer. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="glass-card rounded-xl p-6 transition-transform hover:scale-[1.02]">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
