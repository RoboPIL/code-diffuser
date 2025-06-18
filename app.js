let isProcessing = false; // Track if we're currently processing a request

// Function to check if Plotly is loaded
function isPlotlyReady() {
    return typeof Plotly !== 'undefined';
}

// Function to wait for Plotly to load
function waitForPlotly(callback, maxAttempts = 10) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        if (isPlotlyReady()) {
            clearInterval(checkInterval);
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('Plotly failed to load');
            alert('Visualization library failed to load. Please refresh the page.');
        }
    }, 500);
}

// Function to visualize point cloud using Plotly
function visualizePointCloud(points) {
    if (!isPlotlyReady()) {
        waitForPlotly(() => visualizePointCloud(points));
        return;
    }

    const x = points.map(p => p[0]);
    const y = points.map(p => p[1]);
    const z = points.map(p => p[2]);
    const colors = points.map(p => `rgb(${p[3]},${p[4]},${p[5]})`);

    const trace = {
        type: 'scatter3d',
        mode: 'markers',
        x: x,
        y: y,
        z: z,
        marker: {
            size: 3,
            color: colors,
            opacity: 1.0,
        }
    };

    const layout = {
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        }
    };

    try {
        Plotly.newPlot('visualization', [trace], layout);
    } catch (error) {
        console.error('Error plotting:', error);
        alert('Error creating visualization. Please try again.');
    }
}

// Function to fetch intermediate results
async function fetchIntermediateResults() {
    base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // base_url = 'http://localhost:8080'; // for local development
    try {
        // Fetch generated code
        const codeResponse = await fetch(`${base_url}/media/code/default/generated_code.py`);
        if (codeResponse.ok) {
            const code = await codeResponse.text();
            const generatedCode = document.getElementById('generated-code');
            generatedCode.textContent = code;
        }

        // Fetch detection images
        const img1Response = await fetch(`${base_url}/media/images/default/detection_img_0.png`);
        if (img1Response.ok) {
            const rgbImage = document.getElementById('detection-img-0');
            rgbImage.src = `${base_url}/media/images/default/detection_img_0.png?${new Date().getTime()}`; // Add timestamp to prevent caching
        }

        const img2Response = await fetch(`${base_url}/media/images/default/detection_img_1.png`);
        if (img2Response.ok) {
            const depthImage = document.getElementById('detection-img-1');
            depthImage.src = `${base_url}/media/images/default/detection_img_1.png?${new Date().getTime()}`; // Add timestamp to prevent caching
        }
    } catch (error) {
        console.error('Error fetching intermediate results:', error);
    }
}

// Function to generate point cloud based on instruction
async function processInstruction() {
    base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // base_url = 'http://localhost:8080'; // for local development
    if (isProcessing) return; // Prevent multiple simultaneous submissions
    
    const instructionInput = document.getElementById('instruction');
    const submitButton = document.querySelector('.button.is-primary');
    const loadingSpinner = document.getElementById('loading');
    
    if (!instructionInput.value) {
        alert('Please enter an instruction');
        return;
    }

    // Disable UI elements and show loading state
    isProcessing = true;
    instructionInput.disabled = true;
    submitButton.disabled = true;
    loadingSpinner.style.display = 'block';

    // Setup request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3600000); // 1 hour timeout

    try {
        // Call the server endpoint
        const response = await fetch(`${base_url}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ instruction: instructionInput.value }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Request failed');
        }

        const data = await response.json();
        // Visualize the point cloud
        visualizePointCloud(data.points);

        // Update generated code
        if (data.generated_code) {
            const generatedCode = document.getElementById('generated-code');
            generatedCode.textContent = data.generated_code;
        }

        // Update detection images
        if (data.detection_images && data.detection_images.length >= 2) {
            const rgbImage = document.getElementById('detection-img-0');
            const depthImage = document.getElementById('detection-img-1');
            
            rgbImage.src = `data:image/png;base64,${data.detection_images['detection_img_0']}`;
            depthImage.src = `data:image/png;base64,${data.detection_images['detection_img_1']}`;
        }
        
        
    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'AbortError') {
            alert('Request timed out. Please try again.');
        } else {
            alert('Error: ' + error.message);
        }
        // Show a precomputed point cloud as fallback
        fetch(`${base_url}/media/pcd/default/precomputed.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Loaded data:', data);
                visualizePointCloud(data);
            })
            .catch(err => {
                console.error('Failed to load precomputed point cloud:', err);
                alert('Failed to load precomputed point cloud: ' + err.message);
            });
    } finally {
        // Re-enable UI elements and hide loading state
        isProcessing = false;
        instructionInput.disabled = false;
        submitButton.disabled = false;
        loadingSpinner.style.display = 'none';
        clearTimeout(timeoutId);
    }
}

