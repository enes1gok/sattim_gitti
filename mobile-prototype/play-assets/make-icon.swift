import AppKit

func drawIcon(_ path: String, _ size: Int, foreground: Bool = false) throws {
    let side = CGFloat(size)
    let image = NSImage(size: NSSize(width: side, height: side))
    image.lockFocus()
    if !foreground {
        NSColor.black.setFill()
        NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: side, height: side), xRadius: side * 0.2, yRadius: side * 0.2).fill()
    }
    let font = NSFont.systemFont(ofSize: side * (foreground ? 0.28 : 0.40), weight: .bold)
    let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
    let text = "SG" as NSString
    let dimensions = text.size(withAttributes: attributes)
    text.draw(at: NSPoint(x: (side - dimensions.width) / 2, y: (side - dimensions.height) / 2), withAttributes: attributes)
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

try drawIcon("play-assets/app-icon.png", 512)
for (density, size) in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)] {
    let directory = "android/app/src/main/res/mipmap-\(density)"
    try drawIcon("\(directory)/ic_launcher.png", size)
    try drawIcon("\(directory)/ic_launcher_round.png", size)
    try drawIcon("\(directory)/ic_launcher_foreground.png", size * 108 / 48, foreground: true)
}
