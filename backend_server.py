#!/usr/bin/env python3
"""
============================================================================
DESIGN STUDIO • ZERO-DEPENDENCY PYTHON BACKEND SERVER
Standard Library Python (http.server + json + static files + REST APIs)
============================================================================
"""

import os
import json
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', 3000))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
UPLOADS_DIR = os.path.join(ROOT_DIR, 'uploads')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def read_json(filename, default_val=None):
    if default_val is None:
        default_val = {}
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(default_val, f, indent=2)
        return default_val
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default_val

def write_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False

class LuxuryAPIRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Health
        if path == '/api/health':
            events = read_json('events.json', {})
            return self._send_json({
                'status': 'online',
                'server': 'Python Standalone Server',
                'activeEventsCount': len(events)
            })

        # List all events
        if path == '/api/events':
            events = read_json('events.json', {})
            slugs = list(events.keys())
            if 'master_default' not in slugs:
                slugs.insert(0, 'master_default')
            if 'victoria-25' not in slugs:
                slugs.append('victoria-25')
            return self._send_json({'success': True, 'slugs': slugs, 'events': events})

        # Single event config: /api/events/:slug
        if path.startswith('/api/events/') and not path.endswith('/guests') and not path.endswith('/toasts'):
            slug = path.replace('/api/events/', '').strip('/')
            events = read_json('events.json', {})
            return self._send_json({'success': True, 'slug': slug, 'config': events.get(slug)})

        # Guests list: /api/events/:slug/guests
        if path.startswith('/api/events/') and path.endswith('/guests'):
            parts = path.split('/')
            slug = parts[3] if len(parts) > 3 else 'master_default'
            all_guests = read_json('guests.json', {})
            list_guests = all_guests.get(slug, [])
            return self._send_json({'success': True, 'slug': slug, 'count': len(list_guests), 'guests': list_guests})

        # Toasts list: /api/events/:slug/toasts
        if path.startswith('/api/events/') and path.endswith('/toasts'):
            parts = path.split('/')
            slug = parts[3] if len(parts) > 3 else 'master_default'
            all_toasts = read_json('toasts.json', {})
            data = all_toasts.get(slug, {'clinkCount': 384, 'list': []})
            return self._send_json({'success': True, 'slug': slug, 'clinkCount': data.get('clinkCount', 384), 'toasts': data.get('list', [])})

        # Pass lookup
        if '/pass/' in path:
            parts = path.split('/pass/')
            pass_id = parts[1].strip('/') if len(parts) > 1 else ''
            all_guests = read_json('guests.json', {})
            for slug, glist in all_guests.items():
                for g in glist:
                    if g.get('passId', '').upper() == pass_id.upper():
                        events = read_json('events.json', {})
                        return self._send_json({'success': True, 'guest': g, 'config': events.get(slug, {})})
            return self._send_json({'success': False, 'message': 'Pass not found'}, 404)

        # Fallback to static file serving
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Read JSON body
        content_length = int(self.headers.get('Content-Length', 0))
        body = {}
        if content_length > 0:
            try:
                raw_data = self.rfile.read(content_length).decode('utf-8')
                body = json.loads(raw_data)
            except Exception:
                body = {}

        # Save event config: /api/events/:slug
        if path.startswith('/api/events/') and not path.endswith('/guests') and not path.endswith('/toasts') and not path.endswith('/clink'):
            slug = path.replace('/api/events/', '').strip('/')
            events = read_json('events.json', {})
            body['slug'] = slug
            events[slug] = body
            write_json('events.json', events)
            return self._send_json({'success': True, 'slug': slug, 'message': 'Saved successfully'})

        # Add RSVP Guest: /api/events/:slug/guests
        if path.startswith('/api/events/') and path.endswith('/guests'):
            parts = path.split('/')
            slug = parts[3] if len(parts) > 3 else 'master_default'
            all_guests = read_json('guests.json', {})
            if slug not in all_guests:
                all_guests[slug] = []
            
            mono = (body.get('monogramPrefix') or 'VIP')[:3].upper()
            pass_id = body.get('passId') or f"{mono}-{os.urandom(2).hex().upper()}-VIP"
            body['passId'] = pass_id

            all_guests[slug].insert(0, body)
            write_json('guests.json', all_guests)
            return self._send_json({'success': True, 'slug': slug, 'passId': pass_id, 'guest': body})

        # Add Toast: /api/events/:slug/toasts
        if path.startswith('/api/events/') and path.endswith('/toasts'):
            parts = path.split('/')
            slug = parts[3] if len(parts) > 3 else 'master_default'
            all_toasts = read_json('toasts.json', {})
            if slug not in all_toasts:
                all_toasts[slug] = {'clinkCount': 384, 'list': []}

            new_toast = {
                'id': str(int(os.times()[4] * 1000)),
                'author': body.get('author', 'Guest'),
                'message': body.get('message', ''),
                'timestamp': 'Just now'
            }
            all_toasts[slug]['list'].insert(0, new_toast)
            all_toasts[slug]['clinkCount'] = all_toasts[slug].get('clinkCount', 0) + 1
            write_json('toasts.json', all_toasts)
            return self._send_json({'success': True, 'toast': new_toast, 'clinkCount': all_toasts[slug]['clinkCount']})

        # Clink counter: /api/events/:slug/clink
        if path.startswith('/api/events/') and path.endswith('/clink'):
            parts = path.split('/')
            slug = parts[3] if len(parts) > 3 else 'master_default'
            all_toasts = read_json('toasts.json', {})
            if slug not in all_toasts:
                all_toasts[slug] = {'clinkCount': 384, 'list': []}
            all_toasts[slug]['clinkCount'] = all_toasts[slug].get('clinkCount', 0) + 1
            write_json('toasts.json', all_toasts)
            return self._send_json({'success': True, 'clinkCount': all_toasts[slug]['clinkCount']})

        # Email dispatch simulation
        if path == '/api/dispatch-invite':
            return self._send_json({
                'success': True,
                'message': f"Invitation dispatched to {body.get('email')}",
                'previewUrl': body.get('directLink', 'http://localhost:3000/')
            })

        # Default fallback
        return self._send_json({'success': True})

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), LuxuryAPIRequestHandler)
    print(f"""
  👑 ==========================================================
  ✨ DESIGN STUDIO • PYTHON BACKEND RUNNING
  🌐 Local URL:       http://localhost:{PORT}
  👑 Admin Studio:    http://localhost:{PORT}/admin.html
  📁 Data Directory:  {DATA_DIR}
  ==========================================================
    """)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
