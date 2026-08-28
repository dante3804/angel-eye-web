import socket
import struct
import time
import os
import threading

import cv2
import numpy as np
import mediapipe as mp
import requests
from flask import Flask, Response

HOST = "0.0.0.0"
PORT = 5001
STREAM_PORT = 5002

BACKEND_URL = "https://angel-eye-backend-291327785356.asia-northeast1.run.app/jetson/event"
DEVICE_ID = "vm-processor-01"
USER_ID = 1

LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24

VELOCITY_FALL_THRESHOLD = 0.7
ACCEL_PEAK_THRESHOLD = 2.5
CONSECUTIVE_FRAMES = 2
ACCEL_ACCOMPANY_WINDOW_MS = 400
SMOOTHING_WINDOW = 5
MIN_VISIBILITY = 0.5
DANGER_HOLD_MS = 2500

LATEST_FRAME_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "latest_frame.jpg")

STATUS_LABEL = {"normal": "NORMAL", "warning": "WARNING", "danger": "DANGER!!"}
STATUS_COLOR = {"normal": (0, 200, 0), "warning": (0, 200, 255), "danger": (0, 0, 255)}

# ── 스트리밍용 전역 버퍼 ──
annotated_frame_lock = threading.Lock()
annotated_frame_jpeg = None

mp_drawing = mp.solutions.drawing_utils
mp_pose_module = mp.solutions.pose


def midpoint(a, b):
    return {"x": (a["x"] + b["x"]) / 2, "y": (a["y"] + b["y"]) / 2}


def magnitude(v):
    return (v["x"] ** 2 + v["y"] ** 2) ** 0.5


def body_center(landmarks, min_visibility=MIN_VISIBILITY):
    if landmarks is None or len(landmarks) < 25:
        return None
    ls, rs = landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]
    lh, rh = landmarks[LEFT_HIP], landmarks[RIGHT_HIP]
    for p in (ls, rs, lh, rh):
        if p is None:
            return None
        vis = getattr(p, "visibility", None)
        if vis is not None and vis < min_visibility:
            return None
    ls_d = {"x": ls.x, "y": ls.y}
    rs_d = {"x": rs.x, "y": rs.y}
    lh_d = {"x": lh.x, "y": lh.y}
    rh_d = {"x": rh.x, "y": rh.y}
    shoulder_c = midpoint(ls_d, rs_d)
    hip_c = midpoint(lh_d, rh_d)
    return midpoint(shoulder_c, hip_c)


def moving_average(points, window_size):
    if not points:
        return None
    w = min(window_size, len(points))
    recent = points[-w:]
    sx = sum(p["x"] for p in recent)
    sy = sum(p["y"] for p in recent)
    return {"x": sx / w, "y": sy / w}


def derivative(curr, prev, dt):
    if curr is None or prev is None or not dt or dt <= 0:
        return {"x": 0.0, "y": 0.0}
    return {"x": (curr["x"] - prev["x"]) / dt, "y": (curr["y"] - prev["y"]) / dt}


def vertical_velocity(curr, prev, dt):
    if curr is None or prev is None or not dt or dt <= 0:
        return 0.0
    return (curr["y"] - prev["y"]) / dt


class FallDetector:
    def __init__(self):
        self.pos_history = []
        self.prev_smoothed = None
        self.prev_vel = None
        self.prev_time_ms = None
        self.vel_consec = 0
        self.last_accel_spike_at = 0
        self.last_danger_at = 0
        self.in_danger_event = False
        self.status = "normal"

    def push_frame(self, landmarks, timestamp_ms):
        center = body_center(landmarks)
        if center is None:
            self.prev_time_ms = None
            self.vel_consec = 0
            return self.status, None

        self.pos_history.append(center)
        if len(self.pos_history) > SMOOTHING_WINDOW:
            self.pos_history.pop(0)
        smoothed = moving_average(self.pos_history, SMOOTHING_WINDOW)

        prev_time = self.prev_time_ms
        dt = (timestamp_ms - prev_time) / 1000.0 if prev_time is not None else 0

        metrics = None
        if self.prev_smoothed is not None and dt > 0:
            vy = vertical_velocity(smoothed, self.prev_smoothed, dt)
            vel = derivative(smoothed, self.prev_smoothed, dt)

            ax = ay = mag = 0.0
            if self.prev_vel is not None:
                acc = derivative(vel, self.prev_vel, dt)
                ax, ay = acc["x"], acc["y"]
                mag = magnitude(acc)

            metrics = {"ax": ax, "ay": ay, "vy": vy, "mag": mag}

            accel_spike = abs(ay) > ACCEL_PEAK_THRESHOLD
            if accel_spike:
                self.last_accel_spike_at = timestamp_ms

            if vy > VELOCITY_FALL_THRESHOLD:
                self.vel_consec += 1
            else:
                self.vel_consec = 0

            accel_accompany = (
                self.last_accel_spike_at > 0
                and (timestamp_ms - self.last_accel_spike_at) <= ACCEL_ACCOMPANY_WINDOW_MS
            )

            fall_confirmed = self.vel_consec >= CONSECUTIVE_FRAMES and accel_accompany
            if fall_confirmed:
                self.last_danger_at = timestamp_ms
                if not self.in_danger_event:
                    self.in_danger_event = True

            since_danger = timestamp_ms - self.last_danger_at
            if self.last_danger_at and since_danger < DANGER_HOLD_MS:
                self.status = "danger"
            else:
                self.in_danger_event = False
                self.status = "warning" if accel_accompany else "normal"

            self.prev_vel = vel

        self.prev_smoothed = smoothed
        self.prev_time_ms = timestamp_ms
        return self.status, metrics


