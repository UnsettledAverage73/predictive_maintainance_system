import qrcode

# Define the link you want to convert into a QR code
link = "https://forms.gle/8x8PJqZmpCJsDMAB7"

# Generate the QR code
qr_image = qrcode.make(link)

# Save the QR code as a PNG image file
qr_image.save("website_qr.png")

print("QR Code generated successfully!")

