import urllib.request
import re

req = urllib.request.Request('https://jcanabal.itch.io/spanish-deck-pixel-art', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')
imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
for img in imgs:
    print(img)
