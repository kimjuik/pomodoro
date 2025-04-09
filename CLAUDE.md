# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm start` - Start the app in development mode
- `npm run pack` - Package the app without creating installers
- `npm run dist` - Build and package the app for distribution
- `npm run postinstall` - Install app dependencies after npm install

## Code Style Guidelines
- **Imports**: Node.js modules first, then Electron imports
- **Variables**: Use `const` for constants, `let` for variables that change
- **Functions**: Function declarations for main functions, arrow functions for callbacks
- **Indentation**: 2 spaces
- **Naming**: camelCase for variables and functions, descriptive names
- **Error Handling**: Use try/catch blocks with console.error and fallbacks
- **DOM Manipulation**: Get elements at start of scripts, descriptive variable names
- **Event Handling**: Attach listeners in initialization functions
- **Comments**: Use for explaining complex logic or non-obvious behavior
- **Storage**: Use localStorage with JSON.stringify/parse and error handling
- **IPC Communication**: Use descriptive event names for main/renderer process communication

## Project Architecture
- **main.js**: Main process handling app lifecycle, windows, and system tray
- **renderer.js**: Renderer process with timer logic and UI interactions
- **settings.js**: Manages user preferences and system integration