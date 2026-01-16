"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { createOrgUser, bulkCreateOrgStudents } from "@/lib/firebase/firestore";
import { parseExcelFile, downloadTemplate } from "@/lib/excel";
import type { BulkUploadRow, BulkUploadResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";

interface BulkUploadRowWithSelection extends BulkUploadRow {
    selected: boolean;
}

export default function RegisterStudentsPage() {
    const { orgId, orgSlug } = useOrg();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("single");

    // Single registration
    const [singleData, setSingleData] = useState({
        name: "",
        email: "",
        registrationNumber: "",
        department: "",
    });
    const [singleLoading, setSingleLoading] = useState(false);
    const [singleError, setSingleError] = useState("");
    const [singleSuccess, setSingleSuccess] = useState(false);

    // Bulk registration
    const [bulkData, setBulkData] = useState<BulkUploadRowWithSelection[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
    const [parseError, setParseError] = useState("");

    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !user) return;

        setSingleError("");
        setSingleLoading(true);
        setSingleSuccess(false);

        try {
            const result = await createOrgUser(
                orgId,
                {
                    name: singleData.name,
                    email: singleData.email,
                    role: "student",
                    registrationNumber: singleData.registrationNumber,
                    department: singleData.department,
                },
                user.uid
            );

            if (result.success) {
                setSingleSuccess(true);
                setSingleData({ name: "", email: "", registrationNumber: "", department: "" });
            } else {
                setSingleError(result.error || "Failed to create student");
            }
        } catch (err: any) {
            setSingleError(err.message || "An error occurred");
        } finally {
            setSingleLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParseError("");
        setBulkData([]);
        setBulkResult(null);

        console.log("[Register] Parsing Excel file:", file.name, "Size:", file.size, "Type:", file.type);

        try {
            const result = await parseExcelFile(file);
            console.log("[Register] Parse result:", result);
            
            if (result.success && result.data) {
                // Add selection property to each row
                const dataWithSelection = result.data.map(row => ({ ...row, selected: true }));
                setBulkData(dataWithSelection);
            } else {
                setParseError(result.error || "Failed to parse file");
            }
        } catch (err: any) {
            console.error("[Register] Parse error:", err);
            setParseError(err.message || "Failed to parse file");
        }
    };

    const handleBulkSubmit = async () => {
        if (!orgId || !user || bulkData.length === 0) return;

        // Filter only selected rows
        const selectedRows = bulkData.filter(row => row.selected).map(({ selected, ...row }) => row);
        
        if (selectedRows.length === 0) {
            setParseError("Please select at least one student to register");
            return;
        }

        setBulkLoading(true);
        setBulkResult(null);
        setParseError("");

        try {
            const result = await bulkCreateOrgStudents(orgId, selectedRows, user.uid);
            setBulkResult(result);
            if (result.success) {
                setBulkData([]);
            }
        } catch (err: any) {
            setBulkResult({
                success: false,
                created: 0,
                failed: selectedRows.length,
                errors: [{ row: 0, email: "", error: err.message }],
            });
        } finally {
            setBulkLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        downloadTemplate();
    };

    const toggleSelection = (index: number) => {
        setBulkData(prev => prev.map((row, i) => 
            i === index ? { ...row, selected: !row.selected } : row
        ));
    };

    const toggleSelectAll = () => {
        const allSelected = bulkData.every(row => row.selected);
        setBulkData(prev => prev.map(row => ({ ...row, selected: !allSelected })));
    };

    const selectedCount = bulkData.filter(row => row.selected).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Register Students</h1>
                <p className="text-muted-foreground">
                    Add new students to your organization
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="single">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Single
                    </TabsTrigger>
                    <TabsTrigger value="bulk">
                        <Users className="mr-2 h-4 w-4" />
                        Bulk Upload
                    </TabsTrigger>
                </TabsList>

                {/* Single Registration */}
                <TabsContent value="single" className="mt-6">
                    <Card className="max-w-lg">
                        <CardHeader>
                            <CardTitle>Register Single Student</CardTitle>
                            <CardDescription>
                                Add one student at a time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {singleError && (
                                <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    {singleError}
                                </div>
                            )}

                            {singleSuccess && (
                                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                                    <Check className="h-4 w-4" />
                                    Student registered successfully!
                                </div>
                            )}

                            <form onSubmit={handleSingleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        value={singleData.name}
                                        onChange={(e) =>
                                            setSingleData({ ...singleData, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@college.edu"
                                        value={singleData.email}
                                        onChange={(e) =>
                                            setSingleData({ ...singleData, email: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="regNo">Registration Number *</Label>
                                    <Input
                                        id="regNo"
                                        placeholder="2024CS001"
                                        value={singleData.registrationNumber}
                                        onChange={(e) =>
                                            setSingleData({
                                                ...singleData,
                                                registrationNumber: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This will be the default password
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dept">Department</Label>
                                    <Input
                                        id="dept"
                                        placeholder="Computer Science"
                                        value={singleData.department}
                                        onChange={(e) =>
                                            setSingleData({ ...singleData, department: e.target.value })
                                        }
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={singleLoading}
                                >
                                    {singleLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Register Student
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bulk Upload */}
                <TabsContent value="bulk" className="mt-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bulk Upload Students</CardTitle>
                                <CardDescription>
                                    Upload an Excel file with student data
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={handleDownloadTemplate}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Template
                                    </Button>
                                </div>

                                <div className="rounded-lg border-2 border-dashed p-8 text-center">
                                    <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground">
                                        Upload Excel file (.xlsx, .xls)
                                    </p>
                                    <Input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="mx-auto max-w-xs"
                                    />
                                </div>

                                {parseError && (
                                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        {parseError}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        {bulkData.length > 0 && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Preview ({bulkData.length} students)</CardTitle>
                                        <CardDescription>{selectedCount} selected</CardDescription>
                                    </div>
                                    <Button onClick={handleBulkSubmit} disabled={bulkLoading || selectedCount === 0}>
                                        {bulkLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Register Selected ({selectedCount})
                                            </>
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="mb-4">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={toggleSelectAll}
                                        >
                                            {bulkData.every(row => row.selected) ? "Deselect All" : "Select All"}
                                        </Button>
                                    </div>
                                    <div className="max-h-96 overflow-auto border rounded">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-muted border-b">
                                                <tr>
                                                    <th className="p-2 text-left w-12">Select</th>
                                                    <th className="p-2 text-left">Name</th>
                                                    <th className="p-2 text-left">Email</th>
                                                    <th className="p-2 text-left">Reg No</th>
                                                    <th className="p-2 text-left">Department</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bulkData.map((row, i) => (
                                                    <tr key={i} className="border-b hover:bg-muted/50">
                                                        <td className="p-2">
                                                            <Checkbox 
                                                                checked={row.selected}
                                                                onCheckedChange={() => toggleSelection(i)}
                                                            />
                                                        </td>
                                                        <td className="p-2">{row.name}</td>
                                                        <td className="p-2">{row.email}</td>
                                                        <td className="p-2">{row.registrationNumber}</td>
                                                        <td className="p-2">{row.department || "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Result */}
                        {bulkResult && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {bulkResult.success ? (
                                            <span className="text-green-600">Upload Complete</span>
                                        ) : (
                                            <span className="text-yellow-600">Upload Complete with Errors</span>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-6 mb-4">
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">
                                                {bulkResult.created}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Created</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-red-600">
                                                {bulkResult.failed}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Failed</p>
                                        </div>
                                    </div>

                                    {bulkResult.errors.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Errors:</p>
                                            {bulkResult.errors.map((err, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded bg-destructive/10 p-2 text-sm text-destructive"
                                                >
                                                    Row {err.row}: {err.email} - {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
