# Stream Deck Form Builder

A Stream Deck plugin that allows you to create custom forms and make HTTP API calls with configurable endpoints and output handling.

## Features

- **Form Builder**: Create custom forms with various field types (text, email, password, number, textarea, select, checkbox, date, URL)
- **HTTP API Integration**: Make requests to any HTTP API with configurable methods (GET, POST, PUT, PATCH, DELETE)
- **Flexible Field Configuration**: Each field can be sent as either query parameters or in the request body (JSON)
- **Output Handling**: Choose between status messages or modal display of API responses
- **Electron-based Runtime**: Native desktop application for reliable form display and API communication
- **WebSocket Communication**: Direct communication with Stream Deck software using the official SDK protocol
- **React-based Setup**: Modern, intuitive setup interface built with React and Tailwind CSS
- **Cross-platform**: Supports Windows and macOS

## Installation

### Prerequisites

- Stream Deck software (minimum version 4.1)
- Node.js (version 16 or higher)
- npm or yarn
- Electron (automatically installed via npm)

### Building the Plugin

#### Option 1: Build on Windows (Recommended)
1. Clone this repository on Windows:
   ```cmd
   git clone https://github.com/leandro-menezes/stream-deck-form-builder.git
   cd stream-deck-form-builder
   ```

2. Install dependencies:
   ```cmd
   npm install
   ```

3. Build the web components:
   ```cmd
   npm run build
   ```

4. Build the Electron executable:
   ```cmd
   npm run build-electron
   ```

5. Package the plugin:
   ```cmd
   npm run package
   ```

6. The packaged plugin will be available in the `release/` directory as `com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin`

#### Option 2: Build on Linux/WSL with Docker (Recommended)
1. Install Docker:
   ```bash
   # Install Docker on Ubuntu/WSL
   sudo apt update
   sudo apt install docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   # Logout and login again, or run: newgrp docker
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/leandro-menezes/stream-deck-form-builder.git
   cd stream-deck-form-builder
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the web components:
   ```bash
   npm run build
   ```

5. Build the Electron app using Docker + Wine:
   ```bash
   npm run build-electron-docker
   # Or run the script directly: ./build-docker.sh
   ```

6. Package the plugin:
   ```bash
   npm run package
   ```

7. The packaged plugin will be available in the `release/` directory

#### Option 3: Build on Linux/WSL with Wine (Alternative)
1. Install Wine: `sudo apt install wine`

2. Follow the same steps as Option 2, but use:
   ```bash
   npm run build-electron
   ```
   instead of the Docker command.

### Installing the Plugin

1. Open the Stream Deck software
2. Go to the Stream Deck Store
3. Click on the gear icon in the top right corner
4. Select "Open Plugin Folder"
5. Copy the packaged plugin file to the plugins directory
6. Restart the Stream Deck software

## Architecture

The Stream Deck Form Builder consists of several components:

- **Electron App** (`FormBuilder.exe`): The main executable that handles Stream Deck communication via WebSocket
- **Web Setup Interface**: React-based configuration wizard for setting up forms
- **Form Modal**: Electron window that displays the form and handles submissions
- **Stream Deck Integration**: WebSocket communication using the official Stream Deck SDK protocol

## Current Status

✅ **Plugin successfully built and packaged!**

The plugin package (`com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin`) includes:
- ✅ **Windows Electron executable** (169MB) - portable, no installation required
- ✅ **All web components** (React setup, form modal, property inspector)
- ✅ **Stream Deck SDK integration** with WebSocket communication
- ✅ **Complete configuration system** with step-by-step wizard
- ✅ **HTTP API handling** with flexible parameter support (query params + JSON body)
- ✅ **Proper icon** (32x32 PNG format)
- ✅ **Cross-platform build support** (Docker + Wine)

## Docker Build Support

🐳 **Docker + Wine Cross-Compilation**: For building Windows executables from Linux/WSL, use the Docker approach:
```bash
npm run build-electron-docker
```

This method uses the official `electronuserland/builder` Docker image which provides a clean Wine environment for cross-compilation without requiring Wine to be installed on your system.

### Testing Docker Setup
```bash
npm run test-docker
```

This will verify that Docker is properly installed and configured for the build process.

## Final Package Contents

The complete Stream Deck plugin includes:
- `FormBuilder.exe` - Main Electron application (169MB)
- `manifest.json` - Plugin configuration
- `app.html` - Entry point for Stream Deck
- `form.html` - Form display interface
- `setup.html` - Configuration wizard
- `pi.html` - Property inspector
- All React components and assets
- CSS styling and icons

## Installation

1. Copy `com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin` to your Stream Deck plugins folder
2. Restart Stream Deck software
3. Add the "Form Builder" action to your Stream Deck
4. Right-click the button and select "Open Setup" to configure your form
5. Press the button to display and submit forms

## Architecture Summary

The plugin uses a **hybrid architecture**:
- **Electron app** handles Stream Deck communication via WebSocket
- **Web-based setup** provides intuitive configuration
- **Native form modal** ensures reliable form display
- **HTTP client** handles API requests with flexible parameter mapping
- **Cross-platform build system** supports Windows, macOS, and Linux development

### Configuration

1. **Add the Form Builder action** to your Stream Deck
2. **Right-click the button** and select "Open Setup"
3. **Configure your form** using the step-by-step wizard:
   - **Basic Info**: Set form title, API URL, and HTTP method
   - **Form Fields**: Add and configure input fields
   - **Output Settings**: Choose how to display API responses
   - **Review**: Verify your configuration

### Field Configuration

For each field, you can configure:
- **Name**: Internal identifier (used in API requests)
- **Label**: Display name for users
- **Description**: Help text shown to users
- **Type**: Input type (text, email, password, etc.)
- **Required**: Whether the field must be filled
- **Send As**: Query parameter or request body
- **Options**: For select fields, define available options

### Runtime Usage

1. **Press the Stream Deck button** to open the form modal
2. **Fill out the form** with your data
3. **Submit** to make the API call
4. **View the response** based on your output configuration

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── App.jsx         # Main application
│   ├── Setup.jsx       # Configuration wizard
│   ├── FormBuilder.jsx # Field configuration
│   ├── FormModal.jsx   # Form display modal
│   └── PropertyInspector.jsx # Stream Deck PI
├── js/                 # JavaScript entry points
├── css/                # Stylesheets
├── assets/             # Icons and images
└── manifest.json       # Plugin manifest
```

### Available Scripts

- `npm run dev` - Development build with watching
- `npm run build` - Production build
- `npm run preview` - Preview the built plugin
- `npm run package` - Package the plugin for distribution

### Customization

The plugin is built with modern web technologies and can be easily customized:

- **Styling**: Modify Tailwind CSS classes or add custom CSS
- **Components**: Extend or modify React components
- **Functionality**: Add new field types or HTTP methods
- **Integration**: Connect to different APIs or services

## API Integration Examples

### POST Request with JSON Body
```
URL: https://api.example.com/users
Method: POST
Fields:
- name: "username" (body)
- name: "email" (body)
- name: "api_key" (query)
```

### GET Request with Query Parameters
```
URL: https://api.example.com/search
Method: GET
Fields:
- name: "query" (query)
- name: "limit" (query)
- name: "offset" (query)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the example configurations

## Changelog

### Version 1.0.0
- Initial release
- Form builder with multiple field types
- HTTP API integration
- React-based setup interface
- Cross-platform support