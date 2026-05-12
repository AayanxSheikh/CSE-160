@echo off
echo Starting local HTTP server for asgn3...
echo Open your browser to: http://localhost:8080
echo Press Ctrl+C to stop.
cd /d "%~dp0"
python -m http.server 8080
