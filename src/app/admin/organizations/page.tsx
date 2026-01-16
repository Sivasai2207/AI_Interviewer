"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAllOrganizations } from "@/lib/firebase/firestore";
import type { Organization } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Building2,
    Plus,
    Search,
    ArrowRight,
    Loader2,
    Users,
    ClipboardList,
} from "lucide-react";

export default function OrganizationsListPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        loadOrganizations();
    }, []);

    useEffect(() => {
        filterOrganizations();
    }, [searchTerm, statusFilter, organizations]);

    const loadOrganizations = async () => {
        try {
            const orgs = await getAllOrganizations();
            setOrganizations(orgs);
            setFilteredOrgs(orgs);
        } catch (error) {
            console.error("Error loading organizations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterOrganizations = () => {
        let filtered = [...organizations];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (org) =>
                    org.name.toLowerCase().includes(term) ||
                    org.slug.toLowerCase().includes(term)
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((org) => org.status === statusFilter);
        }

        setFilteredOrgs(filtered);
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
                    <h1 className="text-3xl font-bold">Organizations</h1>
                    <p className="text-muted-foreground">
                        Manage all registered colleges and institutions
                    </p>
                </div>
                <Link href="/admin/organizations/new">
                    <Button className="btn-premium">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or slug..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            {["all", "active", "suspended", "deleted"].map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                            <Building2 className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {organizations.filter((o) => o.status === "active").length}
                            </p>
                            <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Building2 className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {organizations.filter((o) => o.status === "suspended").length}
                            </p>
                            <p className="text-sm text-muted-foreground">Suspended</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{organizations.length}</p>
                            <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Organizations List */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {filteredOrgs.length} Organization{filteredOrgs.length !== 1 ? "s" : ""}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredOrgs.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>No organizations found</p>
                            {searchTerm && (
                                <Button
                                    variant="link"
                                    onClick={() => setSearchTerm("")}
                                    className="mt-2"
                                >
                                    Clear search
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredOrgs.map((org) => (
                                <Link
                                    key={org.id}
                                    href={`/admin/organizations/${org.id}`}
                                    className="block"
                                >
                                    <div className="flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50 hover:border-primary/50">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                                                <Building2 className="h-7 w-7 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">
                                                    {org.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    /{org.slug}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{org.stats?.studentCount || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                                    <span>{org.stats?.interviewCount || 0}</span>
                                                </div>
                                            </div>
                                            <StatusBadge status={org.status} />
                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
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

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: "bg-green-500/10 text-green-500 border-green-500/20",
        suspended: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        deleted: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
        <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                styles[status] || "bg-muted"
            }`}
        >
            {status}
        </span>
    );
}
