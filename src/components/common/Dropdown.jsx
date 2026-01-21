import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Dropdown Component
 * @param {string} label - Label for the dropdown
 * @param {array} options - Array of options [{label: string, value: any}] or simple strings
 * @param {any} value - Currently selected value
 * @param {function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether dropdown is disabled
 * @param {string} error - Error message to display
 * @param {string} className - Additional CSS classes
 */
const Dropdown = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    disabled = false,
    error = "",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Normalize options to always have {label, value} format
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    // Find selected option
    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={`dropdown-container ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-gray-700 font-semibold mb-2 text-lg">
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Dropdown Button */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
            w-full px-4 py-2.5 text-left
            bg-white border-2 rounded-xl
            flex items-center justify-between
            transition-all duration-300 ease-in-out
            ${error
                            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-300 hover:border-[#FFCA08] focus:border-[#FFCA08] focus:ring-2 focus:ring-[#FFCA08]/20'
                        }
            ${disabled
                            ? 'bg-gray-100 cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:shadow-md'
                        }
            ${isOpen ? 'border-[#FFCA08] ring-2 ring-[#FFCA08]/20 shadow-lg' : ''}
          `}
                >
                    <span className={`text-base ${selectedOption ? 'text-gray-800' : 'text-gray-400'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>

                    <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FFCA08]' : ''
                            }`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-[#FFCA08]/30 rounded-xl shadow-2xl overflow-hidden animate-dropdown-open">
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-[#FFCA08] scrollbar-track-gray-100">
                            {normalizedOptions.length === 0 ? (
                                <div className="px-4 py-3 text-gray-400 text-center">
                                    No options available
                                </div>
                            ) : (
                                normalizedOptions.map((option, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        className={`
                      w-full px-3 py-3 text-left text-base
                      transition-all duration-200
                      ${option.value === value
                                                ? 'bg-gradient-to-r from-[#FFCA08] to-[#FFD640] text-white font-semibold'
                                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#FFCA08]/10 hover:to-[#FFD640]/10'
                                            }
                      ${index !== normalizedOptions.length - 1 ? 'border-b border-gray-100' : ''}
                    `}
                                    >
                                        {option.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1 animate-shake">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Dropdown;
