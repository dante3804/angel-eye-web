# astra_pose_3d_v5_vmsend.py
# v5 + GCP VM으로 관절점 데이터 실시간 전송 기능 추가.
#
# v5와의 차이점 (변경 부분에는 "# [VMSEND]" 주석 표시):
#   1) socket 모듈 import 추가
#   2) VM_IP, VM_PORT 상수 추가
#   3) 카메라 루프 시작 전, VM에 소켓 연결
#   4) 프레임마다 .jsonl 파일에 저장하는 것과 "동시에" VM으로도 같은 데이터를 전송 (병행 방식)
#      -> 파일 저장은 그대로 유지되므로, 나중에 LSTM 학습용 데이터도 계속 쌓임
#   5. 프로그램 종료 시 소켓 닫기
#
# 실행 전:
#   1) astra_stream 컴파일 완료 상태여야 함
#   2) 아래 ASTRA_STREAM_BIN 경로를 실제 위치로 수정
#   3) 아래 VM_IP를 GCP VM의 Tailscale IP로 수정 (현재: 100.127.89.85)
#   4) VM에서 receiver.py가 먼저 실행되어 대기 중이어야 함 (그래야 connect가 성공함)
#
# 저장 형식 (한 줄 = 한 프레임, 파일 저장 & VM 전송 데이터 동일):
# {
#   "frame_index": 123,
#   "timestamp": 1783740647.771,
#   "joints": {
#     "0": {"x": 0.51, "y": 0.32, "z_mm": 1200.0},   # 0 = NOSE
#     ...
#     "23": {"x": 0.48, "y": 0.61, "z_mm": 1364.0},  # 23 = LEFT_HIP
#     ...
#   }
# }
#
# 관절 번호(0~32)와 이름 매핑은 mp_pose.PoseLandmark 순서를 그대로 따름
# (예: 0=NOSE, 11=LEFT_SHOULDER, 12=RIGHT_SHOULDER, 23=LEFT_HIP, 24=RIGHT_HIP ...)
#
# conda activate fall_detect 후 실행

import cv2
import mediapipe as mp
import numpy as np
import subprocess
import threading
import json
import time
import os
import socket  # [VMSEND] 추가

WIDTH, HEIGHT = 640, 480
COLOR_BYTES = WIDTH * HEIGHT * 3
DEPTH_BYTES = WIDTH * HEIGHT * 2

ASTRA_STREAM_BIN = "./astra_stream"   # <- 본인 경로로 수정

# [VMSEND] 추가: GCP VM 접속 정보 (Tailscale IP 기준)
VM_IP = "100.127.89.85"   # <- 본인 VM의 Tailscale IP로 수정
VM_PORT = 5001

# 저장할 파일: 실행할 때마다 새 파일(타임스탬프 붙여서) 생성 -> 세션별로 구분됨
OUTPUT_DIR = "./joint_data"
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, f"joints_{int(time.time())}.jsonl")

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
    global latest_color, latest_depth
    while True:
        tag = read_exact(proc.stdout, 1)
        if tag is None:
            print("astra_stream 종료됨")
            break

        if tag == b'C':
            buf = read_exact(proc.stdout, COLOR_BYTES)
            if buf is None:
                break
            arr = np.frombuffer(buf, dtype=np.uint8).reshape(HEIGHT, WIDTH, 3)
            with color_lock:
                latest_color = arr
            frame_counts["color"] += 1

        elif tag == b'D':
            buf = read_exact(proc.stdout, DEPTH_BYTES)
            if buf is None:
                break
            arr = np.frombuffer(buf, dtype=np.uint16).reshape(HEIGHT, WIDTH)
            with depth_lock:
                latest_depth = arr
            frame_counts["depth"] += 1

        else:
            print("알 수 없는 태그, 동기화 깨짐:", tag)
            break


def main():
    proc = subprocess.Popen([ASTRA_STREAM_BIN], stdout=subprocess.PIPE)
    threading.Thread(target=combined_reader_thread, args=(proc,), daemon=True).start()

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

    frame_index = 0
    logfile = open(OUTPUT_FILE, "a", encoding="utf-8")
    print(f"관절 데이터 저장 위치: {OUTPUT_FILE}")

    # [VMSEND] 추가: VM에 소켓 연결 (카메라 루프 시작 전, 한 번만 연결)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((VM_IP, VM_PORT))
    print(f"VM({VM_IP}:{VM_PORT})에 연결됨")

    try:
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

                joints = {}
                for idx, lm in enumerate(results.pose_landmarks.landmark):
                    dx = int(lm.x * WIDTH)
                    dy = int(lm.y * HEIGHT)
                    if 0 <= dx < WIDTH and 0 <= dy < HEIGHT:
                        z_mm = int(depth_snapshot[dy, dx]) * 0.1
                    else:
                        z_mm = 0.0
                    joints[str(idx)] = {"x": round(lm.x, 4), "y": round(lm.y, 4), "z_mm": round(z_mm, 1)}

                # --- 여기서 프레임 하나를 JSONL로 저장 ---
                record = {
                    "frame_index": frame_index,
                    "timestamp": time.time(),
                    "joints": joints,
                }
                logfile.write(json.dumps(record, ensure_ascii=False) + "\n")
                logfile.flush()  # 실시간으로 바로 디스크에 반영 (중간에 꺼져도 데이터 안 날아가게)
                frame_index += 1

                # [VMSEND] 추가: 같은 record를 VM으로도 실시간 전송 (파일 저장과 병행)
                try:
                    sock.sendall(json.dumps(record, ensure_ascii=False).encode() + b'\n')
                except (BrokenPipeError, ConnectionResetError):
                    print("VM 연결 끊김 (전송 실패, 파일 저장은 계속 진행됨)")

                l_hip_z = joints["23"]["z_mm"]  # LEFT_HIP
                cv2.putText(display_frame, f"left_hip_z={l_hip_z:.0f}mm  saved_frames={frame_index}",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            cv2.imshow("Astra Pose 3D", display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        logfile.close()
        sock.close()  # [VMSEND] 추가: 소켓 정리
        proc.terminate()
        cv2.destroyAllWindows()
        print(f"저장 완료: {OUTPUT_FILE} ({frame_index} 프레임)")


if __name__ == "__main__":
    main()
