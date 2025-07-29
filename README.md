# UI to Code Generator

A VS Code extension that generates front-end code from UI screenshots using local LLM inference with Ollama.

## Features

- **Image-to-Code Generation**: Convert UI screenshots to HTML/CSS/JS code
- **Separate File Output**: Generates organized HTML, CSS, and JavaScript files
- **File Picker Integration**: Select any image from your PC
- **Local Processing**: Uses Ollama with llava model for offline processing
- **VS Code Integration**: Seamless integration with VS Code editor
- **Progress Tracking**: Real-time progress updates during generation
- **Detailed Logging**: Comprehensive console logging for debugging
- **Extended Timeout**: 5-minute timeout for complex image processing

## Prerequisites

### 1. Install Ollama

First, install Ollama on your system:

**macOS:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [https://ollama.ai/download](https://ollama.ai/download)

### 2. Install llava Model

After installing Ollama, pull the llava model:

```bash
ollama pull llava
```

### 3. Start Ollama Service

Start the Ollama service:

```bash
ollama serve
```

## Installation

1. Clone or download this extension
2. Open the extension folder in VS Code
3. Install dependencies:
   ```bash
   npm install
   ```
4. Compile the extension:
   ```bash
   npm run compile
   ```
5. Press `F5` to run the extension in a new VS Code window

## Usage

1. **Run the Extension**: 
   - Open Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
   - Type "Generate UI from Image"
   - Select the command
2. **Select Image**: Choose any UI screenshot from your computer
3. **Enter Folder Name**: Specify where to save the generated code
4. **Wait for Processing**: The extension will:
   - Load and process the image
   - Generate HTML, CSS, and JavaScript code
   - Create separate files in your specified folder
   - Open the result in a new editor tab

## How It Works

1. **Image Selection**: File picker allows selection of any image file
2. **Image Processing**: Converts the image to base64 and sends it to Ollama's llava model
3. **Code Generation**: The LLM analyzes the UI and generates separate HTML, CSS, and JavaScript files
4. **File Organization**: Creates a professional project structure with separate files
5. **Display**: Opens the generated HTML code in a new VS Code editor tab

## Output Structure

The extension generates a complete project structure:

```
your-folder-name/
├── index.html      # Main HTML structure
├── styles.css      # All CSS styling
└── script.js       # JavaScript functionality
```

## Configuration

### Supported Image Formats
- PNG, JPG, JPEG, GIF, BMP, WebP
- Recommended size: Under 5MB for optimal performance

### Ollama Configuration
- Default endpoint: `http://localhost:11434`
- Model: `llava`
- Timeout: 5 minutes (300 seconds) for complex processing

### Performance Considerations
- **Processing Time**: 2-5 minutes for complex UI images
- **Memory Usage**: llava requires ~8GB RAM
- **Image Size**: Keep images under 5MB for best results
- **GPU Acceleration**: Recommended for faster processing

## Troubleshooting

### Common Issues

1. **"Ollama is not running"**
   - Make sure Ollama is installed and running
   - Run `ollama serve` in terminal
   - Check if port 11434 is available

2. **"llava model not found"**
   - Install the model: `ollama pull llava`
   - Verify installation: `ollama list`

3. **"Request timeout"**
   - The 5-minute timeout should handle most images
   - Try with a smaller image if timeout persists
   - Check if Ollama is running properly

4. **"No files generated"**
   - Check the console logs for detailed error information
   - Ensure you have write permissions in the target directory
   - Verify the folder name doesn't contain invalid characters

### Debugging

The extension provides detailed console logging:

- **Step-by-step progress**: Each stage of processing is logged
- **File sizes**: Image and response sizes are tracked
- **API details**: Request and response information
- **Error details**: Comprehensive error reporting
- **Extraction results**: Shows what code was successfully extracted

### Performance Tips

- Use a machine with GPU acceleration for faster processing
- Keep image sizes reasonable (under 5MB)
- Close other resource-intensive applications during processing
- First run may be slower due to model loading

## Development

### Project Structure
```
ui-to-code/
├── src/
│   └── extension.ts          # Main extension logic
├── out/
│   └── extension.js          # Compiled extension
├── package.json              # Extension manifest
└── README.md                # This file
```

### Building
```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch for changes
```

### Testing
```bash
npm test          # Run tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Ollama](https://ollama.ai/) for local LLM inference
- [llava](https://github.com/haotian-liu/LLaVA) for multimodal capabilities
- VS Code Extension API for the development framework
