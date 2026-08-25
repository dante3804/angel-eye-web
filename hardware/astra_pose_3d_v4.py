# astra_pose_3d_v4.py
# astra_stream (통합 C 프로그램) 하나만 실행해서 color/depth를 태그로 구분해서 받는다.
# device.open()을 프로세스 하나에서만 하기 때문에 "Resource busy" 문제가 없다.
#
# 실행 전:
#   1) astra_stream 컴파일 완료 상태여야 함
#      g++ astra_stream.cpp -o astra_stream -I../../sdk/Include -L../../sdk/libs -lOpenNI2 -Wl,-rpath,../../sdk/libs
#   2) 아래 ASTRA_STREAM_BIN 경로를 실제 위치로 수정
#
# conda activate fall_detect 후 실행

import cv2
import mediapipe as mp
import numpy as np
import subprocess
import threading

WIDTH, HEIGHT = 640, 480
COLOR_BYTES = WIDTH * HEIGHT * 3
DEPTH_BYTES = WIDTH * HEIGHT * 2

ASTRA_STREAM_BIN = "./astra_stream"   # <- 본인 경로로 수정

latest_color = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
latest_depth = np.zeros((HEIGHT, WIDTH), dtype=np.uint16)
color_lock = threading.Lock()
depth_lock = threading.Lock()

frame_counts = {"color": 0, "depth": 0}


def read_exact(stream, n):
    buf = b""
    while len(buf) < n:
        chunk = stream.read(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def combined_reader_thread(proc):
    """1바이트 태그를 읽고 'C'면 color 프레임, 'D'면 depth 프레임으로 분기해서 읽는다."""
    global latest_color, latest_depth
    while True:
        tag = read_exact(proc.stdout, 1)
        if tag is None:
            print("astra_stream 종료됨")
            break

        if tag == b'C':
            buf = read_exact(proc.stdout, COLOR_BYTES)
            if buf is None:
                print("astra_stream 종료됨 (color 프레임 도중)")
                break
            arr = np.frombuffer(buf, dtype=np.uint8).reshape(HEIGHT, WIDTH, 3)
            with color_lock:
                latest_color = arr
            frame_counts["color"] += 1

        elif tag == b'D':
            buf = read_exact(proc.stdout, DEPTH_BYTES)
            if buf is None:
                print("astra_stream 종료됨 (depth 프레임 도중)")
                break
            arr = np.frombuffer(buf, dtype=np.uint16).reshape(HEIGHT, WIDTH)
            with depth_lock:
                latest_depth = arr
            frame_counts["depth"] += 1

        else:
            # 태그가 깨졌으면(동기화 어긋남) 더 진행해도 의미 없으니 중단
            print("알 수 없는 태그, 동기화 깨짐:", tag)
            break


def main():
    proc = subprocess.Popen([ASTRA_STREAM_BIN], stdout=subprocess.PIPE)
    threading.Thread(target=combined_reader_thread, args=(proc,), daemon=True).start()

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

    while True:
        with color_lock:
            rgb_frame = latest_color.copy()

        results = pose.process(rgb_frame)
        display_frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

        cv2.putText(display_frame, f"color={frame_counts['color']} depth={frame_counts['depth']}",
                    (10, HEIGHT - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(display_frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            with depth_lock:
                depth_snapshot = latest_depth.copy()

            joints_3d = {}
            for idx, lm in enumerate(results.pose_landmarks.landmark):
                dx = int(lm.x * WIDTH)
                dy = int(lm.y * HEIGHT)
                if 0 <= dx < WIDTH and 0 <= dy < HEIGHT:
                    z_mm = int(depth_snapshot[dy, dx]) * 0.1
                else:
                    z_mm = 0.0
                joints_3d[idx] = (lm.x, lm.y, z_mm)

            l_hip_z = joints_3d[mp_pose.PoseLandmark.LEFT_HIP.value][2]
            cv2.putText(display_frame, f"left_hip_z={l_hip_z:.0f}mm", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow("Astra Pose 3D", display_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    proc.terminate()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
