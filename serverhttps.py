from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl


httpd = HTTPServer(('localhost', 20443), SimpleHTTPRequestHandler)

httpd.socket = ssl.wrap_socket (httpd.socket, 
        keyfile="/home/joao/Venus/Pesquisa/Projetor Estelar JS + ESP32/StarProjector/test.key.pem", 
        certfile='/home/joao/Venus/Pesquisa/Projetor Estelar JS + ESP32/StarProjector/test.cert.pem', server_side=True)

httpd.serve_forever()
