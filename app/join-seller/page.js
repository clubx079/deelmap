'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function JoinSellerPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    businessName: '',
    contactPersonName: '',
    email: '',
    phone: '',
    businessType: 'individual',
    dealsPerMonth: '1-2',
    primaryMarkets: '',
    propertyTypes: [],
    website: '',
    linkedin: '',
    description: ''
  })

  // Phone number formatter
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData({ ...formData, phone: formatted })
  }

  const propertyTypeOptions = [
    { value: 'single-family', label: 'Single-Family' },
    { value: 'multi-family', label: 'Multi-Family' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' }
  ]

  const handlePropertyTypeChange = (value) => {
    if (formData.propertyTypes.includes(value)) {
      setFormData({
        ...formData,
        propertyTypes: formData.propertyTypes.filter(type => type !== value)
      })
    } else {
      setFormData({
        ...formData,
        propertyTypes: [...formData.propertyTypes, value]
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.propertyTypes.length === 0) {
      setError('Please select at least one property type')
      setLoading(false)
      return
    }

    if (formData.description.length > 300) {
      setError('Description must be 300 characters or less')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/seller-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-10 py-20">
          <div className="bg-white border-2 border-slate-300 p-10 lg:p-12 text-center">
            <div className="mb-8">
              <div className="w-16 h-1 bg-slate-900 mx-auto mb-6"></div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                Application Received
              </h1>
              <p className="text-xl text-slate-600 mb-8">
                Thank you for applying to become a seller on Deelmap.
              </p>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 p-6 mb-8 text-left">
              <p className="text-slate-700 leading-relaxed">
                We've received your application and our team will review it within <strong className="text-slate-900">24-48 hours</strong>.
                You'll receive an email at <strong className="text-slate-900">{formData.email}</strong> once your application has been reviewed.
              </p>
            </div>
            <a
              href="/"
              className="inline-block bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 text-sm font-semibold transition-all"
            >
              Return to Home
            </a>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Combined Hero & Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center mb-10 sm:mb-12 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 mb-3 sm:mb-4 tracking-tight">
              List Your Properties
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Reach thousands of serious investors and close deals faster
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image */}
            <div className="relative w-full h-56 sm:h-64 lg:h-80 animate-slide-in-left">
              <Image
                src="/assets/Frame-5.png"
                alt="Sell Properties on Deelmap"
                fill
                className="object-contain"
              />
            </div>

            {/* Content - Vertical Layout */}
            <div className="space-y-6 sm:space-y-7 animate-slide-in-right">
              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                <h3 className="text-lg sm:text-xl font-normal text-slate-900 mb-2">Serious Buyers</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Pre-qualified investors actively seeking deals</p>
              </div>

              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                <h3 className="text-lg sm:text-xl font-normal text-slate-900 mb-2">Fast Approval</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Get approved and start listing within 24-48 hours</p>
              </div>

              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                <h3 className="text-lg sm:text-xl font-normal text-slate-900 mb-2">Easy Management</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Manage all your listings from one dashboard</p>
              </div>

              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                <h3 className="text-lg sm:text-xl font-normal text-slate-900 mb-2">Verified Platform</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Quality assurance for legitimate deals only</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="bg-white border-2 border-slate-300 p-8 lg:p-10">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Apply to Become a Seller</h2>
              <p className="text-slate-600">Complete the form below to get started</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 mb-6 rounded-lg">
                <p className="font-semibold mb-1">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-5">Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactPersonName}
                      onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                        placeholder="(555) 555-5555"
                        maxLength={14}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience & Supply */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-5">Experience & Supply</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Are you an individual or company? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer bg-white border-2 border-slate-300 rounded-lg px-6 py-3 transition-all hover:border-slate-900 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-100">
                        <input
                          type="radio"
                          name="businessType"
                          value="individual"
                          checked={formData.businessType === 'individual'}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                          className="w-4 h-4 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="ml-3 text-slate-700 font-medium">Individual</span>
                      </label>
                      <label className="flex items-center cursor-pointer bg-white border-2 border-slate-300 rounded-lg px-6 py-3 transition-all hover:border-slate-900 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-100">
                        <input
                          type="radio"
                          name="businessType"
                          value="company"
                          checked={formData.businessType === 'company'}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                          className="w-4 h-4 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="ml-3 text-slate-700 font-medium">Company</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      How many deals do you typically source per month? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.dealsPerMonth}
                      onChange={(e) => setFormData({ ...formData, dealsPerMonth: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                    >
                      <option value="1-2">1–2</option>
                      <option value="3-5">3–5</option>
                      <option value="6-10">6–10</option>
                      <option value="10+">10+</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-5">Market Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Primary Markets (City, State) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.primaryMarkets}
                      onChange={(e) => setFormData({ ...formData, primaryMarkets: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                      placeholder="e.g., Atlanta, GA; Dallas, TX; Phoenix, AZ"
                    />
                    <p className="text-xs text-slate-500 mt-2">Separate multiple markets with semicolons</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Property Types <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {propertyTypeOptions.map((option) => (
                        <label key={option.value} className="flex items-center cursor-pointer bg-white border-2 border-slate-300 rounded-lg px-4 py-3 transition-all hover:border-slate-900 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={formData.propertyTypes.includes(option.value)}
                            onChange={() => handlePropertyTypeChange(option.value)}
                            className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900"
                          />
                          <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Information */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-5">Additional Information (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tell us briefly about your operation (Max 300 characters)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      maxLength={300}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none resize-none"
                      placeholder="Brief description of your business and experience..."
                    />
                    <p className="text-xs text-slate-500 mt-2 text-right">
                      {formData.description.length}/300
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 font-semibold text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Application...
                    </span>
                  ) : (
                    'Submit Application'
                  )}
                </button>
                <p className="text-center text-sm text-slate-500 mt-4">
                  By submitting, you agree to our terms and conditions
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
