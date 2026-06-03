'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import Image from 'next/image';
import {
  X, Send, Paperclip, File, Download, Loader2, CheckCheck, Check,
  ArrowLeft, Home, Mail, MoreVertical, ExternalLink,
  Smile, MapPin, Phone, Shield, Calendar,
  CornerUpLeft, Copy, Trash2, Flag
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Hover-revealed action bar on a message (Reply/Copy always; Delete on your
// own, Report on the other party's). Shown inline — no three-dot menu.
function MessageActions({ isUser, onReply, onCopy, onDelete, onReport, copied }) {
  const btn = 'p-1.5 rounded text-[#737370] transition-colors';
  return (
    <div className="flex items-center gap-0.5 self-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button type="button" onClick={onReply} title="Reply" className={`${btn} hover:bg-[#FAFAF8] hover:text-[#1A1816]`}><CornerUpLeft className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onCopy} title={copied ? 'Copied' : 'Copy'} className={`${btn} hover:bg-[#FAFAF8] hover:text-[#1A1816]`}>{copied ? <Check className="w-3.5 h-3.5 text-[#0F6E56]" /> : <Copy className="w-3.5 h-3.5" />}</button>
      {isUser && onDelete && (
        <button type="button" onClick={onDelete} title="Delete" className={`${btn} hover:bg-[#FEF0EF] hover:text-[#D03839]`}><Trash2 className="w-3.5 h-3.5" /></button>
      )}
      {!isUser && onReport && (
        <button type="button" onClick={onReport} title="Report" className={`${btn} hover:bg-[#FEF0EF] hover:text-[#D03839]`}><Flag className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export default function ChatWindow({ conversation, lender, financingRequest, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [counterConfirm, setCounterConfirm] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set());
  // Message actions: reply / report / delete
  const [replyingTo, setReplyingTo] = useState(null);
  const [reportingMsg, setReportingMsg] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [deletingMsg, setDeletingMsg] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [offers, setOffers] = useState([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [acceptingCounter, setAcceptingCounter] = useState(false);
  const [rejectingCounter, setRejectingCounter] = useState(false);
  const [showMobilePropPanel, setShowMobilePropPanel] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerClosing, setOfferClosing] = useState('30 days');
  const [offerFinancing, setOfferFinancing] = useState('Cash');
  const [offerEarnest, setOfferEarnest] = useState('');
  const [offerInspection, setOfferInspection] = useState('10 days');
  const [offerNotes, setOfferNotes] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const listingHref = conversation?.property_slug ? `/${conversation.property_slug}` : (conversation?.property_id ? `/${conversation.property_id}` : null);
  const makeOfferHref = conversation?.property_id
    ? `/buyer/make-offer?property_id=${conversation.property_id}&slug=${conversation.property_slug || conversation.property_id}${conversation.seller_id ? `&seller_id=${conversation.seller_id}` : ''}`
    : null;

  const sellerName = lender?.contact_person_name || lender?.business_name || 'Seller';
  const sellerRole = financingRequest ? 'Lender' : 'Real Estate Investor';

  useEffect(() => {
    if (conversation?.id && user?.id) {
      setLoading(true);
      fetchMessages();
      fetchOffers();
      markMessagesAsRead();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [conversation?.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/buyer/chat?action=get_messages&conversation_id=${conversation.id}`,
        { headers: { 'Authorization': `Bearer ${user.id}` } }
      );
      const data = await response.json();
      if (data.success) setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await fetch(
        `/api/buyer/offers?conversation_id=${conversation.id}`,
        { headers: { 'Authorization': `Bearer ${user.id}` } }
      );
      const data = await response.json();
      if (data.offers) setOffers(data.offers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    if (typeof window !== 'undefined' && !window.confirm('Withdraw this offer? The seller will no longer be able to see or accept it.')) return;
    try {
      setWithdrawing(true);
      const res = await fetch('/api/buyer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ offer_id: offerId, action: 'withdraw' }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'withdrawn' } : o));
      }
    } catch (err) {
      console.error('Failed to withdraw offer:', err);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleAcceptCounter = async (offerId) => {
    try {
      setAcceptingCounter(true);
      const res = await fetch('/api/buyer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ offer_id: offerId, action: 'accept_counter' }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o));
      }
    } catch (err) {
      console.error('Failed to accept counter:', err);
    } finally {
      setAcceptingCounter(false);
    }
  };

  const handleRejectCounter = async (offerId) => {
    try {
      setRejectingCounter(true);
      const res = await fetch('/api/buyer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ offer_id: offerId, action: 'reject_counter' }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
      }
    } catch (err) {
      console.error('Failed to reject counter:', err);
    } finally {
      setRejectingCounter(false);
    }
  };

  const CLOSING_OPTIONS = ['30 days', '45 days', '60 days', 'As-is'];
  const INSPECTION_OPTIONS = ['5 days', '10 days', '15 days', 'Waived'];
  const FINANCING_OPTIONS = ['Cash', 'Conventional', 'Hard Money', 'Other'];
  const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737370' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' };

  const openOfferForm = () => {
    const defaultAmt = propertyPrice ? Math.round(Number(propertyPrice)).toLocaleString() : '';
    setOfferAmount(defaultAmt);
    setOfferClosing('30 days');
    setOfferFinancing('Cash');
    setOfferEarnest('');
    setOfferInspection('10 days');
    setOfferNotes('');
    setOfferError('');
    setOfferSuccess(false);
    setShowOfferForm(true);
  };

  const handleSubmitInlineOffer = async () => {
    const numericAmount = Number(String(offerAmount).replace(/[^0-9.]/g, ''));
    const numericEarnest = Number(String(offerEarnest).replace(/[^0-9.]/g, ''));
    if (!numericAmount || numericAmount <= 0) { setOfferError('Please enter a valid offer price'); return; }
    if (!numericEarnest || numericEarnest <= 0) { setOfferError('Please enter an earnest money amount'); return; }
    setSubmittingOffer(true); setOfferError('');
    try {
      const res = await fetch('/api/buyer/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({
          conversation_id: conversation.id,
          property_id: conversation.property_id,
          amount: numericAmount,
          closing_timeline: offerClosing,
          financing_type: offerFinancing,
          earnest_money: numericEarnest,
          inspection_period: offerInspection,
          notes: offerNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit offer');
      setOfferSuccess(true);
      fetchOffers();
    } catch (err) {
      setOfferError(err.message || 'Something went wrong');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'mark_as_read', conversationId: conversation.id })
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const channel = supabase
      .channel(`conversation-${conversation.id}`, { config: { broadcast: { self: true } } })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        const updated = payload.new;
        if (updated?.id != null && updated.is_read) {
          setMessages((prev) => prev.map((msg) => (String(msg.id) === String(updated.id) ? { ...msg, is_read: true } : msg)));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const newMsg = payload.new;
        setMessages((prev) => {
          if (prev.some(msg => String(msg.id) === String(newMsg?.id)) || !newMsg?.id) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
        if (newMsg?.sender_type === 'lender' || newMsg?.sender_type === 'seller') {
          try {
            await fetch('/api/buyer/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
              body: JSON.stringify({ action: 'mark_as_read', conversationId: conversation.id })
            });
          } catch {}
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'offers',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        const newOffer = payload.new;
        if (!newOffer?.id) return;
        setOffers((prev) => prev.some(o => String(o.id) === String(newOffer.id)) ? prev : [...prev, newOffer]);
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'offers',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        const updated = payload.new;
        if (!updated?.id) return;
        setOffers((prev) => prev.map(o => String(o.id) === String(updated.id) ? { ...o, ...updated } : o));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && previewFiles.length === 0) return;
    if (previewFiles.length > 0) { await handleSendFile(); return; }
    try {
      setSending(true);
      const response = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'send_message', conversationId: conversation.id, messageText: newMessage.trim(), replyToId: replyingTo?.id || null })
      });
      const data = await response.json();
      if (data.success && data.message) {
        const sent = replyingTo
          ? { ...data.message, reply_preview: { id: replyingTo.id, sender_type: replyingTo.sender_type, text: (replyingTo.message_text || '[Attachment]').slice(0, 140) } }
          : data.message;
        setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
        setNewMessage('');
        setReplyingTo(null);
        scrollToBottom();
        setTimeout(() => textareaRef.current?.focus(), 0);
        import('@/lib/analytics').then(({ trackEvent }) => {
          trackEvent('message_sent', { conversation_id: conversation.id })
        })
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Message actions ──────────────────────────────────────────────
  const handleCopyMessage = (msg) => {
    const text = msg?.message_text || '';
    if (!text || !navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(msg.id);
      setTimeout(() => setCopiedKey((k) => (k === msg.id ? null : k)), 1500);
    }).catch(() => {});
  };

  const handleDeleteMessage = async (messageId) => {
    setDeletingMsg(null);
    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'delete_message', conversationId: conversation.id, messageId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.map((m) => String(m.id) === String(messageId)
          ? { ...m, is_deleted: true, message_text: null, has_attachment: false } : m));
      } else { alert(data.error || 'Failed to delete message.'); }
    } catch { alert('Failed to delete message.'); }
  };

  const handleSubmitReport = async () => {
    if (!reportingMsg) return;
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'report_message', conversationId: conversation.id, messageId: reportingMsg.id, reason: reportReason, details: reportDetails.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setReportingMsg(null); setReportDetails(''); setReportReason('spam');
        alert('Thanks — this has been reported to our team for review.');
      } else { alert(data.error || 'Failed to submit report.'); }
    } catch { alert('Failed to submit report.'); }
    finally { setSubmittingReport(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File size must be less than 10MB'); return; }
    setPreviewFiles([{ file, url: URL.createObjectURL(file), id: Math.random().toString(36).substr(2, 9) }]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePreview = () => {
    if (previewFiles[0]) URL.revokeObjectURL(previewFiles[0].url);
    setPreviewFiles([]);
  };

  const handleSendFile = async () => {
    if (previewFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', previewFiles[0].file);
      const uploadResponse = await fetch('/api/buyer/upload', { method: 'POST', body: formData });
      const uploadData = await uploadResponse.json();
      if (uploadData.success) {
        const response = await fetch('/api/buyer/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
          body: JSON.stringify({
            action: 'send_message', conversationId: conversation.id,
            messageText: newMessage.trim() || null, hasAttachment: true,
            attachmentUrl: uploadData.url, attachmentName: uploadData.fileName,
            attachmentType: uploadData.fileType, attachmentSize: uploadData.fileSize
          })
        });
        const data = await response.json();
        if (data.success) { setNewMessage(''); handleRemovePreview(); scrollToBottom(); setTimeout(() => textareaRef.current?.focus(), 0); }
      } else { alert(uploadData.error || 'Failed to upload file'); }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file.');
    } finally { setUploading(false); }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDateHeader = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return `Today, ${date.toLocaleDateString('en-US', { month: 'long' })}\n${date.getDate()}`;
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };


  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (type) => type?.startsWith('image/');

  const handleImageLoad = (messageId) => {
    setLoadedImages((prev) => { const s = new Set(prev); s.add(messageId); return s; });
  };

  // Determine active offer state from latest offer
  const sortedOffers = [...offers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestOffer = sortedOffers[0];
  const hasPendingBuyerOffer = latestOffer && !latestOffer.parent_offer_id && latestOffer.status === 'pending';
  const hasPendingCounter = latestOffer && latestOffer.parent_offer_id && latestOffer.status === 'pending';

  // Merge offers as synthetic items into message stream
  // Filter out raw "Offer submitted:" text messages — they're already shown as offer cards
  const offerItems = offers.map(o => ({ ...o, _isOffer: true }));
  const filteredMessages = messages.filter(m => {
    const text = m.message_text || '';
    return !text.startsWith('Offer submitted:') && !text.startsWith('Counter offer:');
  });
  const allItems = [...filteredMessages, ...offerItems].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Group combined items by date
  const getDateKey = (ts) => new Date(ts).toDateString();
  const messagesByDate = allItems.reduce((acc, item) => {
    const key = getDateKey(item.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const renderAttachment = (message) => {
    if (!message.has_attachment) return null;
    const isUser = message.sender_type === 'user';
    const imageLoaded = loadedImages.has(message.id);

    if (isImage(message.attachment_type)) {
      return (
        <div className="mt-2 relative">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[#E8E8E4] rounded animate-pulse flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#A8A8A4] animate-spin" />
            </div>
          )}
          <img
            src={message.attachment_url} alt={message.attachment_name}
            onLoad={() => handleImageLoad(message.id)}
            onClick={() => setSelectedImage(message.attachment_url)}
            className={`max-w-[260px] rounded cursor-pointer hover:opacity-90 transition-all duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 py-2 px-3 rounded transition-colors duration-200 ${isUser ? 'bg-[#C73022] hover:bg-[#b52a1e]' : 'bg-[#FAFAF8] hover:bg-[#E8E8E4]'}`}>
          <File className={`w-4 h-4 ${isUser ? 'text-white' : 'text-[#444441]'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[12px] font-medium truncate ${isUser ? 'text-white' : 'text-[#1A1816]'}`}>{message.attachment_name}</p>
            <p className={`text-[11px] ${isUser ? 'text-white/70' : 'text-[#A8A8A4]'}`}>{formatFileSize(message.attachment_size)}</p>
          </div>
          <Download className={`w-3.5 h-3.5 ${isUser ? 'text-white/70' : 'text-[#A8A8A4]'}`} />
        </a>
      </div>
    );
  };

  // Property info for Deal Overview
  const propertyPrice = conversation?.property_price;
  const propertyAddress = conversation?.property_address;
  const propertyImage = conversation?.property_thumbnail_url;
  const arv = propertyPrice ? Math.round(propertyPrice * 1.8) : null;
  const spread = arv && propertyPrice ? arv - propertyPrice : null;

  return (
    <div className="flex h-full" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Chat Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[#E8E8E4] bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="lg:hidden p-2 -ml-2 rounded hover:bg-[#FAFAF8] transition-colors duration-200">
              <ArrowLeft className="w-5 h-5 text-[#444441]" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-bold text-[#1A1816]">{sellerName}</h2>
              <p className="text-[13px] text-[#737370]">{sellerRole}</p>
            </div>
            <button
              onClick={() => setShowMobilePropPanel(true)}
              className="xl:hidden p-2 rounded hover:bg-[#FAFAF8] transition-colors duration-200 flex-shrink-0"
            >
              <MoreVertical className="w-5 h-5 text-[#444441]" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#A8A8A4] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Send className="w-8 h-8 text-[#A8A8A4] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#444441]">No messages yet</p>
                <p className="text-[12px] text-[#737370] mt-1">Start the conversation</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(messagesByDate).map(([dateKey, items]) => (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-[12px] text-[#A8A8A4] font-medium bg-white px-3">
                      {formatDateHeader(items[0].created_at)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {items.map((item) => {
                      // Offer card
                      if (item._isOffer) {
                        const isCounter = !!item.parent_offer_id;
                        const statusColors = {
                          pending: 'bg-[#FEF3E2] text-[#B5620A]',
                          accepted: 'bg-[#E6F4F1] text-[#0F6E56]',
                          rejected: 'bg-[#FEF0EF] text-[#D03839]',
                          countered: 'bg-[#F3F3F0] text-[#1A1816]',
                          withdrawn: 'bg-[#F3F3F1] text-[#737370]',
                        };
                        const statusLabel = { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', countered: 'Countered', withdrawn: 'Withdrawn' };
                        return (
                          <div key={`offer-${item.id}`}>
                            {isCounter
                              ? <p className="text-[12px] font-medium text-[#444441] mb-1">{sellerName}</p>
                              : <p className="text-[12px] font-medium text-[#444441] mb-1 text-right">You</p>
                            }
                            <div className={`flex ${isCounter ? 'justify-start' : 'justify-end'}`}>
                            <div className="w-full max-w-[300px] bg-white border border-[#E8E8E4] rounded px-4 py-3 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3E2] text-[#B5620A]">
                                  {isCounter ? 'Counter Offer' : 'Offer Submitted'}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[item.status] || statusColors.pending}`}>
                                  {statusLabel[item.status] || item.status}
                                </span>
                              </div>
                              <p className="text-[22px] font-bold text-[#1A1816] leading-none mb-1">{formatCurrency(item.offer_price)}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#737370]">
                                {item.financing_type && <span>{item.financing_type}</span>}
                                {item.closing_timeline && <><span className="text-[#D4D4CF]">·</span><span>Close in {item.closing_timeline}</span></>}
                                {item.inspection_period && <><span className="text-[#D4D4CF]">·</span><span>{item.inspection_period} inspection</span></>}
                              </div>
                              {isCounter && item.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => setCounterConfirm({ kind: 'accept', offerId: item.id, amount: item.offer_price })}
                                    disabled={acceptingCounter || rejectingCounter}
                                    className="flex-1 py-2 bg-[#D03839] text-white text-[13px] font-semibold rounded hover:bg-[#E0493B] transition-colors disabled:opacity-50"
                                  >
                                    {acceptingCounter ? 'Accepting…' : 'Accept'}
                                  </button>
                                  <button
                                    onClick={() => setCounterConfirm({ kind: 'reject', offerId: item.id, amount: item.offer_price })}
                                    disabled={acceptingCounter || rejectingCounter}
                                    className="flex-1 py-2 border border-[#E8E8E4] text-[#737370] text-[13px] font-semibold rounded hover:bg-[#FAFAF8] hover:text-[#D03839] transition-colors disabled:opacity-50"
                                  >
                                    {rejectingCounter ? 'Declining…' : 'Decline'}
                                  </button>
                                </div>
                              )}
                              <span className="text-[11px] text-[#A8A8A4] mt-1 block">{formatTime(item.created_at)}</span>
                            </div>
                            </div>
                          </div>
                        );
                      }

                      // Normal message
                      const message = item;
                      const isUser = message.sender_type === 'user';
                      return (
                        <div key={message.id}>
                          {/* Sender label */}
                          {!isUser && (
                            <p className="text-[12px] font-medium text-[#444441] mb-1">{sellerName}</p>
                          )}
                          {isUser && (
                            <p className="text-[12px] font-medium text-[#444441] mb-1 text-right">You</p>
                          )}
                          <div className={`group flex items-center gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {isUser && !message.is_deleted && (
                              <MessageActions isUser onReply={() => setReplyingTo(message)} onCopy={() => handleCopyMessage(message)} onDelete={() => setDeletingMsg(message)} copied={copiedKey === message.id} />
                            )}
                            <div className="max-w-[70%]">
                              {/* Quoted (replied-to) message */}
                              {message.reply_preview && (
                                <div className="mb-1 px-3 py-1.5 rounded bg-[#FAFAF8] border-l-2 border-[#D03839]">
                                  <p className="text-[10px] font-semibold text-[#737370]">{message.reply_preview.sender_type === 'user' ? 'You' : sellerName}</p>
                                  <p className="text-[12px] text-[#737370] truncate">{message.reply_preview.text}</p>
                                </div>
                              )}
                              {message.is_deleted ? (
                                <div className="rounded px-4 py-3 border border-dashed border-[#E8E8E4]">
                                  <p className="text-[13px] italic text-[#A8A8A4]">This message was deleted</p>
                                </div>
                              ) : (
                                <div className={`rounded px-4 py-3 ${
                                  isUser
                                    ? 'bg-[#FEF0EF] text-[#1A1816] border border-[#F5C4C0]'
                                    : 'bg-[#FAFAF8] text-[#1A1816] border border-[#E8E8E4]'
                                }`}>
                                  {message.message_text && (
                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.message_text}</p>
                                  )}
                                  {renderAttachment(message)}
                                </div>
                              )}
                              <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                {message.is_from_email && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#1A1816] bg-[#F3F3F0] px-1.5 py-0.5 rounded">
                                    <Mail className="w-3 h-3" /><span>Email</span>
                                  </div>
                                )}
                                <span className="text-[11px] text-[#A8A8A4]">{formatTime(message.created_at)}</span>
                                {isUser && !message.is_deleted && (
                                  message.is_read
                                    ? <CheckCheck className="w-3.5 h-3.5 text-[#1A1816]" />
                                    : <Check className="w-3.5 h-3.5 text-[#A8A8A4]" />
                                )}
                              </div>
                            </div>
                            {!isUser && !message.is_deleted && (
                              <MessageActions onReply={() => setReplyingTo(message)} onCopy={() => handleCopyMessage(message)} onReport={() => setReportingMsg(message)} copied={copiedKey === message.id} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* File Preview */}
        {previewFiles.length > 0 && (
          <div className="flex-shrink-0 px-6 py-3 border-t border-[#E8E8E4] bg-[#FAFAF8]">
            <div className="flex items-center gap-3 p-3 bg-white rounded border border-[#E8E8E4]">
              {isImage(previewFiles[0].file.type) ? (
                <img src={previewFiles[0].url} alt="Preview" className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 bg-[#FEF0EF] rounded flex items-center justify-center">
                  <File className="w-5 h-5 text-[#D03839]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1816] truncate">{previewFiles[0].file.name}</p>
                <p className="text-[11px] text-[#737370]">{formatFileSize(previewFiles[0].file.size)}</p>
              </div>
              <button onClick={handleRemovePreview} className="p-1.5 rounded hover:bg-[#FAFAF8] transition-colors duration-200">
                <X className="w-4 h-4 text-[#737370]" />
              </button>
            </div>
          </div>
        )}

        {/* Quick-reply suggestions — only when no messages yet */}
        {messages.length === 0 && !loading && (
          <div className="flex-shrink-0 px-6 pt-4 pb-2 flex flex-wrap gap-2">
            {[
              `Hi, is this property still available?`,
              `What's the best price you can do?`,
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => { setNewMessage(suggestion); setTimeout(() => textareaRef.current?.focus(), 0); }}
                className="text-[13px] text-[#444441] border border-[#E8E8E4] rounded-full px-4 py-1.5 bg-white hover:border-[#D03839] hover:text-[#D03839] transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Replying-to banner */}
        {replyingTo && (
          <div className="flex-shrink-0 px-6 pt-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF8] border-l-2 border-[#D03839] rounded">
              <CornerUpLeft className="w-3.5 h-3.5 text-[#D03839] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#737370]">Replying to {replyingTo.sender_type === 'user' ? 'yourself' : sellerName}</p>
                <p className="text-[12px] text-[#737370] truncate">{replyingTo.message_text || '[Attachment]'}</p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-white text-[#737370]"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#E8E8E4] bg-white">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-[#FAFAF8] transition-colors duration-200 disabled:opacity-50 flex-shrink-0">
              <Paperclip className="w-5 h-5 text-[#737370]" />
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
            <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-[#FAFAF8] transition-colors duration-200 flex-shrink-0">
              <Smile className="w-5 h-5 text-[#737370]" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef} value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                placeholder="Type your message"
                disabled={uploading || sending} rows={1}
                className="w-full resize-none px-4 py-2.5 bg-[#FAFAF8] border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)] disabled:opacity-50 max-h-32 transition-all duration-200"
              />
            </div>

            <button type="submit" disabled={(!newMessage.trim() && previewFiles.length === 0) || uploading || sending}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#D03839] hover:bg-[#E0493B] disabled:bg-[#F5C4C0] rounded transition-colors duration-200 disabled:cursor-not-allowed flex-shrink-0">
              {uploading || sending
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Send className="w-5 h-5 text-white" />
              }
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel — Deal Overview */}
      <div className="hidden xl:flex flex-col w-[300px] border-l border-[#E8E8E4] bg-white overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E8E8E4]">
          <h3 className="text-[16px] font-bold text-[#1A1816]">Deal Overview</h3>
          <p className="text-[13px] text-[#737370]">Property & Seller</p>
        </div>

        {/* Property Image */}
        {propertyImage && (
          <div className="relative h-[160px] bg-[#FAFAF8]">
            <img src={propertyImage} alt="" className="w-full h-full object-cover" />
            {arv && propertyPrice && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-[#1A1816]/70 text-white text-[11px] font-semibold rounded-full">
                +{Math.round(((arv - propertyPrice) / propertyPrice) * 100)}% ROI
              </span>
            )}
          </div>
        )}

        {/* Property Details */}
        <div className="px-5 py-4 border-b border-[#E8E8E4]">
          {propertyAddress && (
            <div className="flex items-center gap-1 text-[12px] text-[#737370] mb-1">
              <MapPin className="w-3 h-3" />
              <span>{propertyAddress}</span>
            </div>
          )}
          {conversation?.property_title && conversation.property_title !== propertyAddress && (
            <p className="text-[14px] font-semibold text-[#1A1816] mb-2">
              {conversation.property_title}
            </p>
          )}

          {(conversation?.property_sqft || conversation?.property_bedrooms || conversation?.property_bathrooms) && (
            <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-3">
              {conversation.property_sqft && <span>{Number(conversation.property_sqft).toLocaleString()} sq ft</span>}
              {conversation.property_bedrooms && <><span className="text-[#D4D4CF]">·</span><span>{conversation.property_bedrooms} bed</span></>}
              {conversation.property_bathrooms && <><span className="text-[#D4D4CF]">·</span><span>{conversation.property_bathrooms} bath</span></>}
            </div>
          )}

          {propertyPrice && (
            <div className="mb-2">
              <span className="text-[22px] font-bold text-[#1A1816]">{formatCurrency(propertyPrice)}</span>
              {arv && <span className="ml-2 text-[12px] text-[#0F6E56] font-medium">ARV {formatCurrency(arv)}</span>}
            </div>
          )}

          {spread && (
            <p className="text-[12px] text-[#0F6E56] font-medium flex items-center gap-0.5">
              <span>&#8593;</span> {formatCurrency(spread)} spread potential
            </p>
          )}
        </div>

        {/* Seller Info */}
        <div className="px-5 py-4 border-b border-[#E8E8E4]">
          <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1.1px] mb-3">Seller Info</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#F3F3F0] flex items-center justify-center text-[13px] font-semibold text-[#1A1816]">
              {getInitials(sellerName)}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1A1816]">{sellerName}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#0F6E56]" />
                <span className="text-[11px] text-[#0F6E56] font-medium">Verified seller</span>
              </div>
            </div>
          </div>

          {lender?.email && (
            <div className="flex items-center gap-2 text-[13px] text-[#444441] mb-2">
              <Mail className="w-4 h-4 text-[#737370]" />
              <span>{lender.email}</span>
            </div>
          )}
          {lender?.phone && (
            <div className="flex items-center gap-2 text-[13px] text-[#444441]">
              <Phone className="w-4 h-4 text-[#737370]" />
              <span>{lender.phone}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4">
          {latestOffer?.status === 'accepted' ? (
            <div className="bg-[#E4F5EC] border border-[#A8DFBA] rounded px-4 py-3 mb-3">
              <p className="text-[13px] font-semibold text-[#0F6E56] mb-1">Next Steps</p>
              <p className="text-[12px] text-[#0F6E56]">Coordinate with the seller to proceed to contract signing.</p>
            </div>
          ) : latestOffer?.status === 'rejected' ? (
            <>
              <div className="bg-[#FEF0EF] border border-[#F5C4C0] rounded px-4 py-3 mb-3">
                <p className="text-[13px] font-semibold text-[#D03839]">Offer declined</p>
                <p className="text-[12px] text-[#D03839] mt-1">You can submit a new offer or continue the conversation.</p>
              </div>
              <button onClick={openOfferForm}
                className="flex items-center justify-center w-full py-3 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors duration-200 mb-3">
                Make New Offer
              </button>
            </>
          ) : hasPendingCounter ? (
            <>
              <button
                onClick={() => handleAcceptCounter(latestOffer.id)}
                disabled={acceptingCounter || rejectingCounter}
                className="flex items-center justify-center w-full py-3 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors duration-200 mb-2 disabled:opacity-50"
              >
                {acceptingCounter ? 'Accepting…' : 'Accept Counter'}
              </button>
              <button
                onClick={() => handleRejectCounter(latestOffer.id)}
                disabled={acceptingCounter || rejectingCounter}
                className="flex items-center justify-center w-full py-3 border border-[#E8E8E4] text-[#737370] text-[14px] font-semibold rounded hover:bg-[#FAFAF8] hover:text-[#D03839] transition-colors duration-200 mb-2 disabled:opacity-50"
              >
                {rejectingCounter ? 'Declining…' : 'Decline Counter'}
              </button>
              <button onClick={openOfferForm}
                className="flex items-center justify-center w-full py-3 border border-[#E8E8E4] text-[#1A1816] text-[14px] font-semibold rounded hover:bg-[#FAFAF8] transition-colors duration-200 mb-3">
                Counter
              </button>
            </>
          ) : hasPendingBuyerOffer ? (
            <button
              onClick={() => handleWithdrawOffer(latestOffer.id)}
              disabled={withdrawing}
              className="flex items-center justify-center w-full py-3 border border-[#D03839] text-[#D03839] text-[14px] font-semibold rounded hover:bg-[#FEF0EF] transition-colors duration-200 mb-3 disabled:opacity-50"
            >
              {withdrawing ? 'Withdrawing…' : 'Withdraw Offer'}
            </button>
          ) : (
            <button onClick={openOfferForm}
              className="flex items-center justify-center w-full py-3 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors duration-200 mb-3">
              Make Offer
            </button>
          )}
        </div>
      </div>

      {/* Mobile Property Details Panel */}
      {showMobilePropPanel && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end" onClick={() => setShowMobilePropPanel(false)}>
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-[#1A1816]">Deal Overview</h3>
                <p className="text-[13px] text-[#737370]">Property & Seller</p>
              </div>
              <button onClick={() => setShowMobilePropPanel(false)} className="p-2 rounded hover:bg-[#FAFAF8] transition-colors">
                <X className="w-5 h-5 text-[#444441]" />
              </button>
            </div>
            {/* Property Image */}
            {propertyImage && (
              <div className="relative h-[180px] bg-[#FAFAF8] flex-shrink-0">
                <img src={propertyImage} alt="" className="w-full h-full object-cover" />
                {arv && propertyPrice && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-[#1A1816]/70 text-white text-[11px] font-semibold rounded-full">
                    +{Math.round(((arv - propertyPrice) / propertyPrice) * 100)}% ROI
                  </span>
                )}
              </div>
            )}
            {/* Property Details */}
            <div className="px-5 py-4 border-b border-[#E8E8E4]">
              {propertyAddress && (
                <div className="flex items-center gap-1 text-[12px] text-[#737370] mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>{propertyAddress}</span>
                </div>
              )}
              {conversation?.property_title && conversation.property_title !== propertyAddress && (
                <p className="text-[14px] font-semibold text-[#1A1816] mb-2">
                  {conversation.property_title}
                </p>
              )}
              {(conversation?.property_sqft || conversation?.property_bedrooms || conversation?.property_bathrooms) && (
                <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-3">
                  {conversation.property_sqft && <span>{Number(conversation.property_sqft).toLocaleString()} sq ft</span>}
                  {conversation.property_bedrooms && <><span className="text-[#D4D4CF]">·</span><span>{conversation.property_bedrooms} bed</span></>}
                  {conversation.property_bathrooms && <><span className="text-[#D4D4CF]">·</span><span>{conversation.property_bathrooms} bath</span></>}
                </div>
              )}
              {propertyPrice && (
                <div className="mb-2">
                  <span className="text-[22px] font-bold text-[#1A1816]">{formatCurrency(propertyPrice)}</span>
                  {arv && <span className="ml-2 text-[12px] text-[#0F6E56] font-medium">ARV {formatCurrency(arv)}</span>}
                </div>
              )}
              {spread && (
                <p className="text-[12px] text-[#0F6E56] font-medium flex items-center gap-0.5">
                  <span>&#8593;</span> {formatCurrency(spread)} spread potential
                </p>
              )}
            </div>
            {/* Seller Info */}
            <div className="px-5 py-4 border-b border-[#E8E8E4]">
              <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1.1px] mb-3">Seller Info</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F3F3F0] flex items-center justify-center text-[13px] font-semibold text-[#1A1816]">
                  {getInitials(sellerName)}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">{sellerName}</p>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#0F6E56]" />
                    <span className="text-[11px] text-[#0F6E56] font-medium">Verified seller</span>
                  </div>
                </div>
              </div>
              {lender?.email && (
                <div className="flex items-center gap-2 text-[13px] text-[#444441] mb-2">
                  <Mail className="w-4 h-4 text-[#737370]" />
                  <span>{lender.email}</span>
                </div>
              )}
              {lender?.phone && (
                <div className="flex items-center gap-2 text-[13px] text-[#444441]">
                  <Phone className="w-4 h-4 text-[#737370]" />
                  <span>{lender.phone}</span>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="px-5 py-4">
              <button
                onClick={() => { setShowMobilePropPanel(false); openOfferForm(); }}
                className="flex items-center justify-center w-full py-3 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors duration-200 mb-3"
              >
                Make Offer
              </button>
              {listingHref && (
                <Link
                  href={listingHref}
                  onClick={() => setShowMobilePropPanel(false)}
                  className="flex items-center justify-center w-full py-3 border border-[#E8E8E4] text-[#1A1816] text-[14px] font-semibold rounded hover:bg-[#FAFAF8] transition-colors duration-200"
                >
                  View Listing
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <div className="w-full sm:max-w-[520px] bg-white rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            {offerSuccess ? (
              <div className="flex flex-col items-center text-center px-6 py-10">
                <div className="w-12 h-12 rounded-full bg-[#E4F5EC] flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5 text-[#0F6E56]" />
                </div>
                <p className="text-[16px] font-bold text-[#1A1816] mb-1">Offer submitted!</p>
                <p className="text-[13px] text-[#737370] mb-6">The seller will review and respond soon.</p>
                <button
                  onClick={() => setShowOfferForm(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#D03839] text-white text-[13px] font-semibold rounded hover:bg-[#E0493B] transition-colors"
                >
                  Back to Deal Overview
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4] sticky top-0 bg-white z-10">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#1A1816]">Make an Offer</p>
                    {propertyAddress && <p className="text-[12px] text-[#737370] mt-0.5 truncate">{propertyAddress}</p>}
                  </div>
                  <button onClick={() => setShowOfferForm(false)} className="p-1.5 rounded hover:bg-[#FAFAF8] transition-colors flex-shrink-0 ml-3">
                    <X className="w-5 h-5 text-[#737370]" />
                  </button>
                </div>

                <div className="px-6 py-5">
                  {offerError && (
                    <div className="mb-4 p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[12px] text-[#D03839]">{offerError}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Offer Price <span className="text-[#D03839]">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[13px]">$</span>
                        <input
                          type="text"
                          value={offerAmount}
                          onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setOfferAmount(r ? Number(r).toLocaleString() : ''); }}
                          placeholder="135,000"
                          className="w-full pl-6 pr-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Earnest Money <span className="text-[#D03839]">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[13px]">$</span>
                        <input
                          type="text"
                          value={offerEarnest}
                          onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setOfferEarnest(r ? Number(r).toLocaleString() : ''); }}
                          placeholder="1,000"
                          className="w-full pl-6 pr-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Financing</label>
                      <select value={offerFinancing} onChange={e => setOfferFinancing(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] bg-white focus:outline-none focus:border-[#D03839] appearance-none"
                        style={selectStyle}>
                        {FINANCING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Closing Timeline</label>
                      <select value={offerClosing} onChange={e => setOfferClosing(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] bg-white focus:outline-none focus:border-[#D03839] appearance-none"
                        style={selectStyle}>
                        {CLOSING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Inspection Period</label>
                      <select value={offerInspection} onChange={e => setOfferInspection(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] bg-white focus:outline-none focus:border-[#D03839] appearance-none"
                        style={selectStyle}>
                        {INSPECTION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-medium text-[#1A1816] mb-1">Notes</label>
                      <textarea
                        value={offerNotes}
                        onChange={e => setOfferNotes(e.target.value)}
                        placeholder="Any additional terms..."
                        rows={3}
                        className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowOfferForm(false)}
                      className="flex-1 py-2.5 border border-[#E8E8E4] text-[#737370] text-[13px] font-semibold rounded hover:bg-[#FAFAF8] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitInlineOffer}
                      disabled={submittingOffer}
                      className="flex-1 py-2.5 bg-[#D03839] text-white text-[13px] font-semibold rounded hover:bg-[#E0493B] transition-colors disabled:opacity-50"
                    >
                      {submittingOffer ? 'Submitting…' : 'Submit Offer'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={selectedImage} alt="Preview" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      <ConfirmDialog
        open={!!counterConfirm}
        busy={counterConfirm?.kind === 'accept' ? acceptingCounter : rejectingCounter}
        onClose={() => setCounterConfirm(null)}
        onConfirm={() => {
          if (!counterConfirm) return;
          if (counterConfirm.kind === 'accept') handleAcceptCounter(counterConfirm.offerId);
          else handleRejectCounter(counterConfirm.offerId);
          setCounterConfirm(null);
        }}
        title={counterConfirm?.kind === 'accept' ? 'Accept counter offer?' : 'Decline counter offer?'}
        message={counterConfirm
          ? (counterConfirm.kind === 'accept'
              ? `You're about to accept the seller's counter offer of ${formatCurrency(counterConfirm.amount)}. This is binding once accepted.`
              : `Decline the seller's counter offer of ${formatCurrency(counterConfirm.amount)}? You can still send a new offer afterward.`)
          : ''}
        confirmText={counterConfirm?.kind === 'accept' ? 'Yes, accept' : 'Yes, decline'}
        danger={counterConfirm?.kind === 'reject'}
      />

      {/* Delete-message confirm */}
      <ConfirmDialog
        open={!!deletingMsg}
        onClose={() => setDeletingMsg(null)}
        onConfirm={() => deletingMsg && handleDeleteMessage(deletingMsg.id)}
        title="Delete this message?"
        message="It will be removed for everyone in this chat and replaced with “This message was deleted.”"
        confirmText="Delete"
        danger
      />

      {/* Report-message dialog */}
      {reportingMsg && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !submittingReport && setReportingMsg(null)}>
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#D03839]" />
              <h3 className="text-[16px] font-bold text-[#1A1816]">Report message</h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-[13px] text-[#737370]">Our team will review this. Reports help us keep DeelMap safe from scams and abuse.</p>
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Reason</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['spam', 'Spam'], ['scam', 'Scam / fraud'], ['abuse', 'Abusive'], ['other', 'Other']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setReportReason(val)}
                      className={`h-9 px-3 rounded border text-[13px] font-medium transition-colors ${reportReason === val ? 'border-[#D03839] bg-[#FEF0EF] text-[#D03839]' : 'border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Details <span className="font-normal text-[#A8A8A4]">(optional)</span></label>
                <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={3}
                  placeholder="Add anything that helps us review this…"
                  className="w-full px-3 py-2 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] resize-none" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E8E8E4] flex justify-end gap-2">
              <button type="button" onClick={() => setReportingMsg(null)} disabled={submittingReport}
                className="h-9 px-4 border border-[#E8E8E4] text-[#444441] text-[13px] font-semibold rounded hover:border-[#1A1816] transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleSubmitReport} disabled={submittingReport}
                className="h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {submittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
