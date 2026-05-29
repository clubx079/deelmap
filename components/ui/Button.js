export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white focus:ring-[#D03839]',
    secondary: 'bg-[#F3F3F0] hover:bg-[#E8E8E4] text-[#1A1816] focus:ring-[#D4D4CF]',
    outline: 'border border-[#D03839] text-[#D03839] hover:bg-[#FEF0EF] focus:ring-[#D03839]'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}