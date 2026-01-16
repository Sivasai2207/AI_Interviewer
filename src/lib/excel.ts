import * as XLSX from "xlsx";
import type { BulkUploadRow } from "@/types";

/**
 * Generate a template Excel file for bulk student upload
 */
export function generateStudentTemplate(): Blob {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Define headers and sample data
    const data = [
        ["Name", "Email", "Registration Number", "Department"],
        ["John Doe", "john.doe@college.edu", "REG2024001", "Computer Science"],
        ["Jane Smith", "jane.smith@college.edu", "REG2024002", "Information Technology"],
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

    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Generate blob
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Download the template Excel file
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
 * Parse uploaded Excel file and extract student data
 * REWRITTEN for better compatibility and error handling
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

                console.log("[Excel] Workbook loaded. Sheets:", workbook.SheetNames);

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    resolve({
                        success: false,
                        error: "No sheets found in the Excel file",
                    });
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                console.log("[Excel] Sheet selected:", sheetName);

                // Convert to JSON with headers
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1, // Get raw array data
                    defval: "", // Default value for empty cells
                }) as string[][];

                console.log("[Excel] Raw data:", jsonData);

                if (jsonData.length < 2) {
                    resolve({
                        success: false,
                        error: "Excel file must have at least a header row and one data row",
                    });
                    return;
                }

                // Extract header and validate
                const headerRow = jsonData[0];
                console.log("[Excel] Header row:", headerRow);

                // Find column indices (case-insensitive, flexible matching)
                const findColumnIndex = (possibleNames: string[]) => {
                    return headerRow.findIndex(header =>
                        possibleNames.some(name =>
                            String(header).toLowerCase().trim() === name.toLowerCase()
                        )
                    );
                };

                const nameIdx = findColumnIndex(["Name", "Full Name", "Student Name"]);
                const emailIdx = findColumnIndex(["Email", "Email Address", "E-mail"]);
                const regNoIdx = findColumnIndex(["Registration Number", "Reg No", "RegNo", "Registration No", "Reg Number"]);
                const deptIdx = findColumnIndex(["Department", "Dept", "Branch"]);

                console.log("[Excel] Column indices:", { nameIdx, emailIdx, regNoIdx, deptIdx });

                if (nameIdx === -1 || emailIdx === -1 || regNoIdx === -1) {
                    resolve({
                        success: false,
                        error: `Missing required columns. Found headers: ${headerRow.join(", ")}. Expected: Name, Email, Registration Number`,
                    });
                    return;
                }

                // Parse data rows
                const students: BulkUploadRow[] = [];
                const errors: string[] = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 1;

                    // Skip completely empty rows
                    if (!row || row.every(cell => !cell || String(cell).trim() === "")) {
                        continue;
                    }

                    const name = String(row[nameIdx] || "").trim();
                    const email = String(row[emailIdx] || "").trim();
                    const registrationNumber = String(row[regNoIdx] || "").trim();
                    const department = deptIdx !== -1 ? String(row[deptIdx] || "").trim() : "";

                    // Validate required fields
                    if (!name) {
                        errors.push(`Row ${rowNum}: Name is required`);
                        continue;
                    }
                    if (!email) {
                        errors.push(`Row ${rowNum}: Email is required`);
                        continue;
                    }
                    if (!registrationNumber) {
                        errors.push(`Row ${rowNum}: Registration Number is required`);
                        continue;
                    }

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        errors.push(`Row ${rowNum}: Invalid email format (${email})`);
                        continue;
                    }

                    students.push({
                        name,
                        email,
                        registrationNumber,
                        department: department || undefined,
                    });
                }

                console.log("[Excel] Parsed students:", students.length, "Errors:", errors.length);

                if (errors.length > 0) {
                    resolve({
                        success: false,
                        error: errors.join("\n"),
                    });
                    return;
                }

                if (students.length === 0) {
                    resolve({
                        success: false,
                        error: "No valid student data found in the file. Make sure to fill in at least one row with Name, Email, and Registration Number.",
                    });
                    return;
                }

                resolve({
                    success: true,
                    data: students,
                });
            } catch (error: any) {
                console.error("[Excel] Parse error:", error);
                resolve({
                    success: false,
                    error: `Failed to parse Excel file: ${error.message || "Unknown error"}. Please ensure it's a valid .xlsx file.`,
                });
            }
        };

        reader.onerror = () => {
            console.error("[Excel] FileReader error");
            resolve({
                success: false,
                error: "Failed to read the file. Please try again.",
            });
        };

        reader.readAsArrayBuffer(file);
    });
}

// Export aliases for compatibility
export const parseExcelFile = parseStudentExcel;
export const generateTemplate = generateStudentTemplate;
