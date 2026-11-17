import AppKit

let size = NSSize(width: 1024, height: 500)
let image = NSImage(size: size)
image.lockFocus()
NSColor.white.setFill()
NSRect(origin: .zero, size: size).fill()
NSColor(calibratedWhite: 0.95, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 700, y: 65, width: 250, height: 370), xRadius: 34, yRadius: 34).fill()
let title: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 70, weight: .bold), .foregroundColor: NSColor.black]
let subtitle: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 30, weight: .medium), .foregroundColor: NSColor.darkGray]
"Sattım Gitti".draw(at: NSPoint(x: 70, y: 280), withAttributes: title)
"Araç keşfi, tek yerde.".draw(at: NSPoint(x: 74, y: 215), withAttributes: subtitle)
let badge = NSImage(contentsOfFile: "play-assets/app-icon.png")!
badge.draw(in: NSRect(x: 745, y: 172, width: 160, height: 160))
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "play-assets/feature-graphic.png"))
