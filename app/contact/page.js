'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Script from 'next/script'

// Marketplace DB: properties, contact_submissions (see ENV_CLEAN.md)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
)

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    propertyAddress: '',
    message: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const recaptchaRef = useRef(null)

  // Load available properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, address')
          .eq('status', 'available')
          .order('address')

        if (error) {
          console.error('Error fetching properties:', error)
        } else {
          setProperties(data || [])
        }
      } catch (error) {
        console.error('Error fetching properties:', error)
      } finally {
        setLoadingProperties(false)
      }
    }

    fetchProperties()
  }, [])

  // Handle reCAPTCHA loading and initialization
  useEffect(() => {
    window.onRecaptchaLoad = () => {
      console.log('reCAPTCHA API loaded')
      setRecaptchaLoaded(true)
      initRecaptcha()
    }

    window.onRecaptchaSuccess = (token) => {
      console.log('reCAPTCHA success:', token)
      setRecaptchaToken(token)
      setError('')
    }

    window.onRecaptchaExpired = () => {
      console.log('reCAPTCHA expired')
      setRecaptchaToken('')
    }

    if (window.grecaptcha && window.grecaptcha.render) {
      setRecaptchaLoaded(true)
      initRecaptcha()
    }

    return () => {
      if (window.grecaptcha && recaptchaRef.current) {
        try {
          window.grecaptcha.reset()
        } catch (error) {
          console.log('Error resetting reCAPTCHA:', error)
        }
      }
    }
  }, [])

  const initRecaptcha = () => {
    if (!recaptchaLoaded || !window.grecaptcha || !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      console.log('reCAPTCHA not ready for initialization')
      return
    }

    const container = document.getElementById('recaptcha-container')
    if (container && !container.hasChildNodes()) {
      try {
        console.log('Rendering reCAPTCHA...')
        window.grecaptcha.render(container, {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
          callback: 'onRecaptchaSuccess',
          'expired-callback': 'onRecaptchaExpired'
        })
        console.log('reCAPTCHA rendered successfully')
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error)
        setError('Failed to load reCAPTCHA. Please refresh the page.')
      }
    }
  }

  useEffect(() => {
    if (recaptchaLoaded) {
      initRecaptcha()
    }
  }, [recaptchaLoaded])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const sendContactEmail = async (data) => {
    try {
      // Use absolute path to the API route
      const response = await fetch('/api/auth/send-contact-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          recaptchaToken
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      return await response.json()
    } catch (error) {
      console.error('Email sending error:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.')
      setIsSubmitting(false)
      return
    }

    try {
      // Insert into Supabase
      const { data, error: supabaseError } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            subject: formData.subject,
            property_address: formData.propertyAddress,
            message: formData.message
          }
        ])

      if (supabaseError) {
        throw supabaseError
      }

      // Send email notification
      await sendContactEmail(formData)

      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        propertyAddress: '',
        message: ''
      })

      if (window.grecaptcha) {
        try {
          window.grecaptcha.reset()
        } catch (error) {
          console.log('Error resetting reCAPTCHA:', error)
        }
      }
      setRecaptchaToken('')

    } catch (error) {
      console.error('Submission error:', error)
      setError('There was an error submitting your message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar currentPage="contact" />
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600">Your message has been submitted successfully. We&apos;ll get back to you soon.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-[#022b41] hover:underline"
            >
              Send another message
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('reCAPTCHA script loaded')
        }}
      />

      <div className="min-h-screen">
        <Navbar currentPage="contact" />

        <section 
          className="py-16 lg:py-20"
          style={{ backgroundColor: '#F6F4F1' }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center mb-12">
              <p 
                className="text-sm font-semibold tracking-wider uppercase mb-4"
                style={{ color: 'var(--secondary-color)' }}
              >
                GET IN TOUCH WITH US
              </p>
              <h2 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold"
                style={{ color: 'var(--primary-color)' }}
              >
                WRITE US ANYTIME
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your Name"
                    required
                    className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    required
                    className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Subject"
                    className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  {loadingProperties ? (
                    <input
                      type="text"
                      placeholder="Loading properties..."
                      disabled
                      className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-100 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200"
                    >
                      <option value="">Select a property address for inspection report (optional)</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.address}>
                          {property.address}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="md:col-span-2">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Message"
                    rows={6}
                    className="w-full px-4 py-3 border-0 border-b border-gray-300 bg-gray-50 focus:bg-white focus:border-[#022b41] focus:outline-none transition-all duration-200 resize-none"
                  />
                </div>

              </div>

              <div className="mt-6">
                <div id="recaptcha-container"></div>
                {!recaptchaLoaded && (
                  <div className="bg-gray-100 border border-gray-300 p-4 rounded flex items-center justify-center">
                    <span className="text-gray-600">Loading reCAPTCHA...</span>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting || !recaptchaToken}
                  className="w-full bg-[#022b41] hover:bg-[#033a56] disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-bold text-lg uppercase tracking-wider transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'SENDING...' : 'SEND'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              
              <div className="bg-gray-100 rounded-lg p-8">
                <h3 
                  className="text-xl font-bold mb-6 uppercase tracking-wider"
                  style={{ color: 'var(--primary-color)' }}
                >
                  LEXINGTON (HEADQUARTER)
                </h3>
                <div className="space-y-3 text-gray-600">
                  <p>Lexington KY, USA</p>
                  <p>office@ableman.co</p>
                  <p>(888) 780-8093</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-8">
                <h3 
                  className="text-xl font-bold mb-6 uppercase tracking-wider"
                  style={{ color: 'var(--primary-color)' }}
                >
                  DECATUR
                </h3>
                <div className="space-y-3 text-gray-600">
                  <p>Decatur, Illinois</p>
                  <p>office@ableman.co</p>
                  <p>(888) 780-8093</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="w-full h-96">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50095.35619869065!2d-84.50373095273437!3d38.04058419999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x884244e4e39ad337%3A0x9d1f4cd76123946b!2sLexington%2C%20KY%2C%20USA!5e0!3m2!1sen!2sus!4v1703958437000!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Lexington, KY Location"
          />
        </section>

        <Footer />
      </div>
    </>
  )
}