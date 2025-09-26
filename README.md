# Stream Deck Form Builder

A Stream Deck plugin that allows you to create custom forms and make HTTP API calls with configurable endpoints and output handling.

## Features

- **Form Builder**: Create custom forms with various field types (text, email, password, number, textarea, select, checkbox, date, URL)
- **HTTP API Integration**: Make requests to any HTTP API with configurable methods (GET, POST, PUT, PATCH, DELETE)
- **Flexible Field Configuration**: Each field can be sent as either query parameters or in the request body (JSON)
- **Custom Headers**: Add any number of key/value headers to every request
- **Authentication**:
  - None
  - OAuth2/OpenID Authorization Code with a built‑in local callback server (opens your default browser)
  - OAuth2 Client Credentials (Basic or Body auth)
  - Optional offline_access support; if a refresh_token is available, access tokens are refreshed automatically
- **Output Handling**: Choose between status messages or modal display of API responses
- **JSON Viewer**: When modal output is selected and the response is JSON, results are rendered with `react18-json-view` (copy supported)
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

#### Quick build (preferred)
This project is typically built inside Docker (even on WSL/Linux) so you can get a Windows portable executable reliably.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build everything (web + Electron via Docker/Wine):
   ```bash
   npm run build-electron-docker
   ```
3. Package the plugin:
   ```bash
   npm run package
   ```
4. The packaged plugin will be in `release/`.
- For stream dock, you have to unzip the package.

#### Option 1: Build on Windows
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

4. Build the Electron executable (or use Docker flow above):
   ```cmd
   npm run build-electron
   ```

5. Package the plugin:
   ```cmd
   npm run package
   ```

6. The packaged plugin will be available in the `release/` directory as `com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin`
- For stream dock, you have to unzip the package.


### Installing the Plugin

1. Open the Stream Deck / Ajazz Stream Dock software
2. Go to the Stream Deck Store / Settings
3. Click on the gear icon in the top right corner
4. Select "Open Plugin Folder"
5. - For Stream deck: Copy the packaged plugin file to the plugins directory
   - For Ajazz Stream Dock: Unzip the package plugin to the plugins directory
6. Restart the Stream Deck software / Ajazz Stream Dock

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

This method uses the official `electronuserland/builder:wine` Docker image which provides a clean Wine environment for cross-compilation without requiring Wine to be installed on your system.

### Configuration

1. **Add the Form Builder action** to your Stream Deck
2. **Right-click the button** and select "Open Setup"
3. **Configure your form** using the step-by-step wizard:
   - **Basic Info**: Set form title, API URL, and HTTP method
   - **Form Fields**: Add and configure input fields
   - **Output Settings**: Choose how to display API responses
   - **Headers**: Add custom headers to be sent with each request
   - **Authentication**: None, OAuth2 Authorization Code (with local callback server + default browser), or Client Credentials
     - Start/Stop the local callback server from the Setup page
     - Redirect URL is generated for you and can be copied from the UI
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
   - If modal output and the response is JSON, it will be rendered using `react18-json-view`

### Auth Flow Overview (Authorization Code)
1. In Setup → Auth, select OAuth 2.0 / OpenID - Authorization Code
2. Click “Start callback server” to spin up the localhost redirect
3. Click “Login with provider” to open your default browser
4. After the provider redirects back, the code is captured and the UI updates
5. If `offline_access` is granted and saved, tokens will refresh automatically when needed

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

- `npm run build-electron-docker` - Build Electron (Windows target) in Docker + Wine

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

## Notes

- This app implements the Stream Deck plugin communication per Elgato’s  specifications, but at the moment it has been tested only on Windows.
- Hardware tested: Ajazz Stream Dock. Other Stream Deck–compatible devices should work, but haven’t been validated yet.