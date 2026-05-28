export function Input({ className = '', ...props }) {
  return (
    <input
      className={`block w-full px-3 py-2 border border-[#E8E8E4] rounded shadow-sm placeholder-[#A8A8A4] focus:outline-none focus:ring-1 focus:ring-[rgba(208,56,57,0.12)] focus:border-[#D03839] ${className}`}
      {...props}
    />
  )
}