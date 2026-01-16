"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/components/providers/OrgContext";
import { getOrgStudents, searchOrgStudents } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users,
    Search,
    ArrowRight,
    Loader2,
    UserPlus,
} from "lucide-react";

export default function OrgStudentsPage() {
    const { orgId, orgSlug } = useOrg();
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId) {
            loadStudents();
        }
    }, [orgId]);

    useEffect(() => {
        if (searchTerm.trim()) {
            handleSearch();
        } else {
            setFilteredStudents(students);
        }
    }, [searchTerm, students]);

    const loadStudents = async () => {
        try {
            const data = await getOrgStudents(orgId!);
            setStudents(data);
            setFilteredStudents(data);
        } catch (error) {
            console.error("Error loading students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (orgId && searchTerm.trim()) {
            const results = await searchOrgStudents(orgId, searchTerm);
            setFilteredStudents(results);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Students</h1>
                    <p className="text-muted-foreground">
                        Manage and monitor student progress
                    </p>
                </div>
                <Link href={`/${orgSlug}/admin/register`}>
                    <Button className="btn-premium">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Students
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or registration number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{students.length}</p>
                            <p className="text-sm text-muted-foreground">Total Students</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Students List */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""}
                        {searchTerm && ` matching "${searchTerm}"`}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>
                                {searchTerm ? "No students match your search" : "No students registered yet"}
                            </p>
                            {!searchTerm && (
                                <Link href={`/${orgSlug}/admin/register`}>
                                    <Button variant="link" className="mt-2">
                                        Register students
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredStudents.map((student) => (
                                <Link
                                    key={student.id}
                                    href={`/${orgSlug}/admin/students/${student.id}`}
                                    className="flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50 hover:border-primary/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                            <span className="text-lg font-bold text-primary">
                                                {student.displayName?.[0]?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{student.displayName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {student.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                {student.registrationNumber}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {student.department || "No department"}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
