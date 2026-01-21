import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import {
    ArrowLeft,
    Server,
    Key,
    Wifi,
    Monitor,
    Settings,
    Save,
    Globe,
    Shield,
    Cpu,
    HardDrive,
    Calendar,
    Info,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import './Configuration.css';
import Dropdown from '../../components/common/dropdown';
import { client } from '../../services/api';
import Modal from '../../components/common/Modal';


const Configuration = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [language, setLanguage] = useState("KR");
    const [formData, setFormData] = useState({
        managerIpUrl: '',
        kioskMode: false
    });
    const [serialDevices, setSerialDevices] = useState([]);
    const [serialPorts, setSerialPorts] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [machineId, setMachineId] = useState("");
    const [appInfo, setAppInfo] = useState([]);
    const [portErrors, setPortErrors] = useState({});
    const baudrateOptions = ['9600', '19200', '38400', '57600', '115200'];


    // Modal states
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleKioskModeChange = (value) => {
        setFormData((prev) => ({ ...prev, kioskMode: value }));
    };

    const handleLanguageChange = async (uiLang) => {
        const backendLang = uiLang === "KR" ? "ko" : "en";
        // UI + local
        setLanguage(uiLang);
        localStorage.setItem("lang", backendLang);
        i18n.changeLanguage(backendLang);
        dispatch(setLanguageAction(backendLang));
    };



    const fetchConfiguration = async () => {
        try {
            const config = await invoke("read_config");
            setFormData({
                managerIpUrl: config.manager_ip_url || "",
                kioskMode: config.kiosk_mode,
            });
            setMachineId(config.machineId);
            setSerialDevices(config.serialdata || []);
        } catch (err) {
            console.error("Failed to fetch config", err);
        }
    };

    const fetchSerialPorts = async () => {
        try {
            const ports = await invoke("list_serial_ports");
            setSerialPorts(ports || []);
        } catch (err) {
            console.error("Failed to fetch serial ports", err);
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

    const handleSerialDeviceChange = (id, field, value) => {
        setSerialDevices(prev => {
            const updated = prev.map(device =>
                device.ID === id
                    ? {
                        ...device,
                        [field]: field === "baudrate" ? parseInt(value, 10) || 0 : value
                    }
                    : device
            );
            validateSerialPorts(updated);
            return updated;
        });
    };
    const validateSerialPorts = (devices) => {
        const ports = devices.map((d) => d.port).filter(p => p);
        const errors = {};
        devices.forEach((device) => {
            if (device.port && ports.filter((p) => p === device.port).length > 1) {
                errors[device.ID] = t("This port is already selected for another device.");
            }
        });
        setPortErrors(errors);
    };

    const validateSerialDevices = () => {
        return Object.keys(portErrors).length === 0;
    };
    const handleSaveClick = () => {
        const isSerialValid = validateSerialDevices();

        if (!isSerialValid) {
            setErrorMessage(t("Please fix the serial port errors before saving."));
            setShowErrorModal(true);
            return;
        }

        setShowConfirmationModal(true);
    };
    const handleBack = () => {
        navigate('/');
    };
const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
        // 1️⃣ Save manager IP URL
        await invoke("update_config", {
            key: "manager_ip_url",
            value: formData.managerIpUrl
        });

        // 2️⃣ Save kiosk mode
        await invoke("update_config", {
            key: "kiosk_mode",
            value: formData.kioskMode.toString()
        });

        // 3️⃣ Save serial devices
        const serialDataToSave = serialDevices.map((device) => ({
            ...device,
            baudrate: parseInt(device.baudrate, 10),
        }));

        await invoke("update_config", {
            key: "serialdata",
            value: JSON.stringify(serialDataToSave),
        });

        // ✅ SUCCESS (no API call here)
        setShowConfirmationModal(false);
        setShowSuccessModal(true);

    } catch (error) {
        console.error("Failed to save configuration:", error);
        setShowConfirmationModal(false);
        setErrorMessage(t("Failed to save configuration"));
        setShowErrorModal(true);
    } finally {
        setIsSaving(false);
    }
};



    const handleRestart = () => {
        invoke("restart_app")
            .then(() => {
                console.log("Restart triggered successfully");
            })
            .catch((error) => {
                console.error("Failed to restart the app:", error);
                setErrorMessage(t("Failed to restart the application."));
                setShowErrorModal(true);
            });
    };

    return (
        <div className="config-outer-container">
            <div className="config-inner-container ">

                {/* Header Section */}
                <div className="config-header">
                    <button
                        onClick={handleBack}
                        className="config-back-button group"
                    >
                        <ArrowLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
                    </button>

                    <h1 className="config-title">
                        <Settings className="w-7 h-7" />
                        {t('Configuration Settings')}
                    </h1>

                    <div className="config-header-spacer">

                    </div>
                </div>

                {/* Main Content */}
                <div className="config-content">

                    {/* Server Information Section */}
                    <section className="config-section">
                        <div className="config-section-header">
                            <Server className="w-6 h-6 text-[#FFCA08]" />
                            <h2>{t('Server Information')}</h2>
                        </div>

                        <div className="config-grid">
                            {/* Manager Call PC */}
                            <div className="config-field">
                                <label className="config-label">
                                    <Monitor className="w-5 h-5" />
                                    {t('Manager Call PC')}
                                </label>
                                <input
                                    type="text"
                                    name="managerIpUrl"
                                    value={formData.managerIpUrl}
                                    onChange={handleInputChange}
                                    placeholder="http://000.000.0.0:0000"
                                    className="config-input"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Peripheral Settings Section */}
                    <section className="config-section">
                        <div className="config-section-header">
                            <Wifi className="w-6 h-6 text-[#FFCA08]" />
                            <h2>{t('Peripheral Settings')}</h2>
                        </div>

                        {serialDevices.map((device) => {
                            return (
                                <div key={device.ID} className="config-device-card">
                                    <h3 className="config-device-title">{t(device.name)}</h3>

                                    {portErrors[device.ID] && (
                                        <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                            <p className="text-red-700 text-sm">{portErrors[device.ID]}</p>
                                        </div>
                                    )}

                                    <div className="config-grid-2">
                                        <Dropdown
                                            label={t('Port')}
                                            options={serialPorts}
                                            value={device.port}
                                            onChange={(value) =>
                                                handleSerialDeviceChange(device.ID, "port", value)
                                            }
                                            placeholder={t('Select Port')}
                                        />

                                        <Dropdown
                                            label={t('Baud Rate')}
                                            options={baudrateOptions}
                                            value={device.baudrate}
                                            onChange={(value) =>
                                                handleSerialDeviceChange(device.ID, "baudrate", value)
                                            }
                                            placeholder={t('Select Baud Rate')}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </section>

                    {/* System Settings Section */}
                    <section className="config-section">
                        <div className="config-section-header">
                            <Settings className="w-6 h-6 text-[#FFCA08]" />
                            <h2>{t('System Settings')}</h2>
                        </div>

                        <div className="config-device-card">
                            <h3 className="config-device-title">{t('Kiosk Mode')}</h3>

                            <div className="config-radio-group">
                                <label className="config-radio-option">
                                    <input
                                        type="radio"
                                        name="kioskMode"
                                        checked={formData.kioskMode === true}
                                        onChange={() => handleKioskModeChange(true)}
                                        className="config-radio-input"
                                    />
                                    <span className="config-radio-label">{t('Enabled')}</span>
                                    <span className="config-radio-indicator"></span>
                                </label>

                                <label className="config-radio-option">
                                    <input
                                        type="radio"
                                        name="kioskMode"
                                        checked={formData.kioskMode === false}
                                        onChange={() => handleKioskModeChange(false)}
                                        className="config-radio-input"
                                    />
                                    <span className="config-radio-label">{t('Disabled')}</span>
                                    <span className="config-radio-indicator"></span>
                                </label>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer Section */}
                <div className="config-footer">
                    <div className="config-info-grid">
                        <div className="config-info-item">
                            <Cpu className="w-6 h-6 text-[#FFCA08]" />
                            <div>
                                <strong className="config-info-label">{t('Device ID')}</strong>
                                <span className="config-info-value">{machineId}</span>
                            </div>
                        </div>

                        <div className="config-info-divider"></div>

                        <div className="config-info-item">
                            <HardDrive className="w-6 h-6 text-[#FFCA08]" />
                            <div>
                                <strong className="config-info-label">{t('App Version')}</strong>
                                <span className="config-info-value">{appInfo.version}</span>
                            </div>
                        </div>

                        <div className="config-info-divider"></div>

                        <div className="config-info-item">
                            <Calendar className="w-6 h-6 text-[#FFCA08]" />
                            <div>
                                <strong className="config-info-label">{t('Release Date')}</strong>
                                <span className="config-info-value">{appInfo.release_date}</span>
                            </div>
                        </div>
                    </div>

                    {/* 🌐 LANGUAGE */}
                    <div className="flex rounded-xl border-2 border-white">
                        {["KR", "EN"].map((lang, i) => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageChange(lang)}
                                className={`min-w-20 h-12 text-[28px] font-bold
        ${language === lang ? "bg-[#FFCA08] rounded-lg text-white" : "bg-white text-black"}
     `}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="config-save-button group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-6 h-6 transition-transform group-hover:scale-110" />
                        {isSaving ? t('Saving...') : t('Save')}
                    </button>
                </div>

            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmationModal}
                onClose={() => !isSaving && setShowConfirmationModal(false)}
                title={t('Confirm Changes')}
                size="medium"
                showCloseButton={!isSaving}
                footer={
                    <div className="flex justify-end gap-4">
                        <button
                            onClick={() => setShowConfirmationModal(false)}
                            disabled={isSaving}
                            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('No')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-[#FFCA08] text-white rounded-lg hover:bg-[#e5b607] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? t('Saving...') : t('Yes')}
                        </button>
                    </div>
                }
            >
                <p className="text-gray-700 text-lg">{t('Are you sure you want to save changes?')}</p>
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => { }}
                title={t('Success')}
                size="small"
                showCloseButton={false}
                footer={
                    <div className="flex justify-end">
                        <button
                            onClick={handleRestart}
                            className="px-6 py-2 bg-[#FFCA08] text-white rounded-lg hover:bg-[#e5b607] transition-colors"
                        >
                            {t('Restart')}
                        </button>
                    </div>
                }
            >
                <div className="flex items-start gap-4">
                    <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                    <div>
                        <p className="text-gray-700 text-lg font-medium mb-2">
                            {t('Changes saved successfully!')}
                        </p>
                        <p className="text-gray-600 text-sm">
                            {t('Please restart the application to apply the changes.')}
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={t('Error')}
                size="small"
                footer={
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="px-6 py-2 bg-[#FFCA08] text-white rounded-lg hover:bg-[#e5b607] transition-colors"
                        >
                            {t('OK')}
                        </button>
                    </div>
                }
            >
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500 flex-shrink-0" />
                    <p className="text-gray-700 text-lg">{errorMessage}</p>
                </div>
            </Modal>
        </div>
    );
};

export default Configuration;