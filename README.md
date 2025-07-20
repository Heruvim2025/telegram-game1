# Telegram 3D Game Demo

A simple 3D game built for the Telegram Game Platform using Three.js. The game features a controllable cube that players can move using arrow keys.

## Features
- 3D graphics using Three.js
- Keyboard controls
- Score tracking
- Telegram Game Platform integration

## Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (usually http://localhost:5173)

## Game Controls
- Use arrow keys to move the cube
- Score increases automatically over time
- The game automatically reports scores to Telegram when played within the platform

## Telegram Integration
To test the game in Telegram:
1. Host the built version of the game on a secure (HTTPS) server
2. Create a game in Telegram using @BotFather
3. Set the game's URL to your hosted version

## Building for Production
```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.
