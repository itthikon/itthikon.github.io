document.addEventListener('DOMContentLoaded', () => {
    // Base64 encoded TH Sarabun New font for jsPDF
    const thSarabunNewFont = 'AAEAAAARAQAABAAQR0RFRgQsA... (very long Base64 string) ...AAA==';

    // --- DOM Elements ---
    const tableBody = document.getElementById('student-table-body');
    const gradeFilter = document.getElementById('grade-filter');
    const roomFilter = document.getElementById('room-filter');
    const searchInput = document.getElementById('search-input');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noDataMessage = document.getElementById('no-data-message');
    
    // Dashboard elements
    const totalStudentsEl = document.getElementById('total-students');
    const cardStatusSummaryEl = document.getElementById('card-status-summary');
    const pickupStatusSummaryEl = document.getElementById('pickup-status-summary');

    // Modal elements
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const studentForm = document.getElementById('student-form');
    const addStudentBtn = document.getElementById('add-student-btn');
    const closeModalBtn = document.querySelector('.close-button');
    const cancelBtn = document.getElementById('cancel-btn');
    const formModeInput = document.getElementById('form-mode');
    const studentIdInput = document.getElementById('studentId');

    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // --- State ---
    let allStudents = [];
    let filterOptions = {};
    let currentFilteredData = [];

    // --- Data Loading and Processing ---
    function showLoading() {
        loadingSpinner.style.display = 'block';
        tableBody.style.display = 'none';
        noDataMessage.style.display = 'none';
    }

    function hideLoading() {
        loadingSpinner.style.display = 'none';
        tableBody.style.display = 'table-row-group';
    }

    function processSheetData(data) {
        return data.map(row => ({
            no: row[0],
            studentId: row[1].toString(),
            fullName: row[2],
            grade: row[3],
            room: row[4].toString(),
            cardStatus: row[5],
            pickupStatus: row[6],
            notes: row[7]
        }));
    }
    
    function generateFilterOptions(data) {
        const options = {};
        data.forEach(student => {
            const { grade, room } = student;
            if (grade) {
                if (!options[grade]) {
                    options[grade] = new Set();
                }
                if (room) {
                    options[grade].add(room);
                }
            }
        });
        
        // Convert sets to sorted arrays
        for (const grade in options) {
            options[grade] = Array.from(options[grade]).sort((a, b) => a - b);
        }
        return options;
    }

    function loadInitialData() {
        showLoading();
        google.script.run.withSuccessHandler(onDataLoaded).getStudentsData();
        google.script.run.withSuccessHandler(onFiltersLoaded).getFilterOptions();
    }

    function onDataLoaded(data) {
        allStudents = processSheetData(data);
        applyFiltersAndRender();
        hideLoading();
    }

    function onFiltersLoaded(options) {
        filterOptions = options;
        populateGradeFilter();
    }

    function populateGradeFilter() {
        const grades = Object.keys(filterOptions).sort();
        gradeFilter.innerHTML = '<option value="">-- เลือกระดับชั้น --</option>'; // Reset
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeFilter.appendChild(option);
        });
        // Reset room filter
        roomFilter.innerHTML = '<option value="">-- เลือกห้อง --</option>';
        roomFilter.disabled = true;
    }

    // --- Rendering ---
    function renderTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            noDataMessage.style.display = 'block';
            tableBody.style.display = 'none';
            return;
        }
        noDataMessage.style.display = 'none';
        tableBody.style.display = 'table-row-group';

        data.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.no}</td>
                <td>${student.studentId}</td>
                <td>${student.fullName}</td>
                <td>${student.grade}</td>
                <td>${student.room}</td>
                <td>${student.cardStatus}</td>
                <td>${student.pickupStatus}</td>
                <td>${student.notes || '-'}</td>
                <td><button class="btn btn-edit" data-id="${student.studentId}">แก้ไข</button></td>
            `;
            row.querySelector('.btn-edit').addEventListener('click', () => openModal('edit', student));
            tableBody.appendChild(row);
        });
    }

    function updateDashboard(data) {
        totalStudentsEl.textContent = data.length;

        const cardStatusCounts = data.reduce((acc, student) => {
            acc[student.cardStatus] = (acc[student.cardStatus] || 0) + 1;
            return acc;
        }, {});
        
        const pickupStatusCounts = data.reduce((acc, student) => {
            if (student.pickupStatus && student.pickupStatus !== '-') {
               acc[student.pickupStatus] = (acc[student.pickupStatus] || 0) + 1;
            }
            return acc;
        }, {});

        cardStatusSummaryEl.innerHTML = Object.entries(cardStatusCounts)
            .map(([status, count]) => `<div class="summary-item"><span>${status}:</span> <span>${count}</span></div>`).join('');
            
        pickupStatusSummaryEl.innerHTML = Object.entries(pickupStatusCounts)
            .map(([status, count]) => `<div class="summary-item"><span>${status}:</span> <span>${count}</span></div>`).join('');
    }

    // --- Filtering and Searching ---
    function applyFiltersAndRender() {
        const grade = gradeFilter.value;
        const room = roomFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filteredData = allStudents;

        if (grade) {
            filteredData = filteredData.filter(s => s.grade === grade);
        }
        if (room) {
            filteredData = filteredData.filter(s => s.room.toString() === room);
        }
        if (searchTerm) {
            filteredData = filteredData.filter(s => 
                s.studentId.toString().includes(searchTerm) || 
                s.fullName.toLowerCase().includes(searchTerm)
            );
        }
        
        currentFilteredData = filteredData; // Update the state for export
        renderTable(filteredData);
        updateDashboard(filteredData);
    }

    function handleGradeChange() {
        const selectedGrade = gradeFilter.value;
        roomFilter.innerHTML = '<option value="">-- เลือกห้อง --</option>';
        
        if (selectedGrade && filterOptions[selectedGrade]) {
            filterOptions[selectedGrade].forEach(room => {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = room;
                roomFilter.appendChild(option);
            });
            roomFilter.disabled = false;
        } else {
            roomFilter.disabled = true;
        }
        applyFiltersAndRender();
    }

    // --- Modal Handling ---
    function openModal(mode, data = null) {
        studentForm.reset();
        formModeInput.value = mode;
        studentIdInput.readOnly = (mode === 'edit');

        if (mode === 'edit') {
            modalTitle.textContent = 'แก้ไขข้อมูลนักเรียน';
            document.getElementById('no').value = data.no;
            studentIdInput.value = data.studentId;
            document.getElementById('fullName').value = data.fullName;
            document.getElementById('grade').value = data.grade;
            document.getElementById('room').value = data.room;
            document.getElementById('cardStatus').value = data.cardStatus;
            document.getElementById('pickupStatus').value = data.pickupStatus;
            document.getElementById('notes').value = data.notes;
        } else {
            modalTitle.textContent = 'เพิ่มรายชื่อนักเรียนใหม่';
            // Optional: auto-fill the next 'no'
            const maxNo = allStudents.reduce((max, s) => Math.max(max, s.no), 0);
            document.getElementById('no').value = maxNo + 1;
        }
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const mode = formModeInput.value;
        const studentData = {
            no: parseInt(document.getElementById('no').value, 10),
            studentId: studentIdInput.value.trim(),
            fullName: document.getElementById('fullName').value.trim(),
            grade: document.getElementById('grade').value.trim(),
            room: document.getElementById('room').value.trim(),
            cardStatus: document.getElementById('cardStatus').value,
            pickupStatus: document.getElementById('pickupStatus').value,
            notes: document.getElementById('notes').value.trim(),
        };

        showLoading();
        closeModal();

        if (mode === 'edit') {
            google.script.run.withSuccessHandler(onSaveSuccess).updateStudentData(studentData);
        } else {
            google.script.run.withSuccessHandler(onSaveSuccess).addStudentData(studentData);
        }
    }
    
    function onSaveSuccess(response) {
        if(response.success) {
            alert(response.message);
            loadInitialData(); // Reload all data to reflect changes
        } else {
            alert(`Error: ${response.message}`);
            hideLoading();
        }
    }

    // --- Export Functions ---
    function exportToExcel() {
        const dataToExport = currentFilteredData.map(s => ({
            'เลขที่': s.no,
            'รหัสนักเรียน': s.studentId,
            'ชื่อ-นามสกุล': s.fullName,
            'ระดับชั้น': s.grade,
            'ห้อง': s.room,
            'สถานะบัตร': s.cardStatus,
            'การรับบัตร': s.pickupStatus,
            'หมายเหตุ': s.notes
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "StudentData");

        // Auto-proportional column widths
        const cols = Object.keys(dataToExport[0]);
        const colWidths = cols.map(col => ({ 
            wch: Math.max(...dataToExport.map(item => item[col] ? item[col].toString().length : 0), col.length)
        }));
        worksheet["!cols"] = colWidths;

        XLSX.writeFile(workbook, "student_data.xlsx");
    }

    function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add the Thai font
        doc.addFileToVFS('THSarabunNew.ttf', thSarabunNewFont);
        doc.addFont('THSarabunNew.ttf', 'THSarabunNew', 'normal');
        doc.setFont('THSarabunNew');

        const head = [['เลขที่', 'รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ระดับชั้น', 'ห้อง', 'สถานะบัตร', 'การรับบัตร', 'หมายเหตุ']];
        const body = currentFilteredData.map(s => [
            s.no,
            s.studentId,
            s.fullName,
            s.grade,
            s.room,
            s.cardStatus,
            s.pickupStatus,
            s.notes
        ]);

        doc.autoTable({
            head: head,
            body: body,
            styles: {
                font: 'THSarabunNew',
                fontStyle: 'normal',
            },
            headStyles: { fillColor: [22, 160, 133] },
        });

        doc.save('student_data.pdf');
    }

    // --- Event Listeners ---
    gradeFilter.addEventListener('change', handleGradeChange);
    roomFilter.addEventListener('change', applyFiltersAndRender);
    searchInput.addEventListener('input', applyFiltersAndRender);
    addStudentBtn.addEventListener('click', () => openModal('add'));
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    studentForm.addEventListener('submit', handleFormSubmit);
    exportExcelBtn.addEventListener('click', exportToExcel);
    exportPdfBtn.addEventListener('click', exportToPDF);
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

    // --- Initial Load ---
    loadInitialData();
});