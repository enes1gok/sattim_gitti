import Foundation
import Metal
import simd
import ImageIO
import UniformTypeIdentifiers

@main struct RenderMasks {
    static func main() throws {
        guard let device = MTLCreateSystemDefaultDevice() else { exit(2) }
        if CommandLine.arguments.contains("--check") { print("{\"supported\":true}"); return }
        guard CommandLine.arguments.count == 4 else { exit(2) }
        let input = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
        let masks = URL(fileURLWithPath: CommandLine.arguments[3], isDirectory: true)
        try FileManager.default.createDirectory(at: masks, withIntermediateDirectories: true)
        let files = try FileManager.default.contentsOfDirectory(at: output, includingPropertiesForKeys: nil)
        guard let obj = files.first(where: { $0.pathExtension == "obj" }) else { exit(3) }
        var vertices: [Float] = [], indices: [UInt32] = []
        for line in try String(contentsOf: obj, encoding: .utf8).split(separator: "\n") {
            let fields = line.split(whereSeparator: { $0 == " " || $0 == "\t" })
            if fields.first == "v", fields.count >= 4 { vertices += fields[1...3].compactMap { Float($0) } }
            if fields.first == "f", fields.count == 4 {
                let face = fields[1...3].compactMap { UInt32($0.split(separator: "/")[0]) }.map { $0 - 1 }
                if face.count == 3 { indices += face }
            }
        }
        guard !vertices.isEmpty, !indices.isEmpty, indices.allSatisfy({ Int($0) * 3 + 2 < vertices.count }) else { exit(3) }
        let vertexBuffer = device.makeBuffer(bytes: vertices, length: vertices.count * 4)!
        let indexBuffer = device.makeBuffer(bytes: indices, length: indices.count * 4)!
        let library = try device.makeLibrary(source: """
        #include <metal_stdlib>
        using namespace metal;
        struct Out { float4 position [[position]]; };
        vertex Out vertexMain(uint id [[vertex_id]], const device packed_float3 *v [[buffer(0)]], constant float4x4 &mvp [[buffer(1)]]) { Out out; out.position = mvp * float4(v[id],1); return out; }
        fragment float4 fragmentMain() { return float4(1); }
        """, options: nil)
        let descriptor = MTLRenderPipelineDescriptor()
        descriptor.vertexFunction = library.makeFunction(name: "vertexMain")
        descriptor.fragmentFunction = library.makeFunction(name: "fragmentMain")
        descriptor.colorAttachments[0].pixelFormat = .r8Unorm
        let pipeline = try device.makeRenderPipelineState(descriptor: descriptor)
        let queue = device.makeCommandQueue()!
        let cameras = try JSONSerialization.jsonObject(with: Data(contentsOf: output.appendingPathComponent("cameras.json"))) as! [[String: Any]]
        for camera in cameras {
            let file = camera["file"] as! String
            let source = CGImageSourceCreateWithURL(input.appendingPathComponent(file) as CFURL, nil)!
            let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as! [CFString: Any]
            let originalWidth = (properties[kCGImagePropertyPixelWidth] as! NSNumber).doubleValue
            let originalHeight = (properties[kCGImagePropertyPixelHeight] as! NSNumber).doubleValue
            let scale = min(1, 1280 / max(originalWidth, originalHeight))
            let width = max(1, Int((originalWidth * scale).rounded())), height = max(1, Int((originalHeight * scale).rounded()))
            let k = (camera["intrinsics"] as! [NSNumber]).map { $0.floatValue }
            let t = (camera["position"] as! [NSNumber]).map { $0.floatValue }
            let q = (camera["rotation"] as! [NSNumber]).map { $0.floatValue }
            var transform = simd_float4x4(simd_quatf(vector: SIMD4(q[0], q[1], q[2], q[3])))
            transform.columns.3 = SIMD4(t[0],t[1],t[2],1)
            let w = Float(originalWidth), h = Float(originalHeight), near: Float = 0.01, far: Float = 100
            let projection = simd_float4x4(columns: (SIMD4(2*k[0]/w,0,0,0), SIMD4(0,2*k[1]/h,0,0), SIMD4(1-2*k[2]/w,2*k[3]/h-1,far/(near-far),-1), SIMD4(0,0,near*far/(near-far),0)))
            var mvp = projection * transform.inverse
            let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .r8Unorm, width: width, height: height, mipmapped: false)
            textureDescriptor.usage = [.renderTarget]; textureDescriptor.storageMode = .shared
            let texture = device.makeTexture(descriptor: textureDescriptor)!
            let pass = MTLRenderPassDescriptor(); pass.colorAttachments[0].texture = texture; pass.colorAttachments[0].loadAction = .clear; pass.colorAttachments[0].storeAction = .store; pass.colorAttachments[0].clearColor = MTLClearColorMake(0,0,0,0)
            let command = queue.makeCommandBuffer()!, encoder = command.makeRenderCommandEncoder(descriptor: pass)!
            encoder.setRenderPipelineState(pipeline); encoder.setCullMode(.none); encoder.setVertexBuffer(vertexBuffer, offset: 0, index: 0); encoder.setVertexBytes(&mvp, length: MemoryLayout<simd_float4x4>.size, index: 1)
            encoder.drawIndexedPrimitives(type: .triangle, indexCount: indices.count, indexType: .uint32, indexBuffer: indexBuffer, indexBufferOffset: 0)
            encoder.endEncoding(); command.commit(); command.waitUntilCompleted()
            if command.status == .error { throw command.error! }
            var pixels = [UInt8](repeating: 0, count: width * height)
            texture.getBytes(&pixels, bytesPerRow: width, from: MTLRegionMake2D(0,0,width,height), mipmapLevel: 0)
            let provider = CGDataProvider(data: Data(pixels) as CFData)!
            let image = CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: width, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue), provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
            let destination = CGImageDestinationCreateWithURL(masks.appendingPathComponent(file + ".png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
            CGImageDestinationAddImage(destination, image, nil)
            guard CGImageDestinationFinalize(destination) else { exit(4) }
        }
        print("{\"masks\":\(cameras.count)}")
    }
}
