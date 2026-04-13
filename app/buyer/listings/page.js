'use client'
import { useState, useEffect, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'
import { Plus, Pencil, Trash2, X, Home, MapPin, Eye, BarChart2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import PostDealForm from '@/components/buyer/PostDealForm'
import PropertyAnalyticsSidebar from '@/components/buyer/PropertyAnalyticsSidebar'

export default function MyListingsPage() {
  const { user } = useAuth()
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(() => false)
  const [editListing, setEditListing] = useState(null)

  // Auto-open form if ?new=1 is in the URL
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      router.replace('/buyer/listings', { scroll: false })
    }
  }, [searchParams, router])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [analyticTarget, setAnalyticTarget] = useState(null)

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
    return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url || null
  }

  if (showForm || editListing) {
    return (
      <PostDealForm
        user={user}
        existing={editListing}
        onClose={() => { setShowForm(false); setEditListing(null); fetchListings() }}
        onSuccess={() => { setShowForm(false); setEditListing(null); fetchListings() }}
      />
    )
  }

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">My Listings</h1>
          <p className="text-[14px] text-[#737370] mt-1">
            {loading ? 'Loading...' : `${listings.length} propert${listings.length !== 1 ? 'ies' : 'y'} posted`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-[40px] px-4 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Deal
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E4]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-4 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#E8E8E4] rounded-lg flex-shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-36 bg-[#E8E8E4] rounded" />
                          <div className="h-2.5 w-20 bg-[#E8E8E4] rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-3 w-24 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-20 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 bg-[#E8E8E4] rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-[#E8E8E4] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-12 h-12 bg-[#F3F3F0] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Home className="w-6 h-6 text-[#A8A8A4]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#1A1816] mb-1">No listings yet</p>
                    <p className="text-[13px] text-[#737370] mb-4">Post your first deal to reach buyers on the marketplace.</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 h-[38px] px-5 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Post a Deal
                    </button>
                  </td>
                </tr>
              ) : (
                listings.map((listing, index) => {
                  const img = getFeaturedImage(listing)
                  const isDraft = listing.status === 'draft'
                  const statusBadge = {
                    active:       { label: 'Active',       cls: 'bg-[#E4F5EC] text-[#0F6E56] border-[#B6E4CE]' },
                    under_review: { label: 'Under Review', cls: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]' },
                    draft:        { label: 'Draft',        cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' },
                    suspended:    { label: 'Suspended',    cls: 'bg-[#FEF0EF] text-[#D03839] border-[#F5C0BF]' },
                  }[listing.status] || { label: listing.status, cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' }
                  return (
                    <tr key={listing.id} className="hover:bg-[#FAFAF8] transition-colors">

                      {/* # */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-[#A8A8A4]">{index + 1}</span>
                      </td>

                      {/* Property */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F3F3F0] border border-[#E8E8E4] overflow-hidden flex-shrink-0">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-4 h-4 text-[#A8A8A4]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1A1816] truncate max-w-[200px]">
                              {listing.seo_title || listing.address || 'No address'}
                            </p>
                            <p className="text-[11px] text-[#A8A8A4]">ID: {String(listing.id).split('-')[0]}</p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#A8A8A4] flex-shrink-0" />
                          <span className="text-[12px] text-[#444441] truncate max-w-[160px]">
                            {listing.address || listing.state || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] font-semibold text-[#1A1816]">
                          {listing.price ? `$${Number(listing.price).toLocaleString()}` : '—'}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] text-[#444441]">{listing.property_type || '—'}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5">
                          {isDraft ? (
                            <button
                              onClick={() => setEditListing(listing)}
                              className="h-7 px-3 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
                            >
                              Complete
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setAnalyticTarget(listing)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                                title="Analytics"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/${listing.slug || listing.id}`}
                                target="_blank"
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                                title="View listing"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setEditListing(listing)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(listing)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[#E8E8E4]">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex gap-3">
                <div className="w-14 h-14 bg-[#E8E8E4] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-3/4 bg-[#E8E8E4] rounded" />
                  <div className="h-3 w-1/2 bg-[#E8E8E4] rounded" />
                  <div className="h-3 w-1/3 bg-[#E8E8E4] rounded" />
                </div>
              </div>
            ))
          ) : listings.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-[#F3F3F0] rounded-full flex items-center justify-center mx-auto mb-3">
                <Home className="w-6 h-6 text-[#A8A8A4]" />
              </div>
              <p className="text-[14px] font-medium text-[#1A1816] mb-1">No listings yet</p>
              <p className="text-[13px] text-[#737370] mb-4">Post your first deal to reach buyers.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 h-[38px] px-5 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post a Deal
              </button>
            </div>
          ) : (
            listings.map((listing) => {
              const img = getFeaturedImage(listing)
              const isDraftMobile = listing.status === 'draft'
              const statusBadgeMobile = {
                active:       { label: 'Active',       cls: 'bg-[#E4F5EC] text-[#0F6E56] border-[#B6E4CE]' },
                under_review: { label: 'Under Review', cls: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]' },
                draft:        { label: 'Draft',        cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' },
                suspended:    { label: 'Suspended',    cls: 'bg-[#FEF0EF] text-[#D03839] border-[#F5C0BF]' },
              }[listing.status] || { label: listing.status, cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' }
              return (
                <div key={listing.id} className="p-4 flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-[#F3F3F0] border border-[#E8E8E4] overflow-hidden flex-shrink-0">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-5 h-5 text-[#A8A8A4]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-[#1A1816] truncate">
                        {listing.seo_title || listing.address || 'No address'}
                      </p>
                      <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusBadgeMobile.cls}`}>
                        {statusBadgeMobile.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#737370] mb-2">
                      {listing.price ? `$${Number(listing.price).toLocaleString()}` : 'Price not set'}
                      {listing.property_type ? ` · ${listing.property_type}` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      {isDraftMobile ? (
                        <button
                          onClick={() => setEditListing(listing)}
                          className="h-6 px-2.5 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
                        >
                          Complete
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setAnalyticTarget(listing)}
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/${listing.slug || listing.id}`}
                            target="_blank"
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setEditListing(listing)}
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteTarget(listing)}
                        className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Analytics sidebar */}
      {analyticTarget && (
        <PropertyAnalyticsSidebar
          propertyId={analyticTarget.id}
          propertyAddress={analyticTarget.seo_title || analyticTarget.address}
          userId={user?.id}
          onClose={() => setAnalyticTarget(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-[16px] font-bold text-[#1A1816] mb-2">Delete listing?</h3>
            <p className="text-[13px] text-[#737370] mb-5">
              This will permanently remove <span className="font-medium text-[#1A1816]">{deleteTarget.seo_title || deleteTarget.address || 'this listing'}</span> from the marketplace.
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
