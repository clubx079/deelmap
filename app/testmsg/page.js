'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react'

export default function TestSMSPage() {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    message: 'This is a test message from DeelMap! 🎉'
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      // Validate phone number
      if (!formData.phoneNumber) {
        setError('Phone number is required')
        setLoading(false)
        return
      }

      // Send SMS
      const response = await fetch('/api/notifications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.phoneNumber,
          message: formData.message,
          from: '(332) 333-3839'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-lg p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-red mb-2">SMS API Test</h1>
          <p className="text-gray-600">Test OpenPhone SMS integration</p>
        </div>

        {/* API Info */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">OpenPhone API Info</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>From Number:</strong> (332) 333-3839</p>
            <p><strong>API Endpoint:</strong> /api/notifications/send-sms</p>
            <p><strong>Status:</strong> <span className="text-green-600 font-semibold">✓ Configured</span></p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-brand-red focus:border-transparent"
              placeholder="+1234567890 or (123) 456-7890"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +1234567890, (123) 456-7890, or 123-456-7890
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-brand-red focus:border-transparent"
              rows={4}
              placeholder="Enter your test message..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length} characters
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {result && result.success && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">SMS Sent Successfully!</p>
                  <p className="text-sm text-green-700">{result.message}</p>
                </div>
              </div>
              <div className="bg-white rounded p-3 space-y-1 text-xs">
                <p><strong>Message ID:</strong> {result.message_id}</p>
                <p><strong>To:</strong> {result.to}</p>
                <p><strong>From:</strong> {result.from}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red text-white py-3 rounded font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending SMS...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Test SMS
              </>
            )}
          </button>
        </form>

        {/* Quick Test Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Tests:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFormData({
                ...formData,
                message: 'This is a test message from DeelMap! 🎉'
              })}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
            >
              Simple Test
            </button>
            <button
              onClick={() => setFormData({
                ...formData,
                message: 'Hey there! Your property at 123 Main St, City, ST 12345 got 2 new views. Engage with them right now: https://deelmap.com/temp-seller/onboard?token=test123'
              })}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
            >
              Magic Link Template
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            This is a test page for development purposes only.
            <br />
            Make sure your OpenPhone API key is configured in .env.local
          </p>
        </div>
      </div>
    </div>
  )
}
