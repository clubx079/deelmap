'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

export default function CashOfferPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    propertyType: 'Single Family House',
    fullAddress: '',
    state: 'Alabama',
    closingTime: '',
    askingPrice: '',
    negotiable: 'Yes',
    contactDate: '',
    condition: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const addressRef = useRef(null)
  const autocompleteRef = useRef(null)

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ]

  // Load Google Places API and Initialize Autocomplete
  useEffect(() => {
    if (typeof window === 'undefined' || !addressRef.current) return

    loadGoogleMapsAPI().then(() => {
      if (addressRef.current && window.google?.maps?.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (place.formatted_address) {
          setFormData(prev => ({
            ...prev,
            fullAddress: place.formatted_address
          }))
        }
      })
    }
    }).catch((error) => {
      console.error('Failed to load Google Maps API:', error)
    })
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const submitToMonday = async (data) => {
    const mutation = `
      mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item (
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `

    const variables = {
      boardId: "7789594745",
      groupId: "topics",
      itemName: `Cash Offer - ${data.firstName} ${data.lastName}`,
      columnValues: JSON.stringify({
        short_text8: data.firstName,
        short_textcp5kwc0i: data.lastName,
        email: { email: data.email, text: data.email },
        number: data.phoneNumber,
        short_text__1: data.propertyType,
        short_text: data.fullAddress,
        state__1: data.state,
        number9: parseInt(data.closingTime) || 0,
        number0: parseFloat(data.askingPrice.replace(/[^0-9.-]+/g, "")) || 0,
        single_select7: data.negotiable,
        date: data.contactDate,
        long_text: data.condition
      })
    }

    try {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQzMTQ5MDY2OCwiYWFpIjoxMSwidWlkIjo2NzgyNDc3MywiaWFkIjoiMjAyNC0xMS0wM1QxMDo0OToyMi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTQ5NDQ5MTQsInJnbiI6InVzZTEifQ.M2y5qvKTBugSmKQLJnPFinl9o1h0H70yCAVnsM75p0M'
        },
        body: JSON.stringify({ query: mutation, variables })
      })

      if (!response.ok) {
        throw new Error('Failed to submit to Monday.com')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting to Monday.com:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await submitToMonday(formData)
      setSubmitted(true)
    } catch (error) {
      alert('There was an error submitting your information. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar currentPage="cashoffer" />
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600">Your cash offer request has been submitted successfully. We'll contact you soon.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar currentPage="cashoffer" />

      {/* Form Section */}
      <section 
        className="py-16 lg:py-20"
        style={{ backgroundColor: '#F6F4F1' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center mb-12">
            <p 
              className="text-sm font-semibold tracking-wider uppercase mb-4"
              style={{ color: 'var(--secondary-color)' }}
            >
              FILL OUT THE FORM TO CONNECT WITH US AND KICKSTART YOUR SALE!
            </p>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold"
              style={{ color: 'var(--primary-color)' }}
            >
              SELL YOUR PROPERTY SEAMLESSLY
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seller Phone Number (Numbers only) *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Property *
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Single Family House">Single Family House</option>
                  <option value="Multi Family House">Multi Family House</option>
                  <option value="Land">Land</option>
                  <option value="Commercial/ Industrial">Commercial/ Industrial</option>
                </select>
              </div>

              {/* Full Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address (Include - City, State, Zip) *
                </label>
                <input
                  ref={addressRef}
                  type="text"
                  name="fullAddress"
                  value={formData.fullAddress}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Closing Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Time (Numbers referring to days) *
                </label>
                <input
                  type="number"
                  name="closingTime"
                  value={formData.closingTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Asking Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asking Price *
                </label>
                <input
                  type="text"
                  name="askingPrice"
                  value={formData.askingPrice}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Is it negotiable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Is it negotiable? *
                </label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="negotiable"
                      value="Yes"
                      checked={formData.negotiable === 'Yes'}
                      onChange={handleInputChange}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="negotiable"
                      value="No"
                      checked={formData.negotiable === 'No'}
                      onChange={handleInputChange}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {/* Contact Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When would you like us to contact you? *
                </label>
                <input
                  type="date"
                  name="contactDate"
                  value={formData.contactDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Condition/Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition / Notes
                </label>
                <textarea
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Ex: number of bedrooms, bathrooms, condition of roof, flooring, kitchen, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#022b41] hover:bg-[#033a56] disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-bold text-lg uppercase tracking-wider transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? 'SENDING...' : 'SEND'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Process Steps Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-16">
            
            {/* Step 1 */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#022b41] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <div className="flex justify-center mb-4">
                  <Image
                    src="/assets/cash/1.svg"
                    alt="Submit Property"
                    width={100}
                    height={100}
                    className="w-24 h-24"
                  />
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">Submit your property above.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#022b41] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <div className="flex justify-center mb-4">
                  <Image
                    src="/assets/cash/2.svg"
                    alt="Agent Contact"
                    width={100}
                    height={100}
                    className="w-24 h-24"
                  />
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">An agent will reach out soon to discuss an offer with you.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#022b41] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <div className="flex justify-center mb-4">
                  <Image
                    src="/assets/cash/3.svg"
                    alt="Cash Offer"
                    width={100}
                    height={100}
                    className="w-24 h-24"
                  />
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">Present the as-is, cash offer to your seller.</p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#022b41] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">4</span>
                </div>
                <div className="flex justify-center mb-4">
                  <Image
                    src="/assets/cash/4.svg"
                    alt="Close Deal"
                    width={100}
                    height={100}
                    className="w-24 h-24"
                  />
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">Close the deal and repeat.</p>
            </div>
          </div>

          {/* Bottom Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
            
            {/* Get Paid */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-center mb-6">
                <Image
                  src="/assets/cash/6.svg"
                  alt="Get Paid"
                  width={100}
                  height={100}
                  className="w-24 h-24"
                />
              </div>
              <h3 
                className="text-xl lg:text-2xl font-bold mb-4"
                style={{ color: 'var(--primary-color)' }}
              >
                GET PAID
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                No service fees or commissions to New Western.
              </p>
            </div>

            {/* Quick Close */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-center mb-6">
                <Image
                  src="/assets/cash/7.svg"
                  alt="Quick Close"
                  width={100}
                  height={100}
                  className="w-24 h-24"
                />
              </div>
              <h3 
                className="text-xl lg:text-2xl font-bold mb-4"
                style={{ color: 'var(--primary-color)' }}
              >
                QUICK CLOSE
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Sellers receive a credible as-is, quick close option with New Western cash offers.
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}