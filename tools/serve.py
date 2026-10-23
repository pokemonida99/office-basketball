# 開發用伺服器：每個檔案都不快取，改完 js 重新整理就是新版（python3 -m http.server 會被瀏覽器快取舊模組）
import http.server, sys, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
os.chdir(sys.argv[2] if len(sys.argv) > 2 else '.')
http.server.ThreadingHTTPServer(('', int(sys.argv[1])), H).serve_forever()
