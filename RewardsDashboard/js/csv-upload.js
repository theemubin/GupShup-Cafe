// === Admin CSV Points Upload (per campus/house) ===
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('csv-upload-form');
    const fileInput = document.getElementById('csv-file-input');
    const campusSelect = document.getElementById('csv-campus-select');
    const houseSelect = document.getElementById('csv-house-select');
    const previewDiv = document.getElementById('csv-upload-preview');
    const downloadBtn = document.getElementById('download-csv-template');

    // Download template for points upload
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const template = 'studentId,studentName,points\n12345,John Doe,50\n';
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'points-template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (!form) return;

    let parsedData = [];

    fileInput.addEventListener('change', function () {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                parsedData = parsePointsCSV(e.target.result);
                showPreview(parsedData);
            } catch (err) {
                previewDiv.innerHTML = '<div style="color:red">Invalid CSV format.</div>';
            }
        };
        reader.readAsText(file);
    });

    function parsePointsCSV(csv) {
        const lines = csv.trim().split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
        });
    }

    function showPreview(data) {
        if (!data.length) {
            previewDiv.innerHTML = '<em>No data found in CSV.</em>';
            return;
        }
        let html = '<table style="width:100%;border-collapse:collapse"><thead><tr>';
        Object.keys(data[0]).forEach(h => {
            html += `<th style="border:1px solid #ccc;padding:4px">${h}</th>`;
        });
        html += '</tr></thead><tbody>';
        data.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(val => {
                html += `<td style="border:1px solid #ccc;padding:4px">${val}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        previewDiv.innerHTML = html;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!parsedData.length) {
            alert('Please select a valid CSV file.');
            return;
        }
        const campus = campusSelect.value;
        const house = houseSelect.value;
        if (!campus || !house) {
            alert('Please select both campus and house.');
            return;
        }
        if (!window.FirebaseConnections || !window.FirebaseConnections.primary || !window.FirebaseConnections.primary.db) {
            alert('Database not initialized.');
            return;
        }
        const db = window.FirebaseConnections.primary.db;
        previewDiv.innerHTML += '<div>Uploading...</div>';
        let success = 0, fail = 0;
        for (const row of parsedData) {
            if (!row.studentId || !row.points) { fail++; continue; }
            try {
                await db.collection('points')
                    .doc(campus)
                    .collection(house)
                    .doc(row.studentId)
                    .set({
                        studentName: row.studentName || '',
                        points: Number(row.points) || 0,
                        updatedAt: new Date()
                    }, { merge: true });
                success++;
            } catch (err) {
                fail++;
            }
        }
        previewDiv.innerHTML += `<div style=\"color:green\">Upload complete: ${success} success, ${fail} failed.</div>`;
    });
});
// CSV Upload and Processing Component
// Handles bulk data import with smart processing and validation


class CsvUploadManager {
    constructor() {
        this.firebaseService = window.FirebaseService;
        this.supportedTypes = ['students', 'houses', 'rewards', 'competitions'];
        this.validationRules = this.getValidationRules();
    }

