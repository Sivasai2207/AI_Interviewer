"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
    getUserProfile, 
    getStudentPerformanceStats, 
    deleteOrgUser, 
    suspendUser, 
    reactivateUser,
    resetUserPassword,
    updateUserProfile
} from "@/lib/firebase/firestore";
import type { UserProfile, StudentPerformanceStats } from "@/types";
import { DEPARTMENTS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Loader2,
    Mail,
    Phone,
    Building2,
    Calendar,
    Hash,
    Power,
    Trash2,
    KeyRound,
    Edit,
    BarChart3,
    Trophy,
    Target,
    TrendingUp,
    AlertTriangle,
    Check,
    AlertCircle,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    BarChart,
    Bar,
} from "recharts";

export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { orgId, orgSlug } = useOrg();
    const { role } = useAuth();
    const studentId = params.id as string;

    const [student, setStudent] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<StudentPerformanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Edit modal state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({
        displayName: "",
        registrationNumber: "",
        department: "",
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    useEffect(() => {
        if (orgId && studentId) {
            loadStudentData();
        }
    }, [orgId, studentId]);

    const loadStudentData = async () => {
        try {
            const [profileData, statsData] = await Promise.all([
                getUserProfile(studentId),
                orgId ? getStudentPerformanceStats(orgId, studentId).catch(() => null) : Promise.resolve(null),
            ]);
            setStudent(profileData);
            setStats(statsData);
            if (profileData) {
                setEditData({
                    displayName: profileData.displayName || "",
                    registrationNumber: profileData.registrationNumber || "",
                    department: profileData.department || "",
                });
            }
        } catch (error) {
            console.error("Error loading student:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!student || !confirm(`Suspend ${student.displayName}?`)) return;
        await suspendUser(student.id);
        loadStudentData();
    };

    const handleReactivate = async () => {
        if (!student || !confirm(`Reactivate ${student.displayName}?`)) return;
        await reactivateUser(student.id);
        loadStudentData();
    };

    const handleDelete = async () => {
        if (!student || !orgId || !confirm(`PERMANENTLY delete ${student.displayName}? This cannot be undone.`)) return;
        try {
            await deleteOrgUser(orgId, student.id, "student");
            router.push(`/${orgSlug}/admin/students`);
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete user");
        }
    };

    const handleResetPassword = async () => {
        if (!student || !confirm(`Send password reset email to ${student.email}?`)) return;
        try {
            await resetUserPassword(student.email);
            alert("Password reset email sent!");
        } catch (error) {
            console.error("Failed:", error);
            alert("Failed to send reset email");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;
        
        setEditLoading(true);
        setEditError("");
        
        try {
            await updateUserProfile(student.id, editData);
            setIsEditOpen(false);
            loadStudentData();
        } catch (error: any) {
            setEditError(error.message || "Failed to update");
        } finally {
            setEditLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h1 className="text-xl font-bold">Student Not Found</h1>
                    <Link href={`/${orgSlug}/admin/students`}>
                        <Button variant="link">Back to Students</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const scoreHistory = stats?.scoreHistory || [];
    const skillData = stats?.skillBreakdown ? [
        { skill: "Fundamentals", value: stats.skillBreakdown.fundamentals },
        { skill: "Project Depth", value: stats.skillBreakdown.projectDepth },
        { skill: "Problem Solving", value: stats.skillBreakdown.problemSolving },
        { skill: "System Design", value: stats.skillBreakdown.systemDesign },
        { skill: "Communication", value: stats.skillBreakdown.communication },
        { skill: "Role Fit", value: stats.skillBreakdown.roleFit },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/${orgSlug}/admin/students`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-4 flex-1">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                        student.status === "suspended" ? "bg-red-100" : "bg-primary/10"
                    }`}>
                        <span className={`text-2xl font-bold ${
                            student.status === "suspended" ? "text-red-600" : "text-primary"
                        }`}>
                            {student.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{student.displayName}</h1>
                            {student.status === "suspended" && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                                    Suspended
                                </span>
                            )}
                            {student.status === "active" && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground">{student.email}</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.totalInterviews || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Interviews</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.completedInterviews || 0}</p>
                                <p className="text-sm text-muted-foreground">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Target className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {scoreHistory.length >= 2 
                                        ? `${scoreHistory[scoreHistory.length - 1].score > scoreHistory[scoreHistory.length - 2].score ? "+" : ""}${Math.round(scoreHistory[scoreHistory.length - 1].score - scoreHistory[scoreHistory.length - 2].score)}%`
                                        : "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">Trend</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Student Info */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Student Information</CardTitle>
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit Student</DialogTitle>
                                    <DialogDescription>Update student information</DialogDescription>
                                </DialogHeader>
                                {editError && (
                                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        {editError}
                                    </div>
                                )}
                                <form onSubmit={handleEditSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            value={editData.displayName}
                                            onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Registration Number</Label>
                                        <Input
                                            value={editData.registrationNumber}
                                            onChange={(e) => setEditData({ ...editData, registrationNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select
                                            value={editData.department}
                                            onValueChange={(value) => setEditData({ ...editData, department: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DEPARTMENTS.map((dept) => (
                                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={editLoading}>
                                        {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{student.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Registration Number</p>
                                <p className="font-medium">{student.registrationNumber || "Not set"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Department</p>
                                <p className="font-medium">{student.department || "Not set"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Joined</p>
                                <p className="font-medium">
                                    {student.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Score History Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Score History</CardTitle>
                        <CardDescription>Interview performance over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {scoreHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={scoreHistory}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Line 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--primary))" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                                No interview data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Skill Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Skill Breakdown</CardTitle>
                        <CardDescription>Performance across different areas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {skillData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={skillData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="skill" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                No skill data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage this student account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full justify-start" onClick={handleResetPassword}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Send Password Reset Email
                        </Button>
                        
                        {student.status === "suspended" ? (
                            <Button variant="outline" className="w-full justify-start text-green-600" onClick={handleReactivate}>
                                <Power className="mr-2 h-4 w-4" />
                                Reactivate Account
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full justify-start text-yellow-600" onClick={handleSuspend}>
                                <Power className="mr-2 h-4 w-4" />
                                Suspend Account
                            </Button>
                        )}
                        
                        {(role === "super_admin" || role === "admin") && (
                            <Button variant="destructive" className="w-full justify-start" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account Permanently
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Strengths & Weaknesses */}
            {stats && (stats.strengths?.length > 0 || stats.weaknesses?.length > 0) && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-green-600">Strengths</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.strengths?.length > 0 ? (
                                <ul className="space-y-2">
                                    {stats.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground">No strengths identified yet</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-red-600">Areas for Improvement</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.weaknesses?.length > 0 ? (
                                <ul className="space-y-2">
                                    {stats.weaknesses.map((w, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 mt-1 text-red-600 flex-shrink-0" />
                                            <span>{w}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground">No areas for improvement identified</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
