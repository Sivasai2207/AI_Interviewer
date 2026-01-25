"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { getOrgStudents, suspendUser, reactivateUser } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types";
import { DEPARTMENTS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Users,
    Search,
    Loader2,
    UserPlus,
    Trash2,
    Power,
    ChevronLeft,
    ChevronRight,
    Filter,
    Eye,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
    AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

export default function OrgStudentsPage() {
    const { orgId, orgSlug } = useOrg();
    const { user, role } = useAuth();
    
    // Data State
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Confirmation Dialog State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null); // For single delete

    useEffect(() => {
        if (orgId) {
            loadStudents();
        }
    }, [orgId]);

    const loadStudents = async () => {
        setIsLoading(true);
        try {
            const data = await getOrgStudents(orgId!);
            data.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
            setStudents(data);
        } catch (error) {
            console.error("Error loading students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredStudents = useMemo(() => {
        let result = students;
        
        if (departmentFilter && departmentFilter !== "all") {
            result = result.filter(s => s.department === departmentFilter);
        }

        if (statusFilter !== "all") {
            if (statusFilter === "active") result = result.filter(s => s.status !== "suspended");
            if (statusFilter === "suspended") result = result.filter(s => s.status === "suspended");
        }
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.displayName?.toLowerCase().includes(term) ||
                s.email?.toLowerCase().includes(term) ||
                s.registrationNumber?.toLowerCase().includes(term)
            );
        }
        
        return result;
    }, [students, departmentFilter, statusFilter, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStudents.slice(start, start + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, departmentFilter, statusFilter, pageSize]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Action Handlers
    const handleDeleteClick = (student: UserProfile) => {
        setStudentToDelete(student);
        setDeleteConfirmOpen(true);
    };

    const handleBulkDeleteClick = () => {
        setStudentToDelete(null); // Indicates bulk mode
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!user || !orgId) return;
        setIsDeleting(true);

        const idsToDelete = studentToDelete ? [studentToDelete.id] : Array.from(selectedIds);
        const description = studentToDelete ? "Student deleted" : `${idsToDelete.length} students deleted`;

        try {
            // Process deletions in parallel (chunked if specific limit needed, but API handles concurrent requests okay for small numbers)
            // Ideally, we'd send a bulk delete request, but our API is currently single user.
            // We'll iterate.
            
            const results = await Promise.allSettled(idsToDelete.map(uid => 
                fetch("/api/admin/delete-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        uid, 
                        orgId, 
                        role: "student",
                        actor: {
                            uid: user.uid,
                            name: user.displayName,
                            email: user.email,
                            role: role || "unknown"
                        }
                    }),
                }).then(res => {
                    if (!res.ok) throw new Error("API Failed");
                    return res.json();
                })
            ));

            const failures = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success));
            
            if (failures.length > 0) {
                console.error("Some deletions failed", failures);
                alert(`Completed with ${failures.length} errors. Please refresh.`);
            } else {
                 // Success UI
                 // Use a simple alert for now as requested "show that conformation"
                 alert(`${description} successfully.`);
            }

            setSelectedIds(new Set());
            setDeleteConfirmOpen(false);
            setStudentToDelete(null);
            loadStudents();

        } catch (error) {
            console.error("Delete error:", error);
            alert("An critical error occurred during deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleStatus = async (student: UserProfile) => {
         const action = student.status === "suspended" ? "reactivate" : "suspend";
         // Simple confirm for status toggle
         if (!confirm(`${action === "suspend" ? "Suspend" : "Reactivate"} ${student.displayName}?`)) return;

         try {
             if (action === "suspend") await suspendUser(student.id);
             else await reactivateUser(student.id);
             loadStudents();
         } catch(e) {
             console.error(e);
             alert("Failed to update status");
         }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription>
                            {studentToDelete 
                                ? `Are you sure you want to permanently delete ${studentToDelete.displayName}?` 
                                : `Are you sure you want to delete ${selectedIds.size} selected students?`}
                            <br/><br/>
                            <span className="font-semibold text-destructive">This action cannot be undone.</span> 
                            User data and authentication access will be removed immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            {isDeleting ? "Deleting..." : "Confirm Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Students
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage student directory, track performance, and control access.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                     {selectedIds.size > 0 && (role === "admin" || role === "super_admin") && (
                        <Button variant="destructive" onClick={handleBulkDeleteClick} className="shadow-red-500/20 shadow-lg">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedIds.size})
                        </Button>
                    )}
                    <Link href={`/${orgSlug}/admin/register`}>
                        <Button className="btn-premium shadow-primary/20 shadow-lg" size="lg">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Add Students
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="flex items-center gap-6 p-6">
                        <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner">
                            <Users className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-gray-900">{students.length}</p>
                            <p className="text-sm font-medium text-blue-600/80 uppercase tracking-wide">Total Students</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white">
                     <CardContent className="flex items-center gap-6 p-6">
                        <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="h-7 w-7 text-green-600" />
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-gray-900">{students.filter(s => s.status !== "suspended").length}</p>
                            <p className="text-sm font-medium text-green-600/80 uppercase tracking-wide">Active Accounts</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white">
                     <CardContent className="flex items-center gap-6 p-6">
                        <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center shadow-inner">
                            <XCircle className="h-7 w-7 text-red-600" />
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-gray-900">{students.filter(s => s.status === "suspended").length}</p>
                            <p className="text-sm font-medium text-red-600/80 uppercase tracking-wide">Suspended</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-12 text-lg bg-muted/30 border-muted-foreground/20"
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                             <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger className="w-[180px] h-12 bg-muted/30">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {DEPARTMENTS.map((dept) => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px] h-12 bg-muted/30">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main List */}
            <Card className="border-none shadow-xl overflow-hidden">
                <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Checkbox 
                            checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                            {selectedIds.size > 0 ? `${selectedIds.size} Selected` : "Select All"}
                        </span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="w-[70px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                </div>

                <div className="divide-y divide-border/50">
                    {isLoading ? (
                         <div className="flex min-h-[400px] items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center">
                             <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                                <Users className="h-10 w-10 text-muted-foreground/50" />
                             </div>
                             <h3 className="text-xl font-semibold">No students found</h3>
                             <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                                 Try adjusting your search or filters, or add new students to build your directory.
                             </p>
                        </div>
                    ) : (
                        paginatedStudents.map((student) => (
                            <div key={student.id} className={`p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30 transition-colors ${selectedIds.has(student.id) ? "bg-primary/5" : ""}`}>
                                <Checkbox 
                                    checked={selectedIds.has(student.id)}
                                    onCheckedChange={() => toggleSelectOne(student.id)}
                                />
                                
                                <div className="flex-1 flex items-center gap-4">
                                     <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${
                                        student.status === "suspended" 
                                            ? "bg-red-100 text-red-600" 
                                            : "bg-gradient-to-br from-primary to-purple-600 text-white"
                                     }`}>
                                         {student.displayName?.[0]?.toUpperCase() || "?"}
                                     </div>
                                     <div>
                                         <h4 className="font-semibold text-gray-900">{student.displayName}</h4>
                                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                             <span>{student.email}</span>
                                             {student.status === "suspended" && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    Suspended
                                                </span>
                                             )}
                                         </div>
                                         {student.targetRoles && student.targetRoles.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {student.targetRoles.slice(0, 2).map((role) => (
                                                    <span key={role} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        {role.length > 20 ? role.substring(0, 18) + "..." : role}
                                                    </span>
                                                ))}
                                                {student.targetRoles.length > 2 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                                                        +{student.targetRoles.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                         )}
                                     </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-8 md:w-1/3">
                                    <div className="hidden md:block text-right">
                                        <p className="font-medium text-sm">{student.department || "No Dept"}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{student.registrationNumber}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        <Link href={`/${orgSlug}/admin/students/${student.id}`}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className={`h-8 w-8 p-0 ${student.status === "suspended" ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"}`}
                                            onClick={() => handleToggleStatus(student)}
                                        >
                                            <Power className="h-4 w-4" />
                                        </Button>

                                        {(role === "super_admin" || role === "admin") && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteClick(student)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-muted/30 p-4 border-t flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                        </Button>
                        <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
