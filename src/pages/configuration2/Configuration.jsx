import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
    Info
} from 'lucide-react';

import './Configuration.css';
import Dropdown from '../../components/common/dropdown';
import { setLanguage } from '../../redux/slice/langSlice';

const Configuration = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [language, setLanguage] = useState("KR");
    // Mock state for UI demonstration
    const [formData, setFormData] = useState({
        serverHost: '',
        protocol: 'http://',
        apiKey: '',
        managerIpUrl: '',
        kioskMode: false
    });

    const [serialDevices] = useState([
        { ID: 1, name: 'Barcode Scanner', port: '', baudrate: '' },
        { ID: 2, name: 'Receipt Printer', port: '', baudrate: '' },
    ]);

    const [formErrors] = useState({});
    const [machineId] = useState('KIOSK-2024-001-SNU');
    const [appInfo] = useState({
        version: '2.1.0',
        release_date: '2024-01-15'
    });

    // Mock options
    const serialPorts = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];
    const baudrateOptions = ['9600', '19200', '38400', '57600', '115200'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleSave = () => {
        console.log('Save configuration:', formData);
    };

    const handleLanguageChange = async (uiLang) => {
        const backendLang = uiLang === "KR" ? "ko" : "en";
        // UI + local
        setLanguage(uiLang);
        localStorage.setItem("lang", backendLang);
        i18n.changeLanguage(backendLang);
        dispatch(setLanguageAction(backendLang));
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

                        {serialDevices.map((device) => (
                            <div key={device.ID} className="config-device-card">
                                <h3 className="config-device-title">{t(device.name)}</h3>

                                <div className="config-grid-2">
                                    <Dropdown
                                        label={t('Port')}
                                        options={serialPorts}
                                        value={device.port}
                                        onChange={(value) => console.log('Port changed:', value)}
                                        placeholder={t('Select Port')}
                                    />

                                    <Dropdown
                                        label={t('Baud Rate')}
                                        options={baudrateOptions}
                                        value={device.baudrate}
                                        onChange={(value) => console.log('Baudrate changed:', value)}
                                        placeholder={t('Select Baud Rate')}
                                    />
                                </div>
                            </div>
                        ))}
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
                                        onChange={() => setFormData(prev => ({ ...prev, kioskMode: true }))}
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
                                        onChange={() => setFormData(prev => ({ ...prev, kioskMode: false }))}
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
                        onClick={handleSave}
                        className="config-save-button group"
                    >
                        <Save className="w-6 h-6 transition-transform group-hover:scale-110" />
                        {t('Save')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Configuration;