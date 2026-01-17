import * as XLSX from "xlsx";
import type { BulkUploadRow, FacultyUploadRow } from "@/types";
import { DEPARTMENTS } from "@/types";

/**
 * Generate a template Excel file for bulk student upload
 */
export function generateStudentTemplate(): Blob {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Define headers and sample data
    const data = [
        ["Name", "Email", "Registration Number", "Department"],
        ["John Doe", "john.doe@college.edu", "REG2024001", "CSE"],
        ["Jane Smith", "jane.smith@college.edu", "REG2024002", "EEE"],
        ["", "", "", ""], // Empty row for user to fill
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Registration Number
        { wch: 25 }, // Department
    ];

    // Add Data Validation for Department (Column D)
    // Note: SheetJS Community Edition has limited support for data validation writing,
    // but we can at least hint it in comments or try to set it if supported in future.
    // For now, we rely on the sample data to guide the user.

    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Generate blob
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Generate a template Excel file for bulk faculty upload
 */
export function generateFacultyTemplate(): Blob {
    const wb = XLSX.utils.book_new();

    const data = [
        ["Name", "Email", "Phone Number", "Department"],
        ["Dr. Alice", "alice@college.edu", "9876543210", "CSE"],
        ["Prof. Bob", "bob@college.edu", "8765432109", "Mechanical Engineering"],
        ["", "", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    ws["!cols"] = [
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Phone
        { wch: 25 }, // Department
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Faculty");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Download the student template Excel file
 */
export function downloadTemplate(): void {
    const blob = generateStudentTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_upload_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download the faculty template Excel file
 */
export function downloadFacultyTemplate(): void {
    const blob = generateFacultyTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty_upload_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse uploaded Excel file and extract student data
 */
export function parseStudentExcel(file: File): Promise<{
    success: boolean;
    data?: BulkUploadRow[];
    error?: string;
}> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    resolve({ success: false, error: "No sheets found" });
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];

                if (jsonData.length < 2) {
                    resolve({ success: false, error: "File is empty or missing header" });
                    return;
                }

                const headerRow = jsonData[0];
                const findColumnIndex = (possibleNames: string[]) => {
                    return headerRow.findIndex(header =>
                        possibleNames.some(name => String(header).toLowerCase().trim() === name.toLowerCase())
                    );
                };

                const nameIdx = findColumnIndex(["Name", "Full Name", "Student Name"]);
                const emailIdx = findColumnIndex(["Email", "Email Address", "E-mail"]);
                const regNoIdx = findColumnIndex(["Registration Number", "Reg No", "RegNo"]);
                const deptIdx = findColumnIndex(["Department", "Dept", "Branch"]);

                if (nameIdx === -1 || emailIdx === -1 || regNoIdx === -1) {
                    resolve({ success: false, error: "Missing required columns: Name, Email, Registration Number" });
                    return;
                }

                const students: BulkUploadRow[] = [];
                const errors: string[] = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 1;
                    if (!row || row.every(cell => !cell || String(cell).trim() === "")) continue;

                    const name = String(row[nameIdx] || "").trim();
                    const email = String(row[emailIdx] || "").trim();
                    const registrationNumber = String(row[regNoIdx] || "").trim();
                    const department = deptIdx !== -1 ? String(row[deptIdx] || "").trim() : "";

                    if (!name || !email || !registrationNumber) {
                        errors.push(`Row ${rowNum}: Missing required fields`);
                        continue;
                    }

                    // Validate Department if present
                    if (department && !DEPARTMENTS.includes(department as any)) {
                        // We can warn or strict fail. Let's warn but allow for now, or maybe auto-correct?
                        // For now, accept it.
                    }

                    students.push({ name, email, registrationNumber, department });
                }

                if (errors.length > 0) {
                    resolve({ success: false, error: errors.join("\n") });
                    return;
                }

                resolve({ success: true, data: students });
            } catch (error: any) {
                resolve({ success: false, error: error.message });
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse uploaded Excel file and extract faculty data
 */
export function parseFacultyExcel(file: File): Promise<{
    success: boolean;
    data?: FacultyUploadRow[];
    error?: string;
}> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];

                if (jsonData.length < 2) {
                    resolve({ success: false, error: "File is empty" });
                    return;
                }

                const headerRow = jsonData[0];
                const findColumnIndex = (possibleNames: string[]) => {
                    return headerRow.findIndex(header =>
                        possibleNames.some(name => String(header).toLowerCase().trim() === name.toLowerCase())
                    );
                };

                const nameIdx = findColumnIndex(["Name", "Full Name"]);
                const emailIdx = findColumnIndex(["Email", "Email Address"]);
                const phoneIdx = findColumnIndex(["Phone", "Phone Number", "Mobile"]);
                const deptIdx = findColumnIndex(["Department", "Dept"]);

                if (nameIdx === -1 || emailIdx === -1 || phoneIdx === -1 || deptIdx === -1) {
                    resolve({ success: false, error: "Missing required columns: Name, Email, Phone Number, Department" });
                    return;
                }

                const faculty: FacultyUploadRow[] = [];
                const errors: string[] = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 1;
                    if (!row || row.every(cell => !cell || String(cell).trim() === "")) continue;

                    const name = String(row[nameIdx] || "").trim();
                    const email = String(row[emailIdx] || "").trim();
                    const phoneNumber = String(row[phoneIdx] || "").trim();
                    const department = String(row[deptIdx] || "").trim();

                    if (!name || !email || !phoneNumber || !department) {
                        errors.push(`Row ${rowNum}: Missing fields`);
                        continue;
                    }

                    faculty.push({ name, email, phoneNumber, department });
                }

                if (errors.length > 0) {
                    resolve({ success: false, error: errors.join("\n") });
                    return;
                }

                resolve({ success: true, data: faculty });
            } catch (error: any) {
                resolve({ success: false, error: error.message });
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Export aliases
export const parseExcelFile = parseStudentExcel;
export const generateTemplate = generateStudentTemplate;
