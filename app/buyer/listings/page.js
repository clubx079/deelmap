'use client'
import { useState, useEffect, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'
import { Plus, Pencil, Trash2, X, Home } from 'lucide-react'
import Image from 'next/image'
import PostDealForm from '@/components/buyer/PostDealForm'

export default function MyListingsPage() {
  const { user } = useAuth()
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editListing, setEditListing] = useState(null) // null = new, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageTitle(showForm ? 'Post a Deal' : editListing ? 'Edit Listing' : 'My Listings')
  }, [setPageTitle, showForm, editListing])

  const fetchListings = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/buyer/listings', { headers: { 'x-user-id': user.id } })
      const data = await res.json()
      if (data.success) setListings(data.listings || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [user?.id])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/buyer/listings?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      })
      if (res.ok) {
        setListings(prev => prev.filter(l => l.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch {}
    setDeleting(false)
  }

  const getFeaturedImage = (listing) => {
    const images = listing.property_images || []
    const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const featured = sorted.find(i => i.is_featured) || sorted[0]
    return featured?.image_url || null
  }

  if (showForm || editListing) {
    return (
      <PostDealForm
        user={user}
        existing={editListing}
        onClose={() => { setShowForm(false); setEditListing(null) }}
        onSuccess={() => { setShowForm(false); setEditListing(null); fetchListings() }}
      />
    )
  }

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816]">My Listings</h1>
          <p className="text-[13px] text-[#737370] mt-0.5">Manage your posted properties</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-[40px] px-4 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Deal
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E8E8E4] border-t-[#D03839]" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[#F5F5F3] rounded-full flex items-center justify-center mb-4">
            <Home className="w-7 h-7 text-[#A8A8A4]" />
          </div>
          <p className="text-[16px] font-semibold text-[#1A1816] mb-1">No listings yet</p>
          <p className="text-[13px] text-[#737370] mb-5">Post your first deal and reach thousands of buyers.</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-[40px] px-5 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => {
            const img = getFeaturedImage(listing)
            const statusColor = listing.status === 'active' ? 'bg-[#E4F5EC] text-[#0F6E56]' : 'bg-[#FEF3E2] text-[#B5620A]'
            return (
              <div key={listing.id} className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">
                {/* Image */}
                <div className="h-[160px] bg-[#FAFAF8] relative flex-shrink-0">
                  {img ? (
                    <Image src={img} alt={listing.address || 'Property'} fill className="object-cover" sizes="400px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-8 h-8 text-[#E8E8E4]" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded ${statusColor}`}>
                    {listing.status === 'active' ? 'Active' : 'Draft'}
                  </span>
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="text-[14px] font-bold text-[#1A1816] truncate mb-0.5">
                    {listing.address || listing.city || 'No address'}
                  </p>
                  <p className="text-[13px] text-[#737370] mb-3">
                    {listing.price ? `$${Number(listing.price).toLocaleString()}` : 'Price not set'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditListing(listing)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-[34px] border border-[#E8E8E4] rounded text-[12px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(listing)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-[34px] border border-[#E8E8E4] rounded text-[12px] font-medium text-[#D03839] hover:border-[#D03839] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-[16px] font-bold text-[#1A1816] mb-2">Delete listing?</h3>
            <p className="text-[13px] text-[#737370] mb-5">
              This will permanently remove <span className="font-medium text-[#1A1816]">{deleteTarget.address || 'this listing'}</span> from the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-[40px] border border-[#E8E8E4] rounded text-[13px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[40px] bg-[#D03839] hover:bg-[#C73022] rounded text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
