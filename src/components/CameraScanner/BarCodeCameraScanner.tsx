import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "./CameraScanner.styles";
import { RNHoleView } from "react-native-hole-view";
import {
  Camera,
  CameraRuntimeError,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";

import { useIsFocused } from "@react-navigation/native";
import { useAppStateListener } from "../../hooks/useAppStateListener";
import { ICameraScannerProps } from "../../utils/helpers/types";
import { getWindowHeight, getWindowWidth } from "../../utils/helpers";

import MaterialIcons from "@react-native-vector-icons/material-icons";
import { useTranslation } from "react-i18next";
import { ui } from "./style";

export const BarCodeCameraScanner = ({
  setIsCameraShown,
  onReadCode,
}: ICameraScannerProps) => {
  const { t } = useTranslation();
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const { appState } = useAppStateListener();
  const { hasPermission, requestPermission } = useCameraPermission();

  const scannedRef = useRef(false);

  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [codeScanned, setCodeScanned] = useState<string | null>(null);

  const closeScanner = useCallback(() => {
    setIsCameraShown(false);
  }, [setIsCameraShown]);

  useEffect(() => {
    let cancelled = false;

    const checkPermission = async () => {
      if (hasPermission) {
        setPermissionDenied(false);
        return;
      }

      try {
        const granted = await requestPermission();

        if (!cancelled) {
          setPermissionDenied(!granted);

          if (!granted) {
            Alert.alert(
              "Camera Permission Required",
              "Please enable camera access in your device settings.",
              [{ text: "OK", onPress: closeScanner }],
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert(
            "Camera Error",
            "Unable to request camera permission.",
            [{ text: "OK", onPress: closeScanner }],
          );
        }
      }
    };

    if (isFocused) {
      checkPermission();
    }

    return () => {
      cancelled = true;
    };
  }, [isFocused, hasPermission, requestPermission, closeScanner]);

  useEffect(() => {
    if (!isFocused) {
      scannedRef.current = false;
      setCodeScanned(null);
      setIsCameraInitialized(false);
      setFlash("off");
    }
  }, [isFocused]);

  useEffect(() => {
    if (codeScanned) {
      onReadCode(codeScanned);
      closeScanner();
    }
  }, [codeScanned, onReadCode, closeScanner]);

  const codeScanner = useCodeScanner({
    codeTypes: [
      "qr",
      "ean-13",
      "ean-8",
      "code-128",
      "code-39",
      "codabar",
      "itf",
      "upc-a",
      "upc-e",
    ],
    onCodeScanned: codes => {
      if (scannedRef.current) {
        return;
      }

      const value = codes.find(code => Boolean(code.value))?.value;

      if (value) {
        scannedRef.current = true;
        setCodeScanned(value);
      }
    },
  });

  const onInitialized = useCallback(() => {
    setIsCameraInitialized(true);
  }, []);

  const onError = useCallback(
    (error: CameraRuntimeError) => {
      console.error(
        "[BarCodeCameraScanner]",
        error.code,
        error.message,
      );

      Alert.alert(
        "Camera Error",
        error.message,
        [{ text: "OK", onPress: closeScanner }],
      );
    },
    [closeScanner],
  );

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closeScanner();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isFocused, closeScanner]);

  const isActive =
    hasPermission &&
    Boolean(device) &&
    isFocused &&
    appState === "active" &&
    isCameraInitialized &&
    !codeScanned &&
    !permissionDenied;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape"]}
        animationType="slide"
        onRequestClose={closeScanner}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {hasPermission && device && !permissionDenied && (
            <Camera
              device={device}
              style={styles.fullScreenCamera}
              isActive={isActive}
              codeScanner={codeScanner}
              photo={false}
              torch={flash}
              onInitialized={onInitialized}
              onError={onError}
            />
          )}

          {(!hasPermission || !device || !isCameraInitialized) && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#111",
                padding: 24,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                {!hasPermission
                  ? "Waiting for camera permission..."
                  : !device
                    ? "Back camera not available."
                    : "Loading camera..."}
              </Text>
            </View>
          )}

          {hasPermission && device && !permissionDenied && (
            <>
              <RNHoleView
                holes={[
                  {
                    x: getWindowWidth() * 0.05,
                    y: getWindowHeight() * 0.3,
                    width: getWindowWidth() * 0.9,
                    height: getWindowHeight() * 0.25,
                    borderRadius: 8,
                  },
                ]}
                style={styles.rnholeView}
              />

              <TouchableOpacity
                style={ui.backButton}
                onPress={closeScanner}
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
              >
                <MaterialIcons
                  name="arrow-back"
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>

              <View style={ui.descriptionBox}>
                <Text style={ui.descriptionText}>{t("test17")}</Text>
              </View>

              <View style={ui.bottomPanel}>
                <Text style={ui.bottomText}>{t("test18")}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};