import http.server
import ssl

server = http.server.ThreadingHTTPServer(('127.0.0.1', 4173), http.server.SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('/tmp/icaew-test-cert.pem', '/tmp/icaew-test-key.pem')
server.socket = context.wrap_socket(server.socket, server_side=True)
server.serve_forever()