    // ===== CSV PARSING =====
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    const data = lines.slice(1)
                        .filter(line => line.trim())
                        .map((line, index) => {
                            const values = this.parseCSVLine(line);
                            const row = {};
                            headers.forEach((header, i) => {
                                row[header] = values[i] || '';
                            });
                            row._rowIndex = index + 2; // +2 for header and 0-based index
                            return row;
                        });
                    resolve({ headers, data });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // ===== VALIDATION RULES =====
    getValidationRules() {
        return {
            students: {
                required: ['studentId', 'name', 'campus', 'house'],
                optional: ['academicPoints', 'lifeSkillsPoints', 'attendanceBonus', 'placementBonus', 'dropoutPenalty', 'email', 'phone'],
                transform: (row) => ({
                    studentId: row.studentId || row.student_id,
                    name: row.name,
                    campus: row.campus.toLowerCase(),
                    house: row.house,
                    email: row.email || '',
                    phone: row.phone || '',
                    points: {
                        academic: parseInt(row.academicPoints || row.academic_points || 0),
                        lifeSkills: parseInt(row.lifeSkillsPoints || row.life_skills_points || 0),
                        attendance: parseInt(row.attendanceBonus || row.attendance_bonus || 0),
                        placement: parseInt(row.placementBonus || row.placement_bonus || 0),
                        dropout: parseInt(row.dropoutPenalty || row.dropout_penalty || 0)
                    },
                }),
            },
            houses: {
                required: ['houseId', 'name', 'campus'],
                optional: ['totalPoints', 'color', 'description'],
                transform: (row) => ({
                    houseId: row.houseId || row.house_id,
                    name: row.name,
                    campus: row.campus.toLowerCase(),
                    totalPoints: parseInt(row.totalPoints || row.total_points || 0),
                    color: row.color || '#3498db',
                    description: row.description || '',
                }),
            },
            rewards: {
                required: ['title', 'description', 'level', 'campus'],
                optional: ['status', 'likes', 'claimed', 'image'],
                transform: (row) => ({
                    title: row.title,
                    description: row.description,
                    level: parseInt(row.level),
                    campus: row.campus.toLowerCase(),
                    status: row.status || 'available',
                    likes: parseInt(row.likes || 0),
                    claimed: parseInt(row.claimed || 0),
                    image: row.image ? convertGoogleDriveLink(row.image) : null,
                }),
            }
        };
    }

