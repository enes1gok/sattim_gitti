import Foundation
import RealityKit

@available(macOS 26.0, *)
func exportAppearance(poses: PhotogrammetrySession.Poses, cloud: PhotogrammetrySession.PointCloud, output: URL) throws {
    let cameras: [[String: Any]] = poses.posesBySample.compactMap { id, pose in
        guard let k = pose.intrinsics, let url = poses.urlsBySample[id] else { return nil }
        let t = pose.translation
        let q = pose.rotation.vector
        return ["file": url.lastPathComponent, "position": [t.x, t.y, t.z],
                "rotation": [q.x, q.y, q.z, q.w], "intrinsics": [k[0][0], k[1][1], k[2][0], k[2][1]]]
    }
    guard cameras.count >= 32, !cloud.points.isEmpty else { return }
    try JSONSerialization.data(withJSONObject: cameras).write(to: output.appendingPathComponent("cameras.json"))
    var ply = "ply\nformat ascii 1.0\nelement vertex \(cloud.points.count)\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n"
    for p in cloud.points { ply += "\(p.position.x) \(p.position.y) \(p.position.z) \(p.color.x) \(p.color.y) \(p.color.z)\n" }
    try ply.write(to: output.appendingPathComponent("sparse.ply"), atomically: true, encoding: .utf8)
}
