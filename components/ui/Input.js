export function Input({ className = '', ...props }) {
  return (
    <input
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#b29578] focus:border-[#b29578] ${className}`}
      {...props}
    />
  )
}