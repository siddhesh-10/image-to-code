import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ui-to-code" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ui-to-code.generateFromImage', async () => {
		try {
			console.log('🚀 Starting UI code generation process...');
			
			// Show file picker to select image
			console.log('📁 Opening file picker for image selection...');
			const imageUri = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				openLabel: 'Select UI Image',
				filters: {
					'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
				}
			});

			if (!imageUri || imageUri.length === 0) {
				console.log('❌ No image selected, cancelling operation');
				vscode.window.showInformationMessage('No image selected. Operation cancelled.');
				return;
			}

			const selectedImagePath = imageUri[0].fsPath;
			console.log('✅ Image selected:', selectedImagePath);

			// Ask user for folder name
			console.log('📝 Prompting for folder name...');
			const folderName = await vscode.window.showInputBox({
				prompt: 'Enter folder name for generated code (e.g., "my-ui-component"):',
				placeHolder: 'my-ui-component',
				value: 'generated-ui',
				validateInput: (value) => {
					if (!value || value.trim() === '') {
						return 'Folder name cannot be empty';
					}
					if (/[<>:"/\\|?*]/.test(value)) {
						return 'Folder name contains invalid characters';
					}
					return null;
				}
			});

			if (!folderName) {
				console.log('❌ No folder name provided, cancelling operation');
				vscode.window.showInformationMessage('No folder name provided. Operation cancelled.');
				return;
			}

			console.log('✅ Folder name provided:', folderName);

			// Get the directory where the image is located
			const imageDir = path.dirname(selectedImagePath);
			const outputDir = path.join(imageDir, folderName.trim());
			console.log('📂 Output directory:', outputDir);

			// Show progress notification
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating UI Code from Image",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0, message: "Loading image..." });
				console.log('🔄 Step 1/5: Loading and processing image...');
				
				// Check if image exists
				if (!fs.existsSync(selectedImagePath)) {
					throw new Error('Selected image not found.');
				}
				
				// Get image file size for logging
				const imageStats = fs.statSync(selectedImagePath);
				console.log(`📊 Image file size: ${(imageStats.size / 1024).toFixed(2)} KB`);
				
				progress.report({ increment: 10, message: "Converting image to base64..." });
				console.log('🔄 Step 2/5: Converting image to base64...');
				
				// Convert image to base64
				const imageBuffer = fs.readFileSync(selectedImagePath);
				const base64Image = imageBuffer.toString('base64');
				console.log(`📊 Base64 image size: ${(base64Image.length / 1024).toFixed(2)} KB`);
				
				progress.report({ increment: 20, message: "Preparing prompt for LLM..." });
				console.log('🔄 Step 3/5: Preparing prompt for LLM...');

				// Enhanced prompt for separate files
				const prompt = `You are a professional front‑end engineer and UI/UX expert. Your task is to analyze a provided UI screenshot and produce three complete, production‑ready code files: HTML, CSS, and JavaScript.

				Steps:
				1. Analyze the screenshot to identify layout, typography, color palette, spacing, responsive behavior, and any interactive elements.
				2. Plan your approach:
				• Semantic HTML structure (e.g., header, nav, main, section, footer)
				• CSS organization (variables, BEM or utility classes, responsive breakpoints)
				• JS interactions (event listeners, form handling, animations)
				3. Generate files: Output exactly three sections, each delimited by clear markers. No extra commentary.

				Formatting rules:
				=== file: index.html ===
				<!DOCTYPE html>
				<html lang="en">
				<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>UI from Screenshot</title>
				<link rel="stylesheet" href="styles.css">
				</head>
				<body>
				<!-- Structured HTML here -->
				<script src="script.js"></script>
				</body>
				</html>

				=== file: styles.css ===
				/* CSS Variables for colors, fonts */
				:root {
				--primary-color: #…;
				--font-family: '…', sans-serif;
				}

				/* Base resets and typography */
				html, body { margin: 0; padding: 0; font-family: var(--font-family); }

				/* Layout classes (Flexbox / Grid) */
				/* Responsive media queries */
				/* Hover states, transitions */
				/* Utility & BEM component styles */

				=== file: script.js ===
				// JavaScript for interactive behavior
				// 1. DOMContentLoaded listener
				// 2. Event handlers (button clicks, form submissions)
				// 3. Animations and transitions
				// 4. Responsive adjustments if needed

				Requirements:
				- HTML: Use semantic tags, meaningful class names, ARIA attributes, and component comments.
				- CSS: Implement CSS variables, Flexbox/Grid matching the screenshot, responsive breakpoints, hover/focus states, smooth transitions, modern best practices.
				- JS: Encapsulate logic in functions/modules, handle all interactions, include basic form validation, use requestAnimationFrame or CSS classes for animations.

				Return only the three complete file sections—no additional text. Ensure each section is complete, syntactically correct, and ready to drop into a new project.`;


				console.log('📝 Prompt prepared, length:', prompt.length, 'characters');
				
				progress.report({ increment: 30, message: "Calling Ollama API (this may take 2-5 minutes)..." });
				console.log('🔄 Step 4/5: Calling Ollama API...');
				console.log('⏱️  Starting API call with 5-minute timeout...');
				
				// Call Ollama API with increased timeout
				const startTime = Date.now();
				const ollamaResponse = await callOllamaAPI(base64Image, prompt);
				const endTime = Date.now();
				const duration = (endTime - startTime) / 1000;
				
				console.log(`✅ API call completed in ${duration.toFixed(2)} seconds`);
				console.log(`📊 Response length: ${ollamaResponse.length} characters`);
				
				progress.report({ increment: 70, message: "Extracting and processing code..." });
				console.log('🔄 Step 5/5: Extracting and processing code...');
				
				// Extract and separate the generated code
				const { htmlCode, cssCode, jsCode } = extractSeparateFiles(ollamaResponse);
				console.log(`📊 Extracted code sizes:`);
				console.log(`   - HTML: ${htmlCode.length} characters`);
				console.log(`   - CSS: ${cssCode.length} characters`);
				console.log(`   - JS: ${jsCode.length} characters`);
				
				progress.report({ increment: 80, message: "Creating output folder..." });
				console.log('📁 Creating output directory...');
				
				// Create output directory if it doesn't exist
				if (!fs.existsSync(outputDir)) {
					fs.mkdirSync(outputDir, { recursive: true });
					console.log('✅ Output directory created');
				} else {
					console.log('✅ Output directory already exists');
				}
				
				// Generate file names
				const htmlFileName = 'index.html';
				const cssFileName = 'styles.css';
				const jsFileName = 'script.js';
				
				const htmlFilePath = path.join(outputDir, htmlFileName);
				const cssFilePath = path.join(outputDir, cssFileName);
				const jsFilePath = path.join(outputDir, jsFileName);
				
				progress.report({ increment: 90, message: "Saving files..." });
				console.log('💾 Saving files...');
				
				// Save the separate files
				fs.writeFileSync(htmlFilePath, htmlCode);
				fs.writeFileSync(cssFilePath, cssCode);
				fs.writeFileSync(jsFilePath, jsCode);
				
				console.log('✅ Files saved successfully:');
				console.log('   - HTML:', htmlFilePath);
				console.log('   - CSS:', cssFilePath);
				console.log('   - JS:', jsFilePath);
				
				progress.report({ increment: 95, message: "Opening editor..." });
				console.log('📝 Opening generated code in editor...');
				
				// Create a new document with the HTML code
				const document = await vscode.workspace.openTextDocument({
					content: htmlCode,
					language: 'html'
				});
				
				// Show the document
				await vscode.window.showTextDocument(document);
				
				progress.report({ increment: 100, message: "Complete!" });
				console.log('🎉 UI code generation completed successfully!');
			});
			
			// Show success message with file locations
			vscode.window.showInformationMessage(`UI code generated successfully! Files saved to: ${outputDir}`);
			console.log('✅ Success message displayed to user');
			
		} catch (error) {
			console.error('❌ Error during UI code generation:', error);
			vscode.window.showErrorMessage(`Failed to generate UI code: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Calls the Ollama API with the image and prompt
 */
async function callOllamaAPI(base64Image: string, prompt: string): Promise<string> {
	try {
		console.log('🌐 Making API request to Ollama...');
		console.log('📊 Request details:');
		console.log('   - Model: llava');
		console.log('   - Image size:', (base64Image.length / 1024).toFixed(2), 'KB');
		console.log('   - Prompt length:', prompt.length, 'characters');
		console.log('   - Timeout: 5 minutes (300 seconds)');
		
		const response = await axios.post('http://localhost:11434/api/generate', {
			model: 'llava',
			prompt: prompt,
			images: [base64Image],
			stream: false
		}, {
			timeout: 300000, // 5 minutes (300 seconds) timeout
			headers: {
				'Content-Type': 'application/json'
			}
		});
		
		console.log('✅ API response received successfully');
		console.log('📊 Response status:', response.status);
		console.log('📊 Response data keys:', Object.keys(response.data));
		
		return response.data.response;
	} catch (error) {
		console.error('❌ API call failed:', error);
		
		if (axios.isAxiosError(error)) {
			if (error.code === 'ECONNREFUSED') {
				console.error('❌ Connection refused - Ollama may not be running');
				throw new Error('Ollama is not running. Please start Ollama and ensure the llava model is installed.');
			}
			if (error.code === 'ECONNABORTED') {
				console.error('❌ Request timeout - the API call took too long');
				throw new Error('Request timeout: The image processing took too long. Try with a smaller image or check if Ollama is running properly.');
			}
			console.error('❌ Axios error details:', {
				code: error.code,
				status: error.response?.status,
				statusText: error.response?.statusText,
				message: error.message
			});
			throw new Error(`Ollama API error: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Extracts and separates HTML, CSS, and JavaScript from the LLM response
 */
function extractSeparateFiles(response: string): { htmlCode: string, cssCode: string, jsCode: string } {
	console.log('🔍 Extracting separate files from LLM response...');
	
	// Try to extract separate files using the === markers
	const htmlMatch = response.match(/===HTML===\s*([\s\S]*?)(?===CSS===|===JS===|$)/i);
	const cssMatch = response.match(/===CSS===\s*([\s\S]*?)(?===HTML===|===JS===|$)/i);
	const jsMatch = response.match(/===JS===\s*([\s\S]*?)(?===HTML===|===CSS===|$)/i);
	
	console.log('📊 Extraction results:');
	console.log('   - HTML markers found:', !!htmlMatch);
	console.log('   - CSS markers found:', !!cssMatch);
	console.log('   - JS markers found:', !!jsMatch);
	
	let htmlCode = '';
	let cssCode = '';
	let jsCode = '';
	
	// Extract HTML
	if (htmlMatch && htmlMatch[1]) {
		console.log('✅ Extracting HTML from markers...');
		htmlCode = htmlMatch[1].trim();
		// Ensure HTML has proper structure
		if (!htmlCode.includes('<!DOCTYPE html>')) {
			console.log('⚠️  HTML missing DOCTYPE, adding structure...');
			htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
${htmlCode}
<script src="script.js"></script>
</body>
</html>`;
		}
	} else {
		console.log('⚠️  HTML markers not found, trying code blocks...');
		// Fallback: try to extract HTML from code blocks
		const htmlBlockMatch = response.match(/```html\s*([\s\S]*?)```/i);
		if (htmlBlockMatch) {
			console.log('✅ Extracting HTML from code blocks...');
			htmlCode = htmlBlockMatch[1].trim();
		} else {
			console.log('⚠️  No HTML found, creating basic structure...');
			// Create basic HTML structure
			htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Generated UI</h1>
        <p>UI component generated from image</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
		}
	}
	
	// Extract CSS
	if (cssMatch && cssMatch[1]) {
		console.log('✅ Extracting CSS from markers...');
		cssCode = cssMatch[1].trim();
	} else {
		console.log('⚠️  CSS markers not found, trying code blocks...');
		// Try to extract CSS from code blocks
		const cssBlockMatch = response.match(/```css\s*([\s\S]*?)```/i);
		if (cssBlockMatch) {
			console.log('✅ Extracting CSS from code blocks...');
			cssCode = cssBlockMatch[1].trim();
		} else {
			console.log('⚠️  No CSS found, creating basic styles...');
			// Create basic CSS
			cssCode = `/* Generated CSS */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

h1 {
    color: #333;
    text-align: center;
    margin-bottom: 20px;
}

p {
    color: #666;
    line-height: 1.6;
}`;
		}
	}
	
	// Extract JavaScript
	if (jsMatch && jsMatch[1]) {
		console.log('✅ Extracting JavaScript from markers...');
		jsCode = jsMatch[1].trim();
	} else {
		console.log('⚠️  JS markers not found, trying code blocks...');
		// Try to extract JS from code blocks
		const jsBlockMatch = response.match(/```javascript\s*([\s\S]*?)```/i);
		if (jsBlockMatch) {
			console.log('✅ Extracting JavaScript from code blocks...');
			jsCode = jsBlockMatch[1].trim();
		} else {
			console.log('⚠️  No JavaScript found, creating basic script...');
			// Create basic JavaScript
			jsCode = `// Generated JavaScript
console.log('UI Component loaded successfully!');

// Add any interactive functionality here
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM is ready!');
});`;
		}
	}
	
	console.log('✅ File extraction completed');
	return { htmlCode, cssCode, jsCode };
}
