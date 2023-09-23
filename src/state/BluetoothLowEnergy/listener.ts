import { createAsyncThunk, createListenerMiddleware } from "@reduxjs/toolkit";
import {
  setConnectedDevice,
  setDevice,
  setRetrievedColor,
  startListening,
  startScanning,
} from "./slice";

import bluetoothLeManager, { DeviceReference } from "./BluetoothLeManager";

export const bleMiddleware = createListenerMiddleware();

export const connectToDevice = createAsyncThunk(
  "bleThunk/connectToDevice",
  async (ref: DeviceReference, thunkApi) => {
    if (ref.id) {
      await bluetoothLeManager.connectToPeripheral(ref.id);
      thunkApi.dispatch(setConnectedDevice(ref));
      bluetoothLeManager.stopScanningForPeripherals();
    }
  }
);

export const readColorFromDevice = createAsyncThunk(
  "bleThunk/readColorFromDevice",
  async (_, thunkApi) => {
    const color = await bluetoothLeManager.readColor();
    thunkApi.dispatch(setRetrievedColor(color));
  }
);

export const sendAngleData = createAsyncThunk(
  "bleThunk/sendAngleData",
  async (newAngle: number, _) => {
    await bluetoothLeManager.sendAngle(newAngle);
  }
);

bleMiddleware.startListening({
  actionCreator: startScanning,
  effect: (_, listenerApi) => {
    bluetoothLeManager.scanForPeripherals((device) => {
      console.log("device", device);
      if (device.name?.includes("Arduino") || device.name?.includes("Friyia")) {
        listenerApi.dispatch(setDevice(device));
      }
    });
  },
});

bleMiddleware.startListening({
  actionCreator: startListening,
  effect: (_, listenerApi) => {
    bluetoothLeManager.startStreamingData(({ payload }) => {
      console.log("payload", payload);
      if (typeof payload === "string") {
        listenerApi.dispatch(setRetrievedColor(payload));
      }
    });
  },
});
