#!/usr/bin/env python3
"""
Simple test script to verify the ShoppingList application is working locally.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 8000
DOCS_DIR = "docs"

def start_server():
    """Start the HTTP server in the docs directory."""
    os.chdir(DOCS_DIR)
    Handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"✅ Server started at http://localhost:{PORT}")
        print(f"📁 Serving files from: {os.getcwd()}")
        print("🔄 Press Ctrl+C to stop the server")
        httpd.serve_forever()

def test_urls():
    """Test all application URLs."""
    base_url = f"http://localhost:{PORT}"
    test_urls = [
        "",  # Main page
        "/index.html",
        "/additemtodatabase.html", 
        "/markitemtobuy.html"
    ]
    
    print("🧪 Testing URLs:")
    for url in test_urls:
        full_url = f"{base_url}{url}"
        print(f"   📄 {full_url}")
    
    # Open browser after a short delay
    time.sleep(2)
    webbrowser.open(base_url)

if __name__ == "__main__":
    if not os.path.exists(DOCS_DIR):
        print(f"❌ Error: {DOCS_DIR} directory not found!")
        print("Please run this script from the ShoppingList-NoBackend root directory.")
        sys.exit(1)
    
    print("🚀 Starting ShoppingList Local Test Server...")
    
    # Start URL testing in a separate thread
    test_thread = threading.Thread(target=test_urls)
    test_thread.daemon = True
    test_thread.start()
    
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
