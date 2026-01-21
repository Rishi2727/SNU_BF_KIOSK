import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import { IoArrowBack } from "react-icons/io5";
import "./style.css";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
// import LanguageDropdown from "../../common/languageOption";
// import { logEvent } from "../../logger";
// import { logoutUser } from "../../Redux/Slices/authSlices";
import { useDispatch } from "react-redux";
// import Swal from "../../utils/MySwal";
import { client } from "../../services/api";

function Configuration() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    serverHost: "",
    protocol: "http://",
    apiKey: "",
    managerIpUrl: "",
    kioskMode: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [machineId, setMachineId] = useState("");
  const [serialDevices, setSerialDevices] = useState([]);
  const [serialPorts, setSerialPorts] = useState([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [appInfo, setAppInfo] = useState([]);
  const [portErrors, setPortErrors] = useState({});

  const baudrateOptions = ["9600", "19200", "38400", "57600", "115200"];
  const stopbitOptions = ["1", "1.5", "2"];
  const parityOptions = [
    { label: "None", value: 0 },
    { label: "Odd", value: 1 },
    { label: "Even", value: 2 },
  ];

  const fetchConfiguration = async () => {
    try {
      const config = await invoke("read_config");
      setFormData({
        serverHost: config.server,
        protocol: config.protocol || "http://",
        apiKey: config.api_key || "",
        managerIpUrl: config.manager_ip_url || "",
        kioskMode: config.kiosk_mode,
      });
      setMachineId(config.machineId);
      setSerialDevices(config.serialdata || []);
    } catch (error) {
      console.error("Failed to fetch configuration:", error);
    }
  };

  const fetchSerialPorts = async () => {
    try {
      const ports = await invoke("list_serial_ports");
      setSerialPorts(ports);
    } catch (error) {
      console.error("Failed to fetch serial ports:", error);
    }
  };

  const fetchAppInfo = async () => {
    try {
      const info = await invoke("get_app_info");
      setAppInfo(info);
    } catch (error) {
      console.error("Failed to fetch app info:", error);
    }
  };

  useEffect(() => {
    fetchAppInfo();
    fetchConfiguration();
    fetchSerialPorts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleKioskModeChange = (value) => {
    setFormData((prev) => ({ ...prev, kioskMode: value }));
  };

  const handleNetworkingChange = (isSecure) => {
    setFormData((prev) => ({
      ...prev,
      protocol: isSecure ? "https://" : "http://",
    }));
  };

  const handleSerialDeviceChange = (id, field, value) => {
    setSerialDevices((prev) => {
      const updated = prev.map((device) =>
        device.ID === id
          ? {
            ...device,
            [field]: ["baudrate", "stopbit", "databit", "parity"].includes(field)
              ? parseInt(value, 10) || 0
              : value,
          }
          : device
      );
      validateSerialPorts(updated);
      return updated;
    });
  };

  const validateSerialPorts = (devices) => {
    const ports = devices.map((d) => d.port);
    const errors = {};
    devices.forEach((device) => {
      if (device.port && ports.filter((p) => p === device.port).length > 1) {
        errors[device.ID] = "This port is already selected for another device.";
      }
    });
    setPortErrors(errors);
  };

  const validateSerialDevices = () => {
    return Object.keys(portErrors).length === 0;
  };

  const validateForm = () => {
    const errors = {};
    if (/^https?:\/\//i.test(formData.serverHost)) {
      errors.serverHost = "Please remove 'http://' or 'https://' from the Host field.";
    }
    if (!formData.apiKey.trim()) {
      errors.apiKey = "API Key is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClick = () => {
    // logEvent("info", "clicked save button");

    const isFormValid = validateForm();
    const isSerialValid = validateSerialDevices();

    if (!isFormValid || !isSerialValid) {
      // logEvent("error", "Validation errors found");
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleSubmit = async () => {
    // logEvent("info", "Submitting configuration");
    try {
      const updatedConfig = {
        server: formData.serverHost,
        protocol: formData.protocol,
        api_key: formData.apiKey,
        manager_ip_url: formData.managerIpUrl,
        kiosk_mode: formData.kioskMode.toString(),
        serialdata: serialDevices.map((device) => ({
          ...device,
          baudrate: parseInt(device.baudrate, 10),
          stopbit: parseInt(device.stopbit, 10),
          databit: parseInt(device.databit, 10),
          parity: parseInt(device.parity, 10),
        })),
      };

      // Save to Tauri
      await invoke("update_config", { key: "server", value: updatedConfig.server });
      await invoke("update_config", { key: "protocol", value: updatedConfig.protocol });
      await invoke("update_config", { key: "api_key", value: updatedConfig.api_key });
      await invoke("update_config", { key: "manager_ip_url", value: updatedConfig.manager_ip_url });
      await invoke("update_config", { key: "kiosk_mode", value: updatedConfig.kiosk_mode });
      await invoke("update_config", {
        key: "serialdata",
        value: JSON.stringify(updatedConfig.serialdata),
      });

      const apiKey = formData.apiKey;
      const protocol = formData.protocol;
      const host = formData.serverHost;

      const BASE_URL = `${protocol}${host}/api/v1/kiosk`;
      const url = `${BASE_URL}/login/${machineId}`;

      const response = await client.get(url, {
        headers: {
          "x-api-key": apiKey,
          "x-kiosk-uuid": machineId,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });
      
      // logEvent("info", `Configuration update response: ${JSON.stringify(response.data)}`);
      
      if (response.data.success) {
        // logEvent("info", "Configuration updated and logged in successfully");
        setShowConfirmationModal(false);
        setShowSuccessModal(true);
      } else {
        // Swal.fire({
        //   icon: "error",
        //   title: "Login Failed",
        //   text: response.data.error_message || "Unknown error occurred",
        // });
        setShowConfirmationModal(false);
      }
    } catch (error) {
      console.error("Failed to update configuration or login:", error);

      if (error.response && error.response.status === 403) {
        setShowConfirmationModal(false);
       // Swal.fire({
       //   icon: "success",
       //   title: t("Kiosk Registered"),
       //   text: t("Kiosk registration completed successfully. Kindly ensure kiosk access is enabled by the seat manager."),
       //   confirmButtonText: t("OK"),
       // });
      } else {
        // Swal.fire({
        //   icon: "error",
        //   title: t("Error"),
        //   text: t("Invalid configuration credentials"),
        //   confirmButtonText: t("OK"),
        // });
      }

      setShowConfirmationModal(false);
    }
  };

  const handleRestart = () => {
    invoke("restart_app")
      .then(() => {
        console.log("Restart triggered successfully");
      })
      .catch((error) => {
        console.error("Failed to restart the app:", error);
        // Swal.fire({
        //   icon: "error",
        //   title: "Error",
        //   text: "Failed to restart the application.",
        // });
      });
  };

  const handleCancel = () => {
    navigate("/");
    // dispatch(logoutUser());
    // logEvent("info", "Back to Dashboard");
  };

  return (
    <div className="outer-containers flex flex-col items-center pt-10 pb-10">
      <div className="inner-containers flex flex-col flex-grow p-6 bg-gray-100">
        <div className="configurationLang flex justify-center items-center absolute  bg-[#8c989c85] sm:right-[20%] sm:top-[8%] 2xl:right-[22%] 2xl:top-[6%] rounded-lg sm:px-3 2xl:px-2">
          {/* <LanguageDropdown /> */}
        </div>
        <div className="flex justify-between pl-2 mb-10">
          <div
            onClick={handleCancel}
            className="cursor-pointer text-black hover:underline mb-4 text-4xl flex justify-start"
          >
            {/* <IoArrowBack /> */}
          </div>
          <div className="w-full text-2xl font-semibold mb-4 text-gray-800 text-center">
            {t('Configuration Settings')}
          </div>
        </div>

        <div className="form-section flex-grow overflow-y-auto mb-4 p-4 bg-white border border-gray-300 rounded-lg scrollbar-thin">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-700">{t('Server Information')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[12%] gap-y-4">

                <div className="grid grid-cols-6">
                  <label className="block col-span-1  text-gray-700 font-semibold">{t('HTTPS Networking:')}</label>
                  <div className="col-span-5 flex gap-20 border pl-6 rounded-md ml-5">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="networking"
                        checked={formData.protocol === "https://"}
                        onChange={() => handleNetworkingChange(true)}
                        className="mr-2"
                      />
                      {t('Applied')}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="networking"
                        checked={formData.protocol === "http://"}
                        onChange={() => handleNetworkingChange(false)}
                        className="mr-2"
                      />
                      {t('Not Applied')}
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-6">
                  <label className="block col-span-1 text-gray-700 font-semibold">{t('URL Address')}:</label>
                  <div className="col-span-5 flex flex-col">
                    <input
                      type="text"
                      name="serverHost"
                      className={`w-full px-4 py-2 border rounded-md ${formErrors.serverHost ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter URL (without http:// or https://)"
                      value={formData.serverHost}
                      onChange={handleInputChange}
                    />
                    {formErrors.serverHost && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.serverHost}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-4">
                  <label className="block col-span-1 text-gray-700 font-semibold">
                    {t('API Parameters')}:
                  </label>
                  <div className="col-span-5 flex flex-col ml-4">
                    <input
                      type="password"
                      name="apiKey"
                      className={`w-full px-4 py-2 border rounded-md ${formErrors.apiKey ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter API Key"
                      value={formData.apiKey}
                      onChange={handleInputChange}
                    />
                    {formErrors.apiKey && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.apiKey}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-4">
                  <label className="block col-span-1 text-gray-700 font-semibold">
                    {t('Manager Call PC')}:
                  </label>
                  <div className="col-span-5 flex flex-col">
                    <input
                      type="text"
                      name="managerIpUrl"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="http://000.000.0.0:0000"
                      value={formData.managerIpUrl}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('Peripheral Settings')}</h2>
              {serialDevices.map((device) => (
                <fieldset
                  key={device.ID}
                  className="device-section mb-4 p-4 border border-gray-200 rounded-md shadow-sm"
                >
                  <legend className="text-base font-bold text-gray-600 px-2">{t(device.name)}</legend>
                  {portErrors[device.ID] && (
                    <p className="text-red-500 text-sm mt-0">{portErrors[device.ID]}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[12%] gap-y-2">
                    <div className="grid grid-cols-6 gap-2">
                      <label className="block col-span-1 text-gray-700 font-semibold">{t('Port')}:</label>
                      <select
                        className="w-full px-4 py-2 border col-span-5 border-gray-300 rounded-md"
                        value={device.port}
                        onChange={(e) => handleSerialDeviceChange(device.ID, "port", e.target.value)}
                      >
                        <option value="">{t('Select Port')}</option>
                        {serialPorts.map((port) => (
                          <option key={port} value={port}>{port}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      <label className="block col-span-1 text-gray-700 font-semibold">{t('Baud Rate:')}</label>
                      <select
                        className="w-full px-4 py-2 border col-span-5 border-gray-300 rounded-md"
                        value={device.baudrate}
                        onChange={(e) => handleSerialDeviceChange(device.ID, "baudrate", e.target.value)}
                      >
                        <option value="">{t('Select Baud Rate')}</option>
                        {baudrateOptions.map((rate) => (
                          <option key={rate} value={rate}>{rate}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('System Settings')}</h2>
              <fieldset className="border border-gray-200 rounded-md p-4">
                <legend className="font-bold text-gray-600 px-2">{t('Kiosk Mode')}</legend>
                <div className="flex items-center space-x-20">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="kioskMode"
                      value={true}
                      checked={formData.kioskMode === true}
                      onChange={() => handleKioskModeChange(true)}
                      className="mr-2"
                    />
                    <span>{t('Enabled')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="kioskMode"
                      value={false}
                      checked={formData.kioskMode === false}
                      onChange={() => handleKioskModeChange(false)}
                      className="mr-2"
                    />
                    <span>{t('Disabled')}</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </form>
        </div>

        <div className="footers flex flex-col sm:flex-row justify-between items-center">
          <div className="flex-grow flex flex-col sm:flex-row justify-start gap-x-[5%]">
            <div className="flex gap-y-6 flex-col sm:flex-row gap-x-20">
              <div className="flex flex-col">
                <strong className="text-gray-700 text-lg sm:text-xl">{t('Device ID-')}</strong>
                <span className="text-gray-800 text-md">{machineId}</span>
              </div>
            </div>

            <div className="flex flex-col sm:border-l-2 border-gray-300 sm:pl-4 mt-4 sm:mt-0">
              <strong className="text-gray-700 font-bold text-lg sm:text-xl pl-0 sm:pl-0">{t('App Version')}</strong>
              <span className="text-gray-500 sm:text-md pl-0 sm:pl-0">{appInfo.version}</span>
            </div>

            <div className="flex flex-col sm:border-l-2 border-gray-300 sm:pl-4 mt-4 sm:mt-0">
              <strong className="text-gray-700 font-bold text-lg sm:text-xl pl-0 sm:pl-0">{t('Release Date')}</strong>
              <span className="text-gray-500 sm:text-md pl-0 sm:pl-0">{appInfo.release_date}</span>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 mt-4 sm:mt-0">
            <button
              onClick={handleSaveClick}
              className="bg-blue-600 text-white font-bold py-2 px-8 rounded-md hover:bg-blue-700 transition duration-200"
            >
              {t('Save')}
            </button>
          </div>
        </div>
      </div>

      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('Confirm Changes')}</h3>
            <p>{t('Are you sure you want to save changes?')}</p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {t('Yes')}
              </button>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-400 text-white py-2 px-4 rounded-md hover:bg-gray-500"
              >
                {t('No')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('Success')}</h3>
            <p>{t('Changes saved successfully!')}</p>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleRestart}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {t('Restart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Configuration;