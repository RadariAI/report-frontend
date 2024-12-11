// Get references to DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const responseMessage = document.getElementById('responseMessage');
const followUpArea = document.getElementById('followUpArea');
const followUpInput = document.getElementById('followUpInput');
const followUpButton = document.getElementById('followUpButton');

// Variables to store server outputs
let rawBodyReport = "";
let reportExplanation = "";
let userConversation = [];

// Open file picker when upload area is clicked
uploadArea.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        uploadPDF(file);
    }
});

function formatTextWithHeaders(text) {
    // Replace **text** with <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, "<h2>$1</h2>");

    // Replace ### text with <h3>text</h3>
    text = text.replace(/###\s+(.*?)(\n|$)/g, "<h2>$1</h2>");

    // Replace ## text with <h2>text</h2> (if needed for larger headers)
    text = text.replace(/##\s+(.*?)(\n|$)/g, "<h3>$1</h3>");

    return text;
}

// Function to upload PDF
async function uploadPDF(file) {
    const formData = new FormData();
    formData.append('document', file, file.name); // Add file under "document" field

    // Get the loading screen elements
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingMessage = document.getElementById('loadingMessage');
    const progressMessage = document.getElementById('progressMessage');
    const progressBar = document.getElementById('progressBar');

    // Show the loading screen and set initial progress
    loadingScreen.style.display = 'block';
    loadingMessage.textContent = `${file.name} - Uploaded`;
    progressMessage.textContent = "Extracting values...";
    progressBar.style.width = "0%";

    // Simulate progress updates
    const updateProgress = async () => {
        await new Promise((resolve) => setTimeout(() => {
            progressMessage.textContent = "Extracting values...";
            progressBar.style.width = "30%";
            resolve();
        }, 5000)); // 10 seconds

        await new Promise((resolve) => setTimeout(() => {
            progressMessage.textContent = "Analyzing...";
            progressBar.style.width = "70%";
            resolve();
        }, 10000)); // 10 seconds

        progressMessage.textContent = "Finalizing...";
        progressBar.style.width = "90%";
    };

    const fetchData = async () => {
        const response = await fetch('https://report-analysis-production.up.railway.app/bot-invoke/upload-pdf', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        return await response.json();
    }

    try {
        // Run both fetch and progress simulation concurrently
        const [data] = await Promise.all([fetchData(), updateProgress()]);

        console.log(data);

        if (data.result) {
            // Hide the loading screen
            loadingScreen.style.display = 'none';
            
            // Display the "raw_body_report"
            rawBodyReport = formatTextWithHeaders(data.result.raw_body_report || "No raw body report available.");
            reportExplanation = formatTextWithHeaders(data.result.report_explanation || "No explanation available.");

            // Update the UI
            responseMessage.style.display = 'block';
            responseMessage.innerHTML = rawBodyReport;

            // Display the explanation in a separate area
            const explanationArea = document.getElementById('explanationArea');
            explanationArea.style.display = 'block';
            explanationArea.innerHTML = reportExplanation;

            // Show follow-up question area
            followUpArea.style.display = 'block';
        } else {
            responseMessage.style.display = 'block';
            responseMessage.textContent = `Error: Missing "result" in server response.`;
            followUpArea.style.display = 'none';
        }
        
    } catch (error) {
        // Enhanced error handling: log the full error and fallback to a generic message
        console.error("Caught error:", error);
        // Handle errors
        progressMessage.textContent = "An error occurred.";
        progressBar.style.backgroundColor = "#dc3545"; // Red color for error
        alert(`Request failed: ${error.message}`);
        followUpArea.style.display = 'none';
    } finally {
        // Finalize progress bar
        progressBar.style.width = "100%";
    }
}

// Function to handle follow-up question
async function sendFollowUpQuestion() {
    // Get the user's query from the input box
    const userQuery = document.getElementById('followUpInput').value.trim();

    if (!userQuery) {
        alert("Please enter a follow-up question.");
        return;
    }

    userConversation.push({ role: "human", content: userQuery });

    // API endpoint
    const baseUrl = 'https://report-analysis-production.up.railway.app';
    const url = `${baseUrl}/bot-invoke/qa`;

    // Data to be sent in the POST request
    const data = {
        user_conversation: userConversation,
        raw_body_report: rawBodyReport,
        report_explanation: reportExplanation
    };

    // Headers
    const headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    };

    try {
        // Send POST request
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log("Follow-up Response:", responseData);

            // Append the server's reply to the conversation list
            if (responseData.message) {
                userConversation.push({ role: "assistant", content: responseData.message });

                // Display the answer in the answer section
                const answerSection = document.getElementById('answerSection');
                const answerText = document.getElementById('answerText');
                answerSection.style.display = 'block'; // Show the answer section
                answerText.textContent = responseData.message; // Update with server's answer
            }
        } else {
            const errorMessage = await response.text();
            console.error("Server Error:", errorMessage);
            alert(`Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error("Request Error:", error);
        alert(`Request failed: ${error.message}`);
    }
}