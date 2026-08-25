// astra_stream.cpp
// color_stream.cpp + depth_stream.cpp 통합판.
// "Resource busy" 문제 원인: OpenNI2는 한 프로세스만 device.open()을 할 수 있음.
// 그래서 별도 프로세스 2개(color_stream, depth_stream)를 동시에 띄우면 나중에 여는 쪽이 실패했음.
// 해결: device.open()을 한 번만 하고, 그 안에서 color/depth 스트림 둘 다 생성.
//
// 출력 형식: 매 프레임마다 1바이트 태그 + 프레임 데이터
//   'C' + RGB888 640x480 (921600바이트)  -> color 프레임
//   'D' + uint16 640x480  (614400바이트) -> depth 프레임
// 두 스트림 중 준비된 쪽이 도착하는 순서대로 섞여서 나옴 (waitForAnyStream 사용).
//
// 주의: OpenNI2는 초기화 중에 "WARNING: ..." 같은 텍스트를 stdout에 직접 찍는 경우가 있어서,
// 그대로 두면 우리 바이너리 데이터 앞에 텍스트가 섞여 파이썬 쪽 태그 파싱이 깨진다.
// 그래서 프로그램 시작 시 진짜 stdout(파이프)을 별도 fd로 빼두고, 원래 stdout은 /dev/null로
// 돌려서 OpenNI의 텍스트 출력이 데이터 채널에 섞이지 않게 한다 (아래 real_stdout_fd 처리).
//
// 컴파일:
//   g++ astra_stream.cpp -o astra_stream \
//       -I../../sdk/Include \
//       -L../../sdk/libs -lOpenNI2 \
//       -Wl,-rpath,../../sdk/libs
//
// 테스트:
//   timeout 3 ./astra_stream > /tmp/combined_test.bin
//   ls -la /tmp/combined_test.bin

#include <OpenNI.h>
#include <cstdio>
#include <cstdlib>
#include <unistd.h>
#include <fcntl.h>

using namespace openni;

int main() {
    // --- OpenNI2가 초기화 중 stdout에 WARNING 등 텍스트를 찍는 문제 방지 ---
    // 진짜 데이터 통로(파이썬으로 갈 파이프)를 fd 3으로 미리 복사해두고,
    // 원래 stdout(fd 1)은 /dev/null로 돌려서 OpenNI의 텍스트 출력이 섞이지 않게 한다.
    int real_stdout_fd = dup(STDOUT_FILENO);
    int devnull_fd = open("/dev/null", O_WRONLY);
    dup2(devnull_fd, STDOUT_FILENO);
    close(devnull_fd);
    FILE* data_out = fdopen(real_stdout_fd, "wb");
    if (!data_out) {
        fprintf(stderr, "data_out fdopen failed\n");
        return 1;
    }

    Status rc = OpenNI::initialize();
    if (rc != STATUS_OK) {
        fprintf(stderr, "OpenNI init failed: %s\n", OpenNI::getExtendedError());
        return 1;
    }

    Device device;
    rc = device.open(ANY_DEVICE);
    if (rc != STATUS_OK) {
        fprintf(stderr, "Device open failed: %s\n", OpenNI::getExtendedError());
        OpenNI::shutdown();
        return 1;
    }

    VideoStream color, depth;

    rc = color.create(device, SENSOR_COLOR);
    if (rc != STATUS_OK) {
        fprintf(stderr, "Color stream create failed: %s\n", OpenNI::getExtendedError());
        device.close();
        OpenNI::shutdown();
        return 1;
    }

    rc = depth.create(device, SENSOR_DEPTH);
    if (rc != STATUS_OK) {
        fprintf(stderr, "Depth stream create failed: %s\n", OpenNI::getExtendedError());
        device.close();
        OpenNI::shutdown();
        return 1;
    }

    VideoMode cmode = color.getVideoMode();
    cmode.setResolution(640, 480);
    cmode.setFps(30);
    cmode.setPixelFormat(PIXEL_FORMAT_RGB888);
    color.setVideoMode(cmode);

    VideoMode dmode = depth.getVideoMode();
    dmode.setResolution(640, 480);
    dmode.setFps(30);
    dmode.setPixelFormat(PIXEL_FORMAT_DEPTH_100_UM);
    depth.setVideoMode(dmode);

    rc = color.start();
    if (rc != STATUS_OK) {
        fprintf(stderr, "Color stream start failed: %s\n", OpenNI::getExtendedError());
        return 1;
    }

    rc = depth.start();
    if (rc != STATUS_OK) {
        fprintf(stderr, "Depth stream start failed: %s\n", OpenNI::getExtendedError());
        return 1;
    }

    VideoStream* streams[] = {&color, &depth};

    while (true) {
        int changedIndex = -1;
        rc = OpenNI::waitForAnyStream(streams, 2, &changedIndex, 2000);
        if (rc != STATUS_OK) {
            continue; // 타임아웃 등, 다음 루프에서 재시도
        }

        VideoFrameRef frame;
        if (changedIndex == 0) {
            rc = color.readFrame(&frame);
            if (rc != STATUS_OK || !frame.isValid()) continue;
            char tag = 'C';
            if (fwrite(&tag, 1, 1, data_out) != 1) break;
            if (fwrite(frame.getData(), 1, frame.getDataSize(), data_out) != (size_t)frame.getDataSize()) break;
        } else if (changedIndex == 1) {
            rc = depth.readFrame(&frame);
            if (rc != STATUS_OK || !frame.isValid()) continue;
            char tag = 'D';
            if (fwrite(&tag, 1, 1, data_out) != 1) break;
            if (fwrite(frame.getData(), 1, frame.getDataSize(), data_out) != (size_t)frame.getDataSize()) break;
        }
        fflush(data_out);
    }

    color.stop();
    depth.stop();
    color.destroy();
    depth.destroy();
    device.close();
    OpenNI::shutdown();
    return 0;
}
