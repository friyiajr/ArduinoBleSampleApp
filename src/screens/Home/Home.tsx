import {
  Canvas,
  Circle,
  Path,
  Rect,
  Skia,
  useSharedValueEffect,
  useValue,
} from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, View, Text } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { ReText, clamp, polar2Canvas } from "react-native-redash";
import { useDispatch } from "react-redux";
import { sendAngleData } from "../../state/BluetoothLowEnergy/listener";
import { useAppDispatch, useAppSelector } from "../../state/store";
import { useNavigation } from "@react-navigation/native";
import { startListening } from "../../state/BluetoothLowEnergy/slice";

const { width, height } = Dimensions.get("window");

export const Home = () => {
  const strokeWidth = 20;
  const center = width / 2;
  const r = (width - strokeWidth) / 2 - 40;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const x1 = center - r * Math.cos(startAngle);
  const y1 = -r * Math.sin(startAngle) + center;
  const x2 = center - r * Math.cos(endAngle);
  const y2 = -r * Math.sin(endAngle) + center;
  const rawPath = `M ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2}`;
  const rawForegroundPath = `M ${x2} ${y2} A ${r} ${r} 1 0 1 ${x1} ${y1}`;
  const skiaBackgroundPath = Skia.Path.MakeFromSVGString(rawPath);
  const skiaForegroundPath = Skia.Path.MakeFromSVGString(rawForegroundPath);

  const movableCx = useSharedValue(187);
  const movableCy = useSharedValue(50);
  const previousPositionX = useSharedValue(187);
  const previousPositionY = useSharedValue(50);
  const percentComplete = useSharedValue(0.5);

  const skiaCx = useValue(187);
  const skiaCy = useValue(50);
  const skiaPercentComplete = useValue(0.5);

  const dispatch = useAppDispatch();

  const navigation = useNavigation<any>();

  const isConnected = useAppSelector((state) => state.ble.connectedDevice);
  const currentAngle = useAppSelector((state) => state.ble.retrievedColor);
  console.log("currentAngle", currentAngle);

  function debounce(cb, delay = 500) {
    let timeout;
    console.log("HELLO 0");

    return (...args) => {
      console.log("HELLO 1");
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cb(...args);
      }, delay);
    };
  }

  const updateAngle = debounce((newAngle: number) => {
    dispatch(sendAngleData(newAngle));
  });

  useEffect(() => {
    if (isConnected) {
      dispatch(startListening());
    }
  }, [isConnected]);

  const gesture = Gesture.Pan()
    .onUpdate(({ translationX, translationY, absoluteX }) => {
      const oldCanvasX = translationX + previousPositionX.value;
      const oldCanvasY = translationY + previousPositionY.value;

      const xPrime = oldCanvasX - center;
      const yPrime = -(oldCanvasY - center);
      const rawTheta = Math.atan2(yPrime, xPrime);

      let newTheta;

      if (absoluteX < width / 2 && rawTheta < 0) {
        newTheta = Math.PI;
      } else if (absoluteX > width / 2 && rawTheta <= 0) {
        newTheta = 0;
      } else {
        newTheta = rawTheta;
      }

      function radToDeg(radians: number) {
        return Math.round(180 - radians * (180 / Math.PI));
      }

      const degrees = radToDeg(newTheta);
      const percent = 1 - newTheta / Math.PI;
      percentComplete.value = percent;

      const newCoords = polar2Canvas(
        {
          theta: newTheta,
          radius: r,
        },
        {
          x: center,
          y: center,
        }
      );

      movableCx.value = newCoords.x;
      movableCy.value = newCoords.y;

      runOnJS(updateAngle)(degrees);
    })
    .onEnd(() => {
      previousPositionX.value = movableCx.value;
      previousPositionY.value = movableCy.value;
    });

  useSharedValueEffect(
    () => {
      skiaCx.current = movableCx.value;
      skiaCy.current = movableCy.value;
      skiaPercentComplete.current = percentComplete.value;
    },
    movableCx,
    movableCy,
    percentComplete
  );

  if (!skiaBackgroundPath || !skiaForegroundPath) {
    return <View />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View style={styles.container}>
          {isConnected ? (
            <>
              <Pressable style={styles.ghost} onPress={() => updateAngle(180)}>
                <Text style={{ color: "white", fontSize: 125 }}>
                  {currentAngle ?? 90}°
                </Text>
              </Pressable>
              <Canvas style={styles.canvas}>
                <Rect x={0} y={0} width={width} height={height} color="black" />
                <Path
                  path={skiaBackgroundPath}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeCap="round"
                  color={"grey"}
                />
                <Path
                  path={skiaForegroundPath}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeCap="round"
                  color={"orange"}
                  start={0}
                  end={skiaPercentComplete}
                />
                <Circle
                  cx={skiaCx}
                  cy={skiaCy}
                  r={20}
                  color="orange"
                  style="fill"
                />
                <Circle
                  cx={skiaCx}
                  cy={skiaCy}
                  r={15}
                  color="white"
                  style="fill"
                />
              </Canvas>
            </>
          ) : (
            <View style={styles.container}>
              <Pressable
                style={{
                  backgroundColor: "purple",
                  marginLeft: 20,
                  marginRight: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  height: 70,
                  borderRadius: 18,
                }}
                onPress={() => {
                  navigation.push("Connect");
                }}
              >
                <Text style={{ fontSize: 25, color: "white" }}>
                  Connect a Device
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },
  canvas: {
    flex: 1,
  },
  cursor: {
    backgroundColor: "green",
  },
  ghost: {
    flex: 2,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
});
