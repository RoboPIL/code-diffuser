// Precomputed point clouds
const POINT_CLOUDS = {
    1: generateSphere(1000),
    2: generateCube(1000),
    3: generateTorus(1000),
    4: generateCylinder(1000),
    5: generatePyramid(1000)
};

// Function to generate point cloud based on instruction
async function processInstruction() {
    const instruction = document.getElementById('instruction').value;
    
    if (!instruction) {
        alert('Please enter an instruction');
        return;
    }

    // Show loading spinner
    document.getElementById('loading').style.display = 'block';

    try {
        // Call the server endpoint
        // const response = await fetch('http://localhost:8080/generate', {
        const response = await fetch('https://yixuanwang.me/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ instruction })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        // Visualize the point cloud
        visualizePointCloud(data.points);
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        // Hide loading spinner
        document.getElementById('loading').style.display = 'none';
    }
}

// Function to visualize point cloud using Plotly
function visualizePointCloud(points) {
    const x = points.map(p => p[0]);
    const y = points.map(p => p[1]);
    const z = points.map(p => p[2]);

    const trace = {
        type: 'scatter3d',
        mode: 'markers',
        x: x,
        y: y,
        z: z,
        marker: {
            size: 2,
            color: z,
            colorscale: 'Viridis',
            opacity: 0.8
        }
    };

    const layout = {
        title: '3D Point Cloud Visualization',
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 30
        }
    };

    Plotly.newPlot('visualization', [trace], layout);
}

// Point cloud generation functions
function generateSphere(numPoints) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        points.push([x, y, z]);
    }
    return points;
}

function generateCube(numPoints) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const x = Math.random() * 2 - 1;
        const y = Math.random() * 2 - 1;
        const z = Math.random() * 2 - 1;
        points.push([x, y, z]);
    }
    return points;
}

function generateTorus(numPoints) {
    const points = [];
    const R = 1; // major radius
    const r = 0.3; // minor radius
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.random() * 2 * Math.PI;
        
        const x = (R + r * Math.cos(phi)) * Math.cos(theta);
        const y = (R + r * Math.cos(phi)) * Math.sin(theta);
        const z = r * Math.sin(phi);
        
        points.push([x, y, z]);
    }
    return points;
}

function generateCylinder(numPoints) {
    const points = [];
    const height = 2;
    const radius = 0.5;
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const h = Math.random() * height - height/2;
        
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        const z = h;
        
        points.push([x, y, z]);
    }
    return points;
}

function generatePyramid(numPoints) {
    const points = [];
    const size = 2;
    for (let i = 0; i < numPoints; i++) {
        const x = Math.random() * size - size/2;
        const y = Math.random() * size - size/2;
        const z = Math.random() * size;
        
        // Create pyramid shape by scaling z based on distance from center
        const distFromCenter = Math.sqrt(x*x + y*y);
        const scale = 1 - (distFromCenter / (size/2));
        const finalZ = z * scale;
        
        points.push([x, y, finalZ]);
    }
    return points;
}

// Add event listener for Enter key
document.getElementById('instruction').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        processInstruction();
    }
}); 