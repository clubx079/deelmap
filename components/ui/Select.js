'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export function Select({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = 'Select...', 
  multiple = false,
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (option) => {
    if (multiple) {
      const newValue = value.includes(option.value)
        ? value.filter(v => v !== option.value)
        : [...value, option.value]
      onChange(newValue)
    } else {
      onChange(option.value)
      setIsOpen(false)
    }
  }

  const displayValue = () => {
    if (multiple) {
      if (value.length === 0) return placeholder
      if (value.length === 1) {
        const option = options.find(opt => opt.value === value[0])
        return option ? option.label : placeholder
      }
      return `${value.length} selected`
    } else {
      const option = options.find(opt => opt.value === value)
      return option ? option.label : placeholder
    }
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:border-[#b29578] focus:outline-none focus:ring-1 focus:ring-[#b29578] focus:border-[#b29578] flex items-center justify-between transition-colors"
      >
        <span className="block truncate">{displayValue()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center transition-colors ${
                multiple && value.includes(option.value) ? 'bg-blue-50' : ''
              }`}
            >
              {multiple && (
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => {}}
                  className="mr-2 accent-[#b29578]"
                />
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}