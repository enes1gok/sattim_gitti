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
            let session = try PhotogrammetrySession(input: input, configuration: configuration)
            try session.process(requests: [.modelFile(url: output, detail: .reduced)])
            for try await event in session.outputs {
                switch event {
                case .requestProgress(_, let fraction): emit(["progress": fraction])
                case .requestError(_, let error):
                    emit(["error": String(describing: error)])
                    exit(1)
                case .invalidSample: emit(["warning": "Bir fotoğraf işlemeye uygun bulunmadı."])
                case .skippedSample: emit(["warning": "Bir fotoğraf eşleştirilemedi."])
                case .processingComplete:
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
