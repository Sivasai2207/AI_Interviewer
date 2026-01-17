"use client";

import React, { useState } from "react";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
    createOrgUser, 
    bulkCreateOrgStudents, 
    bulkCreateOrgFaculty, 
    updateUserProfile 
} from "@/lib/firebase/firestore";
import { 
    parseExcelFile, 
    downloadTemplate, 
    parseFacultyExcel, 
    downloadFacultyTemplate 
} from "@/lib/excel";
import type { BulkUploadRow, BulkUploadResult, FacultyUploadRow } from "@/types";
import { DEPARTMENTS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    UserPlus,
    Users,
    Upload,
    Download,
    Loader2,
    AlertCircle,
    Check,
    FileSpreadsheet,
    GraduationCap,
    School,
    ArrowRight,
    CircleDashed,
} from "lucide-react";

interface BulkUploadRowWithSelection extends BulkUploadRow {
    selected: boolean;
}

interface FacultyUploadRowWithSelection extends FacultyUploadRow {
    selected: boolean;
}

export default function RegisterPage() {
    const { orgId, orgSlug } = useOrg();
    const { user } = useAuth();
    const [userType, setUserType] = useState("student");
    const [activeTab, setActiveTab] = useState("single");

    // Student Single Registration State
    const [studentSingleData, setStudentSingleData] = useState({
        name: "",
        email: "",
        registrationNumber: "",
        department: "",
        password: "",
    });
    const [studentSingleLoading, setStudentSingleLoading] = useState(false);
    const [studentSingleError, setStudentSingleError] = useState("");
    const [studentSingleSuccess, setStudentSingleSuccess] = useState(false);

    // Student Bulk Registration State
    const [studentBulkData, setStudentBulkData] = useState<BulkUploadRowWithSelection[]>([]);
    const [studentBulkLoading, setStudentBulkLoading] = useState(false);
    const [studentBulkResult, setStudentBulkResult] = useState<BulkUploadResult | null>(null);
    const [studentParseError, setStudentParseError] = useState("");

    // Faculty Single Registration State
    const [facultySingleData, setFacultySingleData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        department: "",
        password: "",
    });
    const [facultySingleLoading, setFacultySingleLoading] = useState(false);
    const [facultySingleError, setFacultySingleError] = useState("");
    const [facultySingleSuccess, setFacultySingleSuccess] = useState(false);

    // Faculty Bulk Registration State
    const [facultyBulkData, setFacultyBulkData] = useState<FacultyUploadRowWithSelection[]>([]);
    const [facultyBulkLoading, setFacultyBulkLoading] = useState(false);
    const [facultyBulkResult, setFacultyBulkResult] = useState<BulkUploadResult | null>(null);
    const [facultyParseError, setFacultyParseError] = useState("");

    // ======================
    // Student Handlers
    // ======================
    const handleStudentSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !user) return;

        setStudentSingleError("");
        setStudentSingleLoading(true);
        setStudentSingleSuccess(false);

        try {
            const result = await createOrgUser(
                orgId,
                {
                    name: studentSingleData.name,
                    email: studentSingleData.email,
                    role: "student",
                    registrationNumber: studentSingleData.registrationNumber,
                    department: studentSingleData.department,
                    password: studentSingleData.password,
                },
                user.uid
            );

            if (result.success) {
                setStudentSingleSuccess(true);
                setStudentSingleData({ name: "", email: "", registrationNumber: "", department: "", password: "" });
            } else {
                setStudentSingleError(result.error || "Failed to create student");
            }
        } catch (err: any) {
            setStudentSingleError(err.message || "An error occurred");
        } finally {
            setStudentSingleLoading(false);
        }
    };

    const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStudentParseError("");
        setStudentBulkData([]);
        setStudentBulkResult(null);

        try {
            const result = await parseExcelFile(file);
            
            if (result.success && result.data) {
                const dataWithSelection = result.data.map(row => ({ ...row, selected: true }));
                setStudentBulkData(dataWithSelection);
            } else {
                setStudentParseError(result.error || "Failed to parse file");
            }
        } catch (err: any) {
            setStudentParseError(err.message || "Failed to parse file");
        }
    };

    const handleStudentBulkSubmit = async () => {
        if (!orgId || !user || studentBulkData.length === 0) return;

        const selectedRows = studentBulkData.filter(row => row.selected).map(({ selected, ...row }) => row);
        
        if (selectedRows.length === 0) {
            setStudentParseError("Please select at least one student to register");
            return;
        }

        setStudentBulkLoading(true);
        setStudentBulkResult(null);
        setStudentParseError("");

        try {
            const result = await bulkCreateOrgStudents(orgId, selectedRows, user.uid);
            setStudentBulkResult(result);
            if (result.success) {
                setStudentBulkData([]);
            }
        } catch (err: any) {
            setStudentBulkResult({
                success: false,
                created: 0,
                failed: selectedRows.length,
                errors: [{ row: 0, email: "", error: err.message }],
            });
        } finally {
            setStudentBulkLoading(false);
        }
    };

    const toggleStudentSelection = (index: number) => {
        setStudentBulkData(prev => prev.map((row, i) => 
            i === index ? { ...row, selected: !row.selected } : row
        ));
    };

    const toggleStudentSelectAll = () => {
        const allSelected = studentBulkData.every(row => row.selected);
        setStudentBulkData(prev => prev.map(row => ({ ...row, selected: !allSelected })));
    };

    // ======================
    // Faculty Handlers
    // ======================
    const handleFacultySingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !user) return;

        setFacultySingleError("");
        setFacultySingleLoading(true);
        setFacultySingleSuccess(false);

        try {
            const result = await createOrgUser(
                orgId,
                {
                    name: facultySingleData.name,
                    email: facultySingleData.email,
                    role: "staff",
                    department: facultySingleData.department,
                    password: facultySingleData.password,
                },
                user.uid
            );

            if (result.success && result.uid) {
                await updateUserProfile(result.uid, { phoneNumber: facultySingleData.phoneNumber });

                setFacultySingleSuccess(true);
                setFacultySingleData({ name: "", email: "", phoneNumber: "", department: "", password: "" });
            } else {
                setFacultySingleError(result.error || "Failed to create faculty member");
            }
        } catch (err: any) {
            setFacultySingleError(err.message || "An error occurred");
        } finally {
            setFacultySingleLoading(false);
        }
    };

    const handleFacultyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFacultyParseError("");
        setFacultyBulkData([]);
        setFacultyBulkResult(null);

        try {
            const result = await parseFacultyExcel(file);
            
            if (result.success && result.data) {
                const dataWithSelection = result.data.map(row => ({ ...row, selected: true }));
                setFacultyBulkData(dataWithSelection);
            } else {
                setFacultyParseError(result.error || "Failed to parse file");
            }
        } catch (err: any) {
            setFacultyParseError(err.message || "Failed to parse file");
        }
    };

    const handleFacultyBulkSubmit = async () => {
        if (!orgId || !user || facultyBulkData.length === 0) return;

        const selectedRows = facultyBulkData.filter(row => row.selected).map(({ selected, ...row }) => row);
        
        if (selectedRows.length === 0) {
            setFacultyParseError("Please select at least one member to register");
            return;
        }

        setFacultyBulkLoading(true);
        setFacultyBulkResult(null);
        setFacultyParseError("");

        try {
            const result = await bulkCreateOrgFaculty(orgId, selectedRows, user.uid);
            setFacultyBulkResult(result);
            if (result.success) {
                setFacultyBulkData([]);
            }
        } catch (err: any) {
            setFacultyBulkResult({
                success: false,
                created: 0,
                failed: selectedRows.length,
                errors: [{ row: 0, email: "", error: err.message }],
            });
        } finally {
            setFacultyBulkLoading(false);
        }
    };

    const toggleFacultySelection = (index: number) => {
        setFacultyBulkData(prev => prev.map((row, i) => 
            i === index ? { ...row, selected: !row.selected } : row
        ));
    };

    const toggleFacultySelectAll = () => {
        const allSelected = facultyBulkData.every(row => row.selected);
        setFacultyBulkData(prev => prev.map(row => ({ ...row, selected: !allSelected })));
    };

    return (
        <div className="container max-w-6xl mx-auto py-12 px-4 space-y-12">
            
            {/* Header Section */}
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-primary/10">
                    <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Register New Users
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                    Expand your organization by adding students and faculty members. 
                    Choose your preferred method below.
                </p>
            </div>

            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm ring-1 ring-border/50">
                <CardContent className="p-8">
                    {/* User Type Selection */}
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex p-1 bg-muted/50 rounded-xl">
                            <button
                                onClick={() => setUserType("student")}
                                className={`flex items-center gap-3 px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    userType === "student" 
                                        ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                }`}
                            >
                                <GraduationCap className="h-5 w-5" />
                                Students
                            </button>
                            <button
                                onClick={() => setUserType("faculty")}
                                className={`flex items-center gap-3 px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    userType === "faculty" 
                                        ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                }`}
                            >
                                <School className="h-5 w-5" />
                                Faculty
                            </button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex flex-col items-center mb-8">
                            <TabsList className="bg-muted/50 p-1 rounded-lg">
                                <TabsTrigger value="single" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Single Entry
                                </TabsTrigger>
                                <TabsTrigger value="bulk" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Bulk Upload
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Student Forms */}
                        {userType === "student" && (
                            <>
                                <TabsContent value="single" className="max-w-xl mx-auto focus-visible:outline-none">
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {studentSingleError && (
                                            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                                {studentSingleError}
                                            </div>
                                        )}
                                        {studentSingleSuccess && (
                                            <div className="flex items-center gap-3 rounded-xl bg-green-500/10 p-4 text-sm text-green-600 border border-green-500/20">
                                                <Check className="h-5 w-5 flex-shrink-0" />
                                                Student registered successfully!
                                            </div>
                                        )}

                                        <form onSubmit={handleStudentSingleSubmit} className="space-y-5">
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Full Name</Label>
                                                        <Input placeholder="John Doe" value={studentSingleData.name} onChange={(e) => setStudentSingleData({ ...studentSingleData, name: e.target.value })} required className="h-11" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reg Number</Label>
                                                        <Input placeholder="2024CS001" value={studentSingleData.registrationNumber} onChange={(e) => setStudentSingleData({ ...studentSingleData, registrationNumber: e.target.value })} required className="h-11" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email</Label>
                                                    <Input type="email" placeholder="john@college.edu" value={studentSingleData.email} onChange={(e) => setStudentSingleData({ ...studentSingleData, email: e.target.value })} required className="h-11" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Department</Label>
                                                    <Select value={studentSingleData.department} onValueChange={(value) => setStudentSingleData({ ...studentSingleData, department: value })}>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="Select Department" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {DEPARTMENTS.map((dept) => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                                                    <Input placeholder="Create password" value={studentSingleData.password} onChange={(e) => setStudentSingleData({ ...studentSingleData, password: e.target.value })} required minLength={6} className="h-11" />
                                                    <p className="text-xs text-muted-foreground">User will be prompted to change this on first login</p>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-12 text-base btn-premium mt-6" disabled={studentSingleLoading}>
                                                {studentSingleLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Register Student"}
                                            </Button>
                                        </form>
                                    </div>
                                </TabsContent>

                                <TabsContent value="bulk" className="focus-visible:outline-none">
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid md:grid-cols-2 gap-8 items-start">
                                            {/* Upload Area */}
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">1. Upload File</h3>
                                                <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center hover:bg-primary/10 transition-colors">
                                                    <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-primary/50" />
                                                    <p className="mb-4 text-sm font-medium">Drag & drop or click to upload</p>
                                                    <Input type="file" accept=".xlsx,.xls" onChange={handleStudentFileUpload} className="hidden" id="student-upload" />
                                                    <Button variant="outline" onClick={() => document.getElementById('student-upload')?.click()}>
                                                        Select Excel File
                                                    </Button>
                                                    <p className="mt-4 text-xs text-muted-foreground">Supported formats: .xlsx, .xls</p>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">2. Formatting Guide</h3>
                                                <Card className="bg-muted/30">
                                                    <CardContent className="p-6 text-sm space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                                                            <p>Download the template file below</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                                                            <p>Fill in required fields: Name, Email, Reg No, etc.</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
                                                            <p>Upload the file to preview and confirm</p>
                                                        </div>
                                                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full mt-2">
                                                            <Download className="mr-2 h-4 w-4" /> Download Template
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        {/* Error Display */}
                                        {studentParseError && (
                                            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                                                <AlertCircle className="h-5 w-5" />
                                                {studentParseError}
                                            </div>
                                        )}

                                        {/* Preview Table */}
                                        {studentBulkData.length > 0 && (
                                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">Review Data</h3>
                                                        <p className="text-xs text-muted-foreground">{studentBulkData.filter(r => r.selected).length} students selected</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={toggleStudentSelectAll}>Toggle All</Button>
                                                        <Button size="sm" onClick={handleStudentBulkSubmit} disabled={studentBulkLoading || studentBulkData.filter(r => r.selected).length === 0}>
                                                            {studentBulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                            Process Upload
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="max-h-[400px] overflow-auto">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="p-3 text-left w-12"><div className="h-4 w-4" /></th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Reg No</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Dept</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {studentBulkData.map((row, i) => (
                                                                <tr key={i} className={`hover:bg-muted/50 transition-colors ${!row.selected ? 'opacity-50' : ''}`}>
                                                                    <td className="p-3"><Checkbox checked={row.selected} onCheckedChange={() => toggleStudentSelection(i)} /></td>
                                                                    <td className="p-3 font-medium">{row.name}</td>
                                                                    <td className="p-3 text-muted-foreground">{row.email}</td>
                                                                    <td className="p-3">{row.registrationNumber}</td>
                                                                    <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{row.department || "N/A"}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Result Display */}
                                        {studentBulkResult && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-6 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
                                                    <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold text-green-600">{studentBulkResult.created}</span>
                                                    <span className="text-sm font-medium text-green-800">Successfully Created</span>
                                                </div>
                                                <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
                                                     <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                                                        <AlertCircle className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold text-red-600">{studentBulkResult.failed}</span>
                                                    <span className="text-sm font-medium text-red-800">Failed</span>
                                                </div>
                                                
                                                {studentBulkResult.errors.length > 0 && (
                                                    <div className="col-span-2 mt-4 space-y-2">
                                                        <p className="text-sm font-medium text-destructive">Error Details:</p>
                                                        <div className="max-h-40 overflow-auto border rounded-xl p-4 bg-muted/30 space-y-2">
                                                            {studentBulkResult.errors.map((err, i) => (
                                                                <div key={i} className="text-xs text-destructive flex items-start gap-2">
                                                                    <span className="font-mono bg-destructive/10 px-1 rounded">Row {err.row}</span>
                                                                    <span className="font-medium">{err.email}</span>
                                                                    <span className="opacity-75">{err.error}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </>
                        )}

                        {/* Faculty Forms - Similar Structure */}
                        {userType === "faculty" && (
                            <>
                                <TabsContent value="single" className="max-w-xl mx-auto focus-visible:outline-none">
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {facultySingleError && (
                                            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                                                <AlertCircle className="h-5 w-5" />
                                                {facultySingleError}
                                            </div>
                                        )}
                                        {facultySingleSuccess && (
                                            <div className="flex items-center gap-3 rounded-xl bg-green-500/10 p-4 text-sm text-green-600 border border-green-500/20">
                                                <Check className="h-5 w-5" />
                                                Faculty registered successfully!
                                            </div>
                                        )}

                                        <form onSubmit={handleFacultySingleSubmit} className="space-y-5">
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Full Name</Label>
                                                        <Input placeholder="Jane Doe" value={facultySingleData.name} onChange={(e) => setFacultySingleData({ ...facultySingleData, name: e.target.value })} required className="h-11" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Department</Label>
                                                        <Select value={facultySingleData.department} onValueChange={(value) => setFacultySingleData({ ...facultySingleData, department: value })}>
                                                            <SelectTrigger className="h-11">
                                                                <SelectValue placeholder="Select Department" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {DEPARTMENTS.map((dept) => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email</Label>
                                                    <Input type="email" placeholder="jane@college.edu" value={facultySingleData.email} onChange={(e) => setFacultySingleData({ ...facultySingleData, email: e.target.value })} required className="h-11" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Phone Number</Label>
                                                    <Input placeholder="9876543210" value={facultySingleData.phoneNumber} onChange={(e) => setFacultySingleData({ ...facultySingleData, phoneNumber: e.target.value })} required className="h-11" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                                                    <Input placeholder="Create password" value={facultySingleData.password} onChange={(e) => setFacultySingleData({ ...facultySingleData, password: e.target.value })} required minLength={6} className="h-11" />
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-12 text-base btn-premium mt-6" disabled={facultySingleLoading}>
                                                {facultySingleLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Register Faculty"}
                                            </Button>
                                        </form>
                                    </div>
                                </TabsContent>

                                <TabsContent value="bulk" className="focus-visible:outline-none">
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                         <div className="grid md:grid-cols-2 gap-8 items-start">
                                            {/* Upload Area */}
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">1. Upload File</h3>
                                                <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center hover:bg-primary/10 transition-colors">
                                                    <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-primary/50" />
                                                    <p className="mb-4 text-sm font-medium">Drag & drop or click to upload</p>
                                                    <Input type="file" accept=".xlsx,.xls" onChange={handleFacultyFileUpload} className="hidden" id="faculty-upload" />
                                                    <Button variant="outline" onClick={() => document.getElementById('faculty-upload')?.click()}>
                                                        Select Excel File
                                                    </Button>
                                                    <p className="mt-4 text-xs text-muted-foreground">Supported formats: .xlsx, .xls</p>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">2. Formatting Guide</h3>
                                                <Card className="bg-muted/30">
                                                    <CardContent className="p-6 text-sm space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                                                            <p>Download the template file below</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                                                            <p>Fill in required fields: Name, Email, Phone, etc.</p>
                                                        </div>
                                                        <Button variant="outline" size="sm" onClick={downloadFacultyTemplate} className="w-full mt-2">
                                                            <Download className="mr-2 h-4 w-4" /> Download Template
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        {facultyParseError && (
                                            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                                                <AlertCircle className="h-5 w-5" />
                                                {facultyParseError}
                                            </div>
                                        )}

                                        {facultyBulkData.length > 0 && (
                                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">Review Data</h3>
                                                        <p className="text-xs text-muted-foreground">{facultyBulkData.filter(r => r.selected).length} selected</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={toggleFacultySelectAll}>Toggle All</Button>
                                                        <Button size="sm" onClick={handleFacultyBulkSubmit} disabled={facultyBulkLoading || facultyBulkData.filter(r => r.selected).length === 0}>
                                                            {facultyBulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                            Process Upload
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="max-h-[400px] overflow-auto">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="p-3 text-left w-12"><div className="h-4 w-4" /></th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Phone</th>
                                                                <th className="p-3 text-left font-medium text-muted-foreground">Dept</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {facultyBulkData.map((row, i) => (
                                                                <tr key={i} className={`hover:bg-muted/50 transition-colors ${!row.selected ? 'opacity-50' : ''}`}>
                                                                    <td className="p-3"><Checkbox checked={row.selected} onCheckedChange={() => toggleFacultySelection(i)} /></td>
                                                                    <td className="p-3 font-medium">{row.name}</td>
                                                                    <td className="p-3 text-muted-foreground">{row.email}</td>
                                                                    <td className="p-3">{row.phoneNumber}</td>
                                                                    <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{row.department || "N/A"}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {facultyBulkResult && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-6 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
                                                    <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold text-green-600">{facultyBulkResult.created}</span>
                                                    <span className="text-sm font-medium text-green-800">Successfully Created</span>
                                                </div>
                                                <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
                                                     <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                                                        <AlertCircle className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold text-red-600">{facultyBulkResult.failed}</span>
                                                    <span className="text-sm font-medium text-red-800">Failed</span>
                                                </div>
                                                
                                                {facultyBulkResult.errors.length > 0 && (
                                                    <div className="col-span-2 mt-4 space-y-2">
                                                        <p className="text-sm font-medium text-destructive">Error Details:</p>
                                                        <div className="max-h-40 overflow-auto border rounded-xl p-4 bg-muted/30 space-y-2">
                                                            {facultyBulkResult.errors.map((err, i) => (
                                                                <div key={i} className="text-xs text-destructive flex items-start gap-2">
                                                                    <span className="font-mono bg-destructive/10 px-1 rounded">Row {err.row}</span>
                                                                    <span className="font-medium">{err.email}</span>
                                                                    <span className="opacity-75">{err.error}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
