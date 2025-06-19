let isProcessing = false; // Track if we're currently processing a request
let currentTask = 'hang_mug';
let currentConfig = 'config_1';

// Task and configuration data
const taskConfigs = {
    hang_mug: {
        name: 'Hanging Mug',
        image: 'media/images/hang_mug.png',
        instructions: [
            'Hang the blue mug on the left branch',
            'Hang the red mug on the branch furthest to it',
            'Hang the red mug on one branch, sorry, the blue one.',
            'I want to use the blue mug. Hang the red mug on one branch.'
        ],
        placeholder: 'Hang the blue mug on the left branch.',
        backendEndpoint: '/generate'
    },
    pack_battery: {
        name: 'Packing Battery',
        image: 'media/images/pack_battery.png',
        instructions: [
            'I want to put a battery into the slot on the right column',
            'Put the battery to the slot furthest to it'
        ],
        placeholder: 'I want to put a battery into the slot on the right column.',
        backendEndpoint: '/generate_battery'
    }
};

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

// Function to handle task selection
function handleTaskSelect() {
    const taskSelect = document.getElementById('task-select');
    const configSelect = document.getElementById('config-select');
    const instructionSelect = document.getElementById('instruction-select');
    const instructionInput = document.getElementById('instruction');
    const taskImage = document.getElementById('task-image');
    
    currentTask = taskSelect.value;
    const taskData = taskConfigs[currentTask];
    
    // Update instruction dropdown
    instructionSelect.innerHTML = '';
    taskData.instructions.forEach(instruction => {
        const option = document.createElement('option');
        option.value = instruction;
        option.textContent = instruction;
        instructionSelect.appendChild(option);
    });
    
    // Add custom option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom instruction';
    instructionSelect.appendChild(customOption);
    
    // Update placeholder
    instructionInput.placeholder = taskData.placeholder;
    
    // Reset to first configuration
    configSelect.value = 'config_1';
    currentConfig = 'config_1';
    
    // Update image to use task and config specific path
    taskImage.src = `media/images/${currentTask}/${currentConfig}.png`;

    // Load default intermediate results for new task
    loadDefaultIntermediateResults();
    loadDefaultPointCloud();
}

// Function to handle configuration selection
function handleConfigSelect() {
    const configSelect = document.getElementById('config-select');
    const taskImage = document.getElementById('task-image');
    currentConfig = configSelect.value;
    
    // Update image to use task and config specific path
    taskImage.src = `media/images/${currentTask}/${currentConfig}.png`;
    
    // Load intermediate results for selected configuration
    loadDefaultIntermediateResults();
    loadDefaultPointCloud();
}

// Function to load default intermediate results
async function loadDefaultIntermediateResults() {
    const base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app';
    // const base_url = 'http://localhost:8080'; // for local development
    try {
        // Fetch generated code
        const codeResponse = await fetch(`${base_url}/media/code/${currentTask}/${currentConfig}/generated_code.py`);
        if (codeResponse.ok) {
            const code = await codeResponse.text();
            const generatedCode = document.getElementById('generated-code');
            generatedCode.textContent = code;
        }

        // Set detection images directly from local path
        const rgbImage = document.getElementById('detection-img-0');
        const depthImage = document.getElementById('detection-img-1');
        
        rgbImage.src = `media/images/${currentTask}/${currentConfig}/detection_img_0.png?${new Date().getTime()}`;
        depthImage.src = `media/images/${currentTask}/${currentConfig}/detection_img_1.png?${new Date().getTime()}`;
        
    } catch (error) {
        console.error('Error fetching intermediate results:', error);
    }
}

async function loadDefaultPointCloud() {
    const base_url = 'https://codediffuser-demo-55622474665.us-central1.run.app'; // for deployment
    // const base_url = 'http://localhost:8080'; // for local development
    
    fetch(`${base_url}/media/pcd/${currentTask}/${currentConfig}/precomputed.json`)
        .then(response => {
            if (!response.ok) throw new Error('HTTP error ' + response.status);
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
}

// Function to handle instruction selection
function handleInstructionSelect() {
    const instructionSelect = document.getElementById('instruction-select');
    const instructionInput = document.getElementById('instruction');
    
    if (instructionSelect.value !== 'custom') {
        instructionInput.value = instructionSelect.value;
    } else {
        instructionInput.value = '';
    }

    processInstruction();
}

// Function to process instruction
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
        const taskData = taskConfigs[currentTask];
        
        // Call the server endpoint with task and config information
        const response = await fetch(`${base_url}${taskData.backendEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                instruction: instructionInput.value,
                task: currentTask,
                config: currentConfig
            }),
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
        fetch(`${base_url}/media/pcd/${currentTask}/${currentConfig}/precomputed.json`)
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

// Function to toggle intermediate results
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

// Initialize visualization when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load default intermediate results
    loadDefaultIntermediateResults();
    loadDefaultPointCloud();
    
    // Set up initial state
    handleTaskSelect();
}); 