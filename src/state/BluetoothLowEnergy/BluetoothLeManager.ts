import base64 from "react-native-base64";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";

export interface DeviceReference {
  name?: string | null;
  id?: string;
}

const COLOR_SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1214";
const COLOR_CHARACTARISTIC_WRITE = "19b10001-e8f2-537e-4f6c-d104768a1215";
const COLOR_CHARACTARISTIC_NOTIFY = "19b10001-e8f2-537e-4f6c-d104768a1216";

class BluetoothLeManager {
  bleManager: BleManager;
  device: Device | null;
  isListening = false;

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

  readColor = async () => {
    try {
      const rawColor = await this.bleManager.readCharacteristicForDevice(
        this.device?.id ?? "",
        COLOR_SERVICE,
        ""
      );
      return base64.decode(rawColor.value!);
    } catch (e) {
      console.log(e);
    }
  };

  sendAngle = async (newAngle: number) => {
    const data = base64.encode(newAngle.toString());
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

  onAngleUpdate = (
    error: BleError | null,
    charactaristic: Characteristic | null,
    emitter: (bleValue: { payload: string | BleError }) => void
  ) => {
    if (error) {
      console.log("ERROR", error);
      emitter({ payload: "#FFFFFF" });
    }
    const hexColor = base64.decode(charactaristic?.value!);
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
        (error, charactaristic) => {
          console.log("NOTIFY");
          this.onAngleUpdate(error, charactaristic, emitter);
        }
      );
    }
  };
}

const manager = new BluetoothLeManager();

export default manager;
