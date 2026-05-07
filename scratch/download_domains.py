import urllib.request
import csv
import io

url = "https://downloads.majestic.com/majestic_million.csv"
output_file = "c:/Users/Mukesh_Maruthi/ConsentFair/GDRP/scratch/real_domains.csv"

print(f"Downloading top domains from {url}...")

try:
    response = urllib.request.urlopen(url)
    # Read line by line until we have 6000 domains
    count = 0
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in response:
            f.write(line.decode('utf-8'))
            count += 1
            if count >= 6000:
                break
    print(f"Successfully saved {count} real domains to {output_file}")
except Exception as e:
    print(f"Error: {e}")
