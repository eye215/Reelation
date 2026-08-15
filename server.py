from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path != "/" and not Path(path.lstrip("/")).is_file():
            self.path = "/index.html"
        super().do_GET()


if __name__ == "__main__":
    print("Reelation is running at http://localhost:4173/board")
    ThreadingHTTPServer(("127.0.0.1", 4173), SpaHandler).serve_forever()
