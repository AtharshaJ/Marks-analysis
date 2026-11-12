
import { useEffect, useRef, useState } from 'react'
import './CustomDropdown.css'

function CustomDropdown({
    value,
    options,
    onChange,
    placeholder,
    disabled = false,
    searchable = false,
    searchPlaceholder = 'Search options...'
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef(null)

    const selectedOption = options.find(
        option => String(option.value) === String(value)
    )

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = event => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false)
                setSearchTerm('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            )
        }
    }, [])

    const handleSelect = optionValue => {
        onChange(optionValue)
        setIsOpen(false)
        setSearchTerm('')
    }

    const handleToggle = () => {
        if (disabled) return

        setIsOpen(previous => !previous)
        setSearchTerm('')
    }

    return (
        <div
            className={`custom-dropdown ${disabled ? 'disabled' : ''}`}
            ref={dropdownRef}
        >
            <button
                type="button"
                className={`custom-dropdown-trigger ${
                    isOpen ? 'open' : ''
                }`}
                onClick={handleToggle}
                disabled={disabled}
                aria-expanded={isOpen}
            >
                <span>
                    {selectedOption
                        ? selectedOption.label
                        : placeholder}
                </span>

                <span className="custom-dropdown-arrow">
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className="custom-dropdown-menu">

                    {searchable && (
                        <div className="custom-dropdown-search">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e =>
                                    setSearchTerm(e.target.value)
                                }
                                placeholder={searchPlaceholder}
                                autoFocus
                            />
                        </div>
                    )}

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <button
                                type="button"
                                key={option.value}
                                className={`custom-dropdown-option ${
                                    String(option.value) === String(value)
                                        ? 'selected'
                                        : ''
                                }`}
                                onClick={() =>
                                    handleSelect(option.value)
                                }
                            >
                                {option.label}

                                {String(option.value) === String(value) && (
                                    <span>✓</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="custom-dropdown-empty">
                            No matching options found
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default CustomDropdown
