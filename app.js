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
        // const response = await fetch('http://localhost:8080/generate', {
        // const response = await fetch('https://yixuanwang.me/generate', {
        const response = await fetch('https://codediffuser-demo-55622474665.us-central1.run.app/generate', {
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
        // fetch('http://localhost:8080/media/pcd/precomputed.json')
        // fetch('https://yixuanwang.me/media/pcd/precomputed.json')
        fetch('https://codediffuser-demo-55622474665.us-central1.run.app/media/pcd/precomputed.json')
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
        // fetch('http://localhost:8080/media/pcd/precomputed.json')
        // fetch('https://yixuanwang.me/media/pcd/precomputed.json')
        fetch('https://codediffuser-demo-55622474665.us-central1.run.app/media/pcd/precomputed.json')
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

// Add event listener for Enter key
document.getElementById('instruction').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        processInstruction();
    }
}); 