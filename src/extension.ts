import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "ui-to-code" is now active!');
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
				
				if (!fs.existsSync(selectedImagePath)) {
					throw new Error('Selected image not found.');
				}
				
				const imageStats = fs.statSync(selectedImagePath);
				console.log(`📊 Image file size: ${(imageStats.size / 1024).toFixed(2)} KB`);
				
				progress.report({ increment: 10, message: "Converting image to base64..." });
				console.log('🔄 Step 2/5: Converting image to base64...');
				
				const imageBuffer = fs.readFileSync(selectedImagePath);
				const base64Image = imageBuffer.toString('base64');
				console.log(`📊 Base64 image size: ${(base64Image.length / 1024).toFixed(2)} KB`);
				
				progress.report({ increment: 20, message: "Preparing prompt for LLM..." });
				console.log('🔄 Step 3/5: Preparing prompt for LLM...');

				const prompt = `You are a professional front‑end engineer. Analyze this UI screenshot and generate a complete HTML file with inline CSS and JavaScript.

				CRITICAL: Return ONLY the HTML file content with inline CSS and Javascript in script tag. Do NOT include any explanations, instructions, or markdown formatting.

				Requirements:
				- Create a complete HTML file with <!DOCTYPE html>
				- Important to Include inline CSS in <style> tag in <head>
				- Include inline JavaScript in <script> tag before </body>
				- Match the screenshot's layout, colors, fonts, and spacing
				- Use semantic HTML tags and meaningful class names
				- Include responsive design with media queries
				- Add hover effects and smooth transitions
				- Handle form interactions and animations
				- Make it production-ready and browser-compatible

				Start your response with <!DOCTYPE html> and end with </html>. Include nothing else.`;


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
				
				// Extract the generated HTML code
				const htmlCode = extractSingleHTMLFile(ollamaResponse);
				console.log(`📊 Extracted HTML file size: ${htmlCode.length} characters`);
				
				progress.report({ increment: 80, message: "Creating output folder..." });
				console.log('📁 Creating output directory...');
				
				// Create output directory if it doesn't exist
				if (!fs.existsSync(outputDir)) {
					fs.mkdirSync(outputDir, { recursive: true });
					console.log('✅ Output directory created');
				} else {
					console.log('✅ Output directory already exists');
				}
				
				// Generate file name
				const htmlFileName = 'index.html';
				const htmlFilePath = path.join(outputDir, htmlFileName);
				
				progress.report({ increment: 90, message: "Saving file..." });
				console.log('💾 Saving HTML file...');
				
				// Save the single HTML file
				fs.writeFileSync(htmlFilePath, htmlCode);
				
				console.log('✅ File saved successfully:');
				console.log('   - HTML:', htmlFilePath);
				
				progress.report({ increment: 95, message: "Opening editor..." });
				console.log('📝 Opening generated code in editor...');
				
				// Open the file we have already stored
				const document = await vscode.workspace.openTextDocument(htmlFilePath);
				await vscode.window.showTextDocument(document);
				
				progress.report({ increment: 100, message: "Complete!" });
				console.log('🎉 UI code generation completed successfully!');
			});
			
			// Show success message with file location
			vscode.window.showInformationMessage(`UI code generated successfully! HTML file saved to: ${outputDir}`);
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
			// model: 'llava-llama3:8b',
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
 * Extracts a single HTML file from the LLM response
 */
function extractSingleHTMLFile(response: string): string {
	console.log('🔍 Extracting single HTML file from LLM response...');
	
	let htmlCode = '';
	
	// Try to extract HTML from code blocks first
	const htmlBlockMatch = response.match(/```html\s*([\s\S]*?)```/i);
	if (htmlBlockMatch) {
		console.log('✅ Extracting HTML from code blocks...');
		htmlCode = htmlBlockMatch[1].trim();
	} else {
		console.log('⚠️  HTML code blocks not found, looking for raw HTML...');
		
		// Try to find HTML content without markdown
		const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i);
		if (htmlMatch) {
			console.log('✅ Found complete HTML document...');
			htmlCode = htmlMatch[0].trim();
		} else {
			console.log('⚠️  No complete HTML found, creating basic structure...');
			// Create basic HTML structure with inline styles
			htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <style>
        /* Generated CSS */
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
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Generated UI</h1>
        <p>UI component generated from image</p>
    </div>
    <script>
        // Generated JavaScript
        console.log('UI Component loaded successfully!');
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM is ready!');
        });
    </script>
</body>
</html>`;
		}
	}
	
	// Clean up any markdown artifacts and prompt contamination
	htmlCode = htmlCode.replace(/^\s*```(?:html)?\s*\n?/i, '');
	htmlCode = htmlCode.replace(/\n?\s*```\s*$/i, '');
	
	// Remove any prompt instructions that might have leaked into the code
	htmlCode = htmlCode.replace(/\/\*\s*(?:CRITICAL|Requirements|Steps|Format|Return).*?\*\//gis, '');
	htmlCode = htmlCode.replace(/\/\/\s*(?:CRITICAL|Requirements|Steps|Format|Return).*$/gim, '');
	htmlCode = htmlCode.replace(/<!--\s*(?:CRITICAL|Requirements|Steps|Format|Return).*?-->/gis, '');
	
	// Remove any text that looks like prompt instructions
	htmlCode = htmlCode.replace(/You are a professional.*?Include nothing else\./gis, '');
	htmlCode = htmlCode.replace(/Analyze this UI screenshot.*?Include nothing else\./gis, '');
	
	// Clean up extra whitespace and ensure proper HTML structure
	htmlCode = htmlCode.trim();
	
	// Ensure we have a complete HTML document
	if (!htmlCode.includes('<!DOCTYPE html>')) {
		console.log('⚠️  Adding DOCTYPE declaration...');
		htmlCode = '<!DOCTYPE html>\n' + htmlCode;
	}
	
	console.log('✅ HTML file extraction completed');
	console.log(`📊 Final HTML size: ${htmlCode.length} characters`);
	
	return htmlCode;
}
