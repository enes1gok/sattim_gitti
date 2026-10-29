import Foundation
import RealityKit

func emit(_ value: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: value), let line = String(data: data, encoding: .utf8) {
        print(line)
        fflush(stdout)
    }
}

@main struct Reconstruct {
    static func main() async {
        guard PhotogrammetrySession.isSupported else {
            emit(["error": "Bu Mac Object Capture desteklemiyor."])
            exit(2)
        }
        if CommandLine.arguments.contains("--check") {
            emit(["supported": true])
            return
        }
        guard CommandLine.arguments.count == 3 else { exit(2) }
        do {
            let input = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
            let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
            var configuration = PhotogrammetrySession.Configuration()
            configuration.sampleOrdering = .sequential
            configuration.featureSensitivity = .high
            configuration.isObjectMaskingEnabled = true
            var detail: PhotogrammetrySession.Request.Detail = .full
            if #available(macOS 14.0, *) {
                configuration.customDetailSpecification.maximumPolygonCount = 250_000
                configuration.customDetailSpecification.maximumTextureDimension = .eightK
                configuration.customDetailSpecification.outputTextureMaps = [.diffuseColor]
                detail = .custom
            }
            let session = try PhotogrammetrySession(input: input, configuration: configuration)
            var solvedPoses: PhotogrammetrySession.Poses?
            var sparseCloud: PhotogrammetrySession.PointCloud?
            var requests: [PhotogrammetrySession.Request] = [.modelFile(url: output, detail: detail)]
            if #available(macOS 26.0, *) { requests += [.poses, .pointCloud] }
            // Reduced is a preview budget. Preserve body/wheel detail in the master;
            // the Node packager handles the mobile texture and file-size budget.
            try session.process(requests: requests)
            for try await event in session.outputs {
                switch event {
                case .requestProgress(let request, let fraction):
                    if case .modelFile = request { emit(["progress": fraction]) }
                case .requestComplete(_, let result):
                    if case .poses(let poses) = result { solvedPoses = poses }
                    if case .pointCloud(let cloud) = result { sparseCloud = cloud }
                case .requestError(let request, let error):
                    if case .modelFile = request { emit(["error": String(describing: error)]); exit(1) }
                    emit(["warning": "Gerçekçi görünüm için kamera bilgisi çıkarılamadı."])
                case .invalidSample: emit(["warning": "Bir fotoğraf işlemeye uygun bulunmadı."])
                case .skippedSample: emit(["warning": "Bir fotoğraf eşleştirilemedi."])
                case .automaticDownsampling: emit(["warning": "Donanım sınırı nedeniyle kaynak fotoğraflar küçültüldü."])
                case .processingComplete:
                    if #available(macOS 26.0, *), let poses = solvedPoses, let cloud = sparseCloud {
                        do { try exportAppearance(poses: poses, cloud: cloud, output: output) }
                        catch { emit(["warning": "Gerçekçi görünüm verisi hazırlanamadı; 3D geometri korundu."]) }
                    }
                    emit(["complete": true])
                    return
                case .processingCancelled: exit(1)
                default: break
                }
            }
            exit(1)
        } catch {
            emit(["error": String(describing: error)])
            exit(1)
        }
    }
}
