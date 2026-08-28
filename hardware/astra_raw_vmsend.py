import cv2
import numpy as np
import subprocess
import threading
import socket
import struct
import time

WIDTH, HEIGHT = 640, 480
COLOR_BYTES = WIDTH * HEIGHT * 3
DEPTH_BYTES = WIDTH * HEIGHT * 2

ASTRA_STREAM_BIN = "./astra_stream"

VM_IP = "100.127.89.85"
VM_PORT = 5001

SEND_FPS_LIMIT = 10

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


def send_frame(sock, tag, encoded_bytes):
    header = tag + struct.pack(">I", len(encoded_bytes))
    sock.sendall(header + encoded_bytes)


def main():
    proc = subprocess.Popen([ASTRA_STREAM_BIN], stdout=subprocess.PIPE)
    threading.Thread(target=combined_reader_thread, args=(proc,), daemon=True).start()

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((VM_IP, VM_PORT))
    print(f"VM({VM_IP}:{VM_PORT})에 연결됨")

    min_interval = (1.0 / SEND_FPS_LIMIT) if SEND_FPS_LIMIT else 0
    last_sent = 0
    sent_count = 0

    try:
        while True:
            now = time.time()
            if min_interval and (now - last_sent) < min_interval:
                time.sleep(0.005)
                continue
            last_sent = now

            with color_lock:
                color_frame = latest_color.copy()
            with depth_lock:
                depth_frame = latest_depth.copy()

            ok, color_encoded = cv2.imencode(".jpg", color_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ok:
                send_frame(sock, b"C", color_encoded.tobytes())

            ok, depth_encoded = cv2.imencode(".png", depth_frame)
            if ok:
                send_frame(sock, b"D", depth_encoded.tobytes())

            sent_count += 1
            if sent_count % 30 == 0:
                print(f"전송한 프레임 쌍: {sent_count} "
                      f"(수신 color={frame_counts['color']} depth={frame_counts['depth']})")

    except (BrokenPipeError, ConnectionResetError):
        print("VM 연결 끊김")
    except KeyboardInterrupt:
        print("사용자 종료")
    finally:
        sock.close()
        proc.terminate()
        print(f"종료: 총 {sent_count} 프레임 전송")


if __name__ == "__main__":
    main()