// Initialize visualization when the page loads
document.addEventListener('DOMContentLoaded', function() {
    base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // base_url = 'http://localhost:8080'; // for local development
    
    // Wait for Plotly to load before showing initial visualization
    waitForPlotly(() => {
        console.log('Fetching precomputed point cloud...');
        fetch(`${base_url}/media/pcd/default/precomputed.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Loaded data:', data);
                visualizePointCloud(data);
                
                // Load initial code
                return fetch(`${base_url}/media/code/default/generated_code.py`);
            })
            .then(response => {
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                return response.text();
            })
            .then(code => {
                console.log('Loaded initial code');
                const generatedCode = document.getElementById('generated-code');
                generatedCode.textContent = code;
                
                // Load initial images
                const rgbImage = document.getElementById('detection-img-0');
                const depthImage = document.getElementById('detection-img-1');
                rgbImage.src = `${base_url}/media/images/default/detection_img_0.png`;
                depthImage.src = `${base_url}/media/images/default/detection_img_1.png`;
            })
            .catch(err => {
                console.error('Failed to load initial data:', err);
                alert('Failed to load initial data: ' + err.message);
            });

        // Initialize battery scenario
        console.log('Fetching initial battery data...');
        
        // Load battery point cloud
        fetch(`${base_url}/media/pcd/default/battery/precomputed.json`)
            .then(response => {
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                return response.json();
            })
            .then(data => {
                console.log('Loaded battery point cloud data');
                visualizePointCloudBattery(data);
                
                // Load initial battery code
                return fetch(`${base_url}/media/code/default/battery/generated_code.py`);
            })
            .then(response => {
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                return response.text();
            })
            .then(code => {
                console.log('Loaded initial battery code');
                const generatedCode = document.getElementById('generated-code-battery');
                generatedCode.textContent = code;
                
                // Load initial battery images
                const rgbImage = document.getElementById('detection-img-0-battery');
                const depthImage = document.getElementById('detection-img-1-battery');
                rgbImage.src = `${base_url}/media/images/default/battery/detection_img_0.png`;
                depthImage.src = `${base_url}/media/images/default/battery/detection_img_1.png`;
            })
            .catch(err => {
                console.error('Failed to load initial battery data:', err);
                alert('Failed to load initial battery data: ' + err.message);
            });
    });

    // Initialize input handlers
    const input = document.getElementById('instruction');
    const select = document.getElementById('instruction-select');
    const inputBattery = document.getElementById('instruction-battery');
    const selectBattery = document.getElementById('instruction-select-battery');
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInstruction();
        }
    });

    inputBattery.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInstructionBattery();
        }
    });

    select.value = 'Hang the blue mug on the left branch';
    selectBattery.value = 'I want to put a battery into the slot on the right column';
    input.disabled = false;
    inputBattery.disabled = false;
});

// Function to handle instruction selection from dropdown
function handleInstructionSelect() {
    const select = document.getElementById('instruction-select');
    const input = document.getElementById('instruction');
    
    if (select.value === 'custom') {
        // Enable input for custom instruction
        input.value = '';
        input.disabled = false;
        input.focus();
    } else {
        // Set the selected example
        input.value = select.value;
        input.disabled = true;
        processInstruction();
    }
}

// Function to fetch intermediate results for battery scenario
async function fetchIntermediateResultsBattery() {
    base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // base_url = 'http://localhost:8080'; // for local development
    try {
        // Fetch generated code
        const codeResponse = await fetch(`${base_url}/media/code/default/battery/generated_code.py`);
        if (codeResponse.ok) {
            const code = await codeResponse.text();
            const generatedCode = document.getElementById('generated-code-battery');
            generatedCode.textContent = code;
        }

        // Fetch detection images
        const img1Response = await fetch(`${base_url}/media/images/default/battery/detection_img_0.png`);
        if (img1Response.ok) {
            const rgbImage = document.getElementById('detection-img-0-battery');
            rgbImage.src = `${base_url}/media/images/default/battery/detection_img_0.png?${new Date().getTime()}`;
        }

        const img2Response = await fetch(`${base_url}/media/images/default/battery/detection_img_1.png`);
        if (img2Response.ok) {
            const depthImage = document.getElementById('detection-img-1-battery');
            depthImage.src = `${base_url}/media/images/default/battery/detection_img_1.png?${new Date().getTime()}`;
        }
    } catch (error) {
        console.error('Error fetching intermediate results for battery scenario:', error);
    }
}

// Function to process battery instruction
async function processInstructionBattery() {
    base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // base_url = 'http://localhost:8080'; // for local development
    if (isProcessing) return;
    
    const instructionInput = document.getElementById('instruction-battery');
    const submitButton = document.querySelector('#loading-battery').previousElementSibling;
    const loadingSpinner = document.getElementById('loading-battery');
    
    if (!instructionInput.value) {
        alert('Please enter an instruction');
        return;
    }

    isProcessing = true;
    instructionInput.disabled = true;
    submitButton.disabled = true;
    loadingSpinner.style.display = 'block';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3600000);

    try {
        const response = await fetch(`${base_url}/generate_battery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ instruction: instructionInput.value }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Request failed');
        }

        const data = await response.json();
        visualizePointCloudBattery(data.points);
        // Update generated code
        if (data.generated_code) {
            const generatedCode = document.getElementById('generated-code-battery');
            generatedCode.textContent = data.generated_code;
        }

        // Update detection images
        if (data.detection_images && data.detection_images.length >= 2) {
            const rgbImage = document.getElementById('detection-img-0-battery');
            const depthImage = document.getElementById('detection-img-1-battery');
            
            rgbImage.src = `data:image/png;base64,${data.detection_images['detection_img_0']}`;
            depthImage.src = `data:image/png;base64,${data.detection_images['detection_img_1']}`;
        }
        
        
    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'AbortError') {
            alert('Request timed out. Please try again.');
        } else {
            alert('Error: ' + error.message);
        }
        fetch(`${base_url}/media/pcd/default/battery/precomputed.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Loaded battery data:', data);
                visualizePointCloudBattery(data);
            })
            .catch(err => {
                console.error('Failed to load precomputed battery point cloud:', err);
                alert('Failed to load precomputed battery point cloud: ' + err.message);
            });
    } finally {
        isProcessing = false;
        instructionInput.disabled = false;
        submitButton.disabled = false;
        loadingSpinner.style.display = 'none';
        clearTimeout(timeoutId);
    }
}

// Function to visualize battery point cloud
function visualizePointCloudBattery(points) {
    if (!isPlotlyReady()) {
        waitForPlotly(() => visualizePointCloudBattery(points));
        return;
    }

    const x = points.map(p => p[0]);
    const y = points.map(p => p[1]);
    const z = points.map(p => p[2]);
    const colors = points.map(p => `rgb(${p[3]},${p[4]},${p[5]})`);

    const trace = {
        type: 'scatter3d',
        mode: 'markers',
        x: x,
        y: y,
        z: z,
        marker: {
            size: 3,
            color: colors,
            opacity: 1.0,
        }
    };

    const layout = {
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        }
    };

    try {
        Plotly.newPlot('visualization-battery', [trace], layout);
    } catch (error) {
        console.error('Error plotting battery visualization:', error);
        alert('Error creating battery visualization. Please try again.');
    }
}

// Function to handle battery instruction selection
function handleInstructionSelectBattery() {
    const select = document.getElementById('instruction-select-battery');
    const input = document.getElementById('instruction-battery');
    
    if (select.value === 'custom') {
        input.value = '';
        input.disabled = false;
        input.focus();
    } else {
        input.value = select.value;
        input.disabled = true;
        processInstructionBattery();
    }
}

// Function to toggle intermediate results for mug scenario
function toggleIntermediateResults() {
    const content = document.getElementById('intermediate-content');
    const icon = document.getElementById('toggle-icon');
    const text = document.getElementById('toggle-text');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        text.textContent = 'Hide Details';
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        text.textContent = 'Show Details';
    }
}

// Function to toggle intermediate results for battery scenario
function toggleIntermediateResultsBattery() {
    const content = document.getElementById('intermediate-content-battery');
    const icon = document.getElementById('toggle-icon-battery');
    const text = document.getElementById('toggle-text-battery');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        text.textContent = 'Hide Details';
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        text.textContent = 'Show Details';
    }
} 