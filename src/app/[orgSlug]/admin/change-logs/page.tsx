"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { getOrgChangeLogs, deleteOrgChangeLog } from "@/lib/firebase/firestore";
import type { OrgChangeLog } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    History,
    Search,
    Loader2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    UserCog
} from "lucide-react";

export default function ChangeLogsPage() {
    const { orgId } = useOrg();
    const { role } = useAuth();
    const [logs, setLogs] = useState<OrgChangeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (orgId) {
            loadLogs();
        }
    }, [orgId]);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const data = await getOrgChangeLogs(orgId!);
            // Sort by Date Descending
            data.sort((a, b) => {
                 const dateA = a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000) : new Date();
                 const dateB = b.timestamp?.seconds ? new Date(b.timestamp.seconds * 1000) : new Date();
                 return dateB.getTime() - dateA.getTime();
            });
            setLogs(data);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (logId: string) => {
        if (!confirm("Delete this log entry?")) return;
        try {
            await deleteOrgChangeLog(orgId!, logId);
            setLogs(prev => prev.filter(l => l.id !== logId));
        } catch (error) {
            console.error("Failed to delete log:", error);
            alert("Failed to delete log entry");
        }
    };

    const filteredLogs = useMemo(() => {
        let result = logs;

        if (actionFilter !== "all") {
            result = result.filter(l => l.action === actionFilter);
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l => 
                (l.targetId?.toLowerCase() || "").includes(term) ||
                (l.actorName?.toLowerCase() || "").includes(term) ||
                (l.details?.toLowerCase() || "").includes(term)
            );
        }

        return result;
    }, [logs, actionFilter, searchTerm]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredLogs.length / pageSize);

    // Helper for action colors
    const getActionColor = (action: string) => {
        if (action.includes("deleted")) return "text-red-600 bg-red-50 border-red-100";
        if (action.includes("created") || action.includes("registered")) return "text-green-600 bg-green-50 border-green-100";
        if (action.includes("updated") || action.includes("edited")) return "text-blue-600 bg-blue-50 border-blue-100";
        if (action.includes("suspended")) return "text-orange-600 bg-orange-50 border-orange-100";
        return "text-gray-600 bg-gray-50 border-gray-100";
    };

    const getActionIcon = (action: string) => {
        if (action.includes("deleted")) return XCircle;
        if (action.includes("created")) return CheckCircle2;
        if (action.includes("suspended")) return AlertCircle;
        return History;
    };

    // Date formatter
    const formatDate = (seconds?: number) => {
        if (!seconds) return "Just now";
        return new Date(seconds * 1000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        System Logs
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Audit trail of all administrative actions.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-md">
                <CardContent className="p-4">
                     <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-muted/30"
                            />
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[200px] bg-muted/30">
                                <SelectValue placeholder="Filter by Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="user_registered">User Registration</SelectItem>
                                <SelectItem value="user_deleted">User Deletion</SelectItem>
                                <SelectItem value="user_suspended">Suspension</SelectItem>
                                <SelectItem value="user_updated">Updates</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </CardContent>
            </Card>

            {/* Logs List */}
            <Card className="border-none shadow-lg overflow-hidden">
                <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm text-foreground">Activity History</span>
                     </div>
                     <span className="text-xs text-muted-foreground">{filteredLogs.length} Records found</span>
                </div>
                
                <div className="divide-y divide-gray-100">
                    {isLoading ? (
                         <div className="py-20 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                        </div>
                    ) : paginatedLogs.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <History className="mx-auto h-12 w-12 opacity-20 mb-3" />
                            <p>No logs found matching criteria</p>
                        </div>
                    ) : (
                        paginatedLogs.map((log) => {
                            const ActionIcon = getActionIcon(log.action);
                            const styles = getActionColor(log.action);
                            
                            return (
                                <div key={log.id} className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    {/* Icon */}
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${styles} shrink-0 shadow-sm`}>
                                        <ActionIcon className="h-5 w-5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900 capitalize">
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs font-mono text-gray-500">
                                                {formatDate(log.timestamp?.seconds)}
                                            </span>
                                        </div>
                                        
                                        <div className="text-sm text-gray-600 flex flex-wrap gap-x-2">
                                            <span>
                                                Target: <span className="font-medium text-gray-900">{log.targetRole || "Unknown"}</span>
                                            </span>
                                            {log.details && (
                                                <span className="text-gray-500 italic">- {log.details}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit">
                                            <UserCog className="h-3 w-3" />
                                            <span>Perfomed by: <span className="font-medium text-foreground">{log.actorName || "System"}</span> ({log.actorRole || "System"})</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {role === "super_admin" && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                            onClick={() => handleDelete(log.id!)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t flex justify-center gap-2 sticky bottom-0 bg-white">
                         <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center text-sm text-muted-foreground px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
