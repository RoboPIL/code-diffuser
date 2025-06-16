let isProcessing = false; // Track if we're currently processing a request
let pollingInterval = null; // Track the polling interval

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
    try {
        // Fetch generated code
        const codeResponse = await fetch('http://localhost:8080/media/code/generated_code.py');
        if (codeResponse.ok) {
            const code = await codeResponse.text();
            const generatedCode = document.getElementById('generated-code');
            generatedCode.textContent = code;
        }

        // Fetch detection images
        const img1Response = await fetch('http://localhost:8080/media/images/detection_img_0.png');
        if (img1Response.ok) {
            const rgbImage = document.getElementById('rgb-detection');
            rgbImage.src = 'http://localhost:8080/media/images/detection_img_0.png?' + new Date().getTime(); // Add timestamp to prevent caching
        }

        const img2Response = await fetch('http://localhost:8080/media/images/detection_img_1.png');
        if (img2Response.ok) {
            const depthImage = document.getElementById('depth-detection');
            depthImage.src = 'http://localhost:8080/media/images/detection_img_1.png?' + new Date().getTime(); // Add timestamp to prevent caching
        }
    } catch (error) {
        console.error('Error fetching intermediate results:', error);
    }
}

// Function to start polling for intermediate results
function startPolling() {
    // Clear any existing polling
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Start new polling
    pollingInterval = setInterval(fetchIntermediateResults, 5000); // Poll every 5 seconds
}

// Function to stop polling
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Function to generate point cloud based on instruction
async function processInstruction() {
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
        const response = await fetch('http://localhost:8080/generate', {
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
        
    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'AbortError') {
            alert('Request timed out. Please try again.');
        } else {
            alert('Error: ' + error.message);
        }
        // Show a precomputed point cloud as fallback
        fetch('http://localhost:8080/media/pcd/precomputed.json')
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
    // Wait for Plotly to load before showing initial visualization
    waitForPlotly(() => {
        console.log('Fetching precomputed point cloud...');
        fetch('http://localhost:8080/media/pcd/precomputed.json')
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
    });
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('instruction');
    const select = document.getElementById('instruction-select');
    
    // Add event listener for Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInstruction();
        }
    });

    // Initialize with custom instruction selected
    select.value = 'custom';
    input.disabled = false;

    // Load initial media files
    fetchIntermediateResults();

    // Start polling for intermediate results immediately
    startPolling();
}); 