def send_event_to_backend(risk_level, action):
    payload = {
        "device_id": DEVICE_ID,
        "user_id": USER_ID,
        "risk_level": risk_level,
        "action": action,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=3)
        print(f"[백엔드 전송] {payload} -> status={resp.status_code}")
    except Exception as e:
        print(f"[백엔드 전송 실패] {e}")


def recv_exact(conn, n):
    buf = b""
    while len(buf) < n:
        chunk = conn.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


# ── Flask 스트리밍 서버 ──
app = Flask(__name__)


@app.route("/")
def index():
    return """
    <html><head><title>Angel-Eye Live</title></head>
    <body style="background:#111;text-align:center;">
      <h2 style="color:white;font-family:sans-serif;">Angel-Eye 실시간 감지</h2>
      <img src="/video_feed" style="max-width:90%;border:2px solid #444;">
    </body></html>
    """


@app.route("/video_feed")
def video_feed():
    def generate():
        global annotated_frame_jpeg
        while True:
            with annotated_frame_lock:
                frame = annotated_frame_jpeg
            if frame is not None:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
            time.sleep(0.03)
    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


def run_flask():
    app.run(host="0.0.0.0", port=STREAM_PORT, threaded=True)


def main():
    global annotated_frame_jpeg

    threading.Thread(target=run_flask, daemon=True).start()
    print(f"브라우저에서 확인: http://<VM_IP>:{STREAM_PORT}/")

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(1)
    print(f"수신 대기중... {HOST}:{PORT}")

    conn, addr = server.accept()
    print(f"연결됨: {addr}")

    pose = mp_pose_module.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    detector = FallDetector()

    latest_color = None
    frame_count = 0
    last_status = "normal"

    try:
        while True:
            tag = recv_exact(conn, 1)
            if tag is None:
                print("연결 종료됨")
                break

            length_bytes = recv_exact(conn, 4)
            if length_bytes is None:
                break
            (length,) = struct.unpack(">I", length_bytes)

            payload = recv_exact(conn, length)
            if payload is None:
                break

            if tag == b"C":
                arr = np.frombuffer(payload, dtype=np.uint8)
                latest_color = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            elif tag == b"D":
                pass  # depth는 이번 스트리밍에서는 사용 안 함
            else:
                continue

            if tag == b"C" and latest_color is not None:
                frame_count += 1
                timestamp_ms = time.time() * 1000

                rgb = cv2.cvtColor(latest_color, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb)

                display = latest_color.copy()
                status = last_status

                if results.pose_landmarks:
                    mp_drawing.draw_landmarks(
                        display, results.pose_landmarks, mp_pose_module.POSE_CONNECTIONS
                    )
                    status, metrics = detector.push_frame(
                        results.pose_landmarks.landmark, timestamp_ms
                    )
                    if metrics:
                        print(f"[frame {frame_count}] status={status} "
                              f"vy={metrics['vy']:.3f} ay={metrics['ay']:.3f}")

                    if status == "danger" and last_status != "danger":
                        send_event_to_backend("danger", "falling")

                    last_status = status
                else:
                    print(f"[frame {frame_count}] 사람 인식 안 됨")

                # 상태 텍스트 오버레이
                label = STATUS_LABEL.get(status, status)
                color = STATUS_COLOR.get(status, (255, 255, 255))
                cv2.putText(display, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)

                cv2.imwrite(LATEST_FRAME_PATH, display)

                ok, jpeg = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ok:
                    with annotated_frame_lock:
                        annotated_frame_jpeg = jpeg.tobytes()

    finally:
        conn.close()
        server.close()
        print("종료됨")


if __name__ == "__main__":
    main()
