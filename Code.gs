// The ID of the Google Sheet to use as the database.
const SHEET_ID = "1V0wOMplJ37LfihqigpA_ZCG0SBqwlZ6VbNv9kj9O8tk";
// The name of the sheet that stores student data.
const SHEET_NAME = "students"; // Ensure this matches your sheet name

/**
 * Main function to build the web application page.
 */
function doGet(e) {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('index')
    .setTitle("ระบบจัดการข้อมูลบัตรนักเรียน")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  return htmlOutput;
}

/**
 * Function to include other HTML files within the main file.
 * This allows us to serve the CSS and JavaScript files.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Function to get all student data from the Google Sheet.
 * @returns {Array<Array<any>>} All student data (excluding the header row).
 */
function getStudentsData() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    // Get data starting from the second row to the last row.
    // Ensure your sheet has at least 2 rows (header + 1 data row) or adjust range.
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2) return []; // No data rows besides header
    return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  } catch (e) {
    Logger.log(`Error in getStudentsData: ${e.message}`);
    return []; // Return an empty array in case of an error.
  }
}

/**
 * Function to create options for cascading filters.
 * @returns {Object} An object containing related grade levels and classrooms.
 */
function getFilterOptions() {
  const data = getStudentsData();
  const options = {};
  // Column indices: Grade = 3 (C), Room = 4 (D)
  data.forEach(row => {
    const grade = row[2]; // Assuming Grade is in column C (index 2)
    const room = row[3];  // Assuming Room is in column D (index 3)
    if (grade) {
      if (!options[grade]) {
        options[grade] = new Set();
      }
      if (room) {
        options[grade].add(room.toString()); // Ensure room is string for consistency
      }
    }
  });
  // Convert sets to sorted arrays
  for (const grade in options) {
    options[grade] = Array.from(options[grade]).sort((a, b) => a - b); // Sort numerically
  }
  return options;
}

/**
 * Function to update student data.
 * @param {Object} studentData - The student data to update.
 * @returns {Object} The result of the operation.
 */
function updateStudentData(studentData) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const data = dataRange.getValues();
    
    const studentIdToUpdate = studentData.studentId.toString();
    let rowIndex = -1;

    for (let i = 0; i < data.length; i++) {
      if (data[i][1].toString() === studentIdToUpdate) {
        rowIndex = i + 2; // +2 because array index starts at 0 and sheet starts at 1, and we skip the header.
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update 8 columns: No, StudentID, FullName, Grade, Room, Card Status, Pickup Status, Notes
      const rangeToUpdate = sheet.getRange(rowIndex, 1, 1, 8); 
      rangeToUpdate.setValues([[
        studentData.no,
        studentData.studentId,
        studentData.fullName,
        studentData.grade,
        studentData.room,
        studentData.cardStatus,
        studentData.pickupStatus,
        studentData.notes
      ]]);
      return { success: true, message: "อัปเดตข้อมูลสำเร็จ" };
    } else {
      return { success: false, message: "ไม่พบรหัสนักเรียนที่ต้องการแก้ไข" };
    }
  } catch (e) {
    Logger.log(`Error in updateStudentData: ${e.message}`);
    return { success: false, message: `เกิดข้อผิดพลาด: ${e.message}` };
  }
}

/**
 * Function to add new student data.
 * @param {Object} newStudent - The new student data.
 * @returns {Object} The result of the operation.
 */
function addStudentData(newStudent) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    // Check for duplicate student ID before adding
    const existingData = getStudentsData();
    if (existingData.some(row => row[1].toString() === newStudent.studentId.toString())) {
      return { success: false, message: `รหัสนักเรียน ${newStudent.studentId} มีอยู่แล้วในระบบ` };
    }

    sheet.appendRow([
      newStudent.no,
      newStudent.studentId,
      newStudent.fullName,
      newStudent.grade,
      newStudent.room,
      newStudent.cardStatus,
      newStudent.pickupStatus,
      newStudent.notes
    ]);
    return { success: true, message: "เพิ่มข้อมูลนักเรียนใหม่สำเร็จ" };
  } catch (e) {
    Logger.log(`Error in addStudentData: ${e.message}`);
    return { success: false, message: `เกิดข้อผิดพลาด: ${e.message}` };
  }
}
