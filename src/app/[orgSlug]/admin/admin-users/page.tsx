"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/providers/OrgContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { getOrgAdmins, createOrgUser, suspendUser, reactivateUser, deleteOrgUser, resetUserPassword } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types";
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
    Shield,
    ShieldCheck,
    Search,
    ArrowRight,
    Loader2,
    UserPlus,
    AlertTriangle,
    Power,
    KeyRound,
    Trash2,
    Check,
    AlertCircle,
    Edit,
} from "lucide-react";

export default function AdminUsersPage() {
    const router = useRouter();
    const { orgId, orgSlug } = useOrg();
    const { user, role } = useAuth();
    
    const [admins, setAdmins] = useState<UserProfile[]>([]);
    const [filteredAdmins, setFilteredAdmins] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    
    // Registration state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        department: "",
        password: "",
        role: "admin" as "super_admin" | "admin",
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState(false);

    // Edit state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editData, setEditData] = useState({
        displayName: "",
        email: "",
        department: "",
        password: "",
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState(false);

    // Access control: Only super_admin can view this page
    useEffect(() => {
        if (role && role !== "super_admin") {
            router.push(`/${orgSlug}/admin`);
        }
    }, [role, router, orgSlug]);

    useEffect(() => {
        if (orgId && role === "super_admin") {
            loadAdmins();
        }
    }, [orgId, role]);

    useEffect(() => {
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            const filtered = admins.filter(
                (a) =>
                    a.displayName?.toLowerCase().includes(term) ||
                    a.email.toLowerCase().includes(term)
            );
            setFilteredAdmins(filtered);
        } else {
            setFilteredAdmins(admins);
        }
    }, [searchTerm, admins]);

    const loadAdmins = async () => {
        try {
            const data = await getOrgAdmins(orgId!);
            data.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
            setAdmins(data);
            setFilteredAdmins(data);
        } catch (error) {
            console.error("Error loading admins:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !user) return;

        setFormError("");
        setFormLoading(true);
        setFormSuccess(false);

        try {
            const result = await createOrgUser(
                orgId,
                {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    department: formData.department,
                    password: formData.password,
                },
                user.uid
            );

            if (result.success) {
                setFormSuccess(true);
                setFormData({ name: "", email: "", department: "", password: "", role: "admin" });
                loadAdmins();
                setTimeout(() => {
                    setIsDialogOpen(false);
                    setFormSuccess(false);
                }, 1500);
            } else {
                setFormError(result.error || "Failed to create admin");
            }
        } catch (err: any) {
            setFormError(err.message || "An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    const handleSuspend = async (adminUser: UserProfile) => {
        if (!confirm(`Suspend ${adminUser.displayName}? They will not be able to log in.`)) return;
        try {
            await suspendUser(adminUser.id);
            loadAdmins();
        } catch (error) {
            console.error("Failed to suspend:", error);
            alert("Failed to suspend user");
        }
    };

    const handleReactivate = async (adminUser: UserProfile) => {
        if (!confirm(`Reactivate ${adminUser.displayName}?`)) return;
        try {
            await reactivateUser(adminUser.id);
            loadAdmins();
        } catch (error) {
            console.error("Failed to reactivate:", error);
            alert("Failed to reactivate user");
        }
    };

    const handleDelete = async (adminUser: UserProfile) => {
        if (!confirm(`PERMANENTLY delete ${adminUser.displayName}? This cannot be undone.`)) return;
        try {
            const response = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    uid: adminUser.id, 
                    orgId, 
                    role: adminUser.role === "student" ? "student" : "staff" 
                }),
            });
            
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to delete user");
            }
            
            loadAdmins();
        } catch (error: any) {
            console.error("Failed to delete:", error);
            alert(error.message || "Failed to delete user");
        }
    };

    const handleEdit = (adminUser: UserProfile) => {
        setEditingUser(adminUser);
        setEditData({
            displayName: adminUser.displayName || "",
            email: adminUser.email,
            department: adminUser.department || "",
            password: "",
        });
        setEditError("");
        setEditSuccess(false);
        setIsEditDialogOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setEditError("");
        setEditLoading(true);
        setEditSuccess(false);

        try {
            const updates: any = {
                displayName: editData.displayName,
                email: editData.email,
                department: editData.department,
            };
            
            if (editData.password) {
                updates.password = editData.password;
            }

            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: editingUser.id, updates }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to update user");
            }

            setEditSuccess(true);
            loadAdmins();
            setTimeout(() => {
                setIsEditDialogOpen(false);
                setEditSuccess(false);
            }, 1500);
        } catch (err: any) {
            setEditError(err.message || "An error occurred");
        } finally {
            setEditLoading(false);
        }
    };

    const handleResetPassword = async (adminUser: UserProfile) => {
        if (!confirm(`Send password reset email to ${adminUser.email}?`)) return;
        try {
            await resetUserPassword(adminUser.email);
            alert("Password reset email sent!");
        } catch (error) {
            console.error("Failed to reset password:", error);
            alert("Failed to send reset email");
        }
    };

    // Block access for non-super_admin
    if (role !== "super_admin") {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                    <h1 className="text-xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">Only Super Admins can access this page.</p>
                </div>
            </div>
        );
    }

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
                    <h1 className="text-3xl font-bold">Admin Users</h1>
                    <p className="text-muted-foreground">
                        Manage Super Admins and Admins
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="btn-premium">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Register Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Register New Admin</DialogTitle>
                            <DialogDescription>
                                Create a new admin or super admin user
                            </DialogDescription>
                        </DialogHeader>
                        
                        {formError && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                {formError}
                            </div>
                        )}
                        {formSuccess && (
                            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                                <Check className="h-4 w-4" />
                                Admin created successfully!
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input
                                    placeholder="John Admin"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input
                                    type="email"
                                    placeholder="admin@org.edu"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: "super_admin" | "admin") => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={formData.department}
                                    onValueChange={(value) => setFormData({ ...formData, department: value })}
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
                            <div className="space-y-2">
                                <Label>Temporary Password *</Label>
                                <Input
                                    placeholder="Welcome@123"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-muted-foreground">User will be forced to change on first login</p>
                            </div>
                            <Button type="submit" className="w-full" disabled={formLoading}>
                                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Create Admin
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                            <ShieldCheck className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{admins.filter(a => a.role === "super_admin").length}</p>
                            <p className="text-sm text-muted-foreground">Super Admins</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{admins.filter(a => a.role === "admin").length}</p>
                            <p className="text-sm text-muted-foreground">Admins</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin List */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {filteredAdmins.length} Admin{filteredAdmins.length !== 1 ? "s" : ""}
                        {searchTerm && ` matching "${searchTerm}"`}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredAdmins.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>{searchTerm ? "No admins match your search" : "No admins registered yet"}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAdmins.map((adminUser) => (
                                <div
                                    key={adminUser.id}
                                    className="flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                            adminUser.role === "super_admin" ? "bg-purple-500/10" : "bg-blue-500/10"
                                        }`}>
                                            {adminUser.role === "super_admin" ? (
                                                <ShieldCheck className="h-6 w-6 text-purple-600" />
                                            ) : (
                                                <Shield className="h-6 w-6 text-blue-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{adminUser.displayName}</p>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    adminUser.role === "super_admin" 
                                                        ? "bg-purple-100 text-purple-600" 
                                                        : "bg-blue-100 text-blue-600"
                                                }`}>
                                                    {adminUser.role === "super_admin" ? "Super Admin" : "Admin"}
                                                </span>
                                                {adminUser.status === "suspended" && (
                                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                                                        Suspended
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(adminUser)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleResetPassword(adminUser)}>
                                            <KeyRound className="h-4 w-4" />
                                        </Button>
                                        {adminUser.status === "suspended" ? (
                                            <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleReactivate(adminUser)}>
                                                <Power className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm" className="text-yellow-600" onClick={() => handleSuspend(adminUser)}>
                                                <Power className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(adminUser)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Admin User</DialogTitle>
                        <DialogDescription>Update user details and password</DialogDescription>
                    </DialogHeader>
                    
                    {editError && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {editError}
                        </div>
                    )}
                    {editSuccess && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                            <Check className="h-4 w-4" />
                            User updated successfully!
                        </div>
                    )}

                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name *</Label>
                            <Input
                                value={editData.displayName}
                                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={editData.email}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                required
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
                        <div className="space-y-2">
                            <Label>New Password (optional)</Label>
                            <Input
                                type="password"
                                placeholder="Leave blank to keep current password"
                                value={editData.password}
                                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                minLength={6}
                            />
                            <p className="text-xs text-muted-foreground">Override password without sending email</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={editLoading}>
                            {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                            Update Admin
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