    // ===== VALIDATION =====
    validateData(data, type) {
        const rules = this.validationRules[type];
        if (!rules) {
            throw new Error(`Unsupported data type: ${type}`);
        }
        const errors = [];
        const validData = [];
        data.forEach((row, index) => {
            const rowErrors = [];
            // Check required fields
            rules.required.forEach(field => {
                if (rowErrors.length === 0) {
                    validData.push(transformedRow);
                }
            } catch (error) {
                rowErrors.push(`Transformation error: ${error.message}`);
            }
            if (rowErrors.length > 0) {
                errors.push({
                    row: row._rowIndex || index + 1,
                    errors: rowErrors
                });
            }
        });
        return { validData, errors };
    }

    // ===== UPLOAD PROCESSING =====
    async processUpload(file, type, options = {}) {
        const progressCallback = options.onProgress || (() => {});
        const errorCallback = options.onError || (() => {});
        try {
            progressCallback({ stage: 'parsing', progress: 0 });
            // Parse CSV
            const { headers, data } = await this.parseCSV(file);
            progressCallback({ stage: 'parsing', progress: 25 });
            // Validate data
            const { validData, errors } = this.validateData(data, type);
            progressCallback({ stage: 'validation', progress: 50 });
            if (errors.length > 0 && !options.ignoreErrors) {
                throw new Error(`Validation errors found: ${errors.length} rows have issues`);
            }
            // Process in Firebase
                        attendance: parseInt(row.attendanceBonus || row.attendance_bonus || 0),
                        placement: parseInt(row.placementBonus || row.placement_bonus || 0),
                        dropout: parseInt(row.dropoutPenalty || row.dropout_penalty || 0)
                    }
                })
            },
            houses: {
                required: ['houseId', 'name', 'campus'],
                optional: ['totalPoints', 'color', 'description'],
                transform: (row) => ({
                    houseId: row.houseId || row.house_id,
                    name: row.name,
                    campus: row.campus.toLowerCase(),
                    totalPoints: parseInt(row.totalPoints || row.total_points || 0),
                    color: row.color || '#3498db',
                    description: row.description || ''
                })
            },
            rewards: {
                required: ['title', 'description', 'level', 'campus'],
                optional: ['status', 'likes', 'claimed', 'image'],
                transform: (row) => ({
                    title: row.title,
                    description: row.description,
                    level: parseInt(row.level),
                    campus: row.campus.toLowerCase(),
                    status: row.status || 'available',
                    likes: parseInt(row.likes || 0),
                    claimed: parseInt(row.claimed || 0),
                    image: row.image ? convertGoogleDriveLink(row.image) : null
                })
            }
        };
    }

    // ===== VALIDATION =====

    validateData(data, type) {
        const rules = this.validationRules[type];
        if (!rules) {
            throw new Error(`Unsupported data type: ${type}`);
        }

        const errors = [];
        const validData = [];

        data.forEach((row, index) => {
            const rowErrors = [];
            
            // Check required fields
            rules.required.forEach(field => {
                if (!row[field] && !row[field.replace(/([A-Z])/g, '_$1').toLowerCase()]) {
                    rowErrors.push(`Missing required field: ${field}`);
                }
            });

            // Transform data
            try {
                const transformedRow = rules.transform(row);
                if (rowErrors.length === 0) {
                    validData.push(transformedRow);
                }
            } catch (error) {
                rowErrors.push(`Transformation error: ${error.message}`);
            }

            if (rowErrors.length > 0) {
                errors.push({
                    row: row._rowIndex || index + 1,
                    errors: rowErrors
                });
            }
        });

        return { validData, errors };
    }

    // ===== UPLOAD PROCESSING =====

    async processUpload(file, type, options = {}) {
        const progressCallback = options.onProgress || (() => {});
        const errorCallback = options.onError || (() => {});
        
        try {
            progressCallback({ stage: 'parsing', progress: 0 });
            
            // Parse CSV
            const { headers, data } = await this.parseCSV(file);
            progressCallback({ stage: 'parsing', progress: 25 });

            // Validate data
            const { validData, errors } = this.validateData(data, type);
            progressCallback({ stage: 'validation', progress: 50 });

            if (errors.length > 0 && !options.ignoreErrors) {
                throw new Error(`Validation errors found: ${errors.length} rows have issues`);
            }

            // Process in Firebase
            progressCallback({ stage: 'uploading', progress: 75 });
            const results = await this.firebaseService.processCsvData(validData, type);
            
            progressCallback({ stage: 'complete', progress: 100 });

            return {
                success: true,
                processed: results.success,
                errors: [...errors, ...results.errors],
                validData: validData.length,
                totalRows: data.length
            };

        } catch (error) {
            errorCallback(error);
            throw error;
        }
    }

    // ===== UI HELPERS =====

    createUploadInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Upload container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div class="csv-upload-component">
                <div class="upload-header">
                    <h3><i class="fas fa-upload"></i> Bulk Data Upload</h3>
                    <p>Upload CSV files to import students, houses, or rewards in bulk</p>
                </div>
                
                <div class="upload-type-selector">
                    <label for="upload-type">Data Type:</label>
                    <select id="upload-type" class="form-control">
                        <option value="students">Students</option>
                        <option value="houses">Houses</option>
                        <option value="rewards">Rewards</option>
                    </select>
                </div>

                <div class="upload-area" id="upload-dropzone">
                    <div class="upload-content">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop your CSV file here or <button type="button" id="browse-btn">browse</button></p>
                        <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                    </div>
                </div>

                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <p id="progress-text">Processing...</p>
                </div>

                <div class="upload-results" id="upload-results" style="display: none;">
                    <h4>Upload Results</h4>
                    <div class="results-summary" id="results-summary"></div>
                    <div class="error-list" id="error-list"></div>
                </div>

                <div class="template-downloads">
                    <h4>CSV Templates</h4>
                    <div class="template-buttons">
                        <button class="template-btn" data-template="students">
                            <i class="fas fa-download"></i> Students Template
                        </button>
                        <button class="template-btn" data-template="houses">
                            <i class="fas fa-download"></i> Houses Template
                        </button>
                        <button class="template-btn" data-template="rewards">
                            <i class="fas fa-download"></i> Rewards Template
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupUploadEventListeners();
    }

    setupUploadEventListeners() {
        const dropzone = document.getElementById('upload-dropzone');
        const fileInput = document.getElementById('csv-file-input');
        const browseBtn = document.getElementById('browse-btn');
        const typeSelect = document.getElementById('upload-type');

        // File input events
        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag and drop events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'text/csv') {
                this.handleFileSelect(file);
            }
        });

        // Template download buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.closest('.template-btn').dataset.template;
                this.downloadTemplate(template);
            });
        });
    }

    async handleFileSelect(file) {
        if (!file) return;

        const type = document.getElementById('upload-type').value;
        const progressContainer = document.getElementById('upload-progress');
        const resultsContainer = document.getElementById('upload-results');
        
        progressContainer.style.display = 'block';
        resultsContainer.style.display = 'none';

        try {
            const result = await this.processUpload(file, type, {
                onProgress: (progress) => {
                    const progressFill = document.getElementById('progress-fill');
                    const progressText = document.getElementById('progress-text');
                    
                    progressFill.style.width = `${progress.progress}%`;
                    progressText.textContent = `${progress.stage}: ${progress.progress}%`;
                }
            });

            this.showResults(result);
        } catch (error) {
            this.showError(error.message);
        } finally {
            progressContainer.style.display = 'none';
        }
    }

    showResults(result) {
        const resultsContainer = document.getElementById('upload-results');
        const summaryContainer = document.getElementById('results-summary');
        const errorContainer = document.getElementById('error-list');

        summaryContainer.innerHTML = `
            <div class="success-summary">
                <i class="fas fa-check-circle"></i>
                <strong>${result.processed}</strong> records processed successfully
                out of <strong>${result.totalRows}</strong> total rows
            </div>
        `;

        if (result.errors.length > 0) {
            errorContainer.innerHTML = `
                <h5>Errors (${result.errors.length}):</h5>
                <ul class="error-items">
                    ${result.errors.map(error => `
                        <li>Row ${error.row}: ${error.errors ? error.errors.join(', ') : error.error}</li>
                    `).join('')}
                </ul>
            `;
        } else {
            errorContainer.innerHTML = '<p class="no-errors">No errors found!</p>';
        }

        resultsContainer.style.display = 'block';
    }

    showError(message) {
        const resultsContainer = document.getElementById('upload-results');
        const summaryContainer = document.getElementById('results-summary');
        
        summaryContainer.innerHTML = `
            <div class="error-summary">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Upload Failed:</strong> ${message}
            </div>
        `;
        
        resultsContainer.style.display = 'block';
    }

    // ===== TEMPLATE GENERATION =====

    downloadTemplate(type) {
        const templates = {
            students: {
                headers: ['studentId', 'name', 'campus', 'house', 'email', 'phone', 'academicPoints', 'lifeSkillsPoints', 'attendanceBonus', 'placementBonus', 'dropoutPenalty'],
                sample: ['S001', 'John Doe', 'pune', 'bageshree', 'john@example.com', '9876543210', '890', '340', '15', '0', '0']
            },
            houses: {
                headers: ['houseId', 'name', 'campus', 'totalPoints', 'color', 'description'],
                sample: ['H001', 'Bageshree House', 'pune', '1250', '#e74c3c', 'The red house']
            },
            rewards: {
                headers: ['title', 'description', 'level', 'campus', 'status', 'likes', 'claimed'],
                sample: ['Coffee Voucher', 'Free coffee from campus café', '1', 'pune', 'available', '24', '12']
            }
        };

        const template = templates[type];
        if (!template) return;

        const csvContent = [
            template.headers.join(','),
            template.sample.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Initialize global CSV upload manager
window.CsvUploadManager = new CsvUploadManager();
console.log('📊 CSV Upload Manager initialized');
