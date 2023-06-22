import base64 from "react-native-base64";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";

const COLOR_SERVICE = "96e4d99a-066f-444c-b67c-112345e3b1a2";
const COLOR_CHARACTARISTIC_NOTIFY = "7c0209c0-93f0-437a-828a-a58379b230c4";
const COLOR_CHARACTARISTIC_WRITE = "1b3dcc2d-cc56-4b47-b6c2-13745858c7df";
const COLOR_CHARACTARISTIC_READ = "3d84e60b-90d0-40d4-993a-1b83424cb868";

export interface DeviceReference {
  name?: string | null;
  id?: string;
}

class BluetoothLeManager {
  bleManager: BleManager;
  device: Device | null;
  isListening: boolean = false;

  constructor() {
    this.bleManager = new BleManager();
    this.device = null;
  }

  scanForPeripherals = (
    onDeviceFound: (deviceSummary: DeviceReference) => void
  ) => {
    this.bleManager.startDeviceScan(null, null, (_, scannedDevice) => {
      onDeviceFound({
        id: scannedDevice?.id,
        name: scannedDevice?.localName ?? scannedDevice?.name,
      });
    });
  };

  stopScanningForPeripherals = () => {
    this.bleManager.stopDeviceScan();
  };

  connectToPeripheral = async (identifier: string) => {
    this.device = await this.bleManager.connectToDevice(identifier);
    await this.device?.discoverAllServicesAndCharacteristics();
  };

  onColorUpdate = (
    error: BleError | null,
    characteristic: Characteristic | null,
    emitter: (bleValue: { payload: string | BleError }) => void
  ) => {
    if (error) {
      console.log(error);
      return "#FFFFFF";
    } else if (!characteristic?.value) {
      console.log("No Data was recieved");
      return "#FFFFFF";
    }

    const hexColor = base64.decode(characteristic.value);

    emitter({ payload: hexColor });
  };

  startStreamingData = async (
    emitter: (bleValue: { payload: string | BleError }) => void
  ) => {
    if (!this.isListening) {
      this.isListening = true;
      this.device?.monitorCharacteristicForService(
        COLOR_SERVICE,
        COLOR_CHARACTARISTIC_NOTIFY,
        (error, characteristic) =>
          this.onColorUpdate(error, characteristic, emitter)
      );
    }
  };

  sendColor = async (color: string) => {
    const data = base64.encode(color);
    try {
      await this.bleManager.writeCharacteristicWithResponseForDevice(
        this.device?.id ?? "",
        COLOR_SERVICE,
        COLOR_CHARACTARISTIC_WRITE,
        data
      );
    } catch (e) {
      console.log(e);
    }
  };

  readColor = async () => {
    try {
      const color = await this.bleManager.readCharacteristicForDevice(
        this.device?.id ?? "",
        COLOR_SERVICE,
        COLOR_CHARACTARISTIC_READ
      );
      return base64.decode(color.value ?? "");
    } catch (e) {
      console.log(e);
    }
  };
}

const bluetoothLeManager = new BluetoothLeManager();

export default bluetoothLeManager;